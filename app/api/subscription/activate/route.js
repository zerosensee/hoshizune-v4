/**
 * API активации/покупки подписки Hoshizune VIP.
 * POST /api/subscription/activate
 *
 * Безопасность:
 * 1. Клиент передает ТОЛЬКО planId. Произвольные planName и durationDays игнорируются.
 * 2. durationDays и цена вычисляются исключительно из серверного каталога SUBSCRIPTION_PLANS.
 * 3. Прямая бесплатная активация заблокирована для обычных пользователей (код 402 Payment Required).
 *    Активация разрешена только администратору или при валидной подписи платежного шлюза.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/user-auth';
import {
  SUBSCRIPTION_PLANS,
  getPlanById,
  createSubscription,
} from '@/lib/subscription-repository';

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
    const { planId, paymentToken } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Не указан идентификатор тарифа (planId)' },
        { status: 400 }
      );
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        {
          error: 'Указанный тариф не существует в каталоге платформы',
          availablePlans: Object.keys(SUBSCRIPTION_PLANS),
        },
        { status: 400 }
      );
    }

    // Проверка привилегий или подтверждения платежа
    const isOwnerOrAdmin = user.isAdmin || user.isOwner || user.role === 'owner';
    const isPaymentConfirmed =
      paymentToken &&
      process.env.PAYMENT_SECRET &&
      paymentToken === process.env.PAYMENT_SECRET;

    if (!isOwnerOrAdmin && !isPaymentConfirmed) {
      return NextResponse.json(
        {
          error:
            'Бесплатная прямая активация отключена в целях безопасности. Оплата должна производиться через официальный платёжный шлюз.',
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          requiresPayment: true,
        },
        { status: 402 }
      );
    }

    const sub = createSubscription({
      userId: user.id,
      email: user.primaryEmail || user.email || '',
      orderId: `ORDER-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      planName: plan.name,
      durationDays: plan.durationDays,
    });

    return NextResponse.json({
      success: true,
      subscription: sub,
      message: `Подписка ${plan.name} успешно активирована на ${plan.durationDays} дней!`,
    });
  } catch (error) {
    console.error('Ошибка активации подписки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при оформлении подписки' },
      { status: 500 }
    );
  }
}
