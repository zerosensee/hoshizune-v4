/**
 * Константы приложения Hoshizune Bio.
 * Статусы онлайн, лимиты загрузки, дефолтные значения.
 */

/** Допустимые статусы пользователя */
export const USER_STATUSES = {
  ONLINE: 'online',
  INACTIVE: 'inactive',
  DND: 'dnd',
  INVISIBLE: 'invisible',
};

/** Отображаемые названия статусов */
export const STATUS_LABELS = {
  [USER_STATUSES.ONLINE]: 'В сети',
  [USER_STATUSES.INACTIVE]: 'Неактивен',
  [USER_STATUSES.DND]: 'Не беспокоить',
  [USER_STATUSES.INVISIBLE]: 'Невидимка',
};

/** Цвета индикаторов статусов */
export const STATUS_COLORS = {
  [USER_STATUSES.ONLINE]: '#4ade80',
  [USER_STATUSES.INACTIVE]: '#facc15',
  [USER_STATUSES.DND]: '#f87171',
  [USER_STATUSES.INVISIBLE]: '#6b7280',
  offline: '#6b7280',
};

/** Таймаут heartbeat — после него пользователь оффлайн (мс) */
export const HEARTBEAT_TIMEOUT_MS = 60_000;

/** Интервал отправки heartbeat с клиента (мс) */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Максимальный размер аватара (байт) — 20 МБ */
export const MAX_AVATAR_SIZE = 20 * 1024 * 1024;

/** Допустимые MIME-типы для аватара */
export const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** Slug владельца сайта */
export const OWNER_SLUG = 'hoshizune';

/** Accent-цвет по умолчанию */
export const DEFAULT_ACCENT = '#ffffff';
