/**
 * API галереи профилей.
 * GET /api/explore — список публичных профилей с пагинацией и фильтрацией.
 */
import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

/** Максимальное количество профилей на страницу */
const PAGE_SIZE = 24;

/**
 * Форматирование строки БД в публичный объект профиля для галереи.
 * @param {object} row - Строка из SQLite
 * @returns {object} Публичный профиль
 */
function formatPublicProfile(row) {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    displayName: row.display_name,
    bioText: row.bio_text
      ? row.bio_text.slice(0, 120)
      : '',
    avatarPath: row.avatar_path,
    accentColor: row.accent_color || '#ffffff',
    viewCount: row.view_count,
    level: row.effective_level || row.level || 1,
    isOwner: !!row.is_owner,
    linksCount: (() => {
      try {
        return JSON.parse(row.links || '[]').length;
      } catch {
        return 0;
      }
    })(),
    createdAt: row.created_at,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(
    1,
    parseInt(searchParams.get('page') || '1', 10),
  );
  const search = (searchParams.get('q') || '').trim();
  const sort = searchParams.get('sort') || 'newest';

  const offset = (page - 1) * PAGE_SIZE;

  try {
    const db = getDatabase();

    /* Построение ORDER BY */
    const orderMap = {
      newest: 'p.created_at DESC',
      popular: 'p.view_count DESC',
      oldest: 'p.created_at ASC',
    };
    const orderBy = orderMap[sort] || orderMap.newest;

    let rows;
    let totalRow;

    if (search) {
      /* Поиск по имени и slug */
      const likeParam = `%${search}%`;
      rows = db
        .prepare(
          `SELECT p.*, COALESCE(u.level, p.level, 1) as effective_level
           FROM profiles p
           LEFT JOIN users u ON u.id = p.user_id OR LOWER(u.display_name) = LOWER(p.display_name) OR LOWER(u.display_name) = LOWER(p.slug)
           WHERE (p.display_name LIKE ? OR p.slug LIKE ?)
           ORDER BY ${orderBy}
           LIMIT ? OFFSET ?`,
        )
        .all(likeParam, likeParam, PAGE_SIZE, offset);

      totalRow = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM profiles
           WHERE (display_name LIKE ? OR slug LIKE ?)`,
        )
        .get(likeParam, likeParam);
    } else {
      rows = db
        .prepare(
          `SELECT p.*, COALESCE(u.level, p.level, 1) as effective_level
           FROM profiles p
           LEFT JOIN users u ON u.id = p.user_id OR LOWER(u.display_name) = LOWER(p.display_name) OR LOWER(u.display_name) = LOWER(p.slug)
           ORDER BY ${orderBy}
           LIMIT ? OFFSET ?`,
        )
        .all(PAGE_SIZE, offset);

      totalRow = db
        .prepare(
          'SELECT COUNT(*) as cnt FROM profiles',
        )
        .get();
    }

    const total = totalRow?.cnt ?? 0;
    const profiles = rows.map(formatPublicProfile);

    return NextResponse.json({
      profiles,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error('Ошибка загрузки галереи профилей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}
