'use client';

/**
 * Клиентский компонент карточки профиля для галереи /explore.
 * Терминальная стилистика, плашка уровня (Level System) и экшен-кнопки управления.
 */
import Link from 'next/link';
import Image from 'next/image';
import BadgesContainer from './BadgesContainer';
import { getLevelBadge } from '@/lib/level-utils';

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * @param {{
 *   profile: object,
 *   canEdit?: boolean,
 *   onEdit?: (slug: string) => void,
 *   onDelete?: (profile: object) => void
 * }} props
 */
export default function ProfileCard({ profile, canEdit, onEdit, onDelete }) {
  const accent = profile.accentColor || '#ffffff';
  const accentAlpha = `${accent}40`;
  const accentDim = `${accent}20`;
  const badge = getLevelBadge(profile.level || 1);

  return (
    <div className="profile-card-wrap" style={{ position: 'relative' }}>
      {/* Экшен-кнопки управления профилем (вынесены поверх ссылки) */}
      {canEdit && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '4px',
            zIndex: 100,
          }}
        >
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(profile.slug);
              }}
              title="Редактировать карточку"
              style={{
                padding: '3px 9px',
                background: 'rgba(250, 204, 21, 0.2)',
                border: '1px solid rgba(250, 204, 21, 0.5)',
                borderRadius: '4px',
                color: '#facc15',
                fontSize: '10.5px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                position: 'relative',
                zIndex: 101,
              }}
            >
              ✎ Изменить
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(profile);
              }}
              title="Удалить карточку"
              style={{
                padding: '3px 9px',
                background: 'rgba(248, 113, 113, 0.2)',
                border: '1px solid rgba(248, 113, 113, 0.5)',
                borderRadius: '4px',
                color: '#f87171',
                fontSize: '10.5px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                position: 'relative',
                zIndex: 101,
              }}
            >
              ✕ Удалить
            </button>
          )}
        </div>
      )}

      <Link
        href={`/bio/${profile.slug}`}
        className="profile-card-link"
        style={{ textDecoration: 'none', display: 'block', position: 'relative', zIndex: 1 }}
      >
        <article
          className="profile-card"
          style={{
            '--card-accent': accent,
            '--card-accent-alpha': accentAlpha,
            '--card-accent-dim': accentDim,
          }}
        >
          {/* Хедер в стиле терминала */}
          <div className="profile-card__header">
            <div className="profile-card__dots">
              <span className="profile-card__dot profile-card__dot--r" />
              <span className="profile-card__dot profile-card__dot--y" />
              <span
                className="profile-card__dot profile-card__dot--g"
                style={{ background: accent, opacity: 0.6 }}
              />
            </div>
            <span className="profile-card__slug">@{profile.slug}</span>
          </div>

          {/* Основное содержимое */}
          <div className="profile-card__body">
            <div className="profile-card__avatar-wrap">
              {profile.avatarPath ? (
                <Image
                  src={profile.avatarPath}
                  alt={profile.displayName}
                  width={48}
                  height={48}
                  className="profile-card__avatar"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  className="profile-card__avatar"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '8px',
                    background: accentDim,
                    display: 'block',
                  }}
                >
                  <rect width="64" height="64" fill={accentDim} />
                  <circle cx="32" cy="24" r="12" fill={accent} />
                  <path
                    d="M12 56C12 45 21 40 32 40C43 40 52 45 52 56"
                    fill="none"
                    stroke={accent}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            <div className="profile-card__info">
              <div
                className="profile-card__name"
                style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
              >
                <span>{profile.displayName}</span>

                {/* Бейдж уровня */}
                <span
                  style={{
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 'bold',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    color: badge.color,
                    background: badge.background,
                    border: badge.border,
                    boxShadow: badge.glow,
                  }}
                >
                  LVL {badge.level}
                </span>

                {/* Иерархические бейджи системных ролей и титулов */}
                <BadgesContainer badges={profile.badges || []} maxVisible={2} size="small" />
              </div>
              {profile.bioText && (
                <div className="profile-card__bio">{profile.bioText}</div>
              )}
            </div>
          </div>

          {/* Футер с метаданными */}
          <div className="profile-card__footer">
            <span className="profile-card__meta">
              <span style={{ color: accent, opacity: 0.7 }}>◎</span>{' '}
              {profile.viewCount} views
            </span>
            {profile.linksCount > 0 && (
              <span className="profile-card__meta">
                {profile.linksCount} links
              </span>
            )}
            <span className="profile-card__meta">
              {fmtDate(profile.createdAt)}
            </span>
          </div>

          <div
            className="profile-card__accent-bar"
            style={{ background: accent }}
          />
        </article>
      </Link>
    </div>
  );
}
