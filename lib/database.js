/**
 * Инициализация SQLite базы данных Hoshizune Bio.
 * Singleton-подключение + автомиграция таблиц.
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'hoshizune.db');

let dbInstance = null;

/**
 * Получение singleton-экземпляра базы данных.
 * Создаёт папку data/ и таблицы при первом вызове.
 * @returns {Database.Database} Экземпляр SQLite
 */
export function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  const fs = require('fs');
  const dir = path.dirname(DB_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  runMigrations(dbInstance);

  return dbInstance;
}

/**
 * Выполнение миграций — создание всех таблиц.
 * @param {Database.Database} db - Экземпляр SQLite
 */
function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id            TEXT PRIMARY KEY,
      slug          TEXT UNIQUE NOT NULL,
      display_name  TEXT NOT NULL,
      bio_text      TEXT DEFAULT '',
      avatar_path   TEXT DEFAULT NULL,
      accent_color  TEXT DEFAULT '#ffffff',
      links         TEXT DEFAULT '[]',
      status        TEXT DEFAULT 'online',
      last_seen     INTEGER DEFAULT 0,
      view_count    INTEGER DEFAULT 0,
      is_owner      INTEGER DEFAULT 0,
      created_at    INTEGER DEFAULT 0,
      updated_at    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id  TEXT NOT NULL,
      author_id   TEXT NOT NULL,
      author_name TEXT DEFAULT 'Аноним',
      text        TEXT NOT NULL,
      rating      INTEGER DEFAULT 0,
      created_at  INTEGER DEFAULT 0,
      FOREIGN KEY (profile_id)
        REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS short_links (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      code        TEXT UNIQUE NOT NULL,
      target_url  TEXT NOT NULL,
      title       TEXT DEFAULT '',
      clicks      INTEGER DEFAULT 0,
      created_by  TEXT DEFAULT NULL,
      is_active   INTEGER DEFAULT 1,
      created_at  INTEGER DEFAULT 0,
      expires_at  INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id  TEXT NOT NULL,
      ip_hash     TEXT NOT NULL,
      referrer    TEXT DEFAULT '',
      user_agent  TEXT DEFAULT '',
      viewed_at   INTEGER DEFAULT 0,
      FOREIGN KEY (profile_id)
        REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS link_clicks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id     INTEGER NOT NULL,
      ip_hash     TEXT NOT NULL,
      referrer    TEXT DEFAULT '',
      user_agent  TEXT DEFAULT '',
      clicked_at  INTEGER DEFAULT 0,
      FOREIGN KEY (link_id)
        REFERENCES short_links(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      display_name  TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin      INTEGER DEFAULT 0,
      created_at    INTEGER DEFAULT 0,
      updated_at    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_emails (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      is_primary INTEGER DEFAULT 0,
      is_virtual INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT 0,
      FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at INTEGER DEFAULT 0,
      expires_at INTEGER DEFAULT 0,
      FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL,
      token      TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      used       INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      color       TEXT DEFAULT '#ffffff',
      badge_text  TEXT DEFAULT '',
      is_system   INTEGER DEFAULT 0,
      permissions TEXT DEFAULT '[]',
      created_at  INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL,
      code       TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used       INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_slug
      ON profiles(slug);
    CREATE INDEX IF NOT EXISTS idx_comments_profile
      ON comments(profile_id);
    CREATE INDEX IF NOT EXISTS idx_short_links_code
      ON short_links(code);
    CREATE INDEX IF NOT EXISTS idx_page_views_profile
      ON page_views(profile_id);
    CREATE INDEX IF NOT EXISTS idx_page_views_date
      ON page_views(viewed_at);
    CREATE INDEX IF NOT EXISTS idx_link_clicks_link
      ON link_clicks(link_id);
    CREATE INDEX IF NOT EXISTS idx_user_emails_email
      ON user_emails(email);
    CREATE INDEX IF NOT EXISTS idx_user_emails_user
      ON user_emails(user_id);
  `);

  runAlterMigrations(db);
  seedDefaultAdmin(db);
}

/**
 * Безопасное добавление новых колонок в существующие таблицы.
 * SQLite не поддерживает IF NOT EXISTS в ALTER TABLE —
 * каждый оператор оборачивается в try/catch.
 * @param {Database.Database} db - Экземпляр SQLite
 */
function runAlterMigrations(db) {
  const alterColumns = [
    'ALTER TABLE profiles ADD COLUMN typing_effect INTEGER DEFAULT 0',
    'ALTER TABLE profiles ADD COLUMN pinned_track TEXT DEFAULT NULL',
    'ALTER TABLE profiles ADD COLUMN music_url TEXT DEFAULT NULL',
    'ALTER TABLE profiles ADD COLUMN user_id TEXT DEFAULT NULL',
    'ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1',
    'ALTER TABLE profiles ADD COLUMN custom_title TEXT DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1',
    "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
    'ALTER TABLE users ADD COLUMN title_id TEXT DEFAULT NULL',
    "ALTER TABLE users ADD COLUMN roles_json TEXT DEFAULT '[]'",
    "ALTER TABLE users ADD COLUMN titles_json TEXT DEFAULT '[]'",
    'ALTER TABLE users ADD COLUMN account_token TEXT DEFAULT NULL',
    'ALTER TABLE user_sessions ADD COLUMN session_token TEXT DEFAULT NULL',
    "ALTER TABLE user_sessions ADD COLUMN ip_address TEXT DEFAULT ''",
    "ALTER TABLE user_sessions ADD COLUMN user_agent TEXT DEFAULT ''",
    "ALTER TABLE user_sessions ADD COLUMN device_info TEXT DEFAULT ''",
    "ALTER TABLE user_sessions ADD COLUMN location TEXT DEFAULT ''",
    'ALTER TABLE user_sessions ADD COLUMN last_active INTEGER DEFAULT 0',
    'ALTER TABLE user_sessions ADD COLUMN is_active INTEGER DEFAULT 1',
    'ALTER TABLE roles ADD COLUMN sort_order INTEGER DEFAULT 0',
    'ALTER TABLE profiles ADD COLUMN allow_comments INTEGER DEFAULT 1',
    "ALTER TABLE profiles ADD COLUMN restrictions TEXT DEFAULT '[]'",
    "ALTER TABLE users ADD COLUMN restrictions TEXT DEFAULT '[]'",
    "ALTER TABLE profiles ADD COLUMN last_ip TEXT DEFAULT ''",
    "ALTER TABLE profiles ADD COLUMN last_user_agent TEXT DEFAULT ''",
    "ALTER TABLE profiles ADD COLUMN os_info TEXT DEFAULT ''",
    "ALTER TABLE profiles ADD COLUMN browser_info TEXT DEFAULT ''",
    "ALTER TABLE profiles ADD COLUMN device_info TEXT DEFAULT ''",
    "ALTER TABLE profiles ADD COLUMN track_online INTEGER DEFAULT 1",
    "ALTER TABLE users ADD COLUMN last_ip TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN last_user_agent TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN os_info TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN browser_info TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN device_info TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN track_online INTEGER DEFAULT 1",
    "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
    "ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user'",
  ];

  for (const sql of alterColumns) {
    try {
      db.exec(sql);
    } catch {
      // Колонка уже существует — игнорируем ошибку
    }
  }

  // Создание новых таблиц в отдельных блоках try/catch
  const newTables = [
    `CREATE TABLE IF NOT EXISTS user_bans (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      TEXT DEFAULT NULL,
      ip_address   TEXT DEFAULT NULL,
      ban_type     TEXT NOT NULL,
      reason       TEXT DEFAULT 'Нарушение правил',
      banned_by    TEXT DEFAULT 'Admin',
      created_at   INTEGER NOT NULL,
      expires_at   INTEGER DEFAULT NULL,
      is_active    INTEGER DEFAULT 1
    );`,
    `CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_user_bans_ip ON user_bans(ip_address);`,
    `CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);`,

    `CREATE TABLE IF NOT EXISTS subscriptions (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL,
      email          TEXT DEFAULT '',
      order_id       TEXT DEFAULT '',
      plan_name      TEXT DEFAULT 'Premium',
      duration_days  INTEGER DEFAULT 30,
      created_at     INTEGER NOT NULL,
      expires_at     INTEGER NOT NULL,
      status         TEXT DEFAULT 'active'
    );`,
    `CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);`,

    `CREATE TABLE IF NOT EXISTS staff_members (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL UNIQUE,
      position    TEXT DEFAULT 'Модератор',
      notes       TEXT DEFAULT '',
      added_by    TEXT DEFAULT 'Owner',
      created_at  INTEGER NOT NULL
    );`
  ];

  for (const sql of newTables) {
    try {
      db.exec(sql);
    } catch (err) {
      console.error('[runAlterMigrations] Ошибка инициализации таблицы/индекса:', err);
    }
  }

  // Автоматическая генерация account_token для всех существующих учётных записей
  try {
    const crypto = require('crypto');
    const rows = db.prepare('SELECT id FROM users WHERE account_token IS NULL OR account_token = ""').all();
    const updateStmt = db.prepare('UPDATE users SET account_token = ? WHERE id = ?');
    for (const r of rows) {
      const token = `htk_${crypto.randomBytes(16).toString('hex')}`;
      updateStmt.run(token, r.id);
    }
  } catch {
    // Игнорируем ошибки при первичной подтяжке
  }

  // Наполнение стартовыми ролями и титулами
  try {
    const seedRoles = [
      {
        id: 'owner',
        name: 'Владелец (Owner)',
        color: '#f43f5e',
        badge_text: 'OWNER',
        is_system: 1,
        permissions: JSON.stringify([
          'access_admin',
          'manage_profiles',
          'manage_comments',
          'manage_credentials',
          'manage_links',
          'manage_roles',
          'view_analytics',
          'manage_settings',
        ]),
      },
      {
        id: 'admin',
        name: 'Администратор (Admin)',
        color: '#facc15',
        badge_text: 'ADMIN',
        is_system: 1,
        permissions: JSON.stringify([
          'access_admin',
          'manage_profiles',
          'manage_comments',
          'manage_credentials',
          'manage_links',
          'view_analytics',
        ]),
      },
      {
        id: 'support',
        name: 'Техподдержка (Support)',
        color: '#38bdf8',
        badge_text: 'SUPPORT',
        is_system: 1,
        permissions: JSON.stringify([
          'access_admin',
          'manage_comments',
          'view_analytics',
        ]),
      },
      {
        id: 'user',
        name: 'Обычный пользователь',
        color: '#9ca3af',
        badge_text: 'USER',
        is_system: 1,
        permissions: JSON.stringify([]),
      },
      {
        id: 'vip',
        name: 'VIP Титул',
        color: '#a855f7',
        badge_text: 'VIP',
        is_system: 0,
        permissions: JSON.stringify([]),
      },
      {
        id: 'vibe',
        name: 'Нищий Вайбкодер',
        color: '#4ade80',
        badge_text: 'VIBECODER',
        is_system: 0,
        permissions: JSON.stringify([]),
      },
    ];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO roles (id, name, color, badge_text, is_system, permissions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    for (const r of seedRoles) {
      insertStmt.run(r.id, r.name, r.color, r.badge_text, r.is_system, r.permissions, now);
    }
  } catch (err) {
    // Игнорируем ошибки при сидировании
  }

  // Авто-верификация всех пользователей, выдача прав owner/admin и установка пароля NXCRtop0812
  try {
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync('NXCRtop0812', salt, 10000, 64, 'sha512')
      .toString('hex');
    const newPasswordHash = `pbkdf2:${salt}:${hash}`;

    db.prepare(`
      UPDATE users SET is_verified = 1
      WHERE is_verified = 0 OR is_verified IS NULL
    `).run();

    // Назначаем роль owner аккаунту zerosense и выставляем стартовый пароль только если он пустой
    db.prepare(`
      UPDATE users SET role = 'owner', title_id = 'vibe', is_admin = 1, is_verified = 1
      WHERE id IN (
        SELECT user_id FROM user_emails WHERE LOWER(email) IN ('awianfaip@gmail.com', 'founder@hoshizune.space')
      ) OR LOWER(display_name) = 'zerosense'
    `).run();

    db.prepare(`
      UPDATE users SET password_hash = ?
      WHERE (password_hash IS NULL OR password_hash = '')
      AND (id IN (
        SELECT user_id FROM user_emails WHERE LOWER(email) IN ('awianfaip@gmail.com', 'founder@hoshizune.space')
      ) OR LOWER(display_name) = 'zerosense')
    `).run(newPasswordHash);

    // Очищаем случайные привязки почты основателя у сторонних пользователей
    db.prepare(`
      DELETE FROM user_emails
      WHERE LOWER(email) IN ('awianfaip@gmail.com', 'founder@hoshizune.space')
      AND user_id NOT IN (
        SELECT id FROM users WHERE LOWER(display_name) = 'zerosense' OR id = 'admin-user-zerosense-001'
      )
    `).run();

    // Сбрасываем накрученные через DevTools уровни (> 999), просмотры и фейковые роли owner для всех не-основателей
    db.prepare(`
      UPDATE users SET level = 1, role = 'user', roles_json = '["user"]'
      WHERE level > 999 AND LOWER(display_name) != 'zerosense' AND id != 'admin-user-zerosense-001'
    `).run();

    db.prepare(`
      UPDATE profiles SET level = 1, view_count = 0, is_owner = 0
      WHERE (level > 999 OR view_count > 1000000 OR is_owner = 1)
      AND LOWER(slug) != 'hoshizune' AND user_id NOT IN (
        SELECT id FROM users WHERE LOWER(display_name) = 'zerosense' OR id = 'admin-user-zerosense-001'
      )
    `).run();
  } catch {
    // Игнорируем если колонки ещё нет
  }

  // Восстановление данных профиля hoshizune, уровня 999 и ссылок
  try {
    const defaultLinks = [
      { label: 'Steam', url: 'https://steamcommunity.com' },
      { label: 'Telegram', url: 'https://t.me' },
      { label: 'Spotify', url: 'https://open.spotify.com' },
      { label: 'Discord', url: 'https://discord.com' },
    ];

    const owner = db.prepare('SELECT * FROM profiles WHERE is_owner = 1 OR slug = ?').get('hoshizune');
    if (owner) {
      let currentLinks = [];
      try { currentLinks = JSON.parse(owner.links || '[]'); } catch {}
      if (currentLinks.length === 0) {
        db.prepare(`
          UPDATE profiles SET links = ?, level = 999, bio_text = '01 Нищий вайбкодер' WHERE id = ?
        `).run(JSON.stringify(defaultLinks), owner.id);
      } else {
        db.prepare('UPDATE profiles SET level = 999 WHERE id = ?').run(owner.id);
      }

      // Синхронизируем также таблицу users
      if (owner.user_id) {
        db.prepare('UPDATE users SET level = 999 WHERE id = ?').run(owner.user_id);
      }
    }
  } catch (err) {
    console.error('Ошибка восстановления данных профиля:', err);
  }
}

/**
 * Автоматический сидинг главного администратора с почтами:
 * - awianfaip@gmail.com (основная)
 * - founder@hoshizune.space (виртуальная)
 * @param {Database.Database} db - Экземпляр SQLite
 */
function seedDefaultAdmin(db) {
  try {
    const adminEmail = 'awianfaip@gmail.com';
    const virtualEmail = 'founder@hoshizune.space';
    
    // Проверяем, существует ли уже почта админа
    const existing = db
      .prepare('SELECT user_id FROM user_emails WHERE email = ?')
      .get(adminEmail);

    if (existing) {
      // Привязываем профиль владельца, если ещё не привязан
      db.prepare(
        'UPDATE profiles SET user_id = ? WHERE is_owner = 1 AND user_id IS NULL'
      ).run(existing.user_id);
      return;
    }

    const crypto = require('crypto');
    const adminUserId = 'admin-user-zerosense-001';
    const now = Date.now();
    // Хеш пароля по умолчанию "admin123" с использованием pbkdf2
    const salt = 'hoshizune_static_salt_v4';
    const hash = crypto
      .pbkdf2Sync('admin123', salt, 10000, 64, 'sha512')
      .toString('hex');
    const storedPassword = `pbkdf2:${salt}:${hash}`;

    db.prepare(`
      INSERT INTO users (
        id, display_name, password_hash, is_admin, is_verified, created_at, updated_at
      ) VALUES (?, ?, ?, 1, 1, ?, ?)
    `).run(adminUserId, 'zerosense', storedPassword, now, now);

    db.prepare(`
      INSERT INTO user_emails (
        user_id, email, is_primary, is_virtual, created_at
      ) VALUES (?, ?, 1, 0, ?)
    `).run(adminUserId, adminEmail, now);

    db.prepare(`
      INSERT INTO user_emails (
        user_id, email, is_primary, is_virtual, created_at
      ) VALUES (?, ?, 0, 1, ?)
    `).run(adminUserId, virtualEmail, now);

    // Связываем профиль владельца с пользователем
    db.prepare(
      'UPDATE profiles SET user_id = ? WHERE is_owner = 1'
    ).run(adminUserId);
  } catch (err) {
    console.error('Ошибка сидинга администратора:', err);
  }
}

/**
 * Чтение сохранённых настроек из БД SQLite.
 */
export function getDbSettings() {
  const db = getDatabase();
  try {
    const row = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get('global_config');
    if (row && row.value) {
      return JSON.parse(row.value);
    }
  } catch {}
  return {
    allowedIps: ['*'],
    allowLocalNetwork: true,
    adminSubdomain: 'admin.hoshizune.space',
    sessionMaxAge: 86400,
  };
}

/**
 * Сохранение настроек в БД SQLite (синхронизация на сервере).
 */
export function saveDbSettings(settings) {
  const db = getDatabase();
  const current = getDbSettings();
  const updated = { ...current, ...settings };
  db.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').run('global_config', JSON.stringify(updated));
  return updated;
}

