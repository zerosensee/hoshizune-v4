/**
 * Репозиторий аналитики: запись просмотров профилей,
 * агрегация статистики по дням, рефереры, уникальные визиты.
 */
import crypto from 'crypto';
import { getDatabase } from './database';

/**
 * Хеширование IP-адреса для анонимизации.
 * @param {string} ip - IP-адрес посетителя
 * @returns {string} SHA-256 хеш IP
 */
export function hashIp(ip) {
  return crypto
    .createHash('sha256')
    .update(ip + 'hoshizune_salt_v4')
    .digest('hex');
}

/**
 * Запись просмотра страницы профиля.
 * @param {{
 *   profileId: string,
 *   ip: string,
 *   referrer?: string,
 *   userAgent?: string
 * }} data - Данные просмотра
 */
export function recordPageView(data) {
  const db = getDatabase();
  const ipHash = hashIp(data.ip || '0.0.0.0');

  db.prepare(`
    INSERT INTO page_views (
      profile_id, ip_hash, referrer, user_agent, viewed_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    data.profileId,
    ipHash,
    data.referrer || '',
    data.userAgent || '',
    Date.now(),
  );
}

/**
 * Получение статистики просмотров профиля по дням.
 * @param {string} profileId - UUID профиля
 * @param {number} days - Количество дней
 * @returns {object[]} Массив {day, views}
 */
export function getViewStats(profileId, days = 7) {
  const db = getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  return db.prepare(`
    SELECT
      date(viewed_at / 1000, 'unixepoch') as day,
      COUNT(*) as views
    FROM page_views
    WHERE profile_id = ? AND viewed_at >= ?
    GROUP BY day
    ORDER BY day ASC
  `).all(profileId, since);
}

/**
 * Получение общего числа просмотров профиля.
 * @param {string} profileId - UUID профиля
 * @returns {number} Общее число просмотров
 */
export function getTotalViews(profileId) {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT COUNT(*) as cnt FROM page_views WHERE profile_id = ?'
  ).get(profileId);
  return row.cnt;
}

/**
 * Получение числа уникальных посетителей профиля.
 * @param {string} profileId - UUID профиля
 * @param {number} days - За последние N дней
 * @returns {number} Уникальные посетители
 */
export function getUniqueViews(profileId, days = 30) {
  const db = getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const row = db.prepare(`
    SELECT COUNT(DISTINCT ip_hash) as cnt
    FROM page_views
    WHERE profile_id = ? AND viewed_at >= ?
  `).get(profileId, since);
  return row.cnt;
}

/**
 * Получение топ-рефереров для профиля.
 * @param {string} profileId - UUID профиля
 * @param {number} limit - Количество записей
 * @returns {object[]} Массив {referrer, count}
 */
export function getTopReferrers(profileId, limit = 10) {
  const db = getDatabase();

  return db.prepare(`
    SELECT
      referrer,
      COUNT(*) as count
    FROM page_views
    WHERE profile_id = ? AND referrer != ''
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT ?
  `).all(profileId, limit);
}

/**
 * Получение агрегированной аналитики по всем профилям (для дашборда).
 * @param {number} days - Период в днях
 * @returns {{
 *   totalViews: number,
 *   uniqueVisitors: number,
 *   topProfiles: object[]
 * }} Сводная статистика
 */
export function getGlobalStats(days = 7) {
  const db = getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const totalRow = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM page_views
    WHERE viewed_at >= ?
  `).get(since);

  const uniqueRow = db.prepare(`
    SELECT COUNT(DISTINCT ip_hash) as cnt
    FROM page_views
    WHERE viewed_at >= ?
  `).get(since);

  const topProfiles = db.prepare(`
    SELECT
      pv.profile_id,
      p.display_name,
      p.slug,
      COUNT(*) as views
    FROM page_views pv
    LEFT JOIN profiles p ON p.id = pv.profile_id
    WHERE pv.viewed_at >= ?
    GROUP BY pv.profile_id
    ORDER BY views DESC
    LIMIT 5
  `).all(since);

  return {
    totalViews: totalRow.cnt,
    uniqueVisitors: uniqueRow.cnt,
    topProfiles,
  };
}

/**
 * Получение статистики просмотров по дням для глобального графика.
 * @param {number} days - Период в днях
 * @returns {object[]} Массив {day, views}
 */
export function getGlobalViewsByDay(days = 7) {
  const db = getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  return db.prepare(`
    SELECT
      date(viewed_at / 1000, 'unixepoch') as day,
      COUNT(*) as views
    FROM page_views
    WHERE viewed_at >= ?
    GROUP BY day
    ORDER BY day ASC
  `).all(since);
}
