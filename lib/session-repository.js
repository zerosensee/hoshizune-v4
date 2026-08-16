/**
 * Репозиторий для управления активными сессиями и устройствами пользователей в SQLite.
 */
import { getDatabase } from './database';
import { parseUserAgent } from './device-parser';

/**
 * Регистрация или обновление сессии пользователя.
 */
export function recordSession({ userId, sessionToken, ipAddress, userAgent, expiresAt }) {
  if (!userId || !sessionToken) return null;
  const db = getDatabase();
  const now = Date.now();
  const parsedUA = parseUserAgent(userAgent);
  const deviceInfo = parsedUA.formatted;

  const existing = db
    .prepare('SELECT id FROM user_sessions WHERE session_token = ?')
    .get(sessionToken);

  if (existing) {
    db.prepare(`
      UPDATE user_sessions
      SET ip_address = ?, user_agent = ?, device_info = ?, last_active = ?, is_active = 1
      WHERE session_token = ?
    `).run(ipAddress || '', userAgent || '', deviceInfo, now, sessionToken);
  } else {
    const id = `sess_${now}_${Math.random().toString(36).substr(2, 6)}`;
    db.prepare(`
      INSERT INTO user_sessions (
        id, user_id, session_token, ip_address, user_agent,
        device_info, created_at, last_active, expires_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      userId,
      sessionToken,
      ipAddress || '',
      userAgent || '',
      deviceInfo,
      now,
      now,
      expiresAt || (now + 7 * 24 * 60 * 60 * 1000)
    );
  }
}

/**
 * Получение всех активных сессий конкретного пользователя.
 */
export function getUserSessions(userId) {
  if (!userId) return [];
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM user_sessions WHERE user_id = ? AND is_active = 1 ORDER BY last_active DESC')
    .all(userId);

  return rows.map((r) => {
    const ua = parseUserAgent(r.user_agent);
    return {
      id: r.id,
      sessionToken: r.session_token,
      ipAddress: r.ip_address || '127.0.0.1',
      userAgent: r.user_agent,
      deviceInfo: r.device_info || ua.formatted,
      os: ua.os,
      browser: ua.browser,
      device: ua.device,
      createdAt: r.created_at,
      lastActive: r.last_active,
      expiresAt: r.expires_at,
      isActive: !!r.is_active,
    };
  });
}

/**
 * Проверка валидности активной сессии.
 */
export function isSessionActive(sessionToken) {
  if (!sessionToken) return false;
  const db = getDatabase();
  const row = db
    .prepare('SELECT is_active, expires_at FROM user_sessions WHERE session_token = ?')
    .get(sessionToken);

  if (!row) return true; // Фоллбек на HMAC если нет записи в таблице
  if (!row.is_active) return false;
  if (row.expires_at && row.expires_at < Date.now()) return false;

  return true;
}

/**
 * Аннулирование (разавторизация) конкретной сессии.
 */
export function revokeSession(sessionToken) {
  if (!sessionToken) return;
  const db = getDatabase();
  db.prepare('UPDATE user_sessions SET is_active = 0 WHERE session_token = ?').run(sessionToken);
}

/**
 * Завершение всех сессий пользователя.
 */
export function revokeAllUserSessions(userId) {
  if (!userId) return;
  const db = getDatabase();
  db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?').run(userId);
}
