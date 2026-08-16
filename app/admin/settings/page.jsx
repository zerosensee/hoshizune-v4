/**
 * Страница настроек панели администратора (серверная).
 */
import { getDbSettings } from '@/lib/database';
import AdminLayoutClient from '../AdminLayoutClient';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Настройки — Hoshizune Admin',
};

export default function AdminSettingsPage() {
  const settings = getDbSettings();

  return (
    <AdminLayoutClient>
      <SettingsClient settings={settings} />
    </AdminLayoutClient>
  );
}
