/**
 * API: Добавление дополнительных почт к аккаунту (до 3 шт).
 * POST /api/auth/emails — { email, isVirtual }
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { addEmailToUser } from '@/lib/user-repository';

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, isVirtual } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const added = addEmailToUser(user.id, email, isVirtual);
    return NextResponse.json(added, { status: 201 });
  } catch (error) {
    console.error('Ошибка добавления email:', error);
    return NextResponse.json(
      { error: error.message || 'Не удалось привязать email' },
      { status: 400 }
    );
  }
}
