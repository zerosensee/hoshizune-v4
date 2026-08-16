/**
 * API: Операции с конкретным профилем по slug.
 * GET — получить профиль (+ инкремент просмотров)
 * PUT — обновить профиль (только владелец)
 * DELETE — удалить профиль (только владелец)
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import {
  getProfileBySlug,
  updateProfile,
  deleteProfile,
  incrementViewCount,
  getComments,
} from '@/lib/bio-repository';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const profile = getProfileBySlug(slug);

    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    /* Инкремент просмотров */
    incrementViewCount(slug);

    /* Загрузка комментариев */
    const comments = getComments(profile.id);

    return NextResponse.json({
      ...profile,
      viewCount: profile.viewCount + 1,
      comments,
    });
  } catch (error) {
    console.error(
      'Ошибка получения профиля:',
      error
    );
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const profile = getProfileBySlug(slug);
    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    const isProfileAuthor = String(profile.userId || profile.user_id) === String(user.id);
    const hasPermission = isProfileAuthor || user.isAdmin || user.isOwner || user.role === 'owner';
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Нет доступа для изменения чужого профиля' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = updateProfile(profile.id, body);

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      'Ошибка обновления профиля:',
      error
    );
    return NextResponse.json(
      { error: 'Ошибка сервера при обновлении профиля' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const profile = getProfileBySlug(slug);
    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    const isProfileAuthor = String(profile.userId || profile.user_id) === String(user.id);
    const hasPermission = isProfileAuthor || user.isAdmin || user.isOwner || user.role === 'owner';
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Нет доступа для удаления чужого профиля' },
        { status: 403 }
      );
    }

    const deleted = deleteProfile(profile.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Ошибка при удалении профиля' },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      'Ошибка удаления профиля:',
      error
    );
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
