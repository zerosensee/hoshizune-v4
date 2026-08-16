/**
 * Отдельный layout для страницы входа.
 * Не содержит проверки авторизации — иначе будет бесконечный редирект.
 */
export const metadata = {
  title: 'Вход — Hoshizune Admin',
  robots: 'noindex, nofollow',
};

/**
 * Минималистичный layout для страницы логина.
 * @param {{ children: React.ReactNode }} props
 */
export default function LoginLayout({ children }) {
  return children;
}
