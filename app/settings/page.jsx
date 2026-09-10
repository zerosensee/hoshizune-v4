/**
 * Страница настроек пользователя (тема, отображение тем авторов).
 * Защищена на стороне сервера: неавторизованные пользователи перенаправляются на /auth.
 */
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/user-auth';
import UserSettingsClient from './UserSettingsClient';

export const metadata = {
  title: 'Настройки — Hoshizune',
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }

  return <UserSettingsClient currentUser={user} />;
}
