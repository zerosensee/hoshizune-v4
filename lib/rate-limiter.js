/**
 * Модуль Rate Limiting и временных блокировок (Lockout) для Hoshizune v4.
 * Защищает критические эндпоинты (логин, админка, регистрация, сокращатель ссылок).
 */

const attemptsMap = new Map();
const lockoutsMap = new Map();

// Периодическая очистка устаревших записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [key, exp] of lockoutsMap.entries()) {
    if (exp <= now) lockoutsMap.delete(key);
  }
  for (const [key, record] of attemptsMap.entries()) {
    if (record.resetAt <= now) attemptsMap.delete(key);
  }
}, 5 * 60 * 1000).unref();

/**
 * Проверка и регистрация попытки с лимитом частоты.
 * @param {string} key - Уникальный ключ (например 'login:127.0.0.1:user@example.com')
 * @param {object} options
 * @param {number} options.maxAttempts - Максимальное количество попыток за окно
 * @param {number} options.windowMs - Размер окна в миллисекундах
 * @param {number} [options.lockoutMs] - Длительность блокировки при превышении (опционально)
 * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
 */
export function checkRateLimit(key, { maxAttempts, windowMs, lockoutMs = 0 }) {
  const now = Date.now();

  // 1. Проверяем активную блокировку
  const lockoutUntil = lockoutsMap.get(key);
  if (lockoutUntil && lockoutUntil > now) {
    const retryAfterSeconds = Math.ceil((lockoutUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      isLocked: true,
    };
  }

  // 2. Получаем или инициализируем счетчик
  let record = attemptsMap.get(key);
  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + windowMs };
    attemptsMap.set(key, record);
  }

  record.count += 1;

  // 3. Если лимит превышен
  if (record.count > maxAttempts) {
    if (lockoutMs > 0) {
      lockoutsMap.set(key, now + lockoutMs);
      const retryAfterSeconds = Math.ceil(lockoutMs / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        isLocked: true,
      };
    }

    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      isLocked: false,
    };
  }

  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    retryAfterSeconds: 0,
    isLocked: false,
  };
}

/**
 * Сброс счетчика попыток (при успешной авторизации).
 * @param {string} key - Ключ
 */
export function resetRateLimit(key) {
  attemptsMap.delete(key);
  lockoutsMap.delete(key);
}

/**
 * Извлечение безопасного IP клиента из заголовков запроса.
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return '127.0.0.1';
}
