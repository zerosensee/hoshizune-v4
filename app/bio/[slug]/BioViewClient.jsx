'use client';

/**
 * Клиентский компонент просмотра bio.
 * Включает динамическое примененное тему автора, музыкальный плеер,
 * блок статистики посещений/оценок при скролле вниз и форму редактирования для владельца.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TerminalCard from '@/components/ui/TerminalCard';
import ProfileRow from '@/components/ui/ProfileRow';
import BioBlock from '@/components/ui/BioBlock';
import LinkButton from '@/components/ui/LinkButton';
import MusicWidget from '@/components/ui/MusicWidget';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { getThemePreset } from '@/lib/theme-presets';
import { copyToClipboard } from '@/lib/clipboard';

export default function BioViewClient({
  profile,
  comments: initialComments,
}) {
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState(initialComments || []);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(0);
  const [showAuthorTheme, setShowAuthorTheme] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useHeartbeat();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hoshizune_show_author_themes');
      if (saved === 'false') {
        setShowAuthorTheme(false);
      }
    } catch {
      // Игнорируем ошибки доступа к localStorage
    }

    async function checkUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
      } catch {
        // Игнорируем ошибки
      }
    }

    checkUser();
  }, []);

  const bioLines = profile.bioText
    ? profile.bioText.split('\n').filter(Boolean)
    : [];

  const theme = showAuthorTheme
    ? getThemePreset(profile.accentColor)
    : getThemePreset('emerald');

  const canEdit =
    currentUser &&
    (currentUser.isAdmin ||
      profile.userId === currentUser.id ||
      (profile.isOwner && (currentUser.isAdmin || currentUser.role === 'owner')));

  // Расчёт средней оценки
  const ratedComments = comments.filter((c) => c.rating > 0);
  const avgRating =
    ratedComments.length > 0
      ? (
          ratedComments.reduce((acc, c) => acc + c.rating, 0) /
          ratedComments.length
        ).toFixed(1)
      : null;

  async function handleCopyLink() {
    const url = `${window.location.origin}/bio/${profile.slug}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const [commentError, setCommentError] = useState('');

  async function handleComment() {
    if (!commentText.trim()) return;
    setCommentError('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          text: commentText,
          rating,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const bioData = await fetch(`/api/bio?slug=${profile.slug}`).then((r) => r.json());
        setComments(bioData.comments || []);
        setCommentText('');
        setRating(0);
      } else {
        setCommentError(data.error || 'Ошибка добавления отзыва');
      }
    } catch (e) {
      console.error('Ошибка отправки комментария:', e);
      setCommentError('Сбой связи с сервером');
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      const res = await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка удаления комментария');
      }
    } catch {
      alert('Сбой удаления комментария');
    }
  }

  return (
    <>
      <main
        className="page"
        style={{
          '--accent': theme.accent,
          '--bg-card': theme.bgCard,
          '--border-card': theme.border,
          '--text-primary': theme.textPrimary,
          '--text-muted': theme.textMuted,
          backgroundColor: theme.bgPage,
          color: theme.textPrimary,
          minHeight: '100vh',
          paddingBottom: 60,
          transition: 'background-color 0.3s ease',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
          <TerminalCard
            title={`${profile.slug}@bio`}
            footer={
              <>
                <span>
                  <span className="footer-ok">✓</span> ready
                </span>
                <span className="view-count">👁 {profile.viewCount} просмотров</span>
              </>
            }
          >
            <ProfileRow
              displayName={profile.displayName}
              avatarPath={profile.avatarPath}
              effectiveStatus={profile.effectiveStatus}
              level={profile.level}
              badges={profile.badges}
              role={profile.role}
              titleId={profile.titleId}
            />

            {canEdit && (
              <div style={{ marginTop: 10, marginBottom: 12 }}>
                <Link
                  href={`/bio/editor?slug=${encodeURIComponent(profile.slug)}`}
                  className="modal-btn primary"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 'bold',
                    background: theme.accent,
                    color: theme.id === 'pure_light' ? '#ffffff' : '#000000',
                  }}
                >
                  ✎ Редактировать своё bio
                </Link>
              </div>
            )}

            {bioLines.length > 0 && (
              <>
                <div className="section-label" style={{ color: theme.textMuted }}>
                  // about
                </div>
                <BioBlock lines={bioLines} />
              </>
            )}

            {/* Встроенный Музыкальный Плеер */}
            {profile.musicUrl && (
              <MusicWidget
                musicUrl={profile.musicUrl}
                trackTitle={profile.pinnedTrack}
              />
            )}

            {profile.links && profile.links.length > 0 && (
              <>
                <div className="section-label" style={{ color: theme.textMuted }}>
                  // links
                </div>
                <div className="links">
                  {profile.links.map((link, i) => (
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

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className={`copy-link-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
                style={{
                  borderColor: theme.border,
                  color: theme.accent,
                  width: '100%',
                }}
              >
                {copied ? '✓ Ссылка скопирована' : '🔗 Копировать ссылку на bio'}
              </button>
            </div>
          </TerminalCard>

          {/* Блок статистики при скролле вниз */}
          <div
            className="card"
            style={{
              margin: '16px 0 0',
              padding: '14px 16px',
              background: theme.bgCard,
              borderColor: theme.border,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'var(--font-mono)' }}>
                Посещения
              </div>
              <div style={{ fontSize: 15, fontWeight: 'bold', color: theme.textPrimary, marginTop: 2 }}>
                👁 {profile.viewCount}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'var(--font-mono)' }}>
                Средняя оценка
              </div>
              <div style={{ fontSize: 15, fontWeight: 'bold', color: theme.accent, marginTop: 2 }}>
                ★ {avgRating ? `${avgRating} / 5` : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'var(--font-mono)' }}>
                Отзывов
              </div>
              <div style={{ fontSize: 15, fontWeight: 'bold', color: theme.textPrimary, marginTop: 2 }}>
                💬 {comments.length}
              </div>
            </div>
          </div>

          {/* Раздел комментариев и оценок при скролле вниз */}
          <div
            className="card comments-section"
            style={{
              margin: '16px 0 0',
              background: theme.bgCard,
              borderColor: theme.border,
            }}
          >
            <div className="card-body">
              <div className="section-label" style={{ color: theme.textMuted }}>
                // комментарии и оценки ({comments.length})
              </div>

              {comments.map((c) => (
                <div className="comment" key={c.id} style={{ borderColor: theme.border }}>
                  <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="comment-author" style={{ color: theme.textPrimary, fontWeight: 'bold' }}>
                        {c.authorName}
                      </span>
                      <span className="comment-date" style={{ color: theme.textMuted, fontSize: '11px' }}>
                        {new Date(c.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      title="Удалить отзыв"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 4px',
                        opacity: 0.7,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="comment-text" style={{ color: theme.textPrimary, marginTop: '4px' }}>
                    {c.text}
                  </p>
                  {c.rating > 0 && (
                    <div className="comment-rating" style={{ marginTop: '4px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={`star ${s <= c.rating ? 'filled' : ''}`}
                          style={{ color: s <= c.rating ? theme.accent : theme.textMuted }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {profile.allowComments !== false ? (
                <div style={{ marginTop: 14 }}>
                  {commentError && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        fontSize: '12px',
                        marginBottom: '10px',
                        fontWeight: 'bold',
                      }}
                    >
                      ⚠️ {commentError}
                    </div>
                  )}
                  <textarea
                    className="modal-input"
                    placeholder="Оставить комментарий и оценку..."
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{
                      background: theme.bgCard,
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 12,
                      width: '100%',
                    }}
                  >
                    <div className="comment-rating" style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={`star ${s <= rating ? 'filled' : ''}`}
                          onClick={() => setRating(s)}
                          style={{
                            color: s <= rating ? theme.accent : theme.textMuted,
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '2px',
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <button
                      className="modal-btn primary"
                      onClick={handleComment}
                      style={{
                        background: theme.accent,
                        color: theme.id === 'pure_light' ? '#ffffff' : '#000000',
                        marginLeft: 'auto',
                        padding: '8px 18px',
                        fontWeight: 'bold',
                        borderRadius: '6px',
                      }}
                    >
                      Отправить
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: theme.textMuted,
                    fontSize: '12px',
                    fontStyle: 'italic',
                    borderTop: `1px dashed ${theme.border}`,
                    marginTop: '14px',
                  }}
                >
                  🔒 Комментарии к этому профилю отключены
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link
              href="/"
              style={{
                color: theme.accent,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              ← На главную
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
