/**
 * API для сокращения ссылок — публичный доступ.
 * POST /api/shorten — создание короткой ссылки с вычислением TTL и кастомным кодом.
 * GET  /api/shorten — список ссылок текущей сессии.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createShortLink,
  getAllShortLinks,
} from '@/lib/short-links-repository';

/**
 * Валидация URL.
 * @param {string} url - Проверяемый URL
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/shorten
 * Тело: { url: string, customCode?: string, expiresIn?: number|null }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { url, title, customCode, expiresIn } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Поле url обязательно' },
        { status: 400 }
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Некорректный URL. Укажите адрес с https:// или http://' },
        { status: 400 }
      );
    }

    if (url.length > 2048) {
      return NextResponse.json(
        { error: 'URL слишком длинный (максимум 2048 символов)' },
        { status: 400 }
      );
    }

    if (customCode && !/^[a-zA-Z0-9_-]{3,32}$/.test(customCode)) {
      return NextResponse.json(
        {
          error:
            'Кастомный путь: 3-32 символа (буквы, цифры, дефис, подчёркивание)',
        },
        { status: 400 }
      );
    }

    let expiresAt = null;
    if (expiresIn && typeof expiresIn === 'number') {
      expiresAt = Date.now() + expiresIn * 1000;
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('hoshizune_uid')?.value || null;

    const link = createShortLink({
      targetUrl: url,
      title: title || '',
      createdBy: userId,
      customCode: customCode || undefined,
      expiresAt,
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('hoshizune_uid')?.value;

    if (!userId) {
      return NextResponse.json({ links: [] });
    }

    const links = getAllShortLinks({ limit: 100 }).filter(
      (l) => l.createdBy === userId
    );

    return NextResponse.json({ links });
  } catch {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
