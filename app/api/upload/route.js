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

/**
 * Резервный парсер multipart/form-data для случаев, когда встроенный request.formData()
 * вышибает лимит встроенного парсера Node.js (undici).
 */
function extractFileFromMultipartBuffer(buffer, contentTypeHeader) {
  const boundaryMatch = contentTypeHeader.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return null;
  const boundaryStr = boundaryMatch[1] || boundaryMatch[2];
  const boundary = Buffer.from(`--${boundaryStr.trim()}`);

  let startIdx = buffer.indexOf(boundary);
  if (startIdx === -1) return null;

  const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), startIdx);
  if (headerEnd === -1) return null;

  const headerText = buffer.slice(startIdx, headerEnd).toString('utf-8');

  const filenameMatch = headerText.match(/filename="([^"]+)"/i);
  const fileName = filenameMatch ? filenameMatch[1] : 'avatar.webp';

  const mimeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
  const fileType = mimeMatch ? mimeMatch[1].trim() : 'image/webp';

  const fileDataStart = headerEnd + 4;

  let fileDataEnd = buffer.indexOf(boundary, fileDataStart);
  if (fileDataEnd === -1) {
    fileDataEnd = buffer.length;
  } else {
    if (fileDataEnd >= 2 && buffer[fileDataEnd - 2] === 13 && buffer[fileDataEnd - 1] === 10) {
      fileDataEnd -= 2;
    }
  }

  const fileBuffer = buffer.slice(fileDataStart, fileDataEnd);

  return {
    name: fileName,
    type: fileType,
    size: fileBuffer.length,
    buffer: fileBuffer,
  };
}

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

    let fileBuffer = null;
    let fileName = '';
    let fileType = '';
    let fileSize = 0;

    const contentType = request.headers.get('content-type') || '';

    // 0. Если отправлен JSON с base64 (резервный надежный канал)
    if (contentType.includes('application/json')) {
      try {
        const jsonBody = await request.json();
        if (jsonBody.base64) {
          const matches = jsonBody.base64.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/);
          if (matches) {
            fileType = matches[1];
            fileBuffer = Buffer.from(matches[2], 'base64');
            fileName = jsonBody.filename || 'avatar.webp';
            fileSize = fileBuffer.length;
          }
        }
      } catch (jsonErr) {
        console.error('[Upload] Ошибка чтения JSON base64:', jsonErr);
      }
    }

    // 1. Пробуем стандартный Web API request.formData()
    if (!fileBuffer) {
      try {
        const formData = await request.formData();
        const fileObj = formData.get('avatar') || formData.get('file');

        if (fileObj && fileObj instanceof File) {
          fileName = fileObj.name || 'avatar.webp';
          fileType = fileObj.type || 'image/webp';
          fileSize = fileObj.size;
          fileBuffer = Buffer.from(await fileObj.arrayBuffer());
        }
      } catch (err) {
        console.warn('[Upload] request.formData() не сработал, переключаемся на сырой парсинг буфера:', err.message);
      }
    }

    // 2. Резервный сырой парсинг мультипарт буфера
    if (!fileBuffer) {
      try {
        const rawArrayBuffer = await request.arrayBuffer();
        const rawBuffer = Buffer.from(rawArrayBuffer);
        const parsed = extractFileFromMultipartBuffer(rawBuffer, contentType);

        if (parsed && parsed.buffer && parsed.buffer.length > 0) {
          fileName = parsed.name;
          fileType = parsed.type;
          fileSize = parsed.size;
          fileBuffer = parsed.buffer;
        }
      } catch (rawErr) {
        console.error('[Upload] Ошибка сырого чтения массива байт:', rawErr);
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось прочитать загружаемый файл. Проверьте размер файла.' },
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
    const mime = (fileType || '').toLowerCase();
    const rawExt = (fileName || '').split('.').pop() || 'webp';
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

    if (fileSize > maxSizeBytes) {
      const limitMb = hasBypass ? '500 МБ' : '50 МБ';
      return NextResponse.json(
        {
          error: `Размер файла (${(fileSize / (1024 * 1024)).toFixed(1)} МБ) превышает лимит ${limitMb}!`,
        },
        { status: 400 }
      );
    }

    /* Сохранение файла */
    const filename = `${uuidv4()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, fileBuffer);

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
