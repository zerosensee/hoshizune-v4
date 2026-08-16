/**
 * Репозиторий системы банов Hoshizune v4.
 * Блокировки по IP-адресу, аккаунту и временные ограничения с причиной.
 */
import { getDatabase } from './database';

/**
 * Выдать бан (по аккаунту, IP или временный).
 */
export function createBan({ userId, ipAddress, banType = 'account', reason = 'Нарушение правил', bannedBy = 'Admin', durationHours = null }) {
  const db = getDatabase();
  const now = Date.now();
  let expiresAt = null;

  if (durationHours && typeof durationHours === 'number' && durationHours > 0) {
    expiresAt = now + Math.round(durationHours * 3600 * 1000);
  }

  const result = db.prepare(`
    INSERT INTO user_bans (
      user_id, ip_address, ban_type, reason,
      banned_by, created_at, expires_at, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    userId || null,
    ipAddress || null,
    banType,
    reason || 'Нарушение правил',
    bannedBy || 'Admin',
    now,
    expiresAt
  );

  return result.lastInsertRowid;
}

/**
 * Проверить активный бан для пользователя или IP-адреса.
 */
export function checkBan({ userId = null, ipAddress = null }) {
  const db = getDatabase();
  const now = Date.now();

  const query = `
    SELECT * FROM user_bans
    WHERE is_active = 1
      AND (
        (user_id IS NOT NULL AND user_id = ?)
        OR (ip_address IS NOT NULL AND ip_address = ?)
      )
      AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const ban = db.prepare(query).get(userId || '', ipAddress || '', now);
  if (!ban) return null;

  let remainingMinutes = null;
  if (ban.expires_at) {
    remainingMinutes = Math.max(1, Math.ceil((ban.expires_at - now) / 60000));
  }

  return {
    id: ban.id,
    userId: ban.user_id,
    ipAddress: ban.ip_address,
    banType: ban.ban_type,
    reason: ban.reason,
    bannedBy: ban.banned_by,
    createdAt: ban.created_at,
    expiresAt: ban.expires_at,
    isTemporary: !!ban.expires_at,
    remainingMinutes,
  };
}

/**
 * Снять бан (разблокировать).
 */
export function removeBan(banId) {
  if (!banId) return;
  const db = getDatabase();
  db.prepare('UPDATE user_bans SET is_active = 0 WHERE id = ?').run(banId);
}

/**
 * Снять все баны с пользователя.
 */
export function removeUserBans(userId) {
  if (!userId) return;
  const db = getDatabase();
  db.prepare('UPDATE user_bans SET is_active = 0 WHERE user_id = ?').run(userId);
}

/**
 * Получить список всех активных банов в системе.
 */
export function getAllBans() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM user_bans WHERE is_active = 1 ORDER BY created_at DESC').all();
  return rows.map((b) => ({
    id: b.id,
    userId: b.user_id,
    ipAddress: b.ip_address,
    banType: b.ban_type,
    reason: b.reason,
    bannedBy: b.banned_by,
    createdAt: b.created_at,
    expiresAt: b.expires_at,
    isActive: !!b.is_active,
  }));
}
