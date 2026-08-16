/**
 * Репозиторий для работы с ролями, титулами и правами доступа (Permissions).
 * Поддерживает системные роли (owner, admin, support, user) и пользовательские титулы (VIP, Вайбкодер и т.д.).
 */
import { getDatabase } from './database';

/**
 * Перечень всех доступных системных прав для ролей в админ-панели
 */
export const AVAILABLE_PERMISSIONS = [
  { id: 'access_admin', label: 'Доступ в админ-панель', description: 'Разрешает вход в панель управления' },
  { id: 'manage_profiles', label: 'Управление профилями', description: 'Редактирование профилей, био и уровней' },
  { id: 'manage_comments', label: 'Модерация отзывов', description: 'Редактирование и удаление комментариев/оценок' },
  { id: 'manage_credentials', label: 'Учётные данные', description: 'Изменение email адресов и сброс паролей' },
  { id: 'manage_links', label: 'Управление ссылками', description: 'Сокращение и модерация коротких URL' },
  { id: 'manage_roles', label: 'Управление ролями (Owner)', description: 'Настройка прав ролей и выдача титулов' },
  { id: 'view_analytics', label: 'Просмотр аналитики', description: 'Доступ к графикам и логам просмотров' },
  { id: 'manage_settings', label: 'Настройки сайта', description: 'Изменение глобальных конфигураций сайта' },
];

/**
 * Получить список всех ролей и титулов из базы.
 * @returns {object[]} Массив ролей
 */
export function getAllRoles() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM roles ORDER BY sort_order ASC, created_at ASC').all();

  return rows.map((r, idx) => {
    let permissions = [];
    try {
      permissions = JSON.parse(r.permissions || '[]');
    } catch {
      permissions = [];
    }
    return {
      id: r.id,
      name: r.name,
      color: r.color || '#4ade80',
      badgeText: r.badge_text || r.id.toUpperCase(),
      isSystem: !!r.is_system,
      sortOrder: r.sort_order ?? idx,
      permissions,
      hasAdminAccess: permissions.includes('access_admin'),
      createdAt: r.created_at,
    };
  });
}

/**
 * Изменение порядка иерархии ролей и титулов.
 * @param {string[]} orderedIds - Список ID ролей/титулов по порядку иерархии
 */
export function updateRolesOrder(orderedIds) {
  if (!Array.isArray(orderedIds)) return false;
  const db = getDatabase();
  const stmt = db.prepare('UPDATE roles SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction((ids) => {
    ids.forEach((id, index) => {
      stmt.run(index, id);
    });
  });
  transaction(orderedIds);
  return true;
}

/**
 * Получить роль по ее ID.
 * @param {string} roleId
 * @returns {object|null}
 */
export function getRoleById(roleId) {
  if (!roleId) return null;
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
  if (!row) return null;

  let permissions = [];
  try { permissions = JSON.parse(row.permissions || '[]'); } catch {}

  return {
    id: row.id,
    name: row.name,
    color: row.color || '#4ade80',
    badgeText: row.badge_text || row.id.toUpperCase(),
    isSystem: !!row.is_system,
    permissions,
    hasAdminAccess: permissions.includes('access_admin'),
    createdAt: row.created_at,
  };
}

/**
 * Создать новую роль или кастомный титул.
 */
export function createRole({ id, name, color, badgeText, isSystem = false, permissions = [] }) {
  const db = getDatabase();
  const slug = (id || name).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const now = Date.now();

  const existing = db.prepare('SELECT id FROM roles WHERE id = ?').get(slug);
  if (existing) {
    throw new Error('Роль с таким ID уже существует');
  }

  const sysVal = isSystem ? 1 : 0;

  db.prepare(`
    INSERT INTO roles (id, name, color, badge_text, is_system, permissions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug,
    name.trim(),
    color || '#4ade80',
    (badgeText || slug).toUpperCase().trim(),
    sysVal,
    JSON.stringify(permissions),
    now
  );

  return getRoleById(slug);
}

/**
 * Обновить параметры или права роли/титула.
 */
export function updateRole(roleId, { name, color, badgeText, isSystem, permissions }) {
  const db = getDatabase();
  const existing = getRoleById(roleId);
  if (!existing) {
    throw new Error('Роль не найдена');
  }

  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name.trim());
  }
  if (color !== undefined) {
    fields.push('color = ?');
    values.push(color);
  }
  if (badgeText !== undefined) {
    fields.push('badge_text = ?');
    values.push(badgeText.toUpperCase().trim());
  }
  if (isSystem !== undefined) {
    fields.push('is_system = ?');
    values.push(isSystem ? 1 : 0);
  }
  if (permissions !== undefined) {
    fields.push('permissions = ?');
    values.push(JSON.stringify(permissions));
  }

  if (fields.length > 0) {
    values.push(roleId);
    db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getRoleById(roleId);
}

/**
 * Удалить кастомный титул/роль (системные удалить нельзя).
 */
export function deleteRole(roleId) {
  const db = getDatabase();
  const role = getRoleById(roleId);
  if (!role) return false;
  if (role.isSystem) {
    throw new Error('Нельзя удалить системную роль (owner, admin, support, user)');
  }

  db.prepare('DELETE FROM roles WHERE id = ?').run(roleId);
  return true;
}

/**
 * Проверка наличия права permissionName у пользователя.
 */
export function hasUserPermission(user, permissionName) {
  if (!user) return false;
  if (user.role === 'owner') return true;

  const role = getRoleById(user.role);
  if (!role) return false;

  return role.permissions.includes(permissionName);
}
