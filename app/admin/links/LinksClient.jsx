'use client';

/**
 * Клиентский компонент управления сокращёнными ссылками.
 * Создание, редактирование, удаление с кастомным модальным окном подтверждения.
 */
import {
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import styles from '../admin.module.css';
import { copyToClipboard } from '@/lib/clipboard';

export default function LinksClient({ initialLinks }) {
  const [links, setLinks] = useState(initialLinks);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  /* Форма создания */
  const urlRef = useRef(null);
  const titleRef = useRef(null);
  const codeRef = useRef(null);
  const [creating, setCreating] = useState(false);

  /* Модалка редактирования */
  const [editingLink, setEditingLink] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [updating, setUpdating] = useState(false);

  /* Модалка удаления */
  const [deletingLinkTarget, setDeletingLinkTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /** Тост-уведомление */
  const showToast = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** Фильтрация */
  const filtered = useMemo(() => {
    if (!search) return links;
    const q = search.toLowerCase();
    return links.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.targetUrl.toLowerCase().includes(q) ||
        l.title?.toLowerCase().includes(q),
    );
  }, [links, search]);

  /** Создание ссылки */
  const handleCreate = useCallback(async () => {
    const url = urlRef.current?.value?.trim();
    const title = titleRef.current?.value?.trim() || '';
    const customCode = codeRef.current?.value?.trim() || undefined;

    if (!url) {
      showToast('Введите URL', true);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, customCode }),
      });
      const data = await res.json();

      if (res.ok) {
        setLinks((prev) => [data.link, ...prev]);
        setShowForm(false);
        showToast(`Ссылка создана: /s/${data.link.code}`);
        if (urlRef.current) urlRef.current.value = '';
        if (titleRef.current) titleRef.current.value = '';
        if (codeRef.current) codeRef.current.value = '';
      } else {
        showToast(data.error || 'Ошибка создания', true);
      }
    } catch {
      showToast('Сбой подключения', true);
    } finally {
      setCreating(false);
    }
  }, [showToast]);

  /** Открытие редактирования ссылки */
  const startEdit = (link) => {
    setEditingLink(link);
    setEditUrl(link.targetUrl || '');
    setEditTitle(link.title || '');
  };

  /** Сохранение редактируемой ссылки */
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLink) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/links/${editingLink.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: editUrl.trim(),
          title: editTitle.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setLinks((prev) =>
          prev.map((l) => (l.id === editingLink.id ? data.link : l))
        );
        showToast(`Ссылка /s/${editingLink.code} обновлена`);
        setEditingLink(null);
      } else {
        showToast(data.error || 'Ошибка сохранения', true);
      }
    } catch {
      showToast('Сбой подключения к серверу', true);
    } finally {
      setUpdating(false);
    }
  };

  /** Запрос удаления ссылки */
  const promptDeleteLink = (link) => {
    setDeletingLinkTarget(link);
  };

  /** Подтверждённое удаление */
  const confirmDeleteLink = async () => {
    if (!deletingLinkTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/links/${deletingLinkTarget.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== deletingLinkTarget.id));
        showToast(`Ссылка /s/${deletingLinkTarget.code} удалена`);
        setDeletingLinkTarget(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Ошибка удаления', true);
      }
    } catch {
      showToast('Сбой подключения', true);
    } finally {
      setIsDeleting(false);
    }
  };

  /** Переключение активности ссылки */
  const handleToggle = useCallback(
    async (link) => {
      try {
        const res = await fetch(`/api/admin/links/${link.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !link.isActive }),
        });

        if (res.ok) {
          const data = await res.json();
          setLinks((prev) =>
            prev.map((l) => (l.id === link.id ? data.link : l))
          );
        }
      } catch {
        showToast('Ошибка обновления', true);
      }
    },
    [showToast],
  );

  /** Копирование короткой ссылки */
  const copyLink = useCallback(async (code) => {
    const url = `${window.location.origin}/s/${code}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      showToast(`Скопировано: ${url}`);
    } else {
      showToast('Не удалось скопировать ссылку', true);
    }
  }, [showToast]);

  /** Форматирование даты */
  const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString('ru-RU') : '—');

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Ссылки</div>
        <div className={styles.pageSubtitle}>Всего: {links.length}</div>
      </div>

      {/* Тулбар */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Поиск по коду, URL, названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className={styles.actionBtnPrimary}
          onClick={() => setShowForm(true)}
        >
          + Создать ссылку
        </button>
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #737373)' }}>
          Найдено: {filtered.length}
        </span>
      </div>

      {/* Таблица */}
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>URL</th>
              <th>Название</th>
              <th>Клики</th>
              <th>Статус</th>
              <th>Создан</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>◎</div>
                    Ссылки не найдены
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((link) => (
                <tr key={link.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => copyLink(link.code)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span className={styles.tdCode}>/s/{link.code} ⧉</span>
                    </button>
                  </td>
                  <td
                    style={{
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <a
                      href={link.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#6a8a6a',
                        textDecoration: 'none',
                        fontSize: '12px',
                      }}
                    >
                      {link.targetUrl}
                    </a>
                  </td>
                  <td className={styles.tdMuted}>{link.title || '—'}</td>
                  <td>{link.clicks}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggle(link)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className={
                          link.isActive
                            ? styles.badgeActive
                            : styles.badgeInactive
                        }
                      >
                        {link.isActive ? 'активна' : 'выкл'}
                      </span>
                    </button>
                  </td>
                  <td className={styles.tdMuted}>{fmtDate(link.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => startEdit(link)}
                        style={{ color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.3)' }}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtnDanger}
                        onClick={() => promptDeleteLink(link)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Модалка создания */}
      {showForm && (
        <div className={styles.formModal}>
          <div className={styles.formBox}>
            <div className={styles.formTitle}>Создать ссылку</div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>URL * (обязательно)</label>
              <input
                ref={urlRef}
                type="url"
                className={styles.formInput}
                placeholder="https://example.com/long-url"
                autoFocus
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Название (опционально)</label>
              <input
                ref={titleRef}
                type="text"
                className={styles.formInput}
                placeholder="Описание ссылки"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Пользовательский код (опционально)
              </label>
              <input
                ref={codeRef}
                type="text"
                className={styles.formInput}
                placeholder="my-link (3-20 символов)"
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowForm(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.actionBtnPrimary}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? '...' : '→ Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования */}
      {editingLink && (
        <div className={styles.formModal}>
          <form className={styles.formBox} onSubmit={handleSaveEdit}>
            <div className={styles.formTitle}>
              Редактирование ссылки /s/{editingLink.code}
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Целевой URL</label>
              <input
                type="url"
                className={styles.formInput}
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                required
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Название / Описание</label>
              <input
                type="text"
                className={styles.formInput}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setEditingLink(null)}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={styles.actionBtnPrimary}
                disabled={updating}
              >
                {updating ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Кастомное модальное окно удаления ссылки */}
      {deletingLinkTarget && (
        <div className={styles.formModal}>
          <div className={styles.formBox} style={{ maxWidth: '400px' }}>
            <div className={styles.formTitle} style={{ color: '#f87171' }}>
              ⚠️ Подтверждение удаления ссылки
            </div>
            <div style={{ fontSize: '13px', color: '#c8d0c0', marginBottom: '20px' }}>
              Удалить сокращённую ссылку <strong>/s/{deletingLinkTarget.code}</strong>?
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setDeletingLinkTarget(null)}
                disabled={isDeleting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.actionBtnDanger}
                onClick={confirmDeleteLink}
                disabled={isDeleting}
                style={{ padding: '8px 16px' }}
              >
                {isDeleting ? 'Удаление...' : 'Да, удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Тост */}
      {toast && (
        <div className={toast.isError ? styles.toastError : styles.toast}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
