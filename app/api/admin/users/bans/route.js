/**
 * API: Управление банами и временными ограничениями в админ-панели.
 */
import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  createBan,
  removeBan,
  removeUserBans,
  getAllBans,
} from '@/lib/ban-repository';

export async function GET() {
  try {
    const isAuth = await isAdminAuthorized();
    if (!isAuth) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const bans = getAllBans();
    return NextResponse.json({ bans });
  } catch (error) {
    console.error('Ошибка получения банов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const isAuth = await isAdminAuthorized();
    if (!isAuth) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, ipAddress, banType, reason, durationHours } = body;

    if (!userId && !ipAddress) {
      return NextResponse.json({ error: 'Укажите ID пользователя или IP-адрес' }, { status: 400 });
    }

    if (userId) {
      const { getProfileById } = await import('@/lib/bio-repository');
      const { getCurrentUser } = await import('@/lib/user-auth');
      const { canActorModifyTarget } = await import('@/lib/admin-auth');

      const target = getProfileById(userId);
      const actor = await getCurrentUser();

      if (target && actor && !canActorModifyTarget(actor, target)) {
        return NextResponse.json(
          { error: 'Вы не можете заблокировать равного или вышестоящего сотрудника в иерархии' },
          { status: 403 }
        );
      }
    }

    const banId = createBan({
      userId,
      ipAddress,
      banType: banType || 'account',
      reason: reason || 'Нарушение правил',
      bannedBy: 'Admin',
      durationHours: durationHours ? parseFloat(durationHours) : null,
    });

    return NextResponse.json({ ok: true, banId, message: 'Блокировка успешно применена' });
  } catch (error) {
    console.error('Ошибка создания бана:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const isAuth = await isAdminAuthorized();
    if (!isAuth) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const banId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (userId) {
      removeUserBans(userId);
      return NextResponse.json({ ok: true, message: 'Все блокировки пользователя успешно сняты (Разбан)' });
    }

    if (banId) {
      removeBan(banId);
      return NextResponse.json({ ok: true, message: 'Блокировка успешно снята' });
    }

    return NextResponse.json({ error: 'Не указан ID бана или ID пользователя' }, { status: 400 });
  } catch (error) {
    console.error('Ошибка снятия бана:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
