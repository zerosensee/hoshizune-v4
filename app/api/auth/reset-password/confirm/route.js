/**
 * API: Подтверждение сброса пароля по токену.
 * POST /api/auth/reset-password/confirm — { token, newPassword }
 */
import { NextResponse } from 'next/server';
import { validateResetToken, markResetTokenUsed } from '@/lib/email-service';
import { getUserByEmail, updateUserPassword } from '@/lib/user-repository';

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Токен и новый пароль обязательны' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен быть не менее 6 символов' },
        { status: 400 }
      );
    }

    const resetInfo = validateResetToken(token);
    if (!resetInfo) {
      return NextResponse.json(
        { error: 'Токен сброса недействителен или его срок действия истёк' },
        { status: 400 }
      );
    }

    const user = getUserByEmail(resetInfo.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь с указанным email не найден' },
        { status: 404 }
      );
    }

    updateUserPassword(user.id, newPassword);
    markResetTokenUsed(token);

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён! Выполняется перенаправление на страницу входа...',
    });
  } catch (error) {
    console.error('Ошибка при смене пароля:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при сохранении нового пароля' },
      { status: 500 }
    );
  }
}
