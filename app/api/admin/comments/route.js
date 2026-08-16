/**
 * API администрирования комментариев и оценок.
 * PUT /api/admin/comments — редактирование текста и рейтинга отзыва.
 * DELETE /api/admin/comments — полное удаление отзыва.
 */
import { NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorizedResponse } from '@/lib/admin-auth';
import { updateComment, deleteCommentAdmin } from '@/lib/bio-repository';

export async function PUT(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const { commentId, text, rating } = await request.json();
    if (!commentId || text === undefined) {
      return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
    }

    updateComment(commentId, text.trim(), parseInt(rating, 10) || 0);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'ID отзыва не указан' }, { status: 400 });
    }

    deleteCommentAdmin(commentId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
