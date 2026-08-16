import AdminLayoutClient from '../AdminLayoutClient';
import SubscriptionsClient from './SubscriptionsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Управление Подписками | Админ-панель Hoshizune',
};

export default function SubscriptionsPage() {
  return (
    <AdminLayoutClient>
      <SubscriptionsClient />
    </AdminLayoutClient>
  );
}
