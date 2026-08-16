/**
 * API: Heartbeat для обновления онлайн-статуса пользователя.
 * POST — обновить last_seen для авторизованного пользователя.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import {
  updateHeartbeat,
  updateProfile,
  getProfileById,
} from '@/lib/bio-repository';
import { getDatabase } from '@/lib/database';

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: false, guest: true });
    }

    const db = getDatabase();
    const profRow = db
      .prepare('SELECT id FROM profiles WHERE user_id = ? OR (is_owner = 1 AND ? = 1)')
      .get(user.id, user.isAdmin ? 1 : 0);

    if (profRow) {
      updateHeartbeat(profRow.id);

      const body = await request.json().catch(() => ({}));
      if (body.status) {
        const allowed = ['online', 'inactive', 'dnd', 'invisible'];
        if (allowed.includes(body.status)) {
          updateProfile(profRow.id, { status: body.status });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Ошибка heartbeat:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
