/**
 * API управления конкретным профилем для администратора.
 * PUT    /api/admin/profiles/[id] — обновление профиля.
 * DELETE /api/admin/profiles/[id] — удаление профиля.
 */
import { NextResponse } from 'next/server';
import {
  isAdminAuthorized,
  unauthorizedResponse,
  canActorModifyTarget,
} from '@/lib/admin-auth';
import { getCurrentUser } from '@/lib/user-auth';
import {
  getProfileById,
  updateProfile,
  deleteProfile,
} from '@/lib/bio-repository';

/**
 * PUT /api/admin/profiles/[id]
 * Обновляет профиль с проверкой системной иерархии ролей.
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

    const actor = await getCurrentUser();
    if (actor && !canActorModifyTarget(actor, profile)) {
      return NextResponse.json(
        { error: 'У вас недостаточно полномочий для изменения вышестоящего сотрудника в иерархии' },
        { status: 403 },
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
 * Удаляет профиль по ID с проверкой системной иерархии.
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

  const actor = await getCurrentUser();
  if (actor && !canActorModifyTarget(actor, profile)) {
    return NextResponse.json(
      { error: 'Нельзя удалить аккаунт равного или вышестоящего сотрудника' },
      { status: 403 },
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
