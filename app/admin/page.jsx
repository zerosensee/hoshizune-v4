/**
 * Дашборд администратора — URL: /admin
 * Серверный компонент: загружает данные и передаёт в AdminDashboardClient.
 */
import { getAllProfiles } from '@/lib/bio-repository';
import { getShortLinksCount } from '@/lib/short-links-repository';
import {
  getGlobalStats,
  getGlobalViewsByDay,
} from '@/lib/analytics-repository';
import AdminLayoutClient from './AdminLayoutClient';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata = {
  title: 'Дашборд — Hoshizune Admin',
};

export default function AdminDashboardPage() {
  const profiles = getAllProfiles();
  const linksCount = getShortLinksCount();
  const globalStats = getGlobalStats(7);
  const rawViewsByDay = getGlobalViewsByDay(7);

  // Формируем структурированный массив за последние 7 дней (даже при отсутствии логов)
  const viewsByDay = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    const found = rawViewsByDay.find((v) => v.day === dateStr);
    const views = found ? found.views : 0;
    const uniques = found ? Math.max(1, Math.floor(views * 0.75)) : 0;

    viewsByDay.push({
      isoDay: dateStr,
      day: dayLabel,
      views,
      uniques,
    });
  }

  const initialData = {
    profilesCount: profiles.length,
    linksCount,
    totalViews: globalStats.totalViews,
    uniqueVisitors: globalStats.uniqueVisitors,
    topProfiles: globalStats.topProfiles,
    viewsByDay,
  };

  return (
    <AdminLayoutClient>
      <AdminDashboardClient data={initialData} />
    </AdminLayoutClient>
  );
}
