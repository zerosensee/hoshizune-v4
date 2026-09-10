/**
 * API: Повторная отправка 6-значного кода подтверждения.
 * POST /api/auth/resend-code — { email }
 */
import { NextResponse } from 'next/server';
import { createEmailVerificationCode } from '@/lib/email-service';
import { getUserByEmail } from '@/lib/user-repository';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Троттлинг: максимум 1 запрос на повторную отправку в 60 секунд
    const clientIp = getClientIp(request);
    const rlKey = `resend_code:${normalizedEmail}:${clientIp}`;
    const limit = checkRateLimit(rlKey, {
      maxAttempts: 1,
      windowMs: 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Повторная отправка доступна через ${limit.retryAfterSeconds} сек.`,
        },
        { status: 429 }
      );
    }

    const user = getUserByEmail(normalizedEmail);
    if (!user) {
      // Нейтральный ответ для предотвращения энумерации
      return NextResponse.json({
        success: true,
        message: 'Если указанный адрес зарегистрирован, новый код подтверждения отправлен на почту.',
      });
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: 'Почта уже подтверждена' },
        { status: 400 }
      );
    }

    createEmailVerificationCode(normalizedEmail);

    return NextResponse.json({
      success: true,
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
