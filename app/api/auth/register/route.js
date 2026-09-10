/**
 * API: Регистрация нового пользователя с отправкой 6-значного кода подтверждения.
 * POST /api/auth/register — { email, password, displayName }
 */
import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/user-repository';
import { createEmailVerificationCode } from '@/lib/email-service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

/** Список распространённых слабых паролей для защиты от словарных атак */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  'password',
  'password123',
  'qwerty123',
  '11111111',
  'admin123',
  'admin1234',
  'letmein123',
  'hoshizune',
  'Test1234!',
]);

export async function POST(request) {
  try {
    // Rate Limiting: максимум 5 регистраций за 10 минут с одного IP
    const clientIp = getClientIp(request);
    const rlKey = `register:${clientIp}`;
    const limit = checkRateLimit(rlKey, {
      maxAttempts: 5,
      windowMs: 10 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Слишком много попыток регистрации с вашего адреса. Попробуйте через ${Math.ceil(limit.retryAfterSeconds / 60)} мин.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, displayName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Укажите корректный адрес электронной почты' },
        { status: 400 }
      );
    }

    // Политика надёжности пароля: минимум 8 символов + проверка по словарю
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Пароль должен содержать не менее 8 символов' },
        { status: 400 }
      );
    }

    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      return NextResponse.json(
        { error: 'Пароль слишком простой или скомпрометирован. Выберите более надёжный пароль.' },
        { status: 400 }
      );
    }

    const existing = getUserByEmail(normalizedEmail);
    if (existing) {
      // Защита от энумерации пользователей:
      // Если аккаунт уже есть, но не подтверждён — отправляем новый код.
      // Если уже подтверждён — возвращаем нейтральный ответ без раскрытия статуса.
      if (!existing.isVerified) {
        createEmailVerificationCode(normalizedEmail);
      }

      return NextResponse.json(
        {
          success: true,
          requiresVerification: true,
          email: normalizedEmail,
          message: 'Если адрес ещё не подтверждён, 6-значный код подтверждения отправлен на вашу почту.',
        },
        { status: 200 }
      );
    }

    // Создаём пользователя с is_verified = 0
    createUser({
      email: normalizedEmail,
      password,
      displayName: displayName || normalizedEmail.split('@')[0],
    });

    // Отправляем 6-значный код подтверждения
    createEmailVerificationCode(normalizedEmail);

    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        email: normalizedEmail,
        message: 'Регистрация успешна! 6-значный код подтверждения отправлен на вашу почту.',
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
