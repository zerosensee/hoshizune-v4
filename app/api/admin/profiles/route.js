/**
 * API управления профилями для администратора.
 * GET    /api/admin/profiles — список всех профилей.
 * DELETE /api/admin/profiles — массовое удаление (body: { ids: string[] }).
 */
import { NextResponse } from 'next/server';
import {
  isAdminAuthorized,
  unauthorizedResponse,
} from '@/lib/admin-auth';
import {
  getAllProfiles,
  deleteProfile,
  createProfile,
  slugExists,
} from '@/lib/bio-repository';
import {
  createUser,
  updateUserRole,
} from '@/lib/user-repository';

/**
 * GET /api/admin/profiles
 * Возвращает список всех профилей с пагинацией.
 */
export async function GET(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let profiles = getAllProfiles();

  if (search) {
    const q = search.toLowerCase();
    profiles = profiles.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    );
  }

  const total = profiles.length;
  const paged = profiles.slice(offset, offset + limit);

  return NextResponse.json({ profiles: paged, total });
}

/**
 * DELETE /api/admin/profiles
 * Тело: { ids: string[] }
 * Массовое удаление профилей.
 */
export async function DELETE(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Передайте массив ids' },
        { status: 400 },
      );
    }

    let deleted = 0;
    for (const id of ids) {
      if (deleteProfile(id)) deleted++;
    }

    return NextResponse.json({ success: true, deleted });
  } catch {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/profiles
 * Тело: { email, password, displayName, slug, role }
 * Создает аккаунт пользователя и привязанный био-профиль.
 */
export async function POST(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { email, password, displayName, slug, role = 'user' } = body;

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Email, пароль и имя обязательны' },
        { status: 400 }
      );
    }

    const cleanSlug = (slug || displayName)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');

    if (!cleanSlug) {
      return NextResponse.json(
        { error: 'Укажите валидный URL профиля (slug)' },
        { status: 400 }
      );
    }

    if (slugExists(cleanSlug)) {
      return NextResponse.json(
        { error: `Профиль со slug "${cleanSlug}" уже существует` },
        { status: 400 }
      );
    }

    // 1. Создание записи в таблице users
    const user = createUser({
      email,
      password,
      displayName,
    });

    // 2. Назначение роли при необходимости
    if (role && role !== 'user') {
      updateUserRole(user.id, role, null, [role], []);
    }

    // 3. Создание привязанного био-профиля
    const profile = createProfile({
      id: user.id,
      userId: user.id,
      slug: cleanSlug,
      displayName: displayName.trim(),
      accentColor: '#ffffff',
      status: 'online',
    });

    return NextResponse.json({ success: true, user, profile });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Ошибка создания пользователя' },
      { status: 500 }
    );
  }
}
