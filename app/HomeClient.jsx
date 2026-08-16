'use client';

/**
 * Клиентская часть главной страницы.
 * Использование элементов Link для надежной навигации.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TerminalCard from '@/components/ui/TerminalCard';
import ProfileRow from '@/components/ui/ProfileRow';
import BioBlock from '@/components/ui/BioBlock';
import LinkButton from '@/components/ui/LinkButton';
import ShortenWidget from '@/components/ui/ShortenWidget';
import { useHeartbeat } from '@/hooks/useHeartbeat';

export default function HomeClient({ owner, currentUser, myProfile }) {
  const router = useRouter();

  useHeartbeat();

  // Выбираем отображаемый профиль: если авторизован — показываем свой профиль, иначе профиль владельца
  const displayProfile = (currentUser && myProfile) ? myProfile : owner;

  const bioLines = displayProfile?.bioText
    ? displayProfile.bioText.split('\n').filter(Boolean)
    : [];

  const [loggingOut, setLoggingOut] = useState(false);

  // Вычисляем высшую роль пользователя в иерархии
  const getHighestBadge = () => {
    if (!currentUser) return null;

    if (myProfile?.badges && myProfile.badges.length > 0) {
      const b = myProfile.badges[0];
      return {
        text: b.badgeText || b.name?.toUpperCase(),
        color: b.color || '#facc15',
      };
    }

    const role = currentUser.role || (currentUser.isOwner ? 'owner' : (currentUser.isAdmin ? 'admin' : null));
    if (role === 'owner') return { text: 'OWNER', color: '#f43f5e' };
    if (role === 'admin') return { text: 'ADMIN', color: '#facc15' };
    if (role === 'support') return { text: 'SUPPORT', color: '#38bdf8' };
    if (currentUser.titleId) return { text: currentUser.titleId.toUpperCase(), color: '#a855f7' };
    return null;
  };

  const highestBadge = getHighestBadge();

  /**
   * Безопасный выход пользователя из аккаунта.
   */
  async function handleLogout(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Игнорируем сетевые сбои
    }
    document.cookie = 'hoshizune_user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'hoshizune_uid=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'hoshizune_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = '/auth';
  }

  return (
    <>
      <main className="page">
        <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
          {/* Панель авторизации / пользователя вверху */}
          <div
            className="user-top-bar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {currentUser ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--accent)' }}>●</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    @{currentUser.displayName}
                  </span>
                  {highestBadge && (
                    <span
                      style={{
                        padding: '1px 6px',
                        background: `${highestBadge.color}25`,
                        border: `1px solid ${highestBadge.color}50`,
                        color: highestBadge.color,
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {highestBadge.text}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Link
                    href="/settings"
                    className="modal-btn"
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: 'var(--accent)',
                      borderColor: 'var(--border-card)',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    ⚙ Настройки
                  </Link>
                  {currentUser.isAdmin && (
                    <Link
                      href="/admin"
                      className="modal-btn"
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        color: '#facc15',
                        borderColor: 'rgba(250, 204, 21, 0.4)',
                        textDecoration: 'none',
                        display: 'inline-block',
                      }}
                    >
                      ⚡ Админка
                    </Link>
                  )}
                  <button
                    type="button"
                    className="modal-btn"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    {loggingOut ? '...' : 'Выйти'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-muted)' }}>
                  Вы не авторизованы
                </span>
                <Link
                  href="/auth"
                  className="modal-btn primary"
                  style={{
                    padding: '3px 10px',
                    fontSize: '11px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  🔑 Войти
                </Link>
              </>
            )}
          </div>

          <TerminalCard
            title={`${displayProfile?.slug || 'hoshizune'}@bio`}
            footer={
              <>
                <span>
                  <span className="footer-ok">✓</span> ready
                </span>
                <span className="view-count">👁 {displayProfile?.viewCount || 0}</span>
              </>
            }
          >
            {displayProfile && (
              <>
                <ProfileRow
                  displayName={displayProfile.displayName}
                  avatarPath={displayProfile.avatarPath}
                  effectiveStatus={displayProfile.effectiveStatus || displayProfile.status}
                  level={displayProfile.level}
                  badges={displayProfile.badges}
                  role={displayProfile.role}
                  titleId={displayProfile.titleId}
                />

                {bioLines.length > 0 && (
                  <>
                    <div className="section-label">// about</div>
                    <BioBlock lines={bioLines} />
                  </>
                )}

                {displayProfile.links && displayProfile.links.length > 0 && (
                  <>
                    <div className="section-label">// links</div>
                    <div className="links">
                      {displayProfile.links.map((link, i) => (
                        <LinkButton
                          key={i}
                          label={link.label}
                          href={link.url}
                          icon={link.icon}
                          delay={i}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </TerminalCard>

          {/* Кнопка создания/редактирования bio */}
          {currentUser && (myProfile || currentUser.isAdmin) ? (
            <Link
              href="/bio/editor"
              className="create-bio-btn"
              style={{
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
              }}
            >
              ✎ Редактировать своё Bio
            </Link>
          ) : (
            <Link
              href={currentUser ? '/bio/editor' : '/auth'}
              className="create-bio-btn"
              style={{
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
              }}
            >
              + {currentUser ? 'Создать своё bio' : 'Авторизоваться и создать Bio'}
            </Link>
          )}

          <ShortenWidget />

          <Link
            href="/explore"
            className="create-bio-btn"
            style={{
              marginTop: '10px',
              fontSize: '12px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center',
            }}
          >
            ◉ Смотреть все профили
          </Link>
        </div>
      </main>

      {/* Уголок Создателя Сайта (Король) */}
      <Link
        href="/bio/hoshizune"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          borderRadius: '12px',
          background: 'rgba(15, 12, 5, 0.85)',
          border: '1px solid rgba(245, 158, 11, 0.6)',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
          backdropFilter: 'blur(12px)',
          textDecoration: 'none',
          color: '#fbbf24',
          fontSize: '11px',
          fontWeight: 'bold',
          fontFamily: 'var(--font-mono, monospace)',
          transition: 'transform 0.2s ease, boxShadow 0.2s ease',
        }}
      >
        <span style={{ fontSize: '16px' }}>👑</span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.5px', fontWeight: '800' }}>
            Создатель сайта
          </span>
          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>@hoshizune ↗</span>
        </div>
      </Link>
    </>
  );
}
