/**
 * Утилиты для аутентификации и авторизации в API-роутах админки.
 * Проверка cookie-сессии, хеширование пароля.
 */
import { cookies } from 'next/headers';
import crypto from 'crypto';
import adminConfig from '@/admin-config.json';

/** Имя cookie сессии */
export const SESSION_COOKIE = adminConfig.sessionCookieName;

/**
 * Генерация HMAC-токена сессии.
 * @param {string} payload - Полезная нагрузка (timestamp)
 * @returns {string} Токен сессии
 */
export function generateSessionToken(payload) {
  return crypto
    .createHmac('sha256', adminConfig.sessionSecret)
    .update(payload)
    .digest('hex');
}

/**
 * Проверка валидности сессионного токена.
 * @param {string} token - Токен из cookie
 * @returns {boolean} Валидность токена
 */
export function validateSessionToken(token) {
  if (!token || typeof token !== 'string') return false;

  const [timestamp, hmac] = token.split(':');
  if (!timestamp || !hmac) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  // Проверка срока действия сессии
  const maxAge = adminConfig.sessionMaxAge * 1000;
  if (Date.now() - ts > maxAge) return false;

  const expectedHmac = generateSessionToken(timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(expectedHmac),
  );
}

/**
 * Создание токена сессии с текущим временем.
 * @returns {string} Новый токен вида "timestamp:hmac"
 */
export function createSessionToken() {
  const timestamp = Date.now().toString();
  const hmac = generateSessionToken(timestamp);
  return `${timestamp}:${hmac}`;
}

/**
 * Проверка авторизации текущего запроса.
 * Читает cookie сессии и валидирует токен.
 * @returns {Promise<boolean>} True если авторизован
 */
export async function isAdminAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (validateSessionToken(token)) return true;

  try {
    const { getCurrentUser } = await import('./user-auth');
    const user = await getCurrentUser();
    if (user && user.isAdmin) return true;
  } catch {
    // игнорируем ошибки импорта
  }

  return false;
}

/**
 * Ответ «Не авторизован» для API-роутов.
 * @returns {Response} 401 JSON-ответ
 */
export function unauthorizedResponse() {
  return Response.json(
    { error: 'Требуется авторизация' },
    { status: 401 },
  );
}
