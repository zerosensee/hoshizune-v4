/**
 * Модуль весовой иерархии ролей и титулов Hoshizune v4.
 * Гарантирует единый порядок отображения ролей от старшей к младшей
 * (Owner > Admin > Support > VIP > User) во всей системе.
 */

export const ROLE_HIERARCHY_WEIGHTS = {
  owner: 100,
  admin: 90,
  administrator: 90,
  support: 80,
  moderator: 80,
  vip: 50,
  premium: 50,
  user: 10,
};

/**
 * Получить численный вес роли для сортировки.
 * @param {string|object} role - ID роли или объект роли
 * @returns {number} Численный вес
 */
export function getRoleWeight(role) {
  if (!role) return 0;
  const roleId = (typeof role === 'string' ? role : role.id || role.name || '').toLowerCase();
  return ROLE_HIERARCHY_WEIGHTS[roleId] ?? 20;
}

/**
 * Отсортировать список ролей по весу (старшая роль идет первой).
 * @param {Array<string|object>} roles - Массив ролей
 * @returns {Array<string|object>} Отсортированный массив ролей
 */
export function sortRolesByHierarchy(roles) {
  if (!Array.isArray(roles)) return [];
  const uniqueRoles = Array.from(new Set(roles));
  return uniqueRoles.sort((a, b) => getRoleWeight(b) - getRoleWeight(a));
}

/**
 * Получить наивысшую (первичную) роль пользователя.
 * @param {Array<string|object>} roles - Массив ролей
 * @returns {string} ID старшей роли
 */
export function getPrimaryRole(roles) {
  const sorted = sortRolesByHierarchy(roles);
  return (typeof sorted[0] === 'string' ? sorted[0] : sorted[0]?.id) || 'user';
}
