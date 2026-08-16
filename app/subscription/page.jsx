/**
 * Страница подписок Hoshizune VIP & Creator Plus (/subscription).
 */
import { getCurrentUser } from '@/lib/user-auth';
import { getUserActiveSubscription } from '@/lib/subscription-repository';
import SubscriptionClient from './SubscriptionClient';

export const metadata = {
  title: 'Hoshizune VIP & Подписки | Премиум возможности',
  description: 'Оформите подписку Hoshizune VIP для снятия лимитов на аватарки до 20МБ, уникального свечения и статусных плашек.',
};

export default async function SubscriptionPage() {
  const currentUser = await getCurrentUser();
  let currentSubscription = null;

  if (currentUser) {
    currentSubscription = getUserActiveSubscription(currentUser.id);
  }

  return (
    <SubscriptionClient
      currentUser={currentUser}
      initialSubscription={currentSubscription}
    />
  );
}
