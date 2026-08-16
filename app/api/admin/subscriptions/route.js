/**
 * API Управления Подписками Hoshizune v4.
 * GET    — Список подписок
 * POST   — Выдача новой подписки
 * PUT    — Продление подписки
 * DELETE — Сброс/Отзыв подписки
 */
import { NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorizedResponse } from '@/lib/admin-auth';
import {
  getAllSubscriptions,
  createSubscription,
  extendSubscription,
  revokeSubscription,
} from '@/lib/subscription-repository';

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const subscriptions = getAllSubscriptions();
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Ошибка получения списка подписок:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { userId, email, orderId, planName, durationDays } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Укажите ID или Slug пользователя' }, { status: 400 });
    }

    const sub = createSubscription({
      userId,
      email,
      orderId,
      planName,
      durationDays,
    });

    return NextResponse.json({ ok: true, subscription: sub, message: 'Подписка успешно выдана' });
  } catch (error) {
    console.error('Ошибка выдачи подписки:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { id, extraDays } = body;

    if (!id) {
      return NextResponse.json({ error: 'Не указан ID подписки' }, { status: 400 });
    }

    const sub = extendSubscription(id, extraDays || 30);
    return NextResponse.json({ ok: true, subscription: sub, message: 'Подписка успешно продлена' });
  } catch (error) {
    console.error('Ошибка продления подписки:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Не указан ID подписки' }, { status: 400 });
    }

    const sub = revokeSubscription(id);
    return NextResponse.json({ ok: true, subscription: sub, message: 'Подписка успешно отозвана (сброшена)' });
  } catch (error) {
    console.error('Ошибка сброса подписки:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
