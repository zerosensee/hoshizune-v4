/**
 * API: Работа с био-профилями.
 * GET — выборка профилей или текущего профиля пользователя
 * POST — создание био-профиля (привязка к текущему аккаунту)
 * PUT — обновление профиля (владелец или админ)
 * DELETE — удаление профиля (владелец или админ)
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { getDatabase } from '@/lib/database';
import {
  getAllProfiles,
  createProfile,
  getProfileById,
  getProfileBySlug,
  updateProfile,
  deleteProfile,
  slugExists,
} from '@/lib/bio-repository';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const myProfile = searchParams.get('me') === 'true';
    const slug = searchParams.get('slug');

    if (slug) {
      const profile = getProfileBySlug(slug);
      return NextResponse.json(profile);
    }

    const user = await getCurrentUser();

    if (myProfile) {
      if (!user) {
        return NextResponse.json({ profile: null }, { status: 200 });
      }

      const db = getDatabase();
      const row = db
        .prepare('SELECT * FROM profiles WHERE user_id = ? OR (is_owner = 1 AND ? = 1)')
        .get(user.id, user.isAdmin ? 1 : 0);

      if (!row) {
        return NextResponse.json({ profile: null }, { status: 200 });
      }

      return NextResponse.json({ profile: getProfileById(row.id) });
    }

    const profiles = getAllProfiles();
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Ошибка получения профилей:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Сначала необходимо авторизоваться' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      slug, displayName, bioText, links,
      status, avatarPath, accentColor,
      musicUrl, pinnedTrack,
    } = body;

    if (!slug || !displayName) {
      return NextResponse.json(
        { error: 'Slug и имя обязательны' },
        { status: 400 }
      );
    }

    const slugRegex = /^[a-z0-9][a-z0-9_-]{0,30}[a-z0-9]$|^[a-z0-9]{2,32}$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        {
          error:
            'Slug: 2-32 символа, строчные буквы, цифры, дефис и подчёркивание',
        },
        { status: 400 }
      );
    }

    if (slugExists(slug)) {
      return NextResponse.json(
        { error: 'Этот URL (slug) уже занят' },
        { status: 409 }
      );
    }

    // Фильтруем пустые пресетные ссылки
    const cleanLinks = (links || []).filter(
      (l) => l.url && l.url.trim() !== ''
    );

    const db = getDatabase();
    const existing = db
      .prepare('SELECT id FROM profiles WHERE user_id = ?')
      .get(user.id);

    if (existing) {
      return NextResponse.json(
        { error: 'У вашего аккаунта уже есть био-профиль' },
        { status: 409 }
      );
    }

    const profileId = `prof_${user.id}`;
    const profile = createProfile({
      id: profileId,
      slug: slug.trim().toLowerCase(),
      displayName: displayName.trim(),
      bioText: bioText || '',
      status: status || 'online',
      avatarPath: avatarPath || null,
      accentColor: accentColor || '#ffffff',
      musicUrl: musicUrl?.trim() || null,
      pinnedTrack: pinnedTrack?.trim() || null,
      links: cleanLinks,
      isOwner: user.isAdmin ? 1 : 0,
    });

    // Связываем профиль с user_id в базе данных
    db.prepare('UPDATE profiles SET user_id = ? WHERE id = ?').run(
      user.id,
      profileId
    );

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания профиля:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при создании профиля' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id, slug, displayName, bioText,
      links, status, avatarPath,
      accentColor, musicUrl, pinnedTrack,
    } = body;

    const db = getDatabase();
    let targetProfile = null;

    if (id) {
      targetProfile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    } else if (slug) {
      targetProfile = db.prepare('SELECT * FROM profiles WHERE slug = ?').get(slug);
    } else {
      targetProfile = db
        .prepare('SELECT * FROM profiles WHERE user_id = ? OR (is_owner = 1 AND ? = 1)')
        .get(user.id, user.isAdmin ? 1 : 0);
    }

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: пользователь может редактировать только СВОЙ профиль, админ — любой
    const isMyProfile = targetProfile.user_id === user.id || (targetProfile.is_owner && user.isAdmin);
    if (!isMyProfile && !user.isAdmin) {
      return NextResponse.json(
        { error: 'У вас нет прав для редактирования этого профиля' },
        { status: 403 }
      );
    }

    // Если меняется slug, проверяем уникальность
    if (slug && slug.toLowerCase() !== targetProfile.slug.toLowerCase()) {
      if (slugExists(slug.toLowerCase())) {
        return NextResponse.json(
          { error: 'Этот URL (slug) уже занят' },
          { status: 409 }
        );
      }
    }

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bioText !== undefined) updateData.bioText = bioText;
    if (status !== undefined) updateData.status = status;
    if (avatarPath !== undefined) updateData.avatarPath = avatarPath;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (musicUrl !== undefined) updateData.musicUrl = musicUrl?.trim() || null;
    if (pinnedTrack !== undefined) updateData.pinnedTrack = pinnedTrack?.trim() || null;
    if (slug) updateData.slug = slug.toLowerCase();
    if (links !== undefined) {
      updateData.links = (links || []).filter(
        (l) => l.url && l.url.trim() !== ''
      );
    }

    const updated = updateProfile(targetProfile.id, updateData);

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при обновлении профиля' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    const db = getDatabase();
    let targetProfile = null;

    if (id) {
      targetProfile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    } else if (slug) {
      targetProfile = db.prepare('SELECT * FROM profiles WHERE slug = ?').get(slug);
    }

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      );
    }

    // Пользователь может удалить только свой профиль, админ — любой
    const isMyProfile = targetProfile.user_id === user.id || (targetProfile.is_owner && user.isAdmin);
    if (!isMyProfile && !user.isAdmin) {
      return NextResponse.json(
        { error: 'У вас нет прав для удаления этого профиля' },
        { status: 403 }
      );
    }

    deleteProfile(targetProfile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления профиля:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при удалении профиля' },
      { status: 500 }
    );
  }
}
