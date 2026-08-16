/**
 * API активации/покупки подписки Hoshizune VIP.
 * POST /api/subscription/activate
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { createSubscription } from '@/lib/subscription-repository';

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходимо войти в систему для оформления подписки' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const planName = body.planName || 'VIP PRO';
    const durationDays = parseInt(body.durationDays, 10) || 30;

    const sub = createSubscription({
      userId: user.id,
      email: user.email || '',
      orderId: `ORDER-${Date.now()}`,
      planName,
      durationDays,
    });

    return NextResponse.json({
      success: true,
      subscription: sub,
      message: `Подписка ${planName} успешно активирована на ${durationDays} дней!`,
    });
  } catch (error) {
    console.error('Ошибка активации подписки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при оформлении подписки' },
      { status: 500 }
    );
  }
}
