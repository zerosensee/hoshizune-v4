/**
 * API-эндпоинт смены роли пользователя.
 * Ограничение: изменять роли (owner, admin, support, user) разрешено исключительно Владельцу (owner).
 * PUT /api/admin/users/role
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { updateUserRole } from '@/lib/user-repository';

export async function PUT(request) {
  try {
    const currentUser = await getCurrentUser();

    // Строгая проверка: роль менять может ТОЛЬКО owner
    if (!currentUser || currentUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Только владелец (owner) имеет право выдавать и изменять роли пользователей' },
        { status: 403 }
      );
    }

    const { userId, role, titleId, roles, titles } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'Не указан userId пользователя' },
        { status: 400 }
      );
    }

    const updatedUser = updateUserRole(userId, role, titleId, roles, titles);
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Ошибка изменения роли пользователя:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка сервера при смене роли' },
      { status: 500 }
    );
  }
}
