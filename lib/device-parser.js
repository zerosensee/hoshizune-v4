/**
 * Парсер строк User-Agent для определения операционной системы,
 * браузера и типа устройства пользователя.
 */

export function parseUserAgent(uaString = '') {
  if (!uaString || typeof uaString !== 'string') {
    return { os: 'Неизвестно', browser: 'Браузер', device: 'Desktop', raw: '' };
  }

  const ua = uaString.toLowerCase();
  let os = 'Неизвестная ОС';
  let browser = 'Неизвестный браузер';
  let device = 'Desktop';

  // 1. Определение операционной системы
  if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
  else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
  else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
  else if (ua.includes('android')) {
    os = 'Android';
    device = 'Mobile';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = ua.includes('ipad') ? 'iPadOS' : 'iOS';
    device = ua.includes('ipad') ? 'Tablet' : 'Mobile';
  } else if (ua.includes('mac os x') || ua.includes('macintosh')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  // 2. Определение браузера
  if (ua.includes('yaIndex') || ua.includes('yabrowser')) browser = 'Yandex Browser';
  else if (ua.includes('edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';

  return {
    os,
    browser,
    device,
    formatted: `${browser} (${os})`,
    raw: uaString,
  };
}
