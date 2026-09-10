/**
 * API-эндпоинт смены роли пользователя.
 * Ограничение: изменять роли (owner, admin, support, user) разрешено исключительно Владельцу (owner).
 * PUT /api/admin/users/role
 */
import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { updateUserRole } from '@/lib/user-repository';

export async function PUT(request) {
  try {
    const isAuth = await isAdminAuthorized();
    if (!isAuth) {
      return NextResponse.json(
        { error: 'Требуется авторизация администратора' },
        { status: 401 }
      );
    }

    const { userId, role, titleId, roles, titles } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'Не указан userId пользователя' },
        { status: 400 }
      );
    }

    const cleanUserId = String(userId).replace(/^profile_/, '');
    const updatedUser = updateUserRole(cleanUserId, role, titleId, roles, titles);
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Ошибка изменения роли пользователя:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка сервера при смене роли' },
      { status: 500 }
    );
  }
}
