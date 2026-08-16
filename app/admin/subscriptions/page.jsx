import SubscriptionsClient from './SubscriptionsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Управление Подписками | Админ-панель Hoshizune',
};

export default function SubscriptionsPage() {
  return <SubscriptionsClient />;
}
