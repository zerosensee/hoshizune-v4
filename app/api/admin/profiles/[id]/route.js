/**
 * API управления конкретным профилем для администратора.
 * PUT    /api/admin/profiles/[id] — обновление профиля.
 * DELETE /api/admin/profiles/[id] — удаление профиля.
 */
import { NextResponse } from 'next/server';
import {
  isAdminAuthorized,
  unauthorizedResponse,
} from '@/lib/admin-auth';
import {
  getProfileById,
  updateProfile,
  deleteProfile,
} from '@/lib/bio-repository';

/**
 * PUT /api/admin/profiles/[id]
 * Обновляет любой профиль (включая владельца).
 */
export async function PUT(request, context) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  try {
    const profile = getProfileById(id);
    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const updated = updateProfile(id, body);
    return NextResponse.json({ profile: updated });
  } catch {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/profiles/[id]
 * Удаляет профиль по ID (кроме владельца).
 */
export async function DELETE(request, context) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  const profile = getProfileById(id);
  if (!profile) {
    return NextResponse.json(
      { error: 'Профиль не найден' },
      { status: 404 },
    );
  }

  if (profile.isOwner) {
    return NextResponse.json(
      { error: 'Нельзя удалить профиль владельца' },
      { status: 403 },
    );
  }

  const ok = deleteProfile(id);
  return NextResponse.json({ success: ok });
}
