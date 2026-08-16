/**
 * Серверная страница галереи профилей /explore.
 * Загружает первую страницу профилей на сервере + данные текущего пользователя.
 */
import { getDatabase } from '@/lib/database';
import { getCurrentUser } from '@/lib/user-auth';
import ExploreClient from './ExploreClient';

export const metadata = {
  title: 'Explore — Hoshizune',
  description:
    'Галерея публичных профилей платформы Hoshizune Bio. ' +
    'Находи интересных людей, изучай их ссылки и истории.',
};

const INITIAL_PAGE_SIZE = 24;

/**
 * Получение первой страницы профилей для SSR.
 * @returns {{ profiles: object[], total: number }}
 */
function getInitialProfiles() {
  try {
    const db = getDatabase();

    const rows = db
      .prepare(
        `SELECT p.id, p.user_id, p.slug, p.display_name, p.bio_text,
                p.avatar_path, p.accent_color, p.view_count, p.level,
                p.links, p.created_at, p.is_owner,
                COALESCE(u.level, p.level, 1) as effective_level
         FROM profiles p
         LEFT JOIN users u ON u.id = p.user_id OR LOWER(u.display_name) = LOWER(p.display_name) OR LOWER(u.display_name) = LOWER(p.slug)
         ORDER BY p.created_at DESC
         LIMIT ?`,
      )
      .all(INITIAL_PAGE_SIZE);

    const totalRow = db
      .prepare('SELECT COUNT(*) as cnt FROM profiles')
      .get();

    const profiles = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      slug: row.slug,
      displayName: row.display_name,
      bioText: row.bio_text ? row.bio_text.slice(0, 120) : '',
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
    }));

    return {
      profiles,
      total: totalRow?.cnt ?? 0,
    };
  } catch {
    return { profiles: [], total: 0 };
  }
}

export default async function ExplorePage() {
  const { profiles, total } = getInitialProfiles();
  const currentUser = await getCurrentUser();

  return (
    <ExploreClient
      initialProfiles={profiles}
      initialTotal={total}
      currentUser={currentUser}
    />
  );
}
