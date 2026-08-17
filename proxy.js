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

import fs from 'fs';
import path from 'path';

/**
 * Чтение актуального конфига из admin-config.json для мгновенной проверки IP.
 */
function getAdminConfig() {
  try {
    const configPath = path.join(process.cwd(), 'admin-config.json');
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch {}
  return null;
}

/**
 * Проверка IP на допустимость для доступа к сайту и панелям.
 * @param {string} ip - IP-адрес клиента
 * @returns {boolean} True если доступ разрешён
 */
function isAdminIpAllowed(ip) {
  const config = getAdminConfig();
  const allowedIps = config?.allowedIps || ['*'];
  const allowLocalNetwork = config?.allowLocalNetwork !== false;

  // 1. Если в вайтлисте есть '*', доступ открыт для всех IP
  if (allowedIps.includes('*')) {
    return true;
  }

  // 2. Локальная сеть (127.0.0.1, ::1, 192.168.x.x, 10.x.x.x)
  if (allowLocalNetwork && isLocalIp(ip)) {
    return true;
  }

  // 3. Точная проверка IP-адреса по маске и значениям вайтлиста
  const cleanClientIp = (ip || '').trim().toLowerCase();
  return allowedIps.some((allowed) => {
    const cleanAllowed = allowed.trim().toLowerCase();
    if (cleanAllowed === cleanClientIp) return true;
    if (cleanAllowed.endsWith('.*')) {
      const prefix = cleanAllowed.slice(0, -1);
      return cleanClientIp.startsWith(prefix);
    }
    return false;
  });
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
 * Формирование HTML-страницы 403 Forbidden в терминальном стеклянном стиле.
 * @returns {string} HTML-разметка
 */
function buildNoPermissionsHtml() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 — Доступ запрещён | Hoshizune</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #090a0f;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: rgba(18, 24, 27, 0.85);
      border: 1px solid rgba(248, 113, 113, 0.3);
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(248, 113, 113, 0.15);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .icon {
      font-size: 56px;
      margin-bottom: 16px;
    }
    .code {
      font-size: 42px;
      font-weight: 900;
      color: #f87171;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #fecaca;
      margin-bottom: 12px;
    }
    .desc {
      font-size: 14px;
      color: #9ca3af;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.6);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚫</div>
    <div class="code">403</div>
    <div class="title">Иди отсюда! Доступ запрещён</div>
    <div class="desc">
      У вас нет административных прав для просмотра данной страницы. Все попытки несанкционированного доступа фиксируются в системе безопасности.
    </div>
    <a href="https://hoshizune.space" class="btn">Вернуться на главную (hoshizune.space)</a>
  </div>
</body>
</html>`;
}

function build403Html() {
  return buildNoPermissionsHtml();
}

/**
 * Маршруты внутри /admin/*, не требующие cookie-авторизации.
 * IP-проверка всё равно применяется ко всем.
 */
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/api/admin/auth'];

/**
 * Основная функция proxy — точка входа Next.js 16.
 * Порядок проверок:
 * 1. Проверка IP клиента по динамическому вайтлисту из admin-config.json.
 * 2. Если IP запрещён — отдаём 403 Forbidden.
 * 3. Проверка субдомена admin.* или путей /admin/*
 * 4. Если у пользователя нет прав — перенаправляем на предыдущую страницу (Referer) или выдаём 403 ошибку.
 *
 * @param {import('next/server').NextRequest} request - Входящий запрос
 * @returns {NextResponse} Ответ или пропуск запроса дальше
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Проверка IP для всех входящих публичных и административных страниц/API
  const clientIp = getClientIp(request);

  if (!isAdminIpAllowed(clientIp)) {
    return new NextResponse(build403Html(), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const isAdminDomain = host.startsWith('admin.');
  const isAdminRoute =
    isAdminDomain ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin');

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // Публичные admin-маршруты (логин) не требуют предварительной сессии
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isPublicAdminPath) {
    return NextResponse.next();
  }

  // Проверка cookie-сессии для защищённых административных маршрутов
  const adminToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userToken = request.cookies.get(USER_SESSION_COOKIE_NAME)?.value;

  const isAuthorized =
    validateSessionToken(adminToken) || validateUserSessionToken(userToken);

  if (!isAuthorized) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Иди отсюда. У вас нет прав.' }, { status: 403 });
    }

    // Если нет прав, смотрим откуда пришёл пользователь (Referer)
    const referer = request.headers.get('referer');

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        // Если реферер с нашего же сайта и не из админки — перенаправляем назад
        if (!refererUrl.pathname.startsWith('/admin') && !refererUrl.hostname.startsWith('admin.')) {
          return NextResponse.redirect(referer);
        }
      } catch {}
    }

    // Если прямо перешёл по ссылке admin.hoshizune.space без реферера — выдаём страницу ошибки
    return new NextResponse(buildNoPermissionsHtml(), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
