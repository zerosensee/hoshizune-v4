/**
 * API: Работа с комментариями к профилям.
 * POST — добавление комментария к профилю (с учетом ограничений и мутов)
 * DELETE — удаление комментария авторами/владельцами профиля/админами
 */
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  addComment,
  getProfileById,
  deleteCommentAdmin,
} from '@/lib/bio-repository';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getDatabase } from '@/lib/database';

export async function POST(request) {
  try {
    const body = await request.json();
    const { profileId, text, rating } = body;

    if (!profileId || !text?.trim()) {
      return NextResponse.json(
        { error: 'profileId и text обязательны' },
        { status: 400 }
      );
    }

    /* Проверка существования профиля */
    const profile = getProfileById(profileId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    /* Проверка ограничения комментариев на профиле */
    if (profile.allowComments === false) {
      return NextResponse.json(
        { error: 'Комментарии к этому профилю отключены владельцем или администрацией' },
        { status: 403 }
      );
    }

    /* ID автора комментария из cookie */
    const authorId =
      request.cookies.get('hoshizune_uid')?.value
      || uuidv4();

    /* Получение профиля автора и проверка мутов */
    const authorProfile = getProfileById(authorId);
    if (authorProfile && Array.isArray(authorProfile.restrictions) && authorProfile.restrictions.includes('mute_comments')) {
      return NextResponse.json(
        { error: 'Вашему аккаунту запрещено оставлять отзывы и комментарии (Мут)' },
        { status: 403 }
      );
    }

    const authorName = authorProfile?.displayName || 'Аноним';

    const comment = addComment({
      profileId,
      authorId,
      authorName,
      text: text.trim(),
      rating: Math.min(Math.max(rating || 0, 0), 5),
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'ID отзыва не указан' }, { status: 400 });
    }

    const db = getDatabase();
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 });
    }

    const authorId = request.cookies.get('hoshizune_uid')?.value;
    const isAdmin = await isAdminAuthorized();

    // Проверка прав: автор комментария, владельца профиля или админ
    let isAllowed = isAdmin;
    if (!isAllowed && authorId) {
      if (comment.author_id === authorId) {
        isAllowed = true;
      } else {
        const targetProfile = getProfileById(comment.profile_id);
        if (targetProfile && (targetProfile.id === authorId || targetProfile.userId === authorId)) {
          isAllowed = true;
        }
      }
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Нет прав на удаление этого комментария' }, { status: 403 });
    }

    deleteCommentAdmin(commentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления комментария:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
