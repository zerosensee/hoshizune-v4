/**
 * API настроек для администратора.
 * GET  /api/admin/settings — получить настройки.
 * POST /api/admin/settings — динамическое обновление настроек (IP вайтлист, LAN доступ).
 */
import { NextResponse } from 'next/server';
import {
  isAdminAuthorized,
  unauthorizedResponse,
} from '@/lib/admin-auth';
import { getDbSettings, saveDbSettings } from '@/lib/database';

/**
 * GET /api/admin/settings
 * Возвращает текущие настройки из БД.
 */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const config = getDbSettings();

  return NextResponse.json({
    allowedIps: config.allowedIps || ['*'],
    allowLocalNetwork: !!config.allowLocalNetwork,
    adminSubdomain: config.adminSubdomain || 'admin.hoshizune.space',
    sessionMaxAge: config.sessionMaxAge || 86400,
  });
}

/**
 * POST /api/admin/settings
 * Сохраняет изменения в базу данных SQLite.
 */
export async function POST(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const patch = {};

    if (Array.isArray(body.allowedIps)) {
      patch.allowedIps = body.allowedIps.map((ip) => ip.trim()).filter(Boolean);
    }

    if (typeof body.allowLocalNetwork === 'boolean') {
      patch.allowLocalNetwork = body.allowLocalNetwork;
    }

    if (typeof body.sessionMaxAge === 'number' && body.sessionMaxAge > 0) {
      patch.sessionMaxAge = body.sessionMaxAge;
    }

    const updated = saveDbSettings(patch);

    return NextResponse.json({
      success: true,
      settings: updated,
      message: 'Настройки доступа и IP-вайтлиста успешно сохранены в БД!',
    });
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки в БД' },
      { status: 500 }
    );
  }
}
