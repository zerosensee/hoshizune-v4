/**
 * API: Регистрация нового пользователя с отправкой 6-значного кода подтверждения.
 * POST /api/auth/register — { email, password, displayName }
 */
import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/user-repository';
import { createEmailVerificationCode } from '@/lib/email-service';
import { setUserSessionCookie } from '@/lib/user-auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с такой почтой уже существует' },
        { status: 409 }
      );
    }

    const user = createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    // Устанавливаем куки сессии сразу при регистрации
    await setUserSessionCookie(user.id);

    return NextResponse.json(
      {
        success: true,
        user,
        requiresVerification: false,
        message: 'Регистрация успешно завершена! Вы авторизованы.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка сервера при регистрации' },
      { status: 500 }
    );
  }
}
