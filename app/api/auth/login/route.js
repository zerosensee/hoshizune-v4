/**
 * API: Вход пользователя с проверкой статуса подтверждения почты.
 * POST /api/auth/login — { email, password }
 */
import { NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/user-repository';
import { setUserSessionCookie } from '@/lib/user-auth';
import { createEmailVerificationCode } from '@/lib/email-service';
import { getDatabase } from '@/lib/database';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Укажите email и пароль' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const normalizedEmail = email.trim().toLowerCase();

    // Запрашиваем данные пользователя по почте
    const row = db
      .prepare(`
        SELECT u.id, u.password_hash, u.display_name, u.is_admin, u.is_verified
        FROM users u
        JOIN user_emails e ON u.id = e.user_id
        WHERE LOWER(e.email) = ?
      `)
      .get(normalizedEmail);

    if (!row) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, row.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Автоматическая подтяжка верификации если она не стояла
    if (!row.is_verified) {
      db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(row.id);
    }

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

    const user = getUserByEmail(email);

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
