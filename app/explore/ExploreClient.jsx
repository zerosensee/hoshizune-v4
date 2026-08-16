'use client';

/**
 * Клиентский компонент галереи профилей /explore.
 * Собственный профиль текущего пользователя отображается отдельной сбоку панелью
 * (с ID/номером, топом и популярностью), а остальные био — в основном списке.
 */
import {
  useState,
  useCallback,
  useTransition,
  useEffect,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileCard from '@/components/ui/ProfileCard';
import { getLevelBadge } from '@/lib/level-utils';

const SORT_OPTIONS = [
  { value: 'newest', label: '↓ Новые' },
  { value: 'popular', label: '◉ Популярные' },
  { value: 'oldest', label: '↑ Старые' },
];

export default function ExploreClient({
  initialProfiles,
  initialTotal,
  currentUser,
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [isPending, startTransition] = useTransition();
  const [hasMore, setHasMore] = useState(
    initialProfiles.length < initialTotal,
  );

  const searchTimeoutRef = useRef(null);

  const fetchProfiles = useCallback(
    async (params, append = false) => {
      const qs = new URLSearchParams({
        page: String(params.page || 1),
        sort: params.sort || 'newest',
        ...(params.search ? { q: params.search } : {}),
      });

      const res = await fetch(`/api/explore?${qs}`);
      if (!res.ok) return;

      const data = await res.json();

      startTransition(() => {
        if (append) {
          setProfiles((prev) => [...prev, ...data.profiles]);
        } else {
          setProfiles(data.profiles);
        }
        setTotal(data.pagination.total);
        setHasMore(
          data.pagination.page < data.pagination.totalPages,
        );
        setPage(data.pagination.page);
      });
    },
    [],
  );

  const handleSearch = useCallback(
    (value) => {
      setSearch(value);
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        fetchProfiles({ page: 1, sort, search: value });
      }, 350);
    },
    [sort, fetchProfiles],
  );

  const handleSort = useCallback(
    (value) => {
      setSort(value);
      fetchProfiles({ page: 1, sort: value, search });
    },
    [search, fetchProfiles],
  );

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    fetchProfiles(
      { page: nextPage, sort, search },
      true,
    );
  }, [page, sort, search, fetchProfiles]);

  const handleEditProfile = useCallback((slug) => {
    router.push(`/bio/editor?slug=${encodeURIComponent(slug)}`);
  }, [router]);

  const handleDeleteProfile = useCallback(async (profile) => {
    if (!confirm(`Вы действительно хотите удалить био-профиль @${profile.slug}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/bio?slug=${encodeURIComponent(profile.slug)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при удалении профиля');
      }
    } catch {
      alert('Ошибка подключения при удалении');
    }
  }, []);

  useEffect(() => {
    return () => clearTimeout(searchTimeoutRef.current);
  }, []);

  // Идентифицируем собственный профиль пользователя при монтировании
  const [persistentMyProfile] = useState(() => {
    if (!currentUser || !initialProfiles) return null;
    return (
      initialProfiles.find((p) => String(p.userId) === String(currentUser.id)) ||
      (currentUser.isAdmin || currentUser.role === 'owner' ? initialProfiles.find((p) => p.isOwner) : null) ||
      null
    );
  });

  const myProfile = persistentMyProfile;

  // Исключаем собственный профиль из основного списка
  const otherProfiles = myProfile
    ? profiles.filter((p) => p.id !== myProfile.id)
    : profiles;

  // Вычисляем место в топе по просмотрам
  const sortedByViews = [...profiles].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  const myRankIndex = myProfile
    ? sortedByViews.findIndex((p) => p.id === myProfile.id) + 1
    : 0;

  return (
    <div className="explore-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Шапка */}
      <div className="explore-header" style={{ marginBottom: 20, paddingTop: 30 }}>
        <h1 className="explore-title">
          <span className="explore-title__accent">$</span>
          {' '}explore
        </h1>
        <div className="explore-subtitle">
          {total} профилей в сети
        </div>
      </div>

      {/* Тулбар: поиск + сортировка */}
      <div className="explore-toolbar" style={{ marginBottom: 24 }}>
        <div className="explore-search-wrap">
          <span className="explore-search__icon">◎</span>
          <input
            id="explore-search"
            type="search"
            className="explore-search"
            placeholder="поиск по имени или @slug..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="explore-sort">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={
                sort === opt.value
                  ? 'explore-sort__btn explore-sort__btn--active'
                  : 'explore-sort__btn'
              }
              onClick={() => handleSort(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Основной макет: Сетка других профилей + Боковая панель собственного профиля */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: myProfile ? '1fr 300px' : '1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Список профилей остальных участников */}
        <div>
          {isPending && otherProfiles.length === 0 && (
            <div className="explore-empty">
              <div className="explore-spinner">⟳</div>
              Загрузка...
            </div>
          )}

          {!isPending && otherProfiles.length === 0 && (
            <div className="explore-empty">
              <div className="explore-empty__icon">◎</div>
              <div>Профили не найдены</div>
              {search && (
                <div className="explore-empty__hint">
                  Попробуй другой запрос
                </div>
              )}
            </div>
          )}

          {otherProfiles.length > 0 && (
            <div className="explore-grid">
              {otherProfiles.map((profile) => {
                const canEdit =
                  currentUser &&
                  (currentUser.isAdmin ||
                    profile.userId === currentUser.id ||
                    (profile.isOwner && currentUser.isAdmin));

                return (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    canEdit={canEdit}
                    onEdit={handleEditProfile}
                    onDelete={handleDeleteProfile}
                  />
                );
              })}
            </div>
          )}

          {/* Загрузить ещё */}
          {hasMore && (
            <div className="explore-load-more" style={{ marginTop: 24 }}>
              <button
                className="explore-load-btn"
                onClick={handleLoadMore}
                disabled={isPending}
              >
                {isPending ? '⟳ Загрузка...' : '↓ Загрузить ещё'}
              </button>
            </div>
          )}
        </div>

        {/* Боковая карточка СОБСТВЕННОГО ПРОФИЛЯ */}
        {myProfile && (
          <aside
            style={{
              position: 'sticky',
              top: 24,
              padding: 16,
              background: 'var(--bg-card, #0f1210)',
              border: '1px solid var(--accent, #4ade80)',
              borderRadius: 'var(--radius-md, 12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 12px var(--border-card)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent, #4ade80)',
                fontWeight: 'bold',
                letterSpacing: 1,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>// ВАШ ЛИЧНЫЙ ПРОФИЛЬ</span>
              <span
                style={{
                  background: 'var(--accent-glow, rgba(74, 222, 128, 0.15))',
                  color: 'var(--accent, #4ade80)',
                  border: '1px solid var(--accent, rgba(74, 222, 128, 0.3))',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              >
                {myProfile.isOwner ? '👑 Владелец Сайта' : '👤 Ваш Аккаунт'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              {myProfile.avatarPath ? (
                <img
                  src={myProfile.avatarPath}
                  alt={myProfile.displayName}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--accent, #4ade80)',
                  }}
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--border-card, #161a16)',
                    display: 'block',
                    border: '2px solid var(--accent, #4ade80)',
                  }}
                >
                  <rect width="64" height="64" fill="var(--border-card, #161a16)" />
                  <circle cx="32" cy="24" r="12" fill="var(--accent, #4ade80)" />
                  <path
                    d="M12 56C12 45 21 40 32 40C43 40 52 45 52 56"
                    fill="none"
                    stroke="var(--accent, #4ade80)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 15, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{myProfile.displayName}</span>
                  {(() => {
                    const badge = getLevelBadge(myProfile.level || currentUser?.level || 1);
                    return (
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
                    );
                  })()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--accent, #4ade80)', fontFamily: 'var(--font-mono)' }}>
                  @{myProfile.slug}
                </div>
              </div>
            </div>

            {/* Метрики и Статистика профиля */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                marginBottom: 16,
                background: 'rgba(0,0,0,0.2)',
                padding: 10,
                borderRadius: 8,
                border: '1px solid var(--border-card)',
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Номер в БД
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px',
                  }}
                  title={`#${myProfile.id}`}
                >
                  #{myProfile.id}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Место в Топе
                </div>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent, #4ade80)' }}>
                  #{myRankIndex} из {total}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Популярность
                </div>
                <div style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-primary)' }}>
                  👁 {myProfile.viewCount} просм.
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Ссылки
                </div>
                <div style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-primary)' }}>
                  🔗 {myProfile.linksCount || 0} шт.
                </div>
              </div>
            </div>

            {/* Кнопки действий */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link
                href={`/bio/${myProfile.slug}`}
                className="modal-btn primary"
                style={{
                  textDecoration: 'none',
                  textAlign: 'center',
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: 'var(--accent)',
                  color: '#000',
                  borderRadius: 6,
                }}
              >
                👁 Открыть свой профиль
              </Link>
              <Link
                href={`/bio/editor?slug=${encodeURIComponent(myProfile.slug)}`}
                className="modal-btn"
                style={{
                  textDecoration: 'none',
                  textAlign: 'center',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-card)',
                  borderRadius: 6,
                }}
              >
                ✎ Редактировать
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
