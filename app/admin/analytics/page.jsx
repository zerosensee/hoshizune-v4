/**
 * Страница аналитики в панели администратора (серверная).
 */
import {
  getGlobalStats,
  getGlobalViewsByDay,
} from '@/lib/analytics-repository';
import AdminLayoutClient from '../AdminLayoutClient';
import AnalyticsClient from './AnalyticsClient';

export const metadata = {
  title: 'Аналитика — Hoshizune Admin',
};

export default function AdminAnalyticsPage() {
  const stats7 = getGlobalStats(7);
  const stats30 = getGlobalStats(30);
  const byDay7 = getGlobalViewsByDay(7);
  const byDay30 = getGlobalViewsByDay(30);

  return (
    <AdminLayoutClient>
      <AnalyticsClient
        stats7={stats7}
        stats30={stats30}
        byDay7={byDay7}
        byDay30={byDay30}
      />
    </AdminLayoutClient>
  );
}
