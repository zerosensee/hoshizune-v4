/**
 * Страница настроек панели администратора (серверная).
 */
import adminConfig from '@/admin-config.json';
import AdminLayoutClient from '../AdminLayoutClient';
import SettingsClient from './SettingsClient';

export const metadata = {
  title: 'Настройки — Hoshizune Admin',
};

export default function AdminSettingsPage() {
  const settings = {
    allowedIps: adminConfig.allowedIps,
    allowLocalNetwork: adminConfig.allowLocalNetwork,
    adminSubdomain: adminConfig.adminSubdomain,
    sessionMaxAge: adminConfig.sessionMaxAge,
  };

  return (
    <AdminLayoutClient>
      <SettingsClient settings={settings} />
    </AdminLayoutClient>
  );
}
