/**
 * Репозиторий подписок Hoshizune v4.
 * Выдача, продление, сброс и отслеживание активных подписок пользователей.
 */
import { getDatabase } from './database';
import crypto from 'crypto';

/**
 * Создать/Выдать подписку пользователю.
 */
export function createSubscription({
  userId,
  email = '',
  orderId = '',
  planName = 'Premium',
  durationDays = 30,
}) {
  const db = getDatabase();
  const id = `sub_${crypto.randomBytes(8).toString('hex')}`;
  const now = Date.now();
  const days = parseInt(durationDays, 10) || 30;
  const expiresAt = now + days * 86400 * 1000;

  db.prepare(`
    INSERT INTO subscriptions (
      id, user_id, email, order_id, plan_name, duration_days, created_at, expires_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    id,
    userId,
    email || '',
    orderId || '',
    planName || 'Premium',
    days,
    now,
    expiresAt
  );

  return getSubscriptionById(id);
}

/**
 * Получить подписку по ID.
 */
export function getSubscriptionById(id) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  if (!row) return null;
  return formatSubscription(row);
}

/**
 * Продлить подписку на N дней.
 */
export function extendSubscription(id, extraDays = 30) {
  const db = getDatabase();
  const sub = getSubscriptionById(id);
  if (!sub) return null;

  const now = Date.now();
  const currentExpiry = Math.max(now, sub.expiresAt);
  const newExpiry = currentExpiry + (parseInt(extraDays, 10) || 30) * 86400 * 1000;

  db.prepare(`
    UPDATE subscriptions
    SET expires_at = ?, status = 'active', duration_days = duration_days + ?
    WHERE id = ?
  `).run(newExpiry, parseInt(extraDays, 10) || 30, id);

  return getSubscriptionById(id);
}

/**
 * Отозвать/Сбросить подписку (деактивировать).
 */
export function revokeSubscription(id) {
  const db = getDatabase();
  db.prepare("UPDATE subscriptions SET status = 'revoked' WHERE id = ?").run(id);
  return getSubscriptionById(id);
}

/**
 * Получить список всех подписок с актуализацией статуса просроченных.
 */
export function getAllSubscriptions() {
  const db = getDatabase();
  const now = Date.now();

  try {
    // Автоматический сброс просроченных подписок
    db.prepare("UPDATE subscriptions SET status = 'expired' WHERE expires_at <= ? AND status = 'active'").run(now);

    // Автоматический сидинг бессрочной подписки Founder Lifetime для Владельца
    try {
      const ownerProf = db.prepare('SELECT user_id, id, display_name FROM profiles WHERE is_owner = 1 OR LOWER(slug) = "hoshizune" OR LOWER(display_name) = "zerosense"').get();
      if (ownerProf) {
        const ownerUserId = ownerProf.user_id || ownerProf.id;
        const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ? AND status = "active"').get(ownerUserId);
        if (!existing) {
          const id = `sub_${crypto.randomBytes(8).toString('hex')}`;
          const tenYears = 10 * 365 * 86400 * 1000;
          db.prepare(`
            INSERT INTO subscriptions (
              id, user_id, email, order_id, plan_name, duration_days, created_at, expires_at, status
            ) VALUES (?, ?, 'awianfaip@gmail.com', 'FOUNDER-LIFETIME', 'Founder Lifetime', 3650, ?, ?, 'active')
          `).run(id, ownerUserId, now, now + tenYears);
        }
      }
    } catch {}

    const rows = db.prepare(`
      SELECT p.id as profile_id, p.user_id, p.display_name, p.slug, u.email as user_email,
             s.id as sub_id, s.email as sub_email, s.order_id, s.plan_name, s.duration_days,
             s.created_at as sub_created_at, s.expires_at, s.status
      FROM profiles p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN subscriptions s ON s.user_id = p.user_id OR s.user_id = p.id OR (s.email IS NOT NULL AND s.email != '' AND LOWER(s.email) = LOWER(u.email))
      ORDER BY CASE WHEN s.status = 'active' THEN 0 WHEN s.status = 'expired' THEN 1 ELSE 2 END, p.created_at DESC
    `).all();

    return rows.map((row) => {
      if (row.sub_id) {
        return formatSubscription({
          ...row,
          id: row.sub_id,
          user_id: row.user_id || row.profile_id,
          created_at: row.sub_created_at,
        });
      }
      return {
        id: `nosub_${row.user_id || row.profile_id}`,
        userId: row.user_id || row.profile_id,
        userDisplayName: row.display_name || 'Пользователь',
        userSlug: row.slug || 'user',
        email: row.user_email || '—',
        orderId: '—',
        planName: 'Без подписки',
        durationDays: 0,
        createdAt: null,
        expiresAt: null,
        status: 'none',
        isActive: false,
        isExpired: false,
        daysLeft: 0,
      };
    });
  } catch (err) {
    console.error('[getAllSubscriptions] Ошибка чтения подписок:', err);
    return [];
  }
}

/**
 * Получить активную подписку пользователя по userId или email.
 */
export function getUserActiveSubscription(userId) {
  if (!userId) return null;
  const db = getDatabase();
  const now = Date.now();
  try {
    const row = db.prepare(`
      SELECT * FROM subscriptions
      WHERE (user_id = ? OR email IN (SELECT email FROM user_emails WHERE user_id = ?))
        AND status = 'active'
        AND expires_at > ?
      ORDER BY expires_at DESC LIMIT 1
    `).get(userId, userId, now);
    if (!row) return null;
    return formatSubscription(row);
  } catch {
    return null;
  }
}

/**
 * Вспомогательное форматирование записи подписки.
 */
function formatSubscription(r) {
  const now = Date.now();
  let status = r.status;
  if (r.expires_at <= now && status === 'active') {
    status = 'expired';
  }

  return {
    id: r.id,
    userId: r.user_id,
    userDisplayName: r.display_name || r.user_id,
    userSlug: r.slug || r.user_id,
    userEmail: r.user_email || r.email || '',
    email: r.email || r.user_email || '',
    orderId: r.order_id || '',
    planName: r.plan_name || 'Premium',
    durationDays: r.duration_days,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    status,
    isActive: status === 'active',
  };
}
