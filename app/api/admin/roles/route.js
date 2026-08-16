/**
 * API Управления Ролями и Титулами.
 * GET  /api/admin/roles — получить все роли, титулы и права.
 * POST /api/admin/roles — создать новую роль или косметический титул.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { getAllRoles, createRole, AVAILABLE_PERMISSIONS } from '@/lib/role-repository';

export async function GET() {
  try {
    const roles = getAllRoles();
    return NextResponse.json({
      roles,
      availablePermissions: AVAILABLE_PERMISSIONS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Ошибка сервера при получении ролей' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'owner' && !currentUser.isAdmin)) {
      return NextResponse.json(
        { error: 'Только Владелец (Owner) имеет право создавать роли и титулы' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const newRole = createRole(body);

    return NextResponse.json({ success: true, role: newRole });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Ошибка при создании роли' },
      { status: 400 }
    );
  }
}

export async function PUT(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'owner' && !currentUser.isAdmin)) {
      return NextResponse.json(
        { error: 'Только Владелец (Owner) имеет право менять иерархию ролей' },
        { status: 403 }
      );
    }

    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds должен быть массивом' }, { status: 400 });
    }

    const { updateRolesOrder } = await import('@/lib/role-repository');
    updateRolesOrder(orderedIds);
    const updatedRoles = getAllRoles();

    return NextResponse.json({ success: true, roles: updatedRoles });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Ошибка при смене иерархии ролей' },
      { status: 500 }
    );
  }
}
