/**
 * API: Добавление дополнительных почт к аккаунту (до 3 шт).
 * POST /api/auth/emails — { email, isVirtual }
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { addEmailToUser } from '@/lib/user-repository';
import { createEmailVerificationCode } from '@/lib/email-service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const clientIp = getClientIp(request);
    const limit = checkRateLimit(`add_email:${user.id}:${clientIp}`, {
      maxAttempts: 3,
      windowMs: 15 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Слишком много попыток добавления почты. Попробуйте через ${Math.ceil(limit.retryAfterSeconds / 60)} мин.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, isVirtual } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Некорректный формат email адреса' },
        { status: 400 }
      );
    }

    const added = addEmailToUser(user.id, normalizedEmail, isVirtual);

    // Если это внешний email (не виртуальный), высылаем код верификации для подтверждения владения
    if (!isVirtual) {
      createEmailVerificationCode(normalizedEmail);
    }

    return NextResponse.json(
      {
        ...added,
        message: isVirtual
          ? 'Виртуальный псевдоним успешно создан'
          : 'Email привязан! Код подтверждения отправлен на указанный адрес.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Ошибка добавления email:', error);
    return NextResponse.json(
      { error: error.message || 'Не удалось привязать email' },
      { status: 400 }
    );
  }
}
