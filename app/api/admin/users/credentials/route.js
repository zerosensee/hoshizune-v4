/**
 * API изменения учётных данных (паролей, email) для администратора.
 * POST /api/admin/users/credentials — { userId, newPassword, newEmail, changeAdminConfigPassword }
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAdminAuthorized, unauthorizedResponse } from '@/lib/admin-auth';
import { getDatabase } from '@/lib/database';
import { updateUserPassword, hashPassword } from '@/lib/user-repository';

const CONFIG_PATH = path.join(process.cwd(), 'admin-config.json');

export async function POST(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { userId, newPassword, newEmail, changeAdminConfigPassword } = body;

    const db = getDatabase();

    // Гарантируем существование пользователя и почты в базе данных
    if (userId) {
      const existingUser = db
        .prepare('SELECT id FROM users WHERE id = ?')
        .get(userId);

      if (!existingUser) {
        const now = Date.now();
        const initialHash = hashPassword(newPassword || 'NXCRtop0812');
        db.prepare(`
          INSERT INTO users (id, display_name, password_hash, is_admin, is_verified, created_at, updated_at)
          VALUES (?, ?, ?, 0, 1, ?, ?)
        `).run(userId, userId, initialHash, now, now);

        db.prepare(`
          UPDATE profiles SET user_id = ? WHERE id = ?
        `).run(userId, userId);
      }
    }

    // Обновление пароля
    if (newPassword) {
      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: 'Пароль должен содержать минимум 4 символа' },
          { status: 400 }
        );
      }

      if (userId) {
        updateUserPassword(userId, newPassword);
      } else {
        const adminUsers = db
          .prepare('SELECT id FROM users WHERE is_admin = 1')
          .all();
        for (const u of adminUsers) {
          updateUserPassword(u.id, newPassword);
        }
      }

      if (changeAdminConfigPassword || !userId) {
        try {
          const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
          const config = JSON.parse(configContent);
          config.adminPassword = newPassword;
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
        } catch (e) {
          console.error('Ошибка записи admin-config.json:', e);
        }
      }
    }

    // Обновление основного email
    if (newEmail && userId) {
      const normalizedEmail = newEmail.trim().toLowerCase();

      const existingEmail = db
        .prepare('SELECT id FROM user_emails WHERE LOWER(email) = ? AND user_id != ?')
        .get(normalizedEmail, userId);

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Данный email уже привязан к другому аккаунту' },
          { status: 400 }
        );
      }

      const userEmailRecord = db
        .prepare('SELECT id FROM user_emails WHERE user_id = ?')
        .get(userId);

      if (userEmailRecord) {
        db.prepare(`
          UPDATE user_emails SET email = ? WHERE user_id = ? AND is_primary = 1
        `).run(normalizedEmail, userId);
      } else {
        db.prepare(`
          INSERT INTO user_emails (user_id, email, is_primary, created_at)
          VALUES (?, ?, 1, ?)
        `).run(userId, normalizedEmail, Date.now());
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Пароль и привязки успешно изменены!',
    });
  } catch (error) {
    console.error('Ошибка при смене учетных данных:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить данные пользователя' },
      { status: 500 }
    );
  }
}
