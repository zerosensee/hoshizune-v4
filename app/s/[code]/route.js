/**
 * Роут редиректа по короткому коду.
 * GET /s/[code] — поиск ссылки, запись аналитики, 302 редирект.
 */
import { NextResponse } from 'next/server';
import {
  getShortLinkByCode,
  incrementLinkClicks,
  recordLinkClick,
} from '@/lib/short-links-repository';
import { hashIp } from '@/lib/analytics-repository';

/**
 * Получение IP-адреса из заголовков запроса.
 * @param {Request} request - Входящий запрос
 * @returns {string} IP-адрес клиента
 */
function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '0.0.0.0';
}

/**
 * GET /s/[code]
 * Ищет ссылку по коду, инкрементирует клики, делает 302 редирект.
 * @param {Request} request - Входящий запрос
 * @param {{ params: Promise<{ code: string }> }} context - Параметры роута
 */
export async function GET(request, context) {
  const { code } = await context.params;

  const link = getShortLinkByCode(code);

  if (!link) {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Ссылка не найдена | Hoshizune</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      background:#0a0a0f;color:#4ade80;
      font-family:'Courier New',monospace;
      display:flex;align-items:center;justify-content:center;
      min-height:100vh;
    }
    .box{
      border:1px solid #4ade8040;padding:2rem 3rem;
      text-align:center;background:#0d0d14;
    }
    .code{font-size:4rem;font-weight:bold;color:#f87171;}
    .msg{margin-top:1rem;color:#6b7280;}
    a{color:#4ade80;text-decoration:none;margin-top:1rem;display:block;}
  </style>
</head>
<body>
  <div class="box">
    <div class="code">404</div>
    <div class="msg">Ссылка не найдена или истёк срок действия.</div>
    <a href="/" style="background:rgba(74,222,128,0.12);border:1px solid #4ade80;color:#4ade80;padding:10px 20px;border-radius:8px;font-weight:bold;margin-top:1.5rem;display:inline-block;box-shadow:0 4px 16px rgba(74,222,128,0.2);">🏠 Вернуться на главную</a>
  </div>
</body>
</html>`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  // Асинхронная запись аналитики (не блокируем редирект)
  try {
    const ip = getClientIp(request);
    const ipHash = hashIp(ip);
    const referrer = request.headers.get('referer') || '';
    const userAgent = request.headers.get('user-agent') || '';

    incrementLinkClicks(link.id);
    recordLinkClick({
      linkId: link.id,
      ipHash,
      referrer,
      userAgent,
    });
  } catch {
    // Ошибка аналитики не должна блокировать редирект
  }

  return NextResponse.redirect(link.targetUrl, { status: 302 });
}
