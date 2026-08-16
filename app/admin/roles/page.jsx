/**
 * Страница управления ролями, титулами и правами доступа (серверная).
 */
import { getAllRoles, AVAILABLE_PERMISSIONS } from '@/lib/role-repository';
import { getCurrentUser } from '@/lib/user-auth';
import AdminLayoutClient from '../AdminLayoutClient';
import RolesClient from './RolesClient';

export const metadata = {
  title: 'Роли и Титулы — Hoshizune Admin',
};

export async function AdminRolesPage() {
  const roles = getAllRoles();
  const currentUser = await getCurrentUser();

  return (
    <AdminLayoutClient>
      <RolesClient initialRoles={roles} availablePermissions={AVAILABLE_PERMISSIONS} currentUser={currentUser} />
    </AdminLayoutClient>
  );
}

export default AdminRolesPage;
