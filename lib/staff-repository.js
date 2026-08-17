/**
 * Репозиторий состава администрации (Staff) Hoshizune v4.
 */
import { getDatabase } from './database';
import crypto from 'crypto';

export function getAllStaff() {
  const db = getDatabase();
  try {
    // Автоматический сидинг Владельца в состав администрации
    try {
      const ownerProf = db.prepare('SELECT user_id, id, display_name FROM profiles WHERE is_owner = 1 OR LOWER(slug) = "hoshizune" OR LOWER(display_name) = "zerosense"').get();
      if (ownerProf) {
        const ownerUserId = ownerProf.user_id || ownerProf.id;
        const existing = db.prepare('SELECT id FROM staff_members WHERE user_id = ?').get(ownerUserId);
        if (!existing) {
          const id = `stf_${crypto.randomBytes(8).toString('hex')}`;
          db.prepare(`
            INSERT INTO staff_members (id, user_id, position, notes, added_by, created_at)
            VALUES (?, ?, 'Основатель & Главный Администратор', 'Разработчик и создатель платформы Hoshizune', 'System', ?)
          `).run(id, ownerUserId, Date.now());
        }
      }
    } catch {}

    const rows = db.prepare(`
      SELECT sm.*, ue.email as user_email,
             CASE WHEN p.is_owner = 1 THEN 'owner' WHEN u.is_admin = 1 THEN 'admin' ELSE 'user' END as user_role,
             p.display_name, p.slug, p.avatar_path, p.level
      FROM staff_members sm
      LEFT JOIN users u ON u.id = sm.user_id
      LEFT JOIN user_emails ue ON (ue.user_id = u.id OR ue.user_id = sm.user_id) AND ue.is_primary = 1
      LEFT JOIN profiles p ON p.user_id = sm.user_id OR p.id = sm.user_id
      ORDER BY sm.created_at ASC
    `).all();

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      displayName: r.display_name || r.user_id,
      slug: r.slug || r.user_id,
      userEmail: r.user_email || '',
      userRole: r.user_role || 'user',
      avatarPath: r.avatar_path || '',
      level: r.level || 1,
      position: r.position || 'Сотрудник',
      notes: r.notes || '',
      addedBy: r.added_by || 'Owner',
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error('[getAllStaff] Ошибка чтения списка состава:', err);
    return [];
  }
}

export function addStaffMember({ userId, position = 'Модератор', notes = '', addedBy = 'Admin' }) {
  const db = getDatabase();
  const id = `stf_${crypto.randomBytes(8).toString('hex')}`;
  const now = Date.now();

  db.prepare(`
    INSERT INTO staff_members (id, user_id, position, notes, added_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      position = excluded.position,
      notes = excluded.notes,
      added_by = excluded.added_by
  `).run(id, userId, position || 'Модератор', notes || '', addedBy || 'Admin', now);

  return id;
}

export function removeStaffMember(idOrUserId) {
  const db = getDatabase();
  db.prepare('DELETE FROM staff_members WHERE id = ? OR user_id = ?').run(idOrUserId, idOrUserId);
}
