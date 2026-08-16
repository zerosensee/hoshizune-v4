/**
 * Репозиторий для работы с профилями (bio) в SQLite.
 * Полный набор CRUD-операций, heartbeat, просмотры, комментарии.
 */
import { getDatabase } from './database';
import {
  HEARTBEAT_TIMEOUT_MS,
  USER_STATUSES,
} from './constants';
import { getRoleById } from './role-repository';
import { sortRolesByHierarchy, getPrimaryRole } from './role-utils';

/**
 * Получение профиля по slug.
 * @param {string} slug - Уникальный slug профиля
 * @returns {object|null} Профиль или null
 */
export function getProfileBySlug(slug) {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM profiles WHERE slug = ?')
    .get(slug);

  if (!row) return null;

  return formatProfile(row);
}

/**
 * Получение профиля по ID пользователя или профиля.
 * @param {string} userId - UUID пользователя/профиля
 * @returns {object|null} Профиль или null
 */
export function getProfileById(userId) {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM profiles WHERE id = ? OR user_id = ?')
    .get(userId, userId);

  if (!row) return null;

  return formatProfile(row);
}

/**
 * Получение профиля владельца сайта.
 * @returns {object|null} Профиль владельца или null
 */
export function getOwnerProfile() {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM profiles WHERE is_owner = 1')
    .get();

  if (!row) return null;

  return formatProfile(row);
}

/**
 * Проверка существования slug.
 * @param {string} slug - Проверяемый slug
 * @returns {boolean} Существует ли slug
 */
export function slugExists(slug) {
  const db = getDatabase();
  const row = db
    .prepare('SELECT 1 FROM profiles WHERE slug = ?')
    .get(slug);

  return !!row;
}

/**
 * Создание нового профиля.
 * @param {object} data - Данные профиля
 * @returns {object} Созданный профиль
 */
export function createProfile(data) {
  const db = getDatabase();
  const now = Date.now();
  const id = data.id || `profile-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const userId = data.userId || id;

  db.prepare(`
    INSERT INTO profiles (
      id, user_id, slug, display_name, bio_text, avatar_path,
      accent_color, links, status, last_seen, view_count,
      is_owner, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.slug,
    data.displayName,
    data.bioText || '',
    data.avatarPath || null,
    data.accentColor || '#4ade80',
    JSON.stringify(data.links || []),
    data.status || 'online',
    now,
    0,
    data.isOwner ? 1 : 0,
    now,
    now
  );

  return getProfileBySlug(data.slug);
}

/**
 * Обновление профиля по ID.
 * @param {string} id - ID профиля
 * @param {object} data - Обновляемые поля
 * @returns {object|null} Обновлённый профиль
 */
export function updateProfile(id, data) {
  const db = getDatabase();
  const now = Date.now();
  const fields = [];
  const values = [];

  if (data.displayName !== undefined) {
    fields.push('display_name = ?');
    values.push(data.displayName);
  }
  if (data.bioText !== undefined) {
    fields.push('bio_text = ?');
    values.push(data.bioText);
  }
  if (data.avatarPath !== undefined) {
    fields.push('avatar_path = ?');
    values.push(data.avatarPath);
  }
  if (data.accentColor !== undefined) {
    fields.push('accent_color = ?');
    values.push(data.accentColor);
  }
  if (data.links !== undefined) {
    fields.push('links = ?');
    values.push(JSON.stringify(data.links));
  }
  if (data.slug !== undefined) {
    fields.push('slug = ?');
    values.push(data.slug);
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.level !== undefined) {
    let lvl = parseInt(data.level, 10) || 1;
    if (lvl > 999) lvl = 999;
    if (lvl < 1) lvl = 1;
    fields.push('level = ?');
    values.push(lvl);

    try {
      const pRow = db.prepare('SELECT user_id FROM profiles WHERE id = ?').get(id);
      const targetUserId = pRow?.user_id || id;
      db.prepare('UPDATE users SET level = ? WHERE id = ?').run(lvl, targetUserId);
    } catch {
      // Игнорируем ошибки при синхронизации таблицы users
    }
  }
  if (data.viewCount !== undefined) {
    let vc = parseInt(data.viewCount, 10) || 0;
    if (vc > 999999) vc = 999999;
    if (vc < 0) vc = 0;
    fields.push('view_count = ?');
    values.push(vc);
  }

  if (fields.length === 0) {
    return getProfileById(id);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`
    UPDATE profiles SET ${fields.join(', ')} WHERE id = ?
  `).run(...values);

  return getProfileById(id);
}

