import HomeClient from './HomeClient';
import { getOwnerProfile, createProfile } from '@/lib/bio-repository';
import { OWNER_SLUG } from '@/lib/constants';
import { getCurrentUser } from '@/lib/user-auth';
import { getDatabase } from '@/lib/database';

/**
 * Главная страница (серверный компонент).
 * Загружает профиль владельца и данные текущей сессии пользователя.
 */
export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const db = getDatabase();

  let owner = getOwnerProfile();

  /* Автосоздание дефолтного био при первом запуске */
  if (!owner) {
    owner = createProfile({
      id: 'owner-hoshizune-001',
      slug: OWNER_SLUG,
      displayName: 'hoshizune',
      bioText: [
        'digital presence',
        'crafting pixels & code',
        'somewhere in the void',
      ].join('\n'),
      links: [
        {
          label: 'Discord',
          url: 'https://discord.gg/',
          icon: 'discord',
        },
        {
          label: 'Telegram',
          url: 'https://t.me/',
          icon: 'telegram',
        },
        {
          label: 'Spotify',
          url: 'https://open.spotify.com/',
          icon: 'spotify',
        },
        {
          label: 'Steam',
          url: 'https://steamcommunity.com/',
          icon: 'steam',
        },
      ],
      isOwner: true,
    });
  }

  // Находим профиль текущего пользователя
  let myProfile = null;
  if (currentUser) {
    const userProfRow = db
      .prepare('SELECT id FROM profiles WHERE user_id = ? OR (is_owner = 1 AND ? = 1)')
      .get(currentUser.id, currentUser.isAdmin ? 1 : 0);

    if (userProfRow) {
      const { getProfileById } = require('@/lib/bio-repository');
      myProfile = getProfileById(userProfRow.id);
    }
  }

  return (
    <HomeClient
      owner={owner}
      currentUser={currentUser}
      myProfile={myProfile}
    />
  );
}
