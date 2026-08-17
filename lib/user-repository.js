/**
 * Репозиторий для работы с пользователями и их email-адресами в SQLite.
 * Поддерживает привязку до 3 почт на аккаунт (1 реальная, 2 виртуальные).
 */
import { getDatabase } from './database';
import crypto from 'crypto';
import { sortRolesByHierarchy, getPrimaryRole } from './role-utils';

/**
 * Создание хеша пароля с использованием pbkdf2.
 * @param {string} password - Открытый пароль
 * @returns {string} Форматированная строка хеша
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

/**
 * Проверка совпадения пароля.
 * @param {string} password - Открытый пароль
 * @param {string} storedHash - Сохранённый хеш из БД
 * @returns {boolean} True если пароль верный
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('pbkdf2:')) return false;

  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;

  const [, salt, hash] = parts;
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(verifyHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Получение пользователя по email-адресу.
 * @param {string} email - Почта (основная или виртуальная)
 * @returns {object|null} Объект пользователя или null
 */
export function getUserByEmail(email) {
  if (!email) return null;
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  const row = db
    .prepare(`
      SELECT u.*
      FROM users u
      JOIN user_emails e ON u.id = e.user_id
      WHERE LOWER(e.email) = ?
    `)
    .get(normalizedEmail);

  if (!row) return null;
  return formatUser(row);
}

/**
 * Получение пользователя по ID.
 * @param {string} userId - Идентификатор пользователя
 * @returns {object|null} Объект пользователя или null
 */
export function getUserById(userId) {
  if (!userId) return null;
  const db = getDatabase();

  const row = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(userId);

  if (!row) return null;
  return formatUser(row);
}

/**
 * Получение всех привязанных email пользователя (до 3 шт).
 * @param {string} userId - Идентификатор пользователя
 * @returns {object[]} Массив объектов email
 */
export function getUserEmails(userId) {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM user_emails WHERE user_id = ? ORDER BY is_primary DESC')
    .all(userId);

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    isPrimary: !!r.is_primary,
    isVirtual: !!r.is_virtual,
    createdAt: r.created_at,
  }));
}

/**
 * Создание нового пользователя с базовым email.
 * @param {object} params
 * @param {string} params.email - Основной email
 * @param {string} params.password - Пароль
 * @param {string} params.displayName - Отображаемое имя
 * @returns {object} Созданный пользователь
 */
export function createUser({ email, password, displayName }) {
  const db = getDatabase();
  const now = Date.now();
  const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
  const passwordHash = hashPassword(password);
  const normalizedEmail = email.trim().toLowerCase();

  // Проверка на существующий email
  const existingEmail = db
    .prepare('SELECT id FROM user_emails WHERE LOWER(email) = ?')
    .get(normalizedEmail);

  if (existingEmail) {
    throw new Error('Данная почта уже зарегистрирована');
  }

  // Админские почты автоматически получают is_admin = 1
  const adminEmails = ['awianfaip@gmail.com', 'founder@hoshizune.space'];
  const isAdmin = (adminEmails.includes(normalizedEmail) || (displayName && displayName.toLowerCase() === 'zerosense')) ? 1 : 0;
  // Все создаваемые пользователи сразу подтверждены (без 2FA кода)
  const isVerified = 1;

  const accountToken = `htk_${crypto.randomBytes(16).toString('hex')}`;

  db.prepare(`
    INSERT INTO users (id, account_token, display_name, password_hash, is_admin, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, accountToken, displayName || 'Пользователь', passwordHash, isAdmin, isVerified, now, now);

  db.prepare(`
    INSERT INTO user_emails (user_id, email, is_primary, is_virtual, created_at)
    VALUES (?, ?, 1, 0, ?)
  `).run(userId, normalizedEmail, now);

  // Авто-создание базового профиля для мгновенного отображения в админке
  try {
    const profileId = `profile_${userId}`;
    let baseSlug = (displayName || 'user')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '');
    if (!baseSlug || baseSlug.length < 2) {
      baseSlug = `user_${userId.slice(-6)}`;
    }

    const existingSlug = db.prepare('SELECT id FROM profiles WHERE slug = ?').get(baseSlug);
    if (existingSlug && existingSlug.id !== profileId) {
      baseSlug = `${baseSlug}_${userId.slice(-4)}`;
    }

    db.prepare(`
      INSERT OR IGNORE INTO profiles (
        id, user_id, display_name, slug, bio_text, is_owner, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'Пользователь зарегистрирован на платформе', ?, ?, ?)
    `).run(profileId, userId, displayName || 'Пользователь', baseSlug, isAdmin ? 1 : 0, now, now);
  } catch (err) {
    console.error('[createUser] Ошибка автоматического создания профиля:', err);
  }

  return getUserById(userId);
}

/**
 * Добавление доп. email к пользователю (максимум 3).
 * @param {string} userId - ID пользователя
 * @param {string} email - Добавляемый email
 * @param {boolean} isVirtual - Является ли виртуальным
 * @returns {object} Информация о добавленной почте
 */
export function addEmailToUser(userId, email, isVirtual = false) {
  const db = getDatabase();
  const emails = getUserEmails(userId);

  if (emails.length >= 3) {
    throw new Error('К аккаунту можно привязать не более 3 email-адресов');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO user_emails (user_id, email, is_primary, is_virtual, created_at)
    VALUES (?, ?, 0, ?, ?)
  `).run(userId, normalizedEmail, isVirtual ? 1 : 0, now);

  return {
    email: normalizedEmail,
    isPrimary: false,
    isVirtual: !!isVirtual,
    createdAt: now,
  };
}

