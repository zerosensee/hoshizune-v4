/**
 * API: Управление сессиями и устройствами пользователей в админ-панели.
 */
import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  getUserSessions,
  revokeSession,
  revokeAllUserSessions,
} from '@/lib/session-repository';

export async function GET(request) {
  try {
    const isAuth = await isAdminAuthorized();
    if (!isAuth) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Не указан userId' }, { status: 400 });
    }

    const sessions = getUserSessions(userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Ошибка получения сессий:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const isAuth = await isAdminAuthorized();
    if (!isAuth) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { sessionToken, userId, revokeAll } = body;

    if (revokeAll && userId) {
      revokeAllUserSessions(userId);
      return NextResponse.json({ ok: true, message: 'Все сессии успешно завершены' });
    }

    if (sessionToken) {
      revokeSession(sessionToken);
      return NextResponse.json({ ok: true, message: 'Сессия успешно отозвана' });
    }

    return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
  } catch (error) {
    console.error('Ошибка при отзыве сессии:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
