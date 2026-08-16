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
      .prepare('SELECT id FROM profiles WHERE user_id = ? OR id = ?')
      .get(user.id, user.id);

    const formData = await request.formData();
    const file = formData.get('avatar') || formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    /* Проверка типа (разрешаем стандартные фоновые и аватарные картинки) */
    const mime = (file.type || '').toLowerCase();
    if (!mime.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Допустимы только графические файлы (JPEG, PNG, WebP, GIF, SVG, AVIF)' },
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