/**
 * Обновление пароля пользователя.
 * @param {string} userId - Идентификатор пользователя
 * @param {string} newPassword - Новый пароль
 */
export function updateUserPassword(userId, newPassword) {
  const db = getDatabase();
  const passwordHash = hashPassword(newPassword);
  const now = Date.now();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(passwordHash, now, userId);
}


/**
 * Обновление ролей и титулов пользователя (доступно только владельцу owner).
 * @param {string} userId - ID пользователя
 * @param {string} newRole - Запасная единичная роль
 * @param {string} [titleId] - Запасной единичный титул
 * @param {string[]} [roles] - Массив системных ролей
 * @param {string[]} [titles] - Массив косметических титулов
 */
export function updateUserRole(userId, newRole, titleId = null, roles = null, titles = null) {
  const db = getDatabase();
  const existingUser = getUserById(userId);

  let rawRoles = Array.isArray(roles) && roles.length > 0 ? roles : (newRole ? [newRole] : ['user']);

  // Блокировка понижения роли: Если аккаунт является Owner, роль 'owner' запрещено удалять или понижать
  const isOwnerUser = existingUser && (
    existingUser.role === 'owner' ||
    (Array.isArray(existingUser.roles) && existingUser.roles.includes('owner')) ||
    (existingUser.displayName && existingUser.displayName.toLowerCase() === 'zerosense') ||
    (existingUser.email && existingUser.email.toLowerCase() === 'awianfaip@gmail.com')
  );

  if (isOwnerUser && !rawRoles.includes('owner')) {
    rawRoles.unshift('owner');
  }

  const finalRoles = sortRolesByHierarchy(rawRoles);
  const finalTitles = Array.isArray(titles) ? titles : (titleId ? [titleId] : []);

  const primaryRole = getPrimaryRole(finalRoles);
  const primaryTitle = finalTitles[0] || null;

  const isAdmin = finalRoles.some((r) => ['owner', 'admin', 'support'].includes(r)) ? 1 : 0;
  const now = Date.now();

  db.prepare(`
    UPDATE users
    SET role = ?, title_id = ?, roles_json = ?, titles_json = ?, is_admin = ?, updated_at = ?
    WHERE id = ?
  `).run(
    primaryRole,
    primaryTitle,
    JSON.stringify(finalRoles),
    JSON.stringify(finalTitles),
    isAdmin,
    now,
    userId
  );

  return getUserById(userId);
}

/**
 * Форматирование записи пользователя с привязанными почтами, ролями и титулами.
 * @param {object} row - Строка из таблицы users
 * @returns {object} Объект пользователя
 */
function formatUser(row) {
  const emails = getUserEmails(row.id);
  const primaryEmail = emails.find((e) => e.isPrimary)?.email || emails[0]?.email || '';

  let roles = [];
  try {
    roles = JSON.parse(row.roles_json || '[]');
  } catch {
    roles = [];
  }
  if (!Array.isArray(roles) || roles.length === 0) {
    roles = [row.role || (row.is_admin ? 'admin' : 'user')];
  }
  roles = sortRolesByHierarchy(roles);

  let titles = [];
  try {
    titles = JSON.parse(row.titles_json || '[]');
  } catch {
    titles = [];
  }
  if (!Array.isArray(titles) || titles.length === 0) {
    if (row.title_id) titles = [row.title_id];
  }

  const role = getPrimaryRole(roles);
  const titleId = titles[0] || null;

  return {
    id: row.id,
    accountToken: row.account_token || null,
    displayName: row.display_name,
    role,
    titleId,
    roles,
    titles,
    isOwner: roles.includes('owner') || role === 'owner',
    isAdmin: roles.some((r) => ['owner', 'admin'].includes(r)) || !!row.is_admin,
    isSupport: roles.some((r) => ['owner', 'admin', 'support'].includes(r)),
    isVerified: !!row.is_verified,
    level: row.level || 1,
    primaryEmail,
    email: primaryEmail,
    emails,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
