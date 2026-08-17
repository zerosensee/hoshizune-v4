/**
 * API: Загрузка аватара.
 * POST — multipart/form-data с файлом аватара
 * Лимит: 50 МБ для обычных пользователей, 500 МБ для VIP / Admin
 */
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/user-auth';
import { getDatabase } from '@/lib/database';

export const maxDuration = 60; // Таймаут 60 сек для тяжелых файлов

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован. Пожалуйста, войдите в аккаунт.' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    let profileRow = null;
    try {
      profileRow = db
        .prepare('SELECT id, restrictions FROM profiles WHERE user_id = ? OR id = ?')
        .get(user.id, user.id);
    } catch {}

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

    let formData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.error('[Upload] Ошибка чтения formData:', err);
      return NextResponse.json(
        { error: 'Не удалось прочитать загружаемый файл. Проверьте размер файла.' },
        { status: 400 }
      );
    }

    const file = formData.get('avatar') || formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    /* Проверка формата файла (MIME и Расширение) */
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/x-webp',
      'image/avif',
      'image/svg+xml',
    ];
    const mime = (file.type || '').toLowerCase();
    const rawExt = (file.name || '').split('.').pop() || 'webp';
    const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'webp';

    const isAllowedMime = allowedMimes.includes(mime) || mime.startsWith('image/');
    const isAllowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext);

    if (!isAllowedMime && !isAllowedExt) {
      return NextResponse.json(
        { error: 'Неподдерживаемый формат! Допустимы только изображения: JPG, PNG, GIF, WebP, AVIF' },
        { status: 400 }
      );
    }

    /* Определение допустимого размера */
    let restrictions = [];
    if (profileRow?.restrictions) {
      try {
        restrictions = JSON.parse(profileRow.restrictions);
      } catch {}
    }

    let hasSub = false;
    try {
      const { getUserActiveSubscription } = await import('@/lib/subscription-repository');
      hasSub = !!getUserActiveSubscription(user.id);
    } catch {}

    const hasBypass = user.isAdmin || user.isOwner || hasSub || restrictions.includes('bypass_avatar_limit');
    const maxSizeBytes = hasBypass ? 500 * 1024 * 1024 : 50 * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      const limitMb = hasBypass ? '500 МБ' : '50 МБ';
      return NextResponse.json(
        {
          error: `Размер файла (${(file.size / (1024 * 1024)).toFixed(1)} МБ) превышает лимит ${limitMb}!`,
        },
        { status: 400 }
      );
    }

    /* Сохранение файла */
    const filename = `${uuidv4()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const avatarUrl = `/uploads/${filename}`;

    /* Безопасное обновление в БД */
    try {
      if (profileRow) {
        db.prepare('UPDATE profiles SET avatar_path = ? WHERE id = ?').run(avatarUrl, profileRow.id);
      }
      db.prepare('UPDATE profiles SET avatar_path = ? WHERE user_id = ?').run(avatarUrl, user.id);
    } catch (e) {
      console.error('[Upload] Ошибка обновления profiles.avatar_path:', e);
    }

    try {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, user.id);
    } catch (e) {
      console.error('[Upload] Ошибка обновления users.avatar_url:', e);
    }

    return NextResponse.json({
      avatarPath: avatarUrl,
      url: avatarUrl,
    });
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    return NextResponse.json(
      { error: `Ошибка загрузки аватара на сервере: ${error.message || 'Ошибка обработки'}` },
      { status: 500 }
    );
  }
}
