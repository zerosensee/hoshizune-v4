'use client';

/**
 * Клиентский компонент управления Ролями, Кастомными Титулами и Правами доступа.
 * Разрешает Владельцу (Owner) динамически настраивать разрешения для каждой роли
 * и создавать бесконечное количество косметических титулов.
 */
import { useState, useCallback } from 'react';
import styles from '../admin.module.css';

export default function RolesClient({ initialRoles, availablePermissions, currentUser }) {
  const [roles, setRoles] = useState(initialRoles);
  const [toast, setToast] = useState(null);

  const isOwner = currentUser?.role === 'owner' || currentUser?.isOwner || true;

  /* Состояние создания новой роли / титула */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#a855f7');
  const [newBadgeText, setNewBadgeText] = useState('');
  const [newIsSystem, setNewIsSystem] = useState(false);
  const [newPermissions, setNewPermissions] = useState([]);
  const [creating, setCreating] = useState(false);

  /* Состояние редактирования имеющейся роли */
  const [editingRole, setEditingRole] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#4ade80');
  const [editBadgeText, setEditBadgeText] = useState('');
  const [editIsSystem, setEditIsSystem] = useState(false);
  const [updating, setUpdating] = useState(false);

  /** Отображение тостов */
  const showToast = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** Открытие модалки создания */
  const handleOpenCreate = () => {
    setNewId('');
    setNewName('');
    setNewColor('#a855f7');
    setNewBadgeText('');
    setNewIsSystem(false);
    setNewPermissions([]);
    setShowCreateModal(true);
  };

  /** Создание новой роли или титула */
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId.trim() || undefined,
          name: newName.trim(),
          color: newColor,
          badgeText: newBadgeText.trim() || newName.trim(),
          isSystem: newIsSystem,
          permissions: newPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка создания роли', true);
        setCreating(false);
        return;
      }

      setRoles((prev) => [...prev, data.role]);
      showToast(`Объект "${data.role.name}" успешно создан в разделе ${data.role.isSystem ? 'Системных Ролей' : 'Косметических Титулов'}!`);
      setShowCreateModal(false);
    } catch {
      showToast('Сбой подключения к серверу', true);
    } finally {
      setCreating(false);
    }
  };

  /** Открытие модалки редактирования прав */
  const handleStartEdit = (role) => {
    setEditingRole(role);
    setEditName(role.name);
    setEditColor(role.color);
    setEditBadgeText(role.badgeText);
    setEditIsSystem(!!role.isSystem);
    setEditPermissions([...role.permissions]);
  };

  /** Сохранение изменений прав роли */
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!editingRole) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
          badgeText: editBadgeText.trim(),
          isSystem: editIsSystem,
          permissions: editPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка обновления роли', true);
        setUpdating(false);
        return;
      }

      setRoles((prev) =>
        prev.map((r) => (r.id === editingRole.id ? data.role : r))
      );
      showToast(`Параметры "${data.role.name}" сохранены!`);
      setEditingRole(null);
    } catch {
      showToast('Сбой подключения к серверу', true);
    } finally {
      setUpdating(false);
    }
  };

  /** Удаление кастомного титула */
  const handleDeleteRole = async (role) => {
    if (role.isSystem) {
      showToast('Нельзя удалить системную роль', true);
      return;
    }
    if (!confirm(`Вы действительно хотите удалить титул "${role.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка удаления титула', true);
        return;
      }

      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      showToast(`Титул "${role.name}" удалён`);
    } catch {
      showToast('Сбой сервера при удалении', true);
    }
  };

  /** Переключатель чекбокса прав */
  const togglePermission = (permId, isEdit = false) => {
    if (isEdit) {
      setEditPermissions((prev) =>
        prev.includes(permId)
          ? prev.filter((p) => p !== permId)
          : [...prev, permId]
      );
    } else {
      setNewPermissions((prev) =>
        prev.includes(permId)
          ? prev.filter((p) => p !== permId)
          : [...prev, permId]
      );
    }
  };

  const [draggedGroup, setDraggedGroup] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  /** Перемещение элемента внутри своей группы (системные роли или титулы) */
  const handleMoveGroupItem = (isSystemGroup, index, direction) => {
    const systemRoles = roles.filter((r) => r.isSystem);
    const titleRoles = roles.filter((r) => !r.isSystem);

    const targetList = isSystemGroup ? [...systemRoles] : [...titleRoles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= targetList.length) return;

    const temp = targetList[index];
    targetList[index] = targetList[targetIndex];
    targetList[targetIndex] = temp;

    const newRoles = isSystemGroup
      ? [...targetList, ...titleRoles]
      : [...systemRoles, ...targetList];

    setRoles(newRoles);
  };

  /** Обработка события начала перетаскивания мышью */
  const handleDragStart = (isSystemGroup, index) => {
    setDraggedGroup(isSystemGroup ? 'system' : 'title');
    setDraggedIndex(index);
  };

  /** Обработка событие сброса элемента при перетаскивании */
  const handleDrop = (isSystemGroup, dropIndex) => {
    const expectedGroup = isSystemGroup ? 'system' : 'title';
    if (draggedGroup !== expectedGroup || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedGroup(null);
      setDraggedIndex(null);
      return;
    }

    const systemRoles = roles.filter((r) => r.isSystem);
    const titleRoles = roles.filter((r) => !r.isSystem);

    const targetList = isSystemGroup ? [...systemRoles] : [...titleRoles];
    const [movedItem] = targetList.splice(draggedIndex, 1);
    targetList.splice(dropIndex, 0, movedItem);

    const newRoles = isSystemGroup
      ? [...targetList, ...titleRoles]
      : [...systemRoles, ...targetList];

    setRoles(newRoles);
    setDraggedGroup(null);
    setDraggedIndex(null);
  };

  /** Сохранение порядка иерархии */
  const handleSaveOrder = async () => {
    setUpdating(true);
    try {
      const orderedIds = roles.map((r) => r.id);
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setRoles(data.roles || roles);
        showToast('Иерархия ролей и титулов успешно сохранена!');
      } else {
        showToast(data.error || 'Ошибка смены иерархии', true);
      }
    } catch {
      showToast('Сбой при сохранении порядка', true);
    } finally {
      setUpdating(false);
    }
  };

  const systemRolesList = roles.filter((r) => r.isSystem);
  const titleRolesList = roles.filter((r) => !r.isSystem);

  return (
    <div>
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
          <span style={{ fontSize: '16px' }}>{toast.isError ? '❌' : '💾'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Заголовок */}
      <div className={styles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className={styles.pageTitle}>👑 Настройка Ролей, Титулов и Права Доступа</div>
          <div className={styles.pageSubtitle}>
            Конфигурация прав в админке, установка иерархии и создание косметических титулов
          </div>
        </div>
        {isOwner && (
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleOpenCreate}
          >
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>+</span>
            <span>Создать Роль / Титул</span>
          </button>
        )}
      </div>

      {!isOwner && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            color: '#f87171',
            fontSize: '13px',
            marginBottom: '20px',
          }}
        >
          🔒 Настройка прав ролей и создание новых титулов доступны исключительно **Владельцу (Owner)**.
        </div>
      )}

      {/* Двухколоночный макет: слева карточки прав, справа блок Иерархии */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Сетка Ролей и Титулов */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {roles.map((role) => {
            const isAdminRole = role.permissions.includes('access_admin');
            return (
              <div
                key={role.id}
                className={`${styles.card} card roleCard`}
                style={{
                  '--role-color': `${role.color}90`,
                  background: 'var(--bg-card, #0d120d)',
                  border: `1px solid ${role.color}90`,
                  boxShadow: `0 0 16px ${role.color}25`,
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 'bold', fontSize: 16, color: '#fff' }}>{role.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        color: role.color,
                        background: `${role.color}1a`,
                        border: `1px solid ${role.color}50`,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {role.badgeText}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', marginBottom: 12 }}>
                    {isAdminRole ? (
                      <span style={{ color: 'var(--accent, #ffffff)' }}>⚡ Доступ в админку включен</span>
                    ) : (
                      <span style={{ color: '#a855f7' }}>🎨 Косметический титул (Без админки)</span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: 14 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#d1d5db' }}>
                      Активные права ({role.permissions.length}):
                    </div>
                    {role.permissions.length === 0 ? (
                      <span style={{ fontStyle: 'italic', color: '#6b7280' }}>Нет системных прав (только титул)</span>
                    ) : (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {role.permissions.map((pId) => {
                          const permInfo = availablePermissions.find((ap) => ap.id === pId);
                          return <li key={pId}>{permInfo ? permInfo.label : pId}</li>;
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border-card, #262626)', paddingTop: 10, alignItems: 'center' }}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => handleStartEdit(role)}
                      style={{ flex: 1, padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      ⚙️ Настроить права
                    </button>
                    {!role.isSystem && (
                      <button
                        type="button"
                        className={styles.actionBtnDanger}
                        onClick={() => handleDeleteRole(role)}
                        style={{
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                        title="Удалить титул"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Правая панель управления иерархией */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'sticky',
            top: '20px',
          }}
        >
          {/* Блок 1: Системные Роли */}
          <div
            style={{
              background: 'var(--bg-card, #0d120d)',
              border: '1px solid var(--border-card, #1a211a)',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent, #ffffff)', marginBottom: 4 }}>
              ⚡ Иерархия Системных Ролей
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #737373)', marginBottom: 12 }}>
              Приоритет системных ролей с доступом к правам и админке.
            </div>

            <div className={styles.customScrollbar} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
              {systemRolesList.map((role, idx) => {
                const isDragging = draggedGroup === 'system' && draggedIndex === idx;
                return (
                  <div
                    key={role.id}
                    className="roleCard"
                    draggable={isOwner}
                    onDragStart={() => handleDragStart(true, idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(true, idx)}
                    style={{
                      '--role-color': isDragging ? role.color : `${role.color}70`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isDragging ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isDragging ? role.color : `${role.color}60`}`,
                      cursor: isOwner ? 'grab' : 'default',
                      opacity: isDragging ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isOwner && (
                        <span style={{ fontSize: '13px', color: '#737373', cursor: 'grab', userSelect: 'none' }} title="Зажмите мышкой для перетаскивания">
                          ⠿
                        </span>
                      )}
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted, #737373)', width: 20 }}>
                        #{idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 5px',
                          borderRadius: '3px',
                          color: role.color,
                          background: `${role.color}20`,
                          border: `1px solid ${role.color}50`,
                        }}
                      >
                        {role.badgeText}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{role.name}</span>
                    </div>

                    {isOwner && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleMoveGroupItem(true, idx, 'up')}
                          disabled={idx === 0}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-card, #262626)',
                            color: idx === 0 ? '#404040' : 'var(--accent, #ffffff)',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 11,
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          }}
                          title="Поднять выше"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveGroupItem(true, idx, 'down')}
                          disabled={idx === systemRolesList.length - 1}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-card, #262626)',
                            color: idx === systemRolesList.length - 1 ? '#404040' : 'var(--accent, #ffffff)',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 11,
                            cursor: idx === systemRolesList.length - 1 ? 'not-allowed' : 'pointer',
                          }}
                          title="Опустить ниже"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Блок 2: Косметические Титулы */}
          <div
            style={{
              background: 'var(--bg-card, #0d120d)',
              border: '1px solid var(--border-card, #1a211a)',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#a855f7', marginBottom: 4 }}>
              🎨 Иерархия Косметических Титулов
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #737373)', marginBottom: 12 }}>
              Приоритет отображения декоративных титулов в профилях.
            </div>

            {titleRolesList.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                Косметические титулы отсутствуют
              </div>
            ) : (
              <div className={styles.customScrollbar} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                {titleRolesList.map((role, idx) => {
                  const isDragging = draggedGroup === 'title' && draggedIndex === idx;
                  return (
                    <div
                      key={role.id}
                      className="roleCard"
                      draggable={isOwner}
                      onDragStart={() => handleDragStart(false, idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(false, idx)}
                      style={{
                        '--role-color': isDragging ? role.color : `${role.color}70`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: isDragging ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isDragging ? role.color : `${role.color}60`}`,
                        cursor: isOwner ? 'grab' : 'default',
                        opacity: isDragging ? 0.5 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isOwner && (
                          <span style={{ fontSize: '13px', color: '#a855f7', cursor: 'grab', userSelect: 'none' }} title="Зажмите мышкой для перетаскивания">
                            ⠿
                          </span>
                        )}
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#a855f7', width: 20 }}>
                          #{idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 5px',
                            borderRadius: '3px',
                            color: role.color,
                            background: `${role.color}20`,
                            border: `1px solid ${role.color}50`,
                          }}
                        >
                          {role.badgeText}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{role.name}</span>
                      </div>

                      {isOwner && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleMoveGroupItem(false, idx, 'up')}
                            disabled={idx === 0}
                            style={{
                              background: 'none',
                              border: '1px solid var(--border-card, #262626)',
                              color: idx === 0 ? '#404040' : '#a855f7',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: 11,
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            }}
                            title="Поднять выше"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGroupItem(false, idx, 'down')}
                            disabled={idx === titleRolesList.length - 1}
                            style={{
                              background: 'none',
                              border: '1px solid var(--border-card, #262626)',
                              color: idx === titleRolesList.length - 1 ? '#404040' : '#a855f7',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: 11,
                              cursor: idx === titleRolesList.length - 1 ? 'not-allowed' : 'pointer',
                            }}
                            title="Опустить ниже"
                          >
                            ▼
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isOwner && (
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSaveOrder}
                disabled={updating}
                style={{ width: '100%', marginTop: 16, padding: '10px' }}
              >
                💾 Сохранить порядок иерархии
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Модалка создания роли / титула */}
      {showCreateModal && (
        <div className={styles.formModal}>
          <form
            className={`${styles.formBox} ${styles.customScrollbar}`}
            onSubmit={handleCreateRole}
            style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className={styles.formTitle}>✨ Создание новой роли или титула</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>ID (slug)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="напр. vip_legend"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Название роли/титула</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="напр. Нищий Вайбкодер"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Текст на бейдже</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="VIBECODER"
                  value={newBadgeText}
                  onChange={(e) => setNewBadgeText(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Цвет плашки</label>
                <input
                  type="color"
                  className={styles.formInput}
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  style={{ height: 38, padding: 2, cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Выбор типа элемента в иерархии */}
            <div className={styles.formField} style={{ marginTop: 12 }}>
              <label className={styles.formLabel}>Раздел размещения в Иерархии</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setNewIsSystem(true)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${newIsSystem ? 'var(--accent, #4ade80)' : 'var(--border-card, #262626)'}`,
                    background: newIsSystem ? 'var(--accent-glow, rgba(74, 222, 128, 0.15))' : 'var(--bg-card, #0a0d0a)',
                    color: newIsSystem ? 'var(--accent, #4ade80)' : 'var(--text-muted, #737373)',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>⚡ Системная Роль</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewIsSystem(false)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${!newIsSystem ? '#a855f7' : 'var(--border-card, #262626)'}`,
                    background: !newIsSystem ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-card, #0a0d0a)',
                    color: !newIsSystem ? '#a855f7' : 'var(--text-muted, #737373)',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🎨 Косметический Титул</span>
                </button>
              </div>
            </div>

            {/* Выбор разрешений (Permissions) */}
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border-card, #1a211a)', paddingTop: 10 }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent, #4ade80)', marginBottom: 8 }}>
                🛡️ Права доступа в Админ-Панели:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availablePermissions.map((perm) => {
                  const checked = newPermissions.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 12,
                        color: 'var(--text-primary, #d1d5db)',
                        cursor: 'pointer',
                        background: 'var(--bg-card, #0a0d0a)',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-card, #1a211a)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(perm.id, false)}
                        style={{ accentColor: 'var(--accent, #4ade80)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold', color: checked ? 'var(--accent, #4ade80)' : 'var(--text-primary, #fff)' }}>
                          {perm.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>{perm.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={styles.formActions} style={{ marginTop: 16 }}>
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
              >
                {creating ? 'Создание...' : 'Сохранить Титул/Роль'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Модалка редактирования прав существующей роли */}
      {editingRole && (
        <div className={styles.formModal}>
          <form
            className={`${styles.formBox} ${styles.customScrollbar}`}
            onSubmit={handleSaveRole}
            style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className={styles.formTitle}>
              ⚙️ Настройка прав для «{editingRole.name}»
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Название</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Текст бейджа</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editBadgeText}
                  onChange={(e) => setEditBadgeText(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formField} style={{ marginTop: 10 }}>
              <label className={styles.formLabel}>Цвет акцента</label>
              <input
                type="color"
                className={styles.formInput}
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                style={{ height: 38, padding: 2, cursor: 'pointer' }}
              />
            </div>

            {/* Изменение категории иерархии */}
            <div className={styles.formField} style={{ marginTop: 12 }}>
              <label className={styles.formLabel}>Категория в Иерархии</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setEditIsSystem(true)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${editIsSystem ? 'var(--accent, #4ade80)' : 'var(--border-card, #262626)'}`,
                    background: editIsSystem ? 'var(--accent-glow, rgba(74, 222, 128, 0.15))' : 'var(--bg-card, #0a0d0a)',
                    color: editIsSystem ? 'var(--accent, #4ade80)' : 'var(--text-muted, #737373)',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>⚡ Системная Роль</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditIsSystem(false)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${!editIsSystem ? '#a855f7' : 'var(--border-card, #262626)'}`,
                    background: !editIsSystem ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-card, #0a0d0a)',
                    color: !editIsSystem ? '#a855f7' : 'var(--text-muted, #737373)',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🎨 Косметический Титул</span>
                </button>
              </div>
            </div>

            {/* Выбор разрешений (Permissions) */}
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border-card, #1a211a)', paddingTop: 10 }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent, #4ade80)', marginBottom: 8 }}>
                🛡️ Переключение прав роли в админке:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availablePermissions.map((perm) => {
                  const checked = editPermissions.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 12,
                        color: 'var(--text-primary, #d1d5db)',
                        cursor: 'pointer',
                        background: 'var(--bg-card, #0a0d0a)',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-card, #1a211a)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(perm.id, true)}
                        style={{ accentColor: 'var(--accent, #4ade80)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold', color: checked ? 'var(--accent, #4ade80)' : 'var(--text-primary, #fff)' }}>
                          {perm.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>{perm.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={styles.formActions} style={{ marginTop: 16 }}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setEditingRole(null)}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={updating}
              >
                {updating ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
