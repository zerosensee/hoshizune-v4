/**
 * Страница входа в администраторскую панель.
 * Отдельный layout — без авторизационной проверки.
 */
export const metadata = {
  title: 'Вход — Hoshizune Admin',
  robots: 'noindex, nofollow',
};

import LoginClient from './LoginClient';

export default function LoginPage() {
  return <LoginClient />;
}
