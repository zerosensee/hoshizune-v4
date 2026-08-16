/**
 * API аутентификации в админку.
 * POST /api/admin/auth — строгое совпадение пароля администратора.
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
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Пароль обязателен' },
        { status: 400 },
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
      await new Promise((resolve) => setTimeout(resolve, 300));
      return NextResponse.json(
        { error: 'Неверный пароль администратора' },
        { status: 401 },
      );
    }

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
      { status: 500 },
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
