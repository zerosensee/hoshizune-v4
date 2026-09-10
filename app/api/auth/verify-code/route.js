/**
 * API: Подтверждение 6-значного кода регистрации / верификации email.
 * POST /api/auth/verify-code — { email, code }
 */
import { NextResponse } from 'next/server';
import { verifyEmailCode } from '@/lib/email-service';
import { getUserByEmail } from '@/lib/user-repository';
import { setUserSessionCookie } from '@/lib/user-auth';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email и код подтверждения обязательны' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: 'Код должен состоять ровно из 6 цифр' },
        { status: 400 }
      );
    }

    // Rate Limiting: максимум 5 попыток ввода кода за 15 минут
    const clientIp = getClientIp(request);
    const rlKey = `verify_code:${normalizedEmail}:${clientIp}`;
    const limit = checkRateLimit(rlKey, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      lockoutMs: 15 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Слишком много неверных попыток ввода кода. Блокировка на ${Math.ceil(limit.retryAfterSeconds / 60)} мин. Запросите новый код.`,
        },
        { status: 429 }
      );
    }

    const isCodeValid = verifyEmailCode(normalizedEmail, cleanCode);

    if (!isCodeValid) {
      return NextResponse.json(
        {
          error: 'Неверный или истёкший код подтверждения',
          attemptsRemaining: limit.remaining,
        },
        { status: 400 }
      );
    }

    // Сброс лимита попыток при успешной верификации
    resetRateLimit(rlKey);

    const user = getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Установка сессии после успешного подтверждения
    await setUserSessionCookie(user.id);

    return NextResponse.json({
      success: true,
      user,
      message: 'Email успешно подтверждён! Вы авторизованы.',
    });
  } catch (error) {
    console.error('Ошибка верификации кода:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при проверке кода' },
      { status: 500 }
    );
  }
}
