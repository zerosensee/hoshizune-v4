/**
 * API: Информация о текущем пользователе.
 * GET /api/auth/me — возвращает текущего пользователя и его профиль
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { getDatabase } from '@/lib/database';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { user: null, profile: null },
      { status: 200 }
    );
  }

  const db = getDatabase();
  const profileRow = db
    .prepare('SELECT * FROM profiles WHERE user_id = ? OR (is_owner = 1 AND ? = 1)')
    .get(user.id, user.isAdmin ? 1 : 0);

  let profile = null;
  if (profileRow) {
    let links = [];
    try {
      links = JSON.parse(profileRow.links || '[]');
    } catch {
      links = [];
    }

    profile = {
      id: profileRow.id,
      slug: profileRow.slug,
      displayName: profileRow.display_name,
      bioText: profileRow.bio_text,
      avatarPath: profileRow.avatar_path,
      accentColor: profileRow.accent_color,
      links,
      status: profileRow.status,
      viewCount: profileRow.view_count,
      level: profileRow.level || user.level || 1,
      isOwner: !!profileRow.is_owner,
    };
    user.level = profileRow.level || user.level || 1;
  }

  return NextResponse.json({
    user,
    profile,
  });
}
