/**
 * API настроек для администратора.
 * GET  /api/admin/settings — получить настройки.
 * POST /api/admin/settings — динамическое обновление настроек (IP вайтлист, LAN доступ).
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  isAdminAuthorized,
  unauthorizedResponse,
} from '@/lib/admin-auth';

const CONFIG_PATH = path.join(process.cwd(), 'admin-config.json');

/**
 * Вспомогательная функция чтения конфигурации.
 */
function readConfig() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      allowedIps: ['*'],
      allowLocalNetwork: true,
      adminSubdomain: 'admin.hoshizune.space',
      sessionMaxAge: 86400,
    };
  }
}

/**
 * GET /api/admin/settings
 * Возвращает текущие настройки.
 */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const config = readConfig();

  return NextResponse.json({
    allowedIps: config.allowedIps || ['*'],
    allowLocalNetwork: !!config.allowLocalNetwork,
    adminSubdomain: config.adminSubdomain || 'admin.hoshizune.space',
    sessionMaxAge: config.sessionMaxAge || 86400,
  });
}

/**
 * POST /api/admin/settings
 * Сохраняет изменения в admin-config.json.
 */
export async function POST(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const config = readConfig();

    if (Array.isArray(body.allowedIps)) {
      config.allowedIps = body.allowedIps.map((ip) => ip.trim()).filter(Boolean);
    }

    if (typeof body.allowLocalNetwork === 'boolean') {
      config.allowLocalNetwork = body.allowLocalNetwork;
    }

    if (typeof body.sessionMaxAge === 'number' && body.sessionMaxAge > 0) {
      config.sessionMaxAge = body.sessionMaxAge;
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      settings: {
        allowedIps: config.allowedIps,
        allowLocalNetwork: config.allowLocalNetwork,
        adminSubdomain: config.adminSubdomain,
        sessionMaxAge: config.sessionMaxAge,
      },
      message: 'Настройки доступа и IP-вайтлиста успешно сохранены!',
    });
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    return NextResponse.json(
      { error: 'Не удалось сохранить настройки на диск' },
      { status: 500 }
    );
  }
}
