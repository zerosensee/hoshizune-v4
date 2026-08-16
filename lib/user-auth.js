/**
 * Модуль аутентификации обычных пользователей и администраторов.
 * Управление HMAC-сессиями и куки hoshizune_user_session.
 */
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getUserById } from './user-repository';

const USER_SESSION_COOKIE = 'hoshizune_user_session';
const SESSION_SECRET = 'hoshizune_user_session_secret_key_v4_2026';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 дней в миллисекундах

/**
 * Создание токена сессии для пользователя.
 * @param {string} userId - ID пользователя
 * @returns {string} Токен вида userId:timestamp:hmac
 */
export function createSessionToken(userId) {
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');

  return `${payload}:${hmac}`;
}

/**
 * Валидация токена сессии.
 * @param {string} token - Токен из куки
 * @returns {string|null} ID пользователя или null при недействительном токене
 */
export function validateSessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split(':');
  if (parts.length !== 3) return null;

  const [userId, timestamp, hmac] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return null;

  // Проверка срока действия
  if (Date.now() - ts > SESSION_MAX_AGE) return null;

  const payload = `${userId}:${timestamp}`;
  const expectedHmac = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');

  try {
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
    if (!isMatch) return null;

    // Проверка принудительного отзыва сессии в SQLite
    const { isSessionActive } = require('./session-repository');
    if (!isSessionActive(token)) return null;

    return userId;
  } catch {
    return null;
  }
}

/**
 * Установка куки сессии в ответе или в headers (серверные компоненты / API).
 * @param {string} userId - ID пользователя
 */
export async function setUserSessionCookie(userId) {
  const cookieStore = await cookies();
  const token = createSessionToken(userId);

  cookieStore.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
    path: '/',
  });

  cookieStore.set('hoshizune_uid', userId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
    path: '/',
  });

  try {
    const user = getUserById(userId);
    if (user && (user.isAdmin || user.role === 'admin' || user.role === 'owner')) {
      const { createSessionToken: createAdminToken, SESSION_COOKIE } = await import('./admin-auth');
      const adminToken = createAdminToken();
      cookieStore.set(SESSION_COOKIE, adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 дней
        path: '/',
      });
    }
  } catch {
    // Игнорируем ошибки при опциональной установке админ-куки
  }
}

/**
 * Удаление куки сессии (выход из аккаунта).
 */
export async function clearUserSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(USER_SESSION_COOKIE);
  cookieStore.delete('hoshizune_uid');
  cookieStore.delete('hoshizune_admin_session');
}

/**
 * Получение текущего аутентифицированного пользователя на сервере.
 * @returns {Promise<object|null>} Объект пользователя или null
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
    const userId = validateSessionToken(token);

    if (!userId) return null;

    return getUserById(userId);
  } catch {
    return null;
  }
}

/**
 * Вспомогательная функция для проверки, является ли текущий пользователь админом.
 * @returns {Promise<boolean>} True если пользователь — админ
 */
export async function isCurrentAdmin() {
  const user = await getCurrentUser();
  return !!(user && user.isAdmin);
}
