/**
 * API: Работа с комментариями к профилям.
 * POST — добавление комментария к профилю
 */
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  addComment,
  getProfileBySlug,
  getProfileById,
} from '@/lib/bio-repository';

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

    /* ID автора комментария из cookie */
    const authorId =
      request.cookies.get('hoshizune_uid')?.value
      || uuidv4();

    /* Получение имени автора (если есть профиль) */
    const authorProfile = getProfileById(authorId);
    const authorName =
      authorProfile?.displayName || 'Аноним';

    const comment = addComment({
      profileId,
      authorId,
      authorName,
      text: text.trim(),
      rating: Math.min(Math.max(rating || 0, 0), 5),
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error(
      'Ошибка добавления комментария:',
      error
    );
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
