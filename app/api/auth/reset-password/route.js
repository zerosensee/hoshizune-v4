/**
 * API: Запрос восстановления пароля.
 * POST /api/auth/reset-password — { email }
 */
import { NextResponse } from 'next/server';
import { createPasswordResetToken, sendPasswordResetEmail } from '@/lib/email-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Укажите email-адрес' },
        { status: 400 }
      );
    }

    const resetData = createPasswordResetToken(email);

    if (resetData) {
      const host = request.headers.get('host') || 'localhost:3000';
      const proto = request.headers.get('x-forwarded-proto') || 'http';
      const resetLink = `${proto}://${host}/auth/reset-password?token=${resetData.token}`;

      await sendPasswordResetEmail(resetData.email, resetLink);

      return NextResponse.json({
        success: true,
        message: 'Инструкции отправлены на указный email',
        demoToken: resetData.token, // Для удобного локального тестирования
      });
    }

    // В целях безопасности возвращаем успешный статус даже если email не найден
    return NextResponse.json({
      success: true,
      message: 'Если указный email существует в системе, инструкции будут отправлены',
    });
  } catch (error) {
    console.error('Ошибка при запросе сброса пароля:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
