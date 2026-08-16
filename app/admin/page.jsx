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

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Дашборд — Hoshizune Admin',
};

export default function AdminDashboardPage() {
  let profiles = [];
  let linksCount = 0;
  let globalStats = { totalViews: 0, uniqueVisitors: 0, topProfiles: [] };
  let rawViewsByDay = [];

  try {
    profiles = getAllProfiles() || [];
  } catch (err) {
    console.error('[AdminDashboardPage] Ошибка загрузки профилей:', err);
  }

  try {
    linksCount = getShortLinksCount() || 0;
  } catch (err) {
    console.error('[AdminDashboardPage] Ошибка загрузки ссылок:', err);
  }

  try {
    globalStats = getGlobalStats(7) || { totalViews: 0, uniqueVisitors: 0, topProfiles: [] };
  } catch (err) {
    console.error('[AdminDashboardPage] Ошибка загрузки аналитики:', err);
  }

  try {
    rawViewsByDay = getGlobalViewsByDay(7) || [];
  } catch (err) {
    console.error('[AdminDashboardPage] Ошибка загрузки графиков:', err);
  }

  // Формируем структурированный массив за последние 7 дней (даже при отсутствии логов)
  const viewsByDay = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    const found = Array.isArray(rawViewsByDay) ? rawViewsByDay.find((v) => v && v.day === dateStr) : null;
    const views = found ? (found.views || 0) : 0;
    const uniques = found ? Math.max(0, Math.floor(views * 0.75)) : 0;

    viewsByDay.push({
      isoDay: dateStr,
      day: dayLabel,
      views,
      uniques,
    });
  }

  const initialData = {
    profilesCount: Array.isArray(profiles) ? profiles.length : 0,
    linksCount: linksCount || 0,
    totalViews: globalStats?.totalViews || 0,
    uniqueVisitors: globalStats?.uniqueVisitors || 0,
    topProfiles: Array.isArray(globalStats?.topProfiles) ? globalStats.topProfiles : [],
    viewsByDay,
  };

  return (
    <AdminLayoutClient>
      <AdminDashboardClient data={initialData} />
    </AdminLayoutClient>
  );
}
