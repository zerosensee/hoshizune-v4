import BioViewClient from './BioViewClient';
import {
  getProfileBySlug,
  getComments,
} from '@/lib/bio-repository';

/**
 * Динамические OG meta-теги для каждого профиля.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const profile = getProfileBySlug(slug);

  if (!profile) {
    return { title: 'Профиль не найден — Hoshizune' };
  }

  return {
    title: `${profile.displayName} — Hoshizune Bio`,
    description:
      profile.bioText?.slice(0, 160) ||
      'Персональная био-страница',
    openGraph: {
      title: `${profile.displayName} — Hoshizune Bio`,
      description:
        profile.bioText?.slice(0, 160) ||
        'Персональная био-страница',
      images: profile.avatarPath
        ? [profile.avatarPath]
        : [],
    },
  };
}

/**
 * Страница просмотра конкретного bio по slug.
 * Серверный компонент — загружает данные и передаёт клиенту.
 */
export default async function BioPage({ params }) {
  const { slug } = await params;
  const profile = getProfileBySlug(slug);

  if (!profile) {
    return (
      <main className="page">
        <div
          style={{
            textAlign: 'center',
            color: '#6a8a6a',
          }}
        >
          <h1
            style={{
              fontSize: 48,
              color: '#2a4a2a',
              marginBottom: 8,
            }}
          >
            404
          </h1>
          <p>Профиль не найден</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 20 }}>
            <a
              href="/"
              style={{
                background: 'rgba(74, 222, 128, 0.12)',
                border: '1px solid #4ade80',
                color: '#4ade80',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 16px rgba(74, 222, 128, 0.2)',
              }}
            >
              🏠 Вернуться на главную
            </a>
          </div>
        </div>
      </main>
    );
  }

  const comments = getComments(profile.id);

  return (
    <BioViewClient
      profile={profile}
      comments={comments}
    />
  );
}
