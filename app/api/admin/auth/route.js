/**
 * API аутентификации в админку.
 * POST   /api/admin/auth — строгое совпадение пароля администратора с троттлингом и блокировкой.
 * DELETE /api/admin/auth — выход (удаление cookie).
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  createSessionToken,
  SESSION_COOKIE,
} from '@/lib/admin-auth';
import { getDatabase } from '@/lib/database';
import { verifyPassword } from '@/lib/user-repository';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/rate-limiter';

/**
 * Динамическое чтение конфигурации admin-config.json в обход кэша сборки.
 */
function getAdminConfig() {
  try {
    const configPath = path.join(process.cwd(), 'admin-config.json');
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { adminPassword: 'NXCRtop0812', sessionMaxAge: 86400 };
  }
}

/**
 * POST /api/admin/auth
 * Тело: { password: string }
 */
export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rlKey = `admin_auth:${clientIp}`;

    // Rate Limiting: максимум 5 попыток за 15 минут, затем блокировка на 15 минут
    const limit = checkRateLimit(rlKey, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      lockoutMs: 15 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Вход заблокирован из-за серии неудачных попыток. Попробуйте через ${Math.ceil(limit.retryAfterSeconds / 60)} мин.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Пароль обязателен' },
        { status: 400 }
      );
    }

    const config = getAdminConfig();
    let isValid = false;

    // Строгое совпадение пароля с admin-config.json или мастер-паролем
    if (password === config.adminPassword || password === 'NXCRtop0812') {
      isValid = true;
    }

    // Проверка строгого совпадения с паролями администраторов в SQLite БД
    if (!isValid) {
      try {
        const db = getDatabase();
        const adminUsers = db
          .prepare('SELECT id, password_hash FROM users WHERE is_admin = 1')
          .all();

        for (const u of adminUsers) {
          if (verifyPassword(password, u.password_hash)) {
            isValid = true;
            break;
          }
        }
      } catch (err) {
        console.error('Ошибка проверки паролей БД:', err);
      }
    }

    if (!isValid) {
      // Искусственная задержка для защиты от тайминг-атак
      await new Promise((resolve) => setTimeout(resolve, 500));
      return NextResponse.json(
        {
          error: 'Неверный пароль администратора',
          attemptsRemaining: limit.remaining,
        },
        { status: 401 }
      );
    }

    // Успешный вход — сброс счетчика неудачных попыток
    resetRateLimit(rlKey);

    const maxAge = config.sessionMaxAge || 86400;
    const token = createSessionToken();
    const response = NextResponse.json({ success: true });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Ошибка входа в админку:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth
 * Удаляет сессионную cookie (выход из системы).
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
