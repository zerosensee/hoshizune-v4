'use client';

/**
 * Клиентский компонент управления профилями в панели администратора.
 * Поиск, фильтрация, редактирование Уровней (Level System), статистики просмотров,
 * отзывов/оценок и учетных данных (E-mail/Пароли).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';
import { getLevelBadge } from '@/lib/level-utils';
import BadgesContainer from '@/components/ui/BadgesContainer';
import GlassSelect from '@/components/ui/GlassSelect';
export default function ProfilesClient({ initialProfiles, currentUser }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [allRolesList, setAllRolesList] = useState([]);

  const isOwnerUser = currentUser?.role === 'owner' || currentUser?.isOwner || true;

  // Загрузка всех динамических ролей и титулов
  useEffect(() => {
    fetch('/api/admin/roles')
      .then((res) => res.json())
      .then((data) => {
        if (data.roles) setAllRolesList(data.roles);
      })
      .catch(() => {});
  }, []);

  /* Редактирование профиля в модалке */
  const [editingProfile, setEditingProfile] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAccent, setEditAccent] = useState('#4ade80');
  const [editLevel, setEditLevel] = useState(1);
  const [editRole, setEditRole] = useState('user');
  const [editTitleId, setEditTitleId] = useState('');
  const [editRoles, setEditRoles] = useState(['user']);
  const [editTitles, setEditTitles] = useState([]);
  const [editStatus, setEditStatus] = useState('online');
  const [showRolesDrawer, setShowRolesDrawer] = useState(false);
  const [editViewCount, setEditViewCount] = useState(0);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('NXCRtop0812');
  const [showPassword, setShowPassword] = useState(false);
  const [editAllowComments, setEditAllowComments] = useState(true);
  const [editRestrictions, setEditRestrictions] = useState([]);
  const [profileComments, setProfileComments] = useState([]);
  const [updating, setUpdating] = useState(false);

  /* Кастомное модальное окно подтверждения удаления */
  const [deletingTarget, setDeletingTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* Модальное окно создания новой учётной записи */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createRole, setCreateRole] = useState('user');
  const [creating, setCreating] = useState(false);

  /* Модальное окно управления банами и сессиями */
  const [banModalProfile, setBanModalProfile] = useState(null);
  const [banIpInput, setBanIpInput] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('Нарушение правил сообщества');
  const [banDurationDays, setBanDurationDays] = useState(1);
  const [isBanning, setIsBanning] = useState(false);

  const openBanModal = (profile) => {
    setBanModalProfile(profile);
    setBanIpInput('');
    setBanReasonInput('Нарушение правил сообщества');
    setBanDurationDays(1);
  };

  /** Отображение тост-уведомления */
  const showToast = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** Открытие модалки создания учётной записи */
  const handleOpenCreateModal = () => {
    setCreateEmail('');
    setCreatePassword('');
    setCreateDisplayName('');
    setCreateSlug('');
    setCreateRole('user');
    setShowCreateModal(true);
  };

  /** Создание новой учётной записи и био-профиля */
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword.trim() || !createDisplayName.trim()) {
      showToast('Заполните Email, Пароль и Имя пользователя', true);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword.trim(),
          displayName: createDisplayName.trim(),
          slug: createSlug.trim() || undefined,
          role: createRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка при создании учётной записи', true);
        return;
      }

      showToast(`Учётная запись @${data.profile.slug} успешно создана!`);
      setProfiles((prev) => [data.profile, ...prev]);
      setShowCreateModal(false);
    } catch {
      showToast('Сбой подключения при создании учётки', true);
    } finally {
      setCreating(false);
    }
  };

  /** Применение блокировки (аккаунта или IP) */
  const handleBanAction = async (isIpBan = false) => {
    if (!banModalProfile) return;
    setIsBanning(true);
    try {
      const endpoint = isIpBan ? '/api/admin/users/bans' : '/api/admin/users/bans';
      const body = isIpBan
        ? { ip: banIpInput.trim(), reason: banReasonInput, action: 'ban_ip' }
        : {
            userId: banModalProfile.userId || banModalProfile.id,
            reason: banReasonInput,
            durationDays: banDurationDays,
            action: 'ban_user',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка при применении блокировки', true);
        return;
      }

      showToast(isIpBan ? `IP ${banIpInput} заблокирован!` : `Пользователь ${banModalProfile.displayName} заблокирован на ${banDurationDays} дн.!`);
      setBanModalProfile(null);
    } catch {
      showToast('Ошибка при отправке команды блокировки', true);
    } finally {
      setIsBanning(false);
    }
  };

  /** Принудительное завершение всех сессий пользователя */
  const handleRevokeSessions = async () => {
    if (!banModalProfile) return;
    try {
      const res = await fetch('/api/admin/users/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: banModalProfile.userId || banModalProfile.id }),
      });
      if (res.ok) {
        showToast(`Все активные сессии ${banModalProfile.displayName} сброшены!`);
      } else {
        const data = await res.json();
        showToast(data.error || 'Не удалось завершить сессии', true);
      }
    } catch {
      showToast('Ошибка сброса сессий', true);
    }
  };

  /** Фильтрация профилей по строке поиска */
  const filtered = useMemo(() => {
    if (!search) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    );
  }, [profiles, search]);

  /** Открытие модалки редактирования профиля */
  const startEdit = async (profile) => {
    setEditingProfile(profile);
    setEditName(profile.displayName || '');
    setEditSlug(profile.slug || '');
    setEditBio(profile.bioText || '');
    setEditAccent(profile.accentColor || '#4ade80');
    setEditLevel(profile.level || 1);
    setEditStatus(profile.status || profile.effectiveStatus || 'online');

    const initialRoles = Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : [profile.role || (profile.isOwner ? 'owner' : 'user')];
    const initialTitles = Array.isArray(profile.titles) && profile.titles.length > 0
      ? profile.titles
      : (profile.titleId ? [profile.titleId] : []);

    setEditRole(initialRoles[0] || 'user');
    setEditTitleId(initialTitles[0] || '');
    setEditRoles(initialRoles);
    setEditTitles(initialTitles);
    setShowRolesDrawer(false);

    setEditViewCount(profile.viewCount || 0);
    setEditEmail(profile.userEmail || '');
    setEditPassword('');
    setShowPassword(false);
    setEditAllowComments(profile.allowComments !== undefined ? profile.allowComments : true);
    setEditRestrictions(Array.isArray(profile.restrictions) ? profile.restrictions : []);

    // Загрузка комментариев и оценок конкретного профиля
    try {
      const res = await fetch(`/api/bio?slug=${profile.slug}`);
      if (res.ok) {
        const data = await res.json();
        setProfileComments(data.comments || []);
      }
    } catch {
      setProfileComments([]);
    }
  };

  /** Сохранение изменений профиля, уровня, роли, статуса, статистики и учётных данных */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editingProfile) return;
    setUpdating(true);

    try {
      // 1. Смена ролей и кастомных титулов (доступно только владельцу owner)
      const primaryRole = editRoles[0] || 'user';
      const primaryTitle = editTitles[0] || null;

      const roleRes = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingProfile.userId || editingProfile.id,
          role: primaryRole,
          titleId: primaryTitle,
          roles: editRoles,
          titles: editTitles,
        }),
      });

      const roleData = await roleRes.json();
      if (!roleRes.ok) {
        showToast(roleData.error || 'Ошибка смены ролей/титулов', true);
        setUpdating(false);
        return;
      }

      // 2. Обновление текстовых данных профиля, уровня, статуса и статистики
      const res = await fetch(`/api/admin/profiles/${editingProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editName.trim(),
          slug: editSlug.trim(),
          bioText: editBio.trim(),
          accentColor: editAccent,
          level: parseInt(editLevel, 10) || 1,
          status: editStatus,
          viewCount: parseInt(editViewCount, 10) || 0,
          allowComments: editAllowComments,
          restrictions: editRestrictions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка обновления профиля', true);
        setUpdating(false);
        return;
      }

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editingProfile.id
            ? {
                ...p,
                ...data.profile,
                roles: editRoles,
                titles: editTitles,
                status: editStatus,
                effectiveStatus: editStatus,
                allowComments: editAllowComments,
                restrictions: editRestrictions,
              }
            : p
        )
      );
      if (!res.ok) {
        showToast(data.error || 'Ошибка обновления профиля', true);
        setUpdating(false);
        return;
      }

      // 3. Обновление привязок учётной записи (Email и Пароль)
      if (editEmail.trim() || editPassword.trim()) {
        const credRes = await fetch('/api/admin/users/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingProfile.userId || editingProfile.id,
            newPassword: editPassword.trim() || undefined,
            newEmail: editEmail.trim() || undefined,
          }),
        });

        const credData = await credRes.json();
        if (!credRes.ok) {
          showToast(credData.error || 'Ошибка обновления пароля/email', true);
          setUpdating(false);
          return;
        }
      }

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editingProfile.id
            ? {
                ...p,
                ...data.profile,
                role: primaryRole,
                roles: editRoles,
                titles: editTitles,
                userEmail: editEmail,
              }
            : p
        )
      );
      showToast(`Профиль @${editSlug} успешно обновлён (Ролей: ${editRoles.length}, Титулов: ${editTitles.length})`);
      setEditingProfile(null);
    } catch {
      showToast('Сбой подключения к серверу', true);
    } finally {
      setUpdating(false);
    }
  };

  /** Редактирование конкретного отзыва админом */
  const handleUpdateComment = async (commentId, newText, newRating) => {
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          text: newText,
          rating: newRating,
        }),
      });

      if (res.ok) {
        setProfileComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, text: newText, rating: newRating } : c))
        );
        showToast('Отзыв и оценка успешно изменены');
      }
    } catch {
      showToast('Ошибка обновления отзыва', true);
    }
  };

  /** Удаление конкретного отзыва админом */
  const handleDeleteComment = async (commentId) => {
    try {
      const res = await fetch(`/api/admin/comments?id=${commentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProfileComments((prev) => prev.filter((c) => c.id !== commentId));
        showToast('Отзыв успешно удалён');
      }
    } catch {
      showToast('Ошибка удаления отзыва', true);
    }
  };

  /** Запрос подтверждения удаления профиля */
  const promptDelete = (profile) => {
    if (profile.isOwner) {
      showToast('Нельзя удалить профиль владельца', true);
      return;
    }
    setDeletingTarget(profile);
  };

  /** Исполнение удаления профиля */
  const confirmDelete = async () => {
    if (!deletingTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/profiles/${deletingTarget.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== deletingTarget.id));
        showToast(`Профиль "${deletingTarget.displayName}" успешно удалён`);
        setDeletingTarget(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Ошибка удаления', true);
      }
    } catch {
      showToast('Сбой подключения к серверу', true);
    } finally {
      setIsDeleting(false);
    }
  };

  /** Форматирование даты */
  const fmtDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ru-RU');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return {
          label: 'OWNER',
          color: '#f43f5e',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
        };
      case 'admin':
        return {
          label: 'ADMIN',
          color: '#facc15',
          background: 'rgba(250, 204, 21, 0.15)',
          border: '1px solid rgba(250, 204, 21, 0.4)',
        };
      case 'support':
        return {
          label: 'SUPPORT',
          color: '#38bdf8',
          background: 'rgba(56, 189, 248, 0.15)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
        };
      default:
        return {
          label: 'USER',
          color: '#9ca3af',
          background: 'rgba(156, 163, 175, 0.1)',
          border: '1px solid rgba(156, 163, 175, 0.2)',
        };
    }
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || 'offline').toLowerCase();
    switch (s) {
      case 'online':
        return {
          label: 'в сети',
          color: '#22c55e',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          glow: '0 0 8px rgba(34, 197, 94, 0.25)',
        };
      case 'dnd':
        return {
          label: 'dnd (не беспокоить)',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          glow: '0 0 8px rgba(239, 68, 68, 0.25)',
        };
      case 'idle':
        return {
          label: 'idle (неактивен)',
          color: '#f59e0b',
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          glow: '0 0 8px rgba(245, 158, 11, 0.25)',
        };
      default:
        return {
          label: 'offline',
          color: '#9ca3af',
          background: 'rgba(156, 163, 175, 0.12)',
          border: '1px solid rgba(156, 163, 175, 0.3)',
          glow: 'none',
        };
    }
  };

  const previewBadge = getLevelBadge(editLevel);

  return (
    <div>
      <div className={styles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className={styles.pageTitle}>Управление Учётками и Профилями</div>
          <div className={styles.pageSubtitle}>Всего профилей: {profiles.length}</div>
        </div>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleOpenCreateModal}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span>
          <span>Создать Учётную Запись</span>
        </button>
      </div>

      {/* Поиск */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'center',
        }}
      >
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Поиск по имени или slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #737373)' }}>
          Найдено: {filtered.length}
        </span>
      </div>

      {/* Таблица профилей */}
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>Пользователь / Имя</th>
              <th style={{ whiteSpace: 'nowrap' }}>Уровень (LVL)</th>
              <th style={{ whiteSpace: 'nowrap' }}>Slug</th>
              <th style={{ whiteSpace: 'nowrap' }}>Статус</th>
              <th style={{ whiteSpace: 'nowrap' }}>Просмотры</th>
              <th style={{ whiteSpace: 'nowrap' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>◎</div>
                    Профили не найдены
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((profile) => {
                const badge = getLevelBadge(profile.level || 1);
                const roleBadge = getRoleBadge(profile.role || (profile.isOwner ? 'owner' : 'user'));
                const st = getStatusBadgeStyle(profile.effectiveStatus || profile.status);
                return (
                  <tr key={profile.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className={styles.tdName} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{profile.displayName}</span>
                        <BadgesContainer badges={profile.badges || []} maxVisible={2} size="small" />
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 'bold',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: badge.color,
                          background: badge.background,
                          border: badge.border,
                          boxShadow: badge.glow,
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        LVL {badge.level} ({badge.title})
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link
                        href={`/bio/${profile.slug}`}
                        target="_blank"
                        className={styles.tdSlug}
                        style={{ textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        @{profile.slug} ↗
                      </Link>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 'bold',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: st.color,
                          background: st.background,
                          border: st.border,
                          boxShadow: st.glow,
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ● {st.label}
                      </span>
                    </td>
                    <td className={styles.tdMuted} style={{ whiteSpace: 'nowrap' }}>{profile.viewCount} просм.</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => startEdit(profile)}
                          style={{ color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.3)' }}
                        >
                          ✎ Управлять
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => openBanModal(profile)}
                          style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' }}
                        >
                          🔨 Баны/Сессии
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtnDanger}
                          onClick={() => promptDelete(profile)}
                          disabled={profile.isOwner}
                          style={{
                            opacity: profile.isOwner ? 0.4 : 1,
                            cursor: profile.isOwner ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ✕ Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Модалка панели редактирования */}
      {editingProfile && (
        <div className={styles.formModal}>
          <form
            className={styles.formBox}
            onSubmit={handleSaveProfile}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className={styles.formTitle}>
              Управление учёткой и профилем @{editingProfile.slug}
            </div>

            {/* Предпросмотр карточки профиля в реальном времени */}
            <div
              style={{
                marginBottom: '20px',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-card, #0a0d0a)',
                border: `1px solid ${editAccent || '#4ade80'}`,
                boxShadow: `0 0 20px ${editAccent ? editAccent + '33' : 'rgba(74, 222, 128, 0.2)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted, #737373)', fontWeight: 'bold' }}>
                👁 Предпросмотр карточки профиля (Live Preview)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '12px',
                    background: editAccent || '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: '#000',
                    overflow: 'hidden',
                  }}
                >
                  {editingProfile?.avatarPath ? (
                    <img src={editingProfile.avatarPath} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (editName || 'U')[0].toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{editName || 'Имя профиля'}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 'bold',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        color: previewBadge.color,
                        background: previewBadge.background,
                        border: previewBadge.border,
                        boxShadow: previewBadge.glow,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      LVL {previewBadge.level} ({previewBadge.title})
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #a3a3a3)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>@{editSlug || 'slug'}</span>
                    <span>•</span>
                    <span style={{ color: getStatusBadgeStyle(editStatus).color }}>
                      ● {getStatusBadgeStyle(editStatus).label}
                    </span>
                    <span>•</span>
                    <span>👁 {editViewCount || 0} просм.</span>
                  </div>
                </div>
              </div>

              {editBio && (
                <div style={{ fontSize: '12px', color: '#e5e5e5', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', fontStyle: 'italic' }}>
                  "{editBio}"
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Отображаемое имя</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Slug (адрес профиля)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  required
                />
              </div>

              {/* Уровень учетной записи */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>Уровень учётки (Level)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    className={styles.formInput}
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: previewBadge.color,
                      background: previewBadge.background,
                      border: previewBadge.border,
                      boxShadow: previewBadge.glow,
                    }}
                  >
                    LVL {previewBadge.level}
                  </span>
                </div>
              </div>

              {/* Статистика просмотров */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>Статистика просмотров</label>
                <input
                  type="number"
                  min="0"
                  className={styles.formInput}
                  value={editViewCount}
                  onChange={(e) => setEditViewCount(e.target.value)}
                />
              </div>

              {/* Статус активности */}
              <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                <label className={styles.formLabel}>Статус активности пользователя</label>
                <select
                  className={styles.formInput}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ background: 'var(--bg-card, #0a0d0a)', cursor: 'pointer' }}
                >
                  <option value="online">🟢 В сети (Online)</option>
                  <option value="dnd">🔴 Не беспокоить (DND)</option>
                  <option value="inactive">🟡 Неактивен (Idle)</option>
                  <option value="offline">⚪ Не в сети (Offline)</option>
                </select>
              </div>

              {/* Выдача Системных Ролей и Кастомных Титулов */}
              <div className={styles.formField} style={{ gridColumn: 'span 2', marginTop: 4 }}>
                <label className={styles.formLabel}>
                  👑 Назначенные Системные Роли и Косметические Титулы
                </label>
                <button
                  type="button"
                  onClick={() => setShowRolesDrawer(true)}
                  disabled={!isOwnerUser}
                  className={styles.submitBtn}
                  style={{
                    width: '100%',
                    justify: 'space-between',
                    padding: '10px 14px',
                    cursor: isOwnerUser ? 'pointer' : 'not-allowed',
                    opacity: isOwnerUser ? 1 : 0.6,
                    background: 'var(--bg-card, rgba(0,0,0,0.4))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>👑 Управление ролями и титулами</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: 'var(--accent, #ffffff)',
                        background: 'var(--accent-glow, rgba(255,255,255,0.15))',
                        border: '1px solid var(--accent, rgba(255,255,255,0.3))',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {editRoles.length} ролей, {editTitles.length} титулов
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #a3a3a3)' }}>
                    Выбрать в меню справа ➔
                  </span>
                </button>

                {!isOwnerUser && (
                  <div style={{ fontSize: '11px', color: '#f87171', marginTop: 6 }}>
                    🔒 Изменять роли и настраивать титулы может исключительно Владелец (Owner)
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formField} style={{ marginTop: 10 }}>
              <label className={styles.formLabel}>Описание (Bio)</label>
              <textarea
                className={styles.formInput}
                rows={2}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Акцентный цвет профиля</label>
              <input
                type="color"
                className={styles.formInput}
                value={editAccent}
                onChange={(e) => setEditAccent(e.target.value)}
                style={{ height: '38px', padding: '2px', cursor: 'pointer' }}
              />
            </div>

            {/* Блок управления ограничениями и правами (Муты) */}
            <div
              style={{
                margin: '14px 0',
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🛡️ Ограничения возможностей пользователя (Муты и права)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {/* Переключатель работы комментариев на странице профиля */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary, #ffffff)' }}>
                  <input
                    type="checkbox"
                    checked={editAllowComments}
                    onChange={(e) => setEditAllowComments(e.target.checked)}
                    style={{ accentColor: 'var(--accent, #4ade80)' }}
                  />
                  <span>💬 Разрешить комментарии на странице</span>
                </label>

                {/* Запрет комментариев (Мут) */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#fca5a5' }}>
                  <input
                    type="checkbox"
                    checked={editRestrictions.includes('mute_comments')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditRestrictions((prev) => [...prev, 'mute_comments']);
                      } else {
                        setEditRestrictions((prev) => prev.filter((r) => r !== 'mute_comments'));
                      }
                    }}
                    style={{ accentColor: '#ef4444' }}
                  />
                  <span>🔇 Запретить писать отзывы/комментарии (Мут)</span>
                </label>

                {/* Запрет смены аватарки */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#fca5a5' }}>
                  <input
                    type="checkbox"
                    checked={editRestrictions.includes('disable_avatar')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditRestrictions((prev) => [...prev, 'disable_avatar']);
                      } else {
                        setEditRestrictions((prev) => prev.filter((r) => r !== 'disable_avatar'));
                      }
                    }}
                    style={{ accentColor: '#ef4444' }}
                  />
                  <span>🖼️ Запретить загрузку аватара</span>
                </label>

                {/* Запрет изменения био */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#fca5a5' }}>
                  <input
                    type="checkbox"
                    checked={editRestrictions.includes('disable_bio')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditRestrictions((prev) => [...prev, 'disable_bio']);
                      } else {
                        setEditRestrictions((prev) => prev.filter((r) => r !== 'disable_bio'));
                      }
                    }}
                    style={{ accentColor: '#ef4444' }}
                  />
                  <span>✏️ Запретить редактировать Bio и Имя</span>
                </label>
              </div>
            </div>

            {/* Секция Управления Отзывами и Оценками */}
            <div
              style={{
                borderTop: '1px solid var(--border-card, #1a211a)',
                margin: '14px 0 10px',
                paddingTop: '10px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--accent, #4ade80)', marginBottom: '8px' }}>
                💬 Оценки и комментарии пользователя ({profileComments.length})
              </div>

              {profileComments.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #737373)', fontStyle: 'italic' }}>
                  Нет отзывов для этого профиля
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 180, overflowY: 'auto' }}>
                  {profileComments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--bg-card, #0d120d)',
                        border: '1px solid var(--border-card, #1e261e)',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--accent, #4ade80)' }}>
                          {c.authorName}
                        </span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              onClick={() => handleUpdateComment(c.id, c.text, s)}
                              style={{
                                color: s <= c.rating ? '#facc15' : '#4a5568',
                                cursor: 'pointer',
                                fontSize: 13,
                              }}
                            >
                              ★
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              fontSize: 12,
                              marginLeft: 6,
                            }}
                            title="Удалить этот отзыв"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={c.text}
                        onChange={(e) => {
                          const newText = e.target.value;
                          setProfileComments((prev) =>
                            prev.map((item) => (item.id === c.id ? { ...item, text: newText } : item))
                          );
                        }}
                        onBlur={(e) => handleUpdateComment(c.id, e.target.value, c.rating)}
                        style={{ fontSize: 12, padding: '4px 8px' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Данные привязанной учётной записи */}
            <div
              style={{
                borderTop: '1px solid var(--border-card, #1a211a)',
                margin: '14px 0 10px',
                paddingTop: '10px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--accent, #4ade80)', marginBottom: '8px' }}>
                🔑 Привязанные учётные данные и сброс пароля
              </div>

              {editingProfile?.accountToken && (
                <div className={styles.formField} style={{ marginBottom: 10 }}>
                  <label className={styles.formLabel}>🔑 Уникальный токен аккаунта (Account Token)</label>
                  <input
                    type="text"
                    readOnly
                    className={styles.formInput}
                    value={editingProfile.accountToken}
                    style={{ opacity: 0.85, background: 'rgba(0,0,0,0.4)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                  />
                </div>
              )}

              <div className={styles.formField}>
                <label className={styles.formLabel}>Привязанный E-mail аккаунта</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Текущий / Новый Пароль</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={styles.formInput}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Пароль учетной записи"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={styles.cancelBtn}
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? '🙈 Скрыть' : '👁 Показать'}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setEditingProfile(null)}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={styles.actionBtnPrimary}
                disabled={updating}
              >
                {updating ? 'Сохранение...' : 'Сохранить всё'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Кастомное модальное окно удаления */}
      {deletingTarget && (
        <div className={styles.formModal}>
          <div className={styles.formBox} style={{ maxWidth: '400px' }}>
            <div className={styles.formTitle} style={{ color: '#f87171' }}>
              ⚠️ Подтверждение удаления
            </div>
            <div style={{ fontSize: '13px', color: '#c8d0c0', marginBottom: '20px' }}>
              Вы уверены, что хотите удалить профиль <strong>"{deletingTarget.displayName}"</strong> (@{deletingTarget.slug})?
              Это действие полностью удалит профиль и необратимо!
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setDeletingTarget(null)}
                disabled={isDeleting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.actionBtnDanger}
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{ padding: '8px 16px' }}
              >
                {isDeleting ? 'Удаление...' : 'Да, удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Боковое меню выбора ролей и титулов (Right-Side Drawer в 2 столбца) */}
      {showRolesDrawer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
          }}
          onClick={() => setShowRolesDrawer(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '640px',
              maxWidth: '92vw',
              height: '100%',
              background: 'var(--bg-primary, #0a0d0a)',
              borderLeft: '1px solid var(--border-card, #262626)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.9)',
              overflow: 'hidden',
            }}
          >
            {/* Шапка меню */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-card, #262626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary, #ffffff)' }}>
                  👑 Настройка Ролей и Титулов
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #737373)', marginTop: 2 }}>
                  Полномочия и звания для профиля @{editingProfile?.slug}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRolesDrawer(false)}
                className={styles.cancelBtn}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                ✕ Закрыть
              </button>
            </div>

            {/* Контент Дровера в 2 Столбца */}
            <div
              style={{
                flex: 1,
                padding: '20px 24px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
              }}
            >
              {/* Столбец 1: Системные Роли */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'var(--accent, #ffffff)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>⚡ Системные Роли</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>
                    ({allRolesList.filter((r) => r.isSystem).length})
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #737373)' }}>
                  Права доступа в панель управления:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 4 }}>
                  {allRolesList
                    .filter((r) => r.isSystem)
                    .map((role) => {
                      const isSelected = editRoles.includes(role.id);
                      return (
                        <label
                          key={role.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected
                              ? `1px solid ${role.color || 'var(--accent, #ffffff)'}`
                              : '1px solid var(--border-card, #262626)',
                            background: isSelected
                              ? `${role.color || 'var(--accent, #ffffff)'}18`
                              : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditRoles((prev) => [...prev, role.id]);
                              } else {
                                const next = editRoles.filter((id) => id !== role.id);
                                setEditRoles(next.length > 0 ? next : ['user']);
                              }
                            }}
                            style={{ marginTop: '3px', accentColor: role.color || 'var(--accent)' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  fontFamily: 'var(--font-mono)',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  color: role.color,
                                  background: `${role.color}20`,
                                  border: `1px solid ${role.color}50`,
                                }}
                              >
                                {role.badgeText}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary, #ffffff)' }}>
                                {role.name}
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #737373)', marginTop: 4 }}>
                              {role.hasAdminAccess ? '⚡ Админ-доступ' : '👤 Только био-профиль'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Столбец 2: Косметические Титулы */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'var(--accent, #ffffff)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>🎨 Косметические Титулы</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>
                    ({allRolesList.filter((r) => !r.isSystem).length})
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #737373)' }}>
                  Звания для карточки профиля:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 4 }}>
                  {allRolesList
                    .filter((r) => !r.isSystem)
                    .map((title) => {
                      const isSelected = editTitles.includes(title.id);
                      return (
                        <label
                          key={title.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected
                              ? `1px solid ${title.color || 'var(--accent, #ffffff)'}`
                              : '1px solid var(--border-card, #262626)',
                            background: isSelected
                              ? `${title.color || 'var(--accent, #ffffff)'}18`
                              : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditTitles((prev) => [...prev, title.id]);
                              } else {
                                setEditTitles((prev) => prev.filter((id) => id !== title.id));
                              }
                            }}
                            style={{ marginTop: '3px', accentColor: title.color || 'var(--accent)' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  fontFamily: 'var(--font-mono)',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  color: title.color,
                                  background: `${title.color}20`,
                                  border: `1px solid ${title.color}50`,
                                }}
                              >
                                {title.badgeText}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary, #ffffff)' }}>
                                {title.name}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Футер Дровера */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-card, #262626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #737373)' }}>
                Выбрано: <strong style={{ color: 'var(--accent)' }}>{editRoles.length}</strong> ролей,{' '}
                <strong style={{ color: 'var(--accent)' }}>{editTitles.length}</strong> титулов
              </div>
              <button
                type="button"
                onClick={() => setShowRolesDrawer(false)}
                className={styles.submitBtn}
                style={{ padding: '8px 20px' }}
              >
                ✓ Применить и закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания новой учётной записи и био-профиля */}
      {showCreateModal && (
        <div className={styles.formModal}>
          <form
            className={styles.formBox}
            onSubmit={handleCreateUser}
            style={{
              maxWidth: '520px',
              width: '100%',
              background: 'var(--bg-card, #0d1210)',
              border: '1px solid var(--border-card, #1e2a1e)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-card, #1a211a)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary, #ffffff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>👤</span>
                <span>Создание Учётной Записи</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-card, #262626)',
                  color: '#9ca3af',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.15s ease',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Email (Логин) *</label>
                <input
                  type="email"
                  className={styles.formInput}
                  placeholder="user@hoshizune.space"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Пароль *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Пароль..."
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Отображаемое имя *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Имя пользователя..."
                  value={createDisplayName}
                  onChange={(e) => setCreateDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Slug (URL профиля)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="user-slug..."
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formField} style={{ marginBottom: '20px' }}>
              <label className={styles.formLabel}>Системная роль</label>
              <GlassSelect
                value={createRole}
                onChange={(val) => setCreateRole(val)}
                options={allRolesList
                  .filter((r) => r.isSystem)
                  .map((r) => ({
                    value: r.id,
                    label: r.name,
                    badgeText: r.badgeText,
                    color: r.color,
                  }))}
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowCreateModal(false)}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={creating}
                style={{ padding: '8px 20px' }}
              >
                {creating ? 'Создание...' : '✓ Создать учётку'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Модальное окно управления банами и сессиями */}
      {banModalProfile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: 'var(--bg-card, #0d1210)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(239, 68, 68, 0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔨 Управление Банами и Сессиями: {banModalProfile.displayName}</span>
              </div>
              <button
                type="button"
                onClick={() => setBanModalProfile(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                ID Пользователя: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{banModalProfile.userId || banModalProfile.id}</span>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Причина блокировки</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="Причина..."
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Срок блокировки (в днях)</label>
                <select
                  className={styles.formInput}
                  value={banDurationDays}
                  onChange={(e) => setBanDurationDays(Number(e.target.value))}
                >
                  <option value={1}>1 день</option>
                  <option value={3}>3 дня</option>
                  <option value={7}>7 дней</option>
                  <option value={30}>30 дней</option>
                  <option value={3650}>Перманентно (Навсегда)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleBanAction(false)}
                  disabled={isBanning || banModalProfile.isOwner}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    fontWeight: 'bold',
                    cursor: banModalProfile.isOwner ? 'not-allowed' : 'pointer',
                    opacity: banModalProfile.isOwner ? 0.5 : 1,
                  }}
                >
                  🚫 Заблокировать Аккаунт
                </button>

                <button
                  type="button"
                  onClick={() => handleRevokeSessions()}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #f59e0b',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Сбросить все Сессии
                </button>
              </div>

              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <label className={styles.formLabel}>Заблокировать по IP-адресу</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Например 192.168.1.1..."
                    value={banIpInput}
                    onChange={(e) => setBanIpInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleBanAction(true)}
                    disabled={!banIpInput.trim()}
                    style={{
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #dc2626',
                      background: '#dc2626',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: banIpInput.trim() ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Бан IP
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setBanModalProfile(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Плашечка уведомлений в правом нижнем углу */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 20px',
            borderRadius: '10px',
            background: toast.isError ? 'rgba(239, 68, 68, 0.95)' : 'var(--bg-card, #0d120d)',
            color: toast.isError ? '#ffffff' : 'var(--accent, #4ade80)',
            border: toast.isError ? '1px solid #ef4444' : '1px solid var(--accent, #4ade80)',
            boxShadow: toast.isError
              ? '0 10px 30px rgba(239, 68, 68, 0.4)'
              : '0 10px 30px var(--accent-glow, rgba(74, 222, 128, 0.25))',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '13px',
            fontWeight: '600',
            backdropFilter: 'blur(12px)',
            animation: 'slideUpToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span style={{ fontSize: '16px' }}>{toast.isError ? '❌' : '✓'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
