/**
 * API для сокращения ссылок.
 * POST   /api/shorten — создание короткой ссылки (только авторизованные, с троттлингом).
 * GET    /api/shorten — список ссылок текущего пользователя.
 * DELETE /api/shorten — удаление ссылки автором или администратором.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import {
  createShortLink,
  getAllShortLinks,
  getShortLinkById,
  deleteShortLink,
} from '@/lib/short-links-repository';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

/** Список зарезервированных системных путей, запрещенных для customCode */
const RESERVED_CODES = new Set([
  'auth',
  'admin',
  'api',
  'login',
  'register',
  'settings',
  'bio',
  'explore',
  'subscription',
  's',
  'public',
  'uploads',
  'favicon',
  'robots',
  'sitemap',
  'dashboard',
  'staff',
  'terms',
  'privacy',
  'static',
  '_next',
  'me',
  'home',
  'users',
  'status',
  'help',
  'verify-code',
  'resend-code',
]);

/**
 * Проверка на локальные, приватные и облачные метаданные адреса назначения (SSRF & Phishing Guard).
 * @param {string} url - Проверяемый URL
 * @returns {boolean} True если URL запрещен
 */
function isDisallowedTargetUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true;
    }

    const host = parsed.hostname.toLowerCase();
    // Loopback, localhost, метаданные cloud, локальные подсети
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.startsWith('169.254.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * POST /api/shorten
 * Тело: { url: string, customCode?: string, expiresIn?: number|null, title?: string }
 */
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Сокращение ссылок доступно только авторизованным пользователям' },
        { status: 401 }
      );
    }

    // Rate Limiting: максимум 10 ссылок в час для пользователя
    const isPrivileged = user.isAdmin || user.isOwner || user.role === 'owner';
    if (!isPrivileged) {
      const clientIp = getClientIp(request);
      const rlKey = `shorten:${user.id}:${clientIp}`;
      const limit = checkRateLimit(rlKey, {
        maxAttempts: 10,
        windowMs: 60 * 60 * 1000, // 1 час
      });

      if (!limit.allowed) {
        return NextResponse.json(
          {
            error: `Превышен лимит создания ссылок (максимум 10 в час). Попробуйте через ${Math.ceil(limit.retryAfterSeconds / 60)} мин.`,
          },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const { url, title, customCode, expiresIn } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Поле url обязательно' },
        { status: 400 }
      );
    }

    if (isDisallowedTargetUrl(url)) {
      return NextResponse.json(
        {
          error:
            'Недопустимый URL назначения! Ссылки на локальные адреса, приватные сети и системные службы строго запрещены.',
        },
        { status: 400 }
      );
    }

    if (url.length > 2048) {
      return NextResponse.json(
        { error: 'URL слишком длинный (максимум 2048 символов)' },
        { status: 400 }
      );
    }

    if (customCode) {
      const cleanCode = customCode.trim().toLowerCase();

      if (!/^[a-z0-9_-]{3,32}$/i.test(cleanCode)) {
        return NextResponse.json(
          {
            error:
              'Кастомный путь: 3-32 символа (латинские буквы, цифры, дефис, подчёркивание)',
          },
          { status: 400 }
        );
      }

      if (RESERVED_CODES.has(cleanCode)) {
        return NextResponse.json(
          {
            error: `Код "${cleanCode}" зарезервирован платформой и не может быть использован`,
          },
          { status: 400 }
        );
      }
    }

    let expiresAt = null;
    if (expiresIn && typeof expiresIn === 'number') {
      expiresAt = Date.now() + expiresIn * 1000;
    }

    const link = createShortLink({
      targetUrl: url,
      title: title || '',
      createdBy: user.id,
      customCode: customCode ? customCode.trim().toLowerCase() : undefined,
      expiresAt,
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    return NextResponse.json(
      {
        success: true,
        link: {
          ...link,
          fullShortUrl: `${baseUrl}/s/${link.code}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error.message &&
      error.message.includes('UNIQUE constraint failed')
    ) {
      return NextResponse.json(
        { error: 'Этот короткий адрес уже занят. Выберите другой.' },
        { status: 409 }
      );
    }

    console.error('Ошибка сокращения ссылки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shorten
 * Список ссылок текущего пользователя.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ links: [] });
    }

    const isPrivileged = user.isAdmin || user.isOwner || user.role === 'owner';
    let links = getAllShortLinks({ limit: 100 });

    if (!isPrivileged) {
      links = links.filter((l) => l.createdBy === user.id);
    }

    return NextResponse.json({ links });
  } catch {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shorten?id=...
 * Удаление ссылки создателем или администратором.
 */
export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'), 10);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'Не указан ID ссылки' }, { status: 400 });
    }

    const link = getShortLinkById(id);
    if (!link) {
      return NextResponse.json({ error: 'Ссылка не найдена' }, { status: 404 });
    }

    const isAuthor = link.createdBy === user.id;
    const isPrivileged = user.isAdmin || user.isOwner || user.role === 'owner';

    if (!isAuthor && !isPrivileged) {
      return NextResponse.json({ error: 'У вас нет прав для удаления этой ссылки' }, { status: 403 });
    }

    deleteShortLink(id);
    return NextResponse.json({ success: true, message: 'Ссылка успешно удалена' });
  } catch (error) {
    console.error('Ошибка удаления ссылки:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
