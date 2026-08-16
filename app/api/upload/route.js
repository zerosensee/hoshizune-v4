/**
 * API: Загрузка аватара.
 * POST — multipart/form-data с файлом аватара
 * Лимит: 20 МБ для обычных пользователей
 */
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/user-auth';
import { getDatabase } from '@/lib/database';

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    const profileRow = db
      .prepare('SELECT id, restrictions FROM profiles WHERE user_id = ? OR id = ?')
      .get(user.id, user.id);

    if (profileRow) {
      let restrictions = [];
      try {
        restrictions = JSON.parse(profileRow.restrictions || '[]');
      } catch {}
      if (restrictions.includes('disable_avatar')) {
        return NextResponse.json(
          { error: 'Вашему аккаунту запрещена смена и загрузка аватарки (Ограничение)' },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('avatar') || formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    /* Проверка формата файла */
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    const mime = (file.type || '').toLowerCase();
    if (!allowedMimes.includes(mime) && !mime.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Неподдерживаемый формат! Допустимы только изображения: JPG, PNG, GIF, WebP, AVIF' },
        { status: 400 }
      );
    }

    /* Определение допустимого размера (2 МБ базовый, 20 МБ с VIP или спец. разрешением) */
    let restrictions = [];
    if (profileRow?.restrictions) {
      try {
        restrictions = JSON.parse(profileRow.restrictions);
      } catch {}
    }

    const { getUserActiveSubscription } = await import('@/lib/subscription-repository');
    const hasSub = !!getUserActiveSubscription(user.id);
    const hasBypass = user.isAdmin || user.isOwner || hasSub || restrictions.includes('bypass_avatar_limit');

    const maxSizeBytes = hasBypass ? 500 * 1024 * 1024 : 50 * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      const limitMb = hasBypass ? '500 МБ' : '50 МБ';
      return NextResponse.json(
        {
          error: `Размер файла (${(file.size / (1024 * 1024)).toFixed(1)} МБ) превышает лимит ${limitMb}! ${
            hasBypass
              ? ''
              : 'Оформите подписку Hoshizune VIP или обратитесь к администратору для снятия лимита до 500 МБ.'
          }`,
        },
        { status: 400 }
      );
    }

    /* Сохранение файла */
    const ext = file.name.split('.').pop() || 'webp';
    const filename = `${uuidv4()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const avatarUrl = `/uploads/${filename}`;

    if (profileRow) {
      db.prepare('UPDATE profiles SET avatar_path = ? WHERE id = ?').run(avatarUrl, profileRow.id);
    }
    try {
      db.prepare('UPDATE profiles SET avatar_path = ? WHERE user_id = ? OR LOWER(slug) = LOWER(?)').run(avatarUrl, user.id, user.displayName || '');
    } catch {}

    try {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, user.id);
    } catch {}

    return NextResponse.json({
      avatarPath: avatarUrl,
      url: avatarUrl,
    });
  } catch (error) {
    console.error(
      'Ошибка загрузки аватара:',
      error
    );
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