/**
 * Удаление профиля по ID.
 * @param {string} id - ID профиля
 * @returns {boolean} Успешность удаления
 */
export function deleteProfile(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM profiles WHERE id = ? AND is_owner = 0').run(id);
  return result.changes > 0;
}

/**
 * Обновление времени активности (heartbeat).
 * @param {string} id - ID профиля
 */
export function updateHeartbeat(id) {
  const db = getDatabase();
  const now = Date.now();
  db.prepare('UPDATE profiles SET last_seen = ? WHERE id = ?').run(now, id);
}

/**
 * Инкремент счётчика просмотров профиля.
 * @param {string} slug - Slug профиля
 */
export function incrementViewCount(slug) {
  const db = getDatabase();
  db.prepare('UPDATE profiles SET view_count = view_count + 1 WHERE slug = ?').run(slug);
}

/**
 * Получение списка всех профилей с привязанными e-mail адресами.
 * @returns {object[]} Массив профилей
 */
export function getAllProfiles() {
  const db = getDatabase();
  const rows = db
    .prepare(`
      SELECT p.*,
        COALESCE(u.role, CASE WHEN p.is_owner = 1 THEN 'owner' ELSE 'user' END) as user_role,
        COALESCE(
          ue1.email,
          ue2.email,
          ue3.email
        ) as user_email
      FROM profiles p
      LEFT JOIN users u ON u.id = p.user_id OR LOWER(u.display_name) = LOWER(p.display_name) OR LOWER(u.display_name) = LOWER(p.slug)
      LEFT JOIN user_emails ue1 ON (ue1.user_id = p.user_id OR ue1.user_id = p.id) AND ue1.is_primary = 1
      LEFT JOIN user_emails ue2 ON ue2.user_id = u.id AND ue2.is_primary = 1
      LEFT JOIN user_emails ue3 ON ue3.user_id = p.id
      ORDER BY p.created_at DESC
    `)
    .all();

  return rows.map((row) => {
    let role = row.user_role || 'user';
    if (row.is_owner || (row.slug && row.slug.toLowerCase() === 'hoshizune')) {
      role = 'owner';
    }
    return {
      ...formatProfile(row),
      role,
      userEmail:
        row.user_email ||
        (row.is_owner ? 'awianfaip@gmail.com' : `${row.slug}@hoshizune.space`),
    };
  });
}

/**
 * Добавление комментария к профилю.
 * @param {object} data - Данные комментария
 * @returns {object} Созданный комментарий
 */
