/**
 * Proxy (Next.js 16) — защита админки по IP и cookie-сессии.
 * Перехватывает запросы к /admin/* и /api/admin/*.
 * Разрешает доступ только с локальных IP и из вайтлиста,
 * а для защищённых маршрутов требует наличия валидной cookie-сессии.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Параметры сессии из конфига (хардкод для proxy — импорт JSON недоступен).
 * Должны совпадать с admin-config.json.
 */
const SESSION_COOKIE_NAME = 'hoshizune_admin_session';
const SESSION_SECRET = 'hoshi_secret_session_key_v4_2024';
const SESSION_MAX_AGE_MS = 30 * 86400 * 1000; // 30 дней

const USER_SESSION_COOKIE_NAME = 'hoshizune_user_session';
const USER_SESSION_SECRET = 'hoshizune_user_session_secret_key_v4_2026';

function validateUserSessionToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [userId, timestamp, hmac] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  if (Date.now() - ts > SESSION_MAX_AGE_MS) return false;

  const payload = `${userId}:${timestamp}`;
  const expectedHmac = crypto
    .createHmac('sha256', USER_SESSION_SECRET)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(expectedHmac, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Получение реального IP из заголовков запроса.
 * Учитывает прокси-серверы (nginx, Cloudflare и т.д.)
 * @param {import('next/server').NextRequest} request - Входящий запрос
 * @returns {string} IP-адрес клиента
 */
function getClientIp(request) {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Проверка, является ли IP локальным (LAN/loopback).
 * @param {string} ip - IP-адрес
 * @returns {boolean} True если IP локальный
 */
function isLocalIp(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true;
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;

  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return true;
  }

  return false;
}

/**
 * Вайтлист разрешённых IP для доступа к админке.
 * При деплое на VPS — добавьте свой внешний IP.
 */
const ALLOWED_IPS = ['127.0.0.1', '::1'];

/**
 * Проверка IP на допустимость для доступа к админке.
 * @param {string} ip - IP-адрес клиента
 * @returns {boolean} True если доступ разрешён
 */
function isAdminIpAllowed(ip) {
  // Отключено по требованию пользователя — сейчас IP проверка не требуется
  return true;
}

/**
 * Проверка валидности сессионного cookie.
 * Логика зеркалирует lib/admin-auth.js для использования в proxy.
 * @param {string|undefined} token - Значение cookie
 * @returns {boolean} True если сессия валидна
 */
function validateSessionToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split(':');
  if (parts.length !== 2) return false;

  const [timestamp, hmac] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  // Проверка срока действия сессии
  if (Date.now() - ts > SESSION_MAX_AGE_MS) return false;

  // Проверка HMAC-подписи
  const expectedHmac = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(timestamp)
    .digest('hex');

  // Защита от timing-атак — сравниваем буферы одинаковой длины
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(expectedHmac, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Формирование HTML-страницы 403 Forbidden в терминальном стиле.
 * @returns {string} HTML-разметка
 */
function build403Html() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 — Доступ запрещён | Hoshizune</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      background:#000000;color:#ffffff;
      font-family:'Courier New',monospace;
      display:flex;align-items:center;justify-content:center;
      min-height:100vh;
    }
    .box{
      border:1px solid #262626;
      padding:2rem 3rem;text-align:center;
      background:#000000;
      box-shadow:0 0 40px rgba(255,255,255,0.05);
    }
    .code{font-size:4rem;font-weight:bold;color:#f87171;}
    .msg{margin-top:1rem;color:#737373;font-size:.9rem;}
    .prompt{margin-top:2rem;color:rgba(255,255,255,0.5);}
  </style>
</head>
<body>
  <div class="box">
    <div class="code">403</div>
    <div class="msg">Доступ запрещён. Ваш IP не в списке разрешённых.</div>
    <div class="prompt">$ access denied from unauthorized origin</div>
  </div>
</body>
</html>`;
}

/**
 * Маршруты внутри /admin/*, не требующие cookie-авторизации.
 * IP-проверка всё равно применяется ко всем.
 */
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/api/admin/auth'];

/**
 * Основная функция proxy — точка входа Next.js 16.
 * Порядок проверок:
 * 1. Если не admin-маршрут — пропустить.
 * 2. Проверка IP — 403 если не в вайтлисте.
 * 3. Если публичный admin-маршрут (login) — пропустить.
 * 4. Проверка cookie-сессии — редирект на login если невалидна.
 *
 * @param {import('next/server').NextRequest} request - Входящий запрос
 * @returns {NextResponse} Ответ или пропуск запроса дальше
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Шаг 1: Проверяем только маршруты /admin/* и /api/admin/*
  const isAdminRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin');

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // Шаг 2: IP-вайтлист
  const clientIp = getClientIp(request);

  if (!isAdminIpAllowed(clientIp)) {
    return new NextResponse(build403Html(), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Шаг 3: Публичные admin-маршруты не требуют cookie
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isPublicAdminPath) {
    return NextResponse.next();
  }

  // Шаг 4: Проверка cookie-сессии для защищённых маршрутов
  const adminToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userToken = request.cookies.get(USER_SESSION_COOKIE_NAME)?.value;

  const isAuthorized =
    validateSessionToken(adminToken) || validateUserSessionToken(userToken);

  if (!isAuthorized) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
