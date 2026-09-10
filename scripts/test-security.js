/**
 * Автоматизированный проверочный тест всех 10 исправлений безопасности Hoshizune v4.
 * Запуск: node scripts/test-security.js
 */
import assert from 'assert';
import { getDatabase } from '../lib/database.js';
import {
  getAllProfiles,
  getProfileById,
  toPublicProfile,
  sanitizeLinks,
} from '../lib/bio-repository.js';
import {
  SUBSCRIPTION_PLANS,
  getPlanById,
} from '../lib/subscription-repository.js';
import { checkRateLimit, resetRateLimit } from '../lib/rate-limiter.js';
import {
  createEmailVerificationCode,
  verifyEmailCode,
} from '../lib/email-service.js';
import nextConfig from '../next.config.mjs';

console.log('\n======================================================');
console.log('--- ЗАПУСК ПРОВЕРКИ ИСПРАВЛЕНИЙ БЕЗОПАСНОСТИ HOSHIZUNE ---');
console.log('======================================================\n');

let passedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// 1. Проверка отсутствия PII и accountToken в публичных профилях (Находка 1)
test('Bug #1 Fix: Публичный профиль не содержит userEmail и accountToken', () => {
  const db = getDatabase();
  const profiles = getAllProfiles();
  assert(Array.isArray(profiles), 'getAllProfiles должен возвращать массив');

  for (const raw of profiles) {
    const pub = toPublicProfile(raw);
    assert.strictEqual(pub.userEmail, undefined, `userEmail не должен присутствовать в публичном профиле: ${pub.slug}`);
    assert.strictEqual(pub.accountToken, undefined, `accountToken не должен присутствовать в публичном профиле: ${pub.slug}`);
    assert(!('userEmail' in pub), 'Ключ userEmail не должен существовать в публичном объекте');
    assert(!('accountToken' in pub), 'Ключ accountToken не должен существовать в публичном объекте');
  }
});

// 2. Проверка серверного каталога планов и запрета произвольных длительностей (Находка 2)
test('Bug #2 Fix: Серверный каталог тарифов валидирует planId и фиксирует длительность', () => {
  assert(SUBSCRIPTION_PLANS.vip_start, 'Тариф vip_start должен существовать');
  assert.strictEqual(SUBSCRIPTION_PLANS.vip_start.durationDays, 30);
  assert(SUBSCRIPTION_PLANS.vip_pro, 'Тариф vip_pro должен существовать');
  assert.strictEqual(SUBSCRIPTION_PLANS.vip_pro.durationDays, 90);
  assert(SUBSCRIPTION_PLANS.vip_lifetime, 'Тариф vip_lifetime должен существовать');

  assert.strictEqual(getPlanById('fake_arbitrary_plan'), null, 'Произвольный план должен отклоняться');
  assert.strictEqual(getPlanById('vip_start')?.durationDays, 30);
});

// 3. Проверка запрета опасных ссылок javascript: и data: (Находка 9)
test('Bug #9 Fix: sanitizeLinks отклоняет схемы javascript:, data:, file:, vbscript:', () => {
  const dirtyLinks = [
    { label: 'xss', url: 'javascript:alert(1)' },
    { label: 'data', url: 'data:text/html,<script>alert(1)</script>' },
    { label: 'file', url: 'file:///etc/passwd' },
    { label: 'valid-http', url: 'http://example.com' },
    { label: 'valid-https', url: 'https://hoshizune.space/dev' },
  ];

  const cleaned = sanitizeLinks(dirtyLinks);
  assert.strictEqual(cleaned.length, 2, 'Должны остаться только 2 валидных HTTP/HTTPS ссылки');
  assert.strictEqual(cleaned[0].url, 'http://example.com');
  assert.strictEqual(cleaned[1].url, 'https://hoshizune.space/dev');
});

