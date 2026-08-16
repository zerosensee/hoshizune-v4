/**
 * API Обновления и Удаления конкретной Роли / Титула.
 * PUT    /api/admin/roles/[id] — обновление прав, названия, цвета.
 * DELETE /api/admin/roles/[id] — удаление кастомного титула.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { updateRole, deleteRole } from '@/lib/role-repository';

export async function PUT(request, context) {
  try {
    const currentUser = await getCurrentUser();

    // Права на изменение прав ролей имеет исключительно Владелец (Owner)
    if (!currentUser || currentUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Только Владелец (Owner) имеет право изменять конфигурации и права ролей' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const updated = updateRole(id, body);
    return NextResponse.json({ success: true, role: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Ошибка обновления роли' },
      { status: 400 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Только Владелец (Owner) имеет право удалять титулы' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    deleteRole(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Ошибка при удалении роли' },
      { status: 400 }
    );
  }
}
