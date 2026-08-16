/**
 * Репозиторий для работы с сокращёнными ссылками.
 * CRUD-операции, генерация уникального кода, счётчик кликов.
 */
import { getDatabase } from './database';

/** Алфавит для генерации кодов ссылок */
const CODE_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Длина генерируемого кода */
const CODE_LENGTH = 7;

/**
 * Генерация случайного короткого кода.
 * @returns {string} Уникальный код длиной CODE_LENGTH символов
 */
function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[idx];
  }
  return code;
}

/**
 * Генерация уникального кода (с проверкой коллизий).
 * @param {import('better-sqlite3').Database} db - Экземпляр БД
 * @returns {string} Уникальный код
 */
function generateUniqueCode(db) {
  let code;
  let attempts = 0;

  do {
    code = generateCode();
    attempts++;
    if (attempts > 20) {
      throw new Error(
        'Не удалось сгенерировать уникальный код за 20 попыток'
      );
    }
  } while (
    db.prepare('SELECT 1 FROM short_links WHERE code = ?').get(code)
  );

  return code;
}

/**
 * Форматирование строки БД в объект ссылки.
 * @param {object} row - Строка из SQLite
 * @returns {object} Отформатированная ссылка
 */
function formatLink(row) {
  return {
    id: row.id,
    code: row.code,
    targetUrl: row.target_url,
    title: row.title,
    clicks: row.clicks,
    createdBy: row.created_by,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    shortUrl: `/s/${row.code}`,
  };
}

/**
 * Создание новой сокращённой ссылки.
 * @param {{
 *   targetUrl: string,
 *   title?: string,
 *   createdBy?: string,
 *   expiresAt?: number|null,
 *   customCode?: string
 * }} data - Данные ссылки
 * @returns {object} Созданная ссылка
 */
export function createShortLink(data) {
  const db = getDatabase();
  const now = Date.now();
  const code = data.customCode || generateUniqueCode(db);

  db.prepare(`
    INSERT INTO short_links (
      code, target_url, title,
      created_by, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    code,
    data.targetUrl,
    data.title || '',
    data.createdBy || null,
    now,
    data.expiresAt || null,
  );

  const row = db
    .prepare('SELECT * FROM short_links WHERE code = ?')
    .get(code);

  return formatLink(row);
}

/**
 * Получение ссылки по короткому коду.
 * @param {string} code - Короткий код
 * @returns {object|null} Ссылка или null
 */
export function getShortLinkByCode(code) {
  const db = getDatabase();
  const row = db
    .prepare(
      'SELECT * FROM short_links WHERE code = ? AND is_active = 1'
    )
    .get(code);

  if (!row) return null;

  // Проверка срока действия
  if (row.expires_at && row.expires_at < Date.now()) {
    return null;
  }

  return formatLink(row);
}

/**
 * Инкремент счётчика кликов по ссылке.
 * @param {number} linkId - ID ссылки
 */
export function incrementLinkClicks(linkId) {
  const db = getDatabase();
  db.prepare(
    'UPDATE short_links SET clicks = clicks + 1 WHERE id = ?'
  ).run(linkId);
}

/**
 * Запись клика по ссылке в аналитику.
 * @param {{
 *   linkId: number,
 *   ipHash: string,
 *   referrer?: string,
 *   userAgent?: string
 * }} data - Данные клика
 */
export function recordLinkClick(data) {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO link_clicks (
      link_id, ip_hash, referrer, user_agent, clicked_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    data.linkId,
    data.ipHash,
    data.referrer || '',
    data.userAgent || '',
    Date.now(),
  );
}

/**
 * Получение всех сокращённых ссылок (для админки).
 * @param {{
 *   limit?: number,
 *   offset?: number,
 *   search?: string
 * }} options - Параметры выборки
 * @returns {object[]} Массив ссылок
 */
export function getAllShortLinks(options = {}) {
  const db = getDatabase();
  const { limit = 50, offset = 0, search = '' } = options;

  let query =
    'SELECT * FROM short_links';
  const params = [];

  if (search) {
    query +=
      ' WHERE (title LIKE ? OR target_url LIKE ? OR code LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params).map(formatLink);
}

/**
 * Получение общего количества ссылок.
 * @returns {number} Количество ссылок
 */
export function getShortLinksCount() {
  const db = getDatabase();
  const row = db
    .prepare('SELECT COUNT(*) as cnt FROM short_links')
    .get();
  return row.cnt;
}

/**
 * Обновление сокращённой ссылки.
 * @param {number} id - ID ссылки
 * @param {{
 *   targetUrl?: string,
 *   title?: string,
 *   isActive?: boolean,
 *   expiresAt?: number|null
 * }} data - Обновляемые поля
 * @returns {object|null} Обновлённая ссылка
 */
export function updateShortLink(id, data) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  if (data.targetUrl !== undefined) {
    fields.push('target_url = ?');
    values.push(data.targetUrl);
  }
  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(data.isActive ? 1 : 0);
  }
  if (data.expiresAt !== undefined) {
    fields.push('expires_at = ?');
    values.push(data.expiresAt);
  }

  if (fields.length === 0) {
    const row = db
      .prepare('SELECT * FROM short_links WHERE id = ?')
      .get(id);
    return row ? formatLink(row) : null;
  }

  values.push(id);
  db.prepare(
    `UPDATE short_links SET ${fields.join(', ')} WHERE id = ?`
  ).run(...values);

  const row = db
    .prepare('SELECT * FROM short_links WHERE id = ?')
    .get(id);
  return row ? formatLink(row) : null;
}

/**
 * Удаление сокращённой ссылки.
 * @param {number} id - ID ссылки
 * @returns {boolean} Успешность удаления
 */
export function deleteShortLink(id) {
  const db = getDatabase();
  const result = db
    .prepare('DELETE FROM short_links WHERE id = ?')
    .run(id);
  return result.changes > 0;
}

/**
 * Получение статистики кликов по ссылке за последние N дней.
 * @param {number} linkId - ID ссылки
 * @param {number} days - Количество дней
 * @returns {object[]} Статистика по дням
 */
export function getLinkClickStats(linkId, days = 7) {
  const db = getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  return db.prepare(`
    SELECT
      date(clicked_at / 1000, 'unixepoch') as day,
      COUNT(*) as clicks
    FROM link_clicks
    WHERE link_id = ? AND clicked_at >= ?
    GROUP BY day
    ORDER BY day ASC
  `).all(linkId, since);
}
