/**
 * Страница настроек пользователя (тема, отображение тем авторов).
 */
import UserSettingsClient from './UserSettingsClient';

export const metadata = {
  title: 'Настройки — Hoshizune',
};

export default function SettingsPage() {
  return <UserSettingsClient />;
}
