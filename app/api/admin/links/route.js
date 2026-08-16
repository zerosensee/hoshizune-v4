/**
 * API управления сокращёнными ссылками для администратора.
 * GET  /api/admin/links — список всех ссылок.
 * POST /api/admin/links — создание ссылки из админки.
 */
import { NextResponse } from 'next/server';
import {
  isAdminAuthorized,
  unauthorizedResponse,
} from '@/lib/admin-auth';
import {
  getAllShortLinks,
  getShortLinksCount,
  createShortLink,
} from '@/lib/short-links-repository';

/**
 * GET /api/admin/links
 * Список всех ссылок с пагинацией и поиском.
 */
export async function GET(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const links = getAllShortLinks({ limit, offset, search });
  const total = getShortLinksCount();

  return NextResponse.json({ links, total });
}

/**
 * POST /api/admin/links
 * Тело: { url: string, title?: string, customCode?: string }
 * Создаёт ссылку от имени администратора.
 */
export async function POST(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { url, title, customCode } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Поле url обязательно' },
        { status: 400 },
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Некорректный URL' },
        { status: 400 },
      );
    }

    const link = createShortLink({
      targetUrl: url,
      title: title || '',
      createdBy: 'admin',
      customCode: customCode || undefined,
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Этот код уже занят' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}
