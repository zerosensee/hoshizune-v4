/**
 * Страница управления сокращёнными ссылками (серверная).
 */
import {
  getAllShortLinks,
  getShortLinksCount,
} from '@/lib/short-links-repository';
import AdminLayoutClient from '../AdminLayoutClient';
import LinksClient from './LinksClient';

export const metadata = {
  title: 'Ссылки — Hoshizune Admin',
};

export default function AdminLinksPage() {
  const links = getAllShortLinks({ limit: 100 });
  const total = getShortLinksCount();
  return (
    <AdminLayoutClient>
      <LinksClient initialLinks={links} total={total} />
    </AdminLayoutClient>
  );
}
