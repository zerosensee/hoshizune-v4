/**
 * Утилита анализа User-Agent и сетевых метаданных (ОС, Браузер, Устройство).
 */

export function parseUserAgent(ua = '') {
  if (!ua || typeof ua !== 'string') {
    return {
      os: 'Неизвестно',
      browser: 'Неизвестно',
      device: 'Desktop (ПК)',
    };
  }

  const uaLower = ua.toLowerCase();

  // Определение Операционной системы
  let os = 'Другая ОС';
  if (uaLower.includes('windows nt 10.0')) os = 'Windows 10/11';
  else if (uaLower.includes('windows nt 6.3')) os = 'Windows 8.1';
  else if (uaLower.includes('windows nt 6.1')) os = 'Windows 7';
  else if (uaLower.includes('mac os x')) os = 'macOS';
  else if (uaLower.includes('android')) os = 'Android';
  else if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) os = 'iOS';
  else if (uaLower.includes('linux')) os = 'Linux';

  // Определение Браузера
  let browser = 'Неизвестный браузер';
  if (uaLower.includes('edg/')) browser = 'Microsoft Edge';
  else if (uaLower.includes('yabrowser/')) browser = 'Яндекс Браузер';
  else if (uaLower.includes('opr/') || uaLower.includes('opera')) browser = 'Opera';
  else if ((uaLower.includes('chrome/') || uaLower.includes('crios/')) && !uaLower.includes('edg/')) browser = 'Google Chrome';
  else if (uaLower.includes('firefox/') || uaLower.includes('fxios/')) browser = 'Mozilla Firefox';
  else if (uaLower.includes('safari/') && !uaLower.includes('chrome/')) browser = 'Apple Safari';

  // Определение Устройства
  let device = 'Desktop (ПК)';
  if (uaLower.includes('iphone') || (uaLower.includes('android') && uaLower.includes('mobile'))) {
    device = 'Smartphone (Смартфон)';
  } else if (uaLower.includes('ipad') || uaLower.includes('tablet')) {
    device = 'Tablet (Планшет)';
  }

  return { os, browser, device };
}

export function extractClientInfo(request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  const ua = request.headers.get('user-agent') || '';
  const parsed = parseUserAgent(ua);

  return {
    ip,
    userAgent: ua,
    os: parsed.os,
    browser: parsed.browser,
    device: parsed.device,
  };
}
