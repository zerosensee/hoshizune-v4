/**
 * API управления конкретной сокращённой ссылкой (администратор).
 * PUT    /api/admin/links/[id] — обновление ссылки.
 * DELETE /api/admin/links/[id] — удаление ссылки.
 */
import { NextResponse } from 'next/server';
import {
  isAdminAuthorized,
  unauthorizedResponse,
} from '@/lib/admin-auth';
import {
  updateShortLink,
  deleteShortLink,
  getLinkClickStats,
} from '@/lib/short-links-repository';

/**
 * PUT /api/admin/links/[id]
 * Тело: { targetUrl?, title?, isActive?, expiresAt? }
 */
export async function PUT(request, context) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const linkId = parseInt(id, 10);

  if (isNaN(linkId)) {
    return NextResponse.json(
      { error: 'Некорректный ID' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const updated = updateShortLink(linkId, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'Ссылка не найдена' },
        { status: 404 },
      );
    }

    return NextResponse.json({ link: updated });
  } catch {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/links/[id]
 * Удаляет сокращённую ссылку по ID.
 */
export async function DELETE(request, context) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const linkId = parseInt(id, 10);

  if (isNaN(linkId)) {
    return NextResponse.json(
      { error: 'Некорректный ID' },
      { status: 400 },
    );
  }

  const ok = deleteShortLink(linkId);

  if (!ok) {
    return NextResponse.json(
      { error: 'Ссылка не найдена' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * GET /api/admin/links/[id]
 * Возвращает статистику кликов по конкретной ссылке.
 */
export async function GET(request, context) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const linkId = parseInt(id, 10);

  if (isNaN(linkId)) {
    return NextResponse.json(
      { error: 'Некорректный ID' },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7', 10);
  const stats = getLinkClickStats(linkId, days);

  return NextResponse.json({ stats });
}
