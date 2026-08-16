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
  const profiles = getAllProfiles();
  const currentUser = await getCurrentUser();

  return (
    <AdminLayoutClient>
      <ProfilesClient initialProfiles={profiles} currentUser={currentUser} />
    </AdminLayoutClient>
  );
}

export default AdminProfilesPage;
