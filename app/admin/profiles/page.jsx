/**
 * Страница управления профилями (серверная).
 */
import { getAllProfiles } from '@/lib/bio-repository';
import { getCurrentUser } from '@/lib/user-auth';
import AdminLayoutClient from '../AdminLayoutClient';
import ProfilesClient from './ProfilesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Профили — Hoshizune Admin',
};

export async function AdminProfilesPage() {
  let profiles = [];
  let currentUser = null;

  try {
    profiles = getAllProfiles() || [];
  } catch (err) {
    console.error('[AdminProfilesPage] Ошибка получения профилей:', err);
  }

  try {
    currentUser = await getCurrentUser();
  } catch (err) {
    console.error('[AdminProfilesPage] Ошибка получения текущего пользователя:', err);
  }

  return (
    <AdminLayoutClient>
      <ProfilesClient initialProfiles={profiles} currentUser={currentUser} />
    </AdminLayoutClient>
  );
}

export default AdminProfilesPage;
