/**
 * Сервис отправки электронных писем, генерации кодов подтверждения и сброса паролей.
 * Поддерживает 6-значную двухфакторную верификацию регистрации по email.
 */
import crypto from 'crypto';
import { getDatabase } from './database';

/**
 * Генерация случайного 6-значного кода подтверждения.
 * @returns {string} 6-значный цифровой код
 */
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Генерация случайного токена сброса пароля.
 * @returns {string} Токен 64 символа
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Создание 6-значного кода подтверждения почты при регистрации.
 * @param {string} email - Email пользователя
 * @returns {{ code: string, expiresAt: number }}
 */
export function createEmailVerificationCode(email) {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateVerificationCode();
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 минут

  db.prepare(`
    INSERT INTO email_verifications (email, code, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(normalizedEmail, code, expiresAt, now);

  sendVerificationEmail(normalizedEmail, code);

  return { code, expiresAt, email: normalizedEmail };
}

/**
 * Проверка введенного 6-значного кода подтверждения почты.
 * @param {string} email - Email пользователя
 * @param {string} code - 6-значный код
 * @returns {boolean} True если код верный и валидный
 */
export function verifyEmailCode(email, code) {
  if (!email || !code) return false;
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const row = db
    .prepare(`
      SELECT * FROM email_verifications
      WHERE LOWER(email) = ? AND code = ? AND used = 0
      ORDER BY id DESC LIMIT 1
    `)
    .get(normalizedEmail, cleanCode);

  if (!row) return false;
  if (row.expires_at < Date.now()) return false;

  // Помечаем код как использованный
  db.prepare('UPDATE email_verifications SET used = 1 WHERE id = ?').run(row.id);

  // Обновляем статус верификации пользователя
  db.prepare(`
    UPDATE users SET is_verified = 1, updated_at = ?
    WHERE id IN (
      SELECT user_id FROM user_emails WHERE LOWER(email) = ?
    )
  `).run(Date.now(), normalizedEmail);

  return true;
}

/**
 * Симуляция / Отправка письма с кодом подтверждения.
 * @param {string} email - Email получателя
 * @param {string} code - 6-значный код
 */
export async function sendVerificationEmail(email, code) {
  console.log(`\n==================================================`);
  console.log(`[SMTP CONFIRMATION CODE] Получатель: ${email}`);
  console.log(`ВАШ КОД ПОДТВЕРЖДЕНИЯ РЕГИСТРАЦИИ: [ ${code} ]`);
  console.log(`Срок действия кода: 15 минут`);
  console.log(`==================================================\n`);
  return true;
}

/**
 * Создание запроса на сброс пароля.
 * @param {string} email - Email пользователя
 * @returns {{ token: string, expiresAt: number }|null}
 */
export function createPasswordResetToken(email) {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  const userEmailRow = db
    .prepare('SELECT user_id FROM user_emails WHERE LOWER(email) = ?')
    .get(normalizedEmail);

  if (!userEmailRow) {
    return null;
  }

  const token = generateResetToken();
  const now = Date.now();
  const expiresAt = now + 3600 * 1000; // 1 час

  db.prepare(`
    INSERT INTO password_resets (email, token, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(normalizedEmail, token, expiresAt, now);

  return { token, expiresAt, email: normalizedEmail };
}

/**
 * Валидация токена сброса пароля.
 * @param {string} token - Токен
 * @returns {{ email: string }|null}
 */
export function validateResetToken(token) {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0')
    .get(token);

  if (!row) return null;
  if (row.expires_at < Date.now()) return null;

  return { email: row.email, id: row.id };
}

/**
 * Пометка токена сброса пароля как использованного.
 * @param {string} token - Использованный токен
 */
export function markResetTokenUsed(token) {
  const db = getDatabase();
  db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);
}

/**
 * Отправка сообщения сброса пароля.
 * @param {string} email - Email получателя
 * @param {string} resetLink - Ссылка на сброс пароля
 */
export async function sendPasswordResetEmail(email, resetLink) {
  console.log(`\n==================================================`);
  console.log(`[SMTP RESET LINK] Сброс пароля для ${email}`);
  console.log(`Ссылка восстановления: ${resetLink}`);
  console.log(`==================================================\n`);
  return true;
}
