/**
 * API: Повторная отправка 6-значного кода подтверждения.
 * POST /api/auth/resend-code — { email }
 */
import { NextResponse } from 'next/server';
import { createEmailVerificationCode } from '@/lib/email-service';
import { getUserByEmail } from '@/lib/user-repository';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: 'Почта уже подтверждена' },
        { status: 400 }
      );
    }

    const verification = createEmailVerificationCode(email);

    return NextResponse.json({
      success: true,
      demoCode: verification.code,
      message: 'Новый 6-значный код подтверждения отправлен на вашу почту.',
    });
  } catch (error) {
    console.error('Ошибка повторной отправки кода:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при повторной отправке кода' },
      { status: 500 }
    );
  }
}
