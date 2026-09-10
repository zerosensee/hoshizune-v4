/**
 * Скрипт очистки артефактов тестирования на проникновение и ротации токенов.
 * Запускается на сервере и локально: node scripts/security-cleanup.js
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase } from '../lib/database.js';

function purgeUserAndProfile(db, targetUserId, profileId) {
  if (targetUserId) {
    db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);
    db.prepare('DELETE FROM user_emails WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM short_links WHERE created_by = ?').run(targetUserId);
    db.prepare('DELETE FROM user_bans WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM staff_members WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM comments WHERE author_id = ?').run(targetUserId);
  }
  if (profileId) {
    db.prepare('DELETE FROM profiles WHERE id = ?').run(profileId);
    db.prepare('DELETE FROM comments WHERE profile_id = ?').run(profileId);
    db.prepare('DELETE FROM page_views WHERE profile_id = ?').run(profileId);
  }
}

export function runSecurityCleanup() {
  const db = getDatabase();
  console.log('[Security Cleanup] Запуск очистки артефактов тестирования...');

  const report = {
    rotatedTokens: 0,
    deletedAccounts: 0,
    deletedSubscriptions: 0,
    deletedLinks: 0,
    deletedFiles: 0,
  };

  try {
    // 1. Ротация всех account_token в таблице users
    const users = db.prepare('SELECT id FROM users').all();
    const updateToken = db.prepare('UPDATE users SET account_token = ? WHERE id = ?');

    for (const u of users) {
      const newToken = `htk_${crypto.randomBytes(16).toString('hex')}`;
      updateToken.run(newToken, u.id);
      report.rotatedTokens++;
    }
    console.log(`✓ Ротировано ${report.rotatedTokens} account_token пользователей.`);

    // 2. Удаление тестовых аккаунтов аудита (hoshizune_6f06, xss, matst)
    const testEmails = [
      'hoshizune@example.com',
      'xss@example.com',
      'matst@example.com',
      'attacker-controlled@example.org',
    ];

    for (const email of testEmails) {
      const userEmailRow = db
        .prepare('SELECT user_id FROM user_emails WHERE LOWER(email) = ?')
        .get(email.toLowerCase());

      if (userEmailRow) {
        const uid = userEmailRow.user_id;
        purgeUserAndProfile(db, uid, uid);
        report.deletedAccounts++;
        console.log(`✓ Удален тестовый аккаунт: ${email} (ID: ${uid})`);
      }
    }

    // Также удаляем по slug профиля и display_name пользователей
    const testSlugs = ['hoshizune_6f06', 'xss', 'matst'];
    for (const slug of testSlugs) {
      const p = db.prepare('SELECT id, user_id FROM profiles WHERE LOWER(slug) = ?').get(slug.toLowerCase());
      if (p) {
        purgeUserAndProfile(db, p.user_id, p.id);
        report.deletedAccounts++;
      }

      const uRows = db.prepare('SELECT id FROM users WHERE LOWER(display_name) = ?').all(slug.toLowerCase());
      for (const u of uRows) {
        purgeUserAndProfile(db, u.id, u.id);
        report.deletedAccounts++;
      }
    }

    // 3. Аннулирование тестовых подписок
    const testSubIds = ['sub_bd3134c5c7094b9c', 'sub_4aa875fd7bd76513'];
    for (const sid of testSubIds) {
      const res = db.prepare('DELETE FROM subscriptions WHERE id = ?').run(sid);
      if (res.changes > 0) {
        report.deletedSubscriptions += res.changes;
        console.log(`✓ Удалена тестовая подписка: ${sid}`);
      }
    }

    // Также удаляем любые подписки с отрицательным или аномальным сроком (> 3650 дней)
    const anomalySubs = db
      .prepare('DELETE FROM subscriptions WHERE duration_days < 0 OR duration_days > 3650')
      .run();
    report.deletedSubscriptions += anomalySubs.changes;

    // 4. Удаление тестовых коротких ссылок
    const testCodes = ['RWD1nbe', 'auth', 'LiSjpOe', 'TU1PV32'];
    for (const code of testCodes) {
      const res = db.prepare('DELETE FROM short_links WHERE code = ?').run(code);
      if (res.changes > 0) {
        report.deletedLinks += res.changes;
        console.log(`✓ Удалена тестовая короткая ссылка с кодом: ${code}`);
      }
    }

    // Удаляем ссылки на example.com, 127.0.0.1, 169.254.169.254
    const badTargets = db.prepare(`
      DELETE FROM short_links 
      WHERE target_url LIKE '%example.com%' 
         OR target_url LIKE '%127.0.0.1%' 
         OR target_url LIKE '%169.254.%'
         OR target_url LIKE '%localhost%'
    `).run();
    report.deletedLinks += badTargets.changes;

    // 5. Удаление SVG-зонда и любых .svg в public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.svg')) {
          fs.unlinkSync(path.join(uploadsDir, file));
          report.deletedFiles++;
          console.log(`✓ Удален опасный SVG-файл: ${file}`);
        }
      }
    }

    console.log('[Security Cleanup] Очистка успешно завершена:', report);
    return report;
  } catch (error) {
    console.error('[Security Cleanup] Ошибка выполнения:', error);
    return report;
  }
}

// Запуск при прямом вызове
if (process.argv[1] && process.argv[1].endsWith('security-cleanup.js')) {
  runSecurityCleanup();
}
