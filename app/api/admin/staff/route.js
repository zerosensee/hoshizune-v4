/**
 * API Управления Составом Администрации (Staff) Hoshizune v4.
 * GET    — Получение списка сотрудников
 * POST   — Добавление / Обновление сотрудника
 * DELETE — Удаление из состава администрации
 */
import { NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorizedResponse } from '@/lib/admin-auth';
import { getAllStaff, addStaffMember, removeStaffMember } from '@/lib/staff-repository';

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const staff = getAllStaff();
    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Ошибка получения списка состава администрации:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { userId, position, notes } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Укажите ID пользователя' }, { status: 400 });
    }

    const id = addStaffMember({
      userId,
      position: position || 'Модератор',
      notes: notes || '',
      addedBy: 'Admin',
    });

    return NextResponse.json({ ok: true, id, message: 'Сотрудник успешно добавлен в состав' });
  } catch (error) {
    console.error('Ошибка добавления сотрудника:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Не указан ID записи сотрудника' }, { status: 400 });
    }

    removeStaffMember(id);
    return NextResponse.json({ ok: true, message: 'Сотрудник успешно исключен из состава' });
  } catch (error) {
    console.error('Ошибка исключения сотрудника:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