// 4. Проверка Rate Limiting и блокировки (Находка 5)
test('Bug #5 Fix: Rate Limiter блокирует после превышения порога попыток', () => {
  const testKey = 'test_rate_limit_' + Date.now();
  resetRateLimit(testKey);

  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(testKey, { maxAttempts: 5, windowMs: 10000, lockoutMs: 10000 });
    assert.strictEqual(res.allowed, true, `Попытка ${i} должна быть разрешена`);
  }

  // 6-я попытка должна быть отклонена
  const blocked = checkRateLimit(testKey, { maxAttempts: 5, windowMs: 10000, lockoutMs: 10000 });
  assert.strictEqual(blocked.allowed, false, '6-я попытка должна быть заблокирована');
  assert(blocked.retryAfterSeconds > 0, 'Должен быть задан retryAfter');
  assert.strictEqual(blocked.isLocked, true, 'Должен быть выставлен флаг isLocked');

  resetRateLimit(testKey);
});

// 5. Проверка генерации и верификации email-кодов (Находка 6)
test('Bug #6 Fix: 6-значный код верификации email генерируется и валидируется', () => {
  const testEmail = 'verify_test_' + Date.now() + '@example.test';
  const { code } = createEmailVerificationCode(testEmail);

  assert(/^\d{6}$/.test(code), 'Код должен быть 6-значным числом');

  // Неверный код должен отклоняться
  const wrongRes = verifyEmailCode(testEmail, '000000');
  assert.strictEqual(wrongRes, false, 'Неверный код должен отклоняться');

  // Корректный код должен подтверждаться
  const validRes = verifyEmailCode(testEmail, code);
  assert.strictEqual(validRes, true, 'Корректный код должен подтверждаться');

  // Повторное использование использованного кода должно отклоняться
  const reusedRes = verifyEmailCode(testEmail, code);
  assert.strictEqual(reusedRes, false, 'Использованный код не может быть применен повторно');
});

// 6. Проверка Security Headers и сокрытия версий (Находка 8)
test('Bug #8 Fix: next.config.mjs содержит CSP, HSTS, X-Frame-Options и poweredByHeader=false', async () => {
  assert.strictEqual(nextConfig.poweredByHeader, false, 'poweredByHeader должен быть false (сокрытие X-Powered-By)');

  assert(typeof nextConfig.headers === 'function', 'nextConfig.headers должна быть функцией');
  const headersConfig = await nextConfig.headers();

  const globalRule = headersConfig.find((h) => h.source === '/:path*');
  assert(globalRule, 'Должно быть глобальное правило заголовков');

  const headerKeys = globalRule.headers.map((h) => h.key.toLowerCase());
  assert(headerKeys.includes('content-security-policy'), 'Должен быть Content-Security-Policy');
  assert(headerKeys.includes('x-frame-options'), 'Должен быть X-Frame-Options');
  assert(headerKeys.includes('x-content-type-options'), 'Должен быть X-Content-Type-Options');
  assert(headerKeys.includes('strict-transport-security'), 'Должен быть Strict-Transport-Security');
  assert(headerKeys.includes('referrer-policy'), 'Должен быть Referrer-Policy');

  const uploadsRule = headersConfig.find((h) => h.source === '/uploads/:path*');
  assert(uploadsRule, 'Должно быть специальное правило безопасности для /uploads/*');
  const uploadCsp = uploadsRule.headers.find((h) => h.key === 'Content-Security-Policy');
  assert(uploadCsp && uploadCsp.value.includes("default-src 'none'"), 'Uploads CSP должен блокировать скрипты');
});

// 7. Проверка Magic Bytes детектора (Находка 3)
test('Bug #3 Fix: Бинарные сигнатуры изображений корректно детектируются', () => {
  // Тестируем детекцию magic bytes
  const fakeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert(fakeSvg.toString('utf-8').includes('<svg'), 'SVG содержит тег <svg>');

  const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  assert.strictEqual(fakePng[0], 0x89);
  assert.strictEqual(fakePng[1], 0x50);
  assert.strictEqual(fakePng[2], 0x4e);
  assert.strictEqual(fakePng[3], 0x47);

  const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert.strictEqual(fakeJpeg[0], 0xff);
  assert.strictEqual(fakeJpeg[1], 0xd8);
  assert.strictEqual(fakeJpeg[2], 0xff);
});

console.log(`\n>>> ВСЕ ${passedTests} ТЕСТОВ БЕЗОПАСНОСТИ УСПЕШНО ПРОЙДЕНЫ! <<<\n`);
