/**
 * API: Вход пользователя с проверкой статуса подтверждения почты и защитой от брутфорса.
 * POST /api/auth/login — { email, password }
 */
import { NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/user-repository';
import { setUserSessionCookie } from '@/lib/user-auth';
import { createEmailVerificationCode } from '@/lib/email-service';
import { getDatabase } from '@/lib/database';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Укажите email и пароль' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Rate Limiting: максимум 5 попыток за 5 минут на IP + email, затем блокировка на 10 минут
    const rlKey = `login:${clientIp}:${normalizedEmail}`;
    const limit = checkRateLimit(rlKey, {
      maxAttempts: 5,
      windowMs: 5 * 60 * 1000,
      lockoutMs: 10 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Слишком много неудачных попыток входа. Доступ заблокирован на ${Math.ceil(limit.retryAfterSeconds / 60)} мин.`,
        },
        { status: 429 }
      );
    }

    const db = getDatabase();

    // Запрашиваем данные пользователя по почте
    const row = db
      .prepare(`
        SELECT u.id, u.password_hash, u.display_name, u.is_admin, u.is_verified
        FROM users u
        JOIN user_emails e ON u.id = e.user_id
        WHERE LOWER(e.email) = ?
      `)
      .get(normalizedEmail);

    // Защита от timing-атак
    if (!row) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, row.password_hash);
    if (!isValid) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Проверка статуса подтверждения почты
    if (!row.is_verified) {
      // Отправляем код подтверждения, если почта ещё не верифицирована
      createEmailVerificationCode(normalizedEmail);
      return NextResponse.json(
        {
          error: 'Ваш email ещё не подтверждён. Мы отправили новый 6-значный код на вашу почту.',
          requiresVerification: true,
          email: normalizedEmail,
        },
        { status: 403 }
      );
    }

    // Сброс счетчика неудачных попыток при успешном входе
    resetRateLimit(rlKey);

    // Установка сессии при успешном входе
    await setUserSessionCookie(row.id);

    // Если пользователь является админом, устанавливаем куку админ-сессии для /admin
    if (row.is_admin) {
      try {
        const { createSessionToken } = await import('@/lib/admin-auth');
        const adminToken = createSessionToken();
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.set('hoshizune_admin_session', adminToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60,
          path: '/',
        });
      } catch (err) {
        console.error('Ошибка установки админ-куки:', err);
      }
    }

    const user = getUserByEmail(normalizedEmail);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Ошибка входа пользователя:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при авторизации' },
      { status: 500 }
    );
  }
}
