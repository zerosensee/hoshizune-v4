/**
 * Корневой layout для /admin — только мета-данные.
 * Авторизация управляется в proxy.js (IP + cookie-сессия).
 * AdminLayoutClient (боковое меню) добавляется в каждой странице отдельно,
 * чтобы страница /admin/login не получала боковую навигацию.
 */
export const metadata = {
  title: {
    template: '%s — Hoshizune Admin',
    default: 'Hoshizune Admin',
  },
  description: 'Панель управления Hoshizune',
  robots: 'noindex, nofollow',
};

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function AdminRootLayout({ children }) {
  return <>{children}</>;
}