export function addComment(data) {
  const db = getDatabase();
  const now = Date.now();

  const result = db.prepare(`
    INSERT INTO comments (
      profile_id, author_id, author_name,
      text, rating, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.profileId,
    data.authorId,
    data.authorName || 'Аноним',
    data.text,
    data.rating || 0,
    now
  );

  return {
    id: result.lastInsertRowid,
    profileId: data.profileId,
    authorId: data.authorId,
    authorName: data.authorName || 'Аноним',
    text: data.text,
    rating: data.rating || 0,
    createdAt: now,
  };
}

/**
 * Получение всех комментариев профиля.
 * @param {string} profileId - ID профиля
 * @returns {object[]} Массив комментариев
 */
export function getCommentsByProfileId(profileId) {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM comments WHERE profile_id = ? ORDER BY created_at DESC')
    .all(profileId);

  return rows.map((r) => ({
    id: r.id,
    profileId: r.profile_id,
    authorId: r.author_id,
    authorName: r.author_name,
    text: r.text,
    rating: r.rating,
    createdAt: r.created_at,
  }));
}

/**
 * Псевдоним getComments для обратной совместимости.
 */
export const getComments = getCommentsByProfileId;

/**
 * Вспомогательное форматирование строки базы данных в объект профиля.
 * @param {object} row - Строка из таблицы profiles
 * @returns {object} Сформатированный профиль
 */
function formatProfile(row) {
  const db = getDatabase();
  const now = Date.now();
  const isRecentlyOnline = now - row.last_seen < HEARTBEAT_TIMEOUT_MS;

  let effectiveStatus = row.status;
  if (row.status === USER_STATUSES.INVISIBLE) {
    effectiveStatus = 'offline';
  } else if (!isRecentlyOnline && row.status !== USER_STATUSES.DND) {
    effectiveStatus = 'offline';
  }

  let links = [];
  try {
    links = JSON.parse(row.links || '[]');
  } catch {
    links = [];
  }

  // Запрашиваем актуальные роли и титулы из таблицы users
  let userRow = null;
  const targetUserId = row.user_id || row.id;
  let userEmail = '';
  let accountToken = null;
  if (targetUserId) {
    try {
      userRow = db.prepare('SELECT role, title_id, roles_json, titles_json, level, account_token FROM users WHERE id = ?').get(targetUserId);
      accountToken = userRow?.account_token || null;
      const emailRow = db.prepare('SELECT email FROM user_emails WHERE user_id = ? ORDER BY is_primary DESC').get(targetUserId);
      if (emailRow) userEmail = emailRow.email;
    } catch {}
  }

  let userRoles = [];
  try {
    userRoles = JSON.parse(userRow?.roles_json || '[]');
  } catch {
    userRoles = [];
  }
  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    userRoles = [userRow?.role || (row.is_owner ? 'owner' : 'user')];
  }
  userRoles = sortRolesByHierarchy(userRoles);

  let userTitles = [];
  try {
    userTitles = JSON.parse(userRow?.titles_json || '[]');
  } catch {
    userTitles = [];
  }
  if (!Array.isArray(userTitles) || userTitles.length === 0) {
    const t = userRow?.title_id || row.title_id || row.custom_title;
    if (t) userTitles = [t];
  }

  const primaryRole = getPrimaryRole(userRoles);
  const primaryTitle = userTitles[0] || null;

  // Построение ролевых и косметических бейджей по иерархии
  const badges = [];
  const addedBadgeIds = new Set();

  // 1. Системные роли (Owner, Admin, Support)
  for (const rId of userRoles) {
    if (rId && rId !== 'user' && !addedBadgeIds.has(rId)) {
      const sysRole = getRoleById(rId);
      if (sysRole) {
        badges.push({
          id: sysRole.id,
          name: sysRole.name,
          badgeText: sysRole.badgeText,
          color: sysRole.color,
          type: 'role',
          isSystem: true,
        });
        addedBadgeIds.add(sysRole.id);
      }
    }
  }

  // 2. Косметические титулы (VIP, Вайбкодер и т.д.)
  for (const tId of userTitles) {
    if (tId && !addedBadgeIds.has(tId)) {
      const titleRole = getRoleById(tId);
      if (titleRole) {
        badges.push({
          id: titleRole.id,
          name: titleRole.name,
          badgeText: titleRole.badgeText,
          color: titleRole.color,
          type: 'title',
          isSystem: false,
        });
        addedBadgeIds.add(titleRole.id);
      }
    }
  }

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    bioText: row.bio_text,
    avatarPath: row.avatar_path,
    accentColor: row.accent_color,
    links,
    status: row.status,
    effectiveStatus,
    lastSeen: row.last_seen,
    viewCount: row.view_count,
    level: userRow?.level || row.level || 1,
    isOwner: !!row.is_owner || userRoles.includes('owner'),
    role: primaryRole,
    titleId: primaryTitle,
    roles: userRoles,
    titles: userTitles,
    badges,
    userId: targetUserId,
    userEmail,
    accountToken,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Редактирование комментария администратором.
 */
export function updateComment(id, text, rating) {
  const db = getDatabase();
  db.prepare('UPDATE comments SET text = ?, rating = ? WHERE id = ?').run(text, rating, id);
}

/**
 * Удаление комментария администратором.
 */
export function deleteCommentAdmin(id) {
  const db = getDatabase();
  db.prepare('DELETE FROM comments WHERE id = ?').run(id);
}
