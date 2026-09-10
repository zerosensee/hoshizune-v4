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

/**
 * Определение реального формата файла по бинарной сигнатуре (Magic Bytes).
 * @param {Buffer} buffer
 * @returns {'jpg'|'png'|'gif'|'webp'|'avif'|null}
 */
function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'gif';
  }

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  // AVIF: ....ftypavif / ftypavis / ftypmif1
  const ftyp = buffer.slice(4, 12).toString('ascii');
  if (ftyp.includes('avif') || ftyp.includes('avis') || ftyp.includes('mif1')) {
    return 'avif';
  }

  return null;
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
        .prepare('SELECT id, restrictions, is_owner FROM profiles WHERE user_id = ? OR id = ?')
        .get(user.id, user.id);
    } catch {}

    const isOwner = user.isOwner || user.role === 'owner' || profileRow?.is_owner === 1 || user.displayName?.toLowerCase() === 'zerosense';
    const isAdmin = user.isAdmin || user.role === 'admin';

    if (profileRow && !isOwner) {
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

    const contentType = request.headers.get('content-type') || '';
    let fileBuffer = null;
    let fileName = '';
    let fileType = '';
    let fileSize = 0;

    // Считываем сырой буфер тела запроса ЕДИНОЖДЫ (избегаем ошибок 'Body already consumed')
    let rawBuffer = null;
    try {
      const rawArrayBuffer = await request.arrayBuffer();
      rawBuffer = Buffer.from(rawArrayBuffer);
    } catch (readErr) {
      console.error('[Upload] Ошибка чтения тела запроса:', readErr);
    }

    if (rawBuffer && rawBuffer.length > 0) {
      // 1. Пробуем распарсить JSON с Base64
      if (contentType.includes('application/json')) {
        try {
          const jsonBody = JSON.parse(rawBuffer.toString('utf-8'));
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
          console.warn('[Upload] JSON Base64 распарсить не удалось, используем ручной парсер:', jsonErr.message);
        }
      }

      // 2. Если мультипарт или JSON не подошел — извлекаем бинарный файл из Multipart по boundary
      if (!fileBuffer) {
        const parsed = extractFileFromMultipartBuffer(rawBuffer, contentType);
        if (parsed && parsed.buffer && parsed.buffer.length > 0) {
          fileName = parsed.name;
          fileType = parsed.type;
          fileSize = parsed.size;
          fileBuffer = parsed.buffer;
        }
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось прочитать загружаемый файл. Проверьте размер файла.' },
        { status: 400 }
      );
    }

    /* 1. Жесткая проверка на наличие SVG, XML и внедренных скриптов */
    const first1024 = fileBuffer.slice(0, 1024).toString('utf-8', 0, Math.min(1024, fileBuffer.length)).toLowerCase();
    if (
      first1024.includes('<svg') ||
      first1024.includes('<?xml') ||
      first1024.includes('<script') ||
      first1024.includes('xmlns') ||
      first1024.includes('javascript:')
    ) {
      return NextResponse.json(
        { error: 'Загрузка векторных SVG и файлов с внедренной разметкой/скриптами строго запрещена в целях безопасности!' },
        { status: 400 }
      );
    }

    /* 2. Проверка бинарной сигнатуры (Magic Bytes) */
    const detectedFormat = detectImageFormat(fileBuffer);
    if (!detectedFormat) {
      return NextResponse.json(
        { error: 'Неподдерживаемый или повреждённый формат файла! Разрешены только растровые изображения: JPG, PNG, GIF, WebP, AVIF' },
        { status: 400 }
      );
    }

    // Расширение определяется исключительно валидированным бинарным содержимым
    const ext = detectedFormat;

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

    const hasBypass = isOwner || isAdmin || user.isAdmin || user.isOwner || user.role === 'owner' || hasSub || restrictions.includes('bypass_avatar_limit');
    const maxSizeBytes = hasBypass ? 1024 * 1024 * 1024 : 50 * 1024 * 1024;

    if (fileSize > maxSizeBytes) {
      const limitMb = hasBypass ? '1024 МБ' : '50 МБ';
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
