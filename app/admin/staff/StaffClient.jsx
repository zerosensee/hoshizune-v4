'use client';

import { useState, useEffect } from 'react';
import styles from '../profiles/ProfilesClient.module.css';

export default function StaffClient() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Стейт формы добавления сотрудника
  const [staffUserId, setStaffUserId] = useState('');
  const [staffPosition, setStaffPosition] = useState('Модератор');
  const [staffNotes, setStaffNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // Тост-уведомления
  const [toastMessage, setToastMessage] = useState(null);
  const [toastIsError, setToastIsError] = useState(false);

  const showToast = (msg, isErr = false) => {
    setToastMessage(msg);
    setToastIsError(isErr);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/staff');
      const data = await res.json();
      if (res.ok) {
        setStaffList(data.staff || []);
      } else {
        showToast(data.error || 'Ошибка загрузки состава администрации', true);
      }
    } catch {
      showToast('Сбой подключения к серверу', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!staffUserId.trim()) {
      showToast('Укажите ID или Slug пользователя', true);
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: staffUserId.trim(),
          position: staffPosition.trim(),
          notes: staffNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Сотрудник успешно добавлен в состав!');
        setShowAddModal(false);
        setStaffUserId('');
        setStaffPosition('Модератор');
        setStaffNotes('');
        loadStaff();
      } else {
        showToast(data.error || 'Ошибка добавления сотрудника', true);
      }
    } catch {
      showToast('Ошибка сети при добавлении', true);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStaff = async (stf) => {
    if (!confirm(`Исключить @${stf.slug} из состава администрации?`)) return;
    try {
      const res = await fetch(`/api/admin/staff?id=${stf.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Пользователь @${stf.slug} исключен из состава`);
        loadStaff();
      } else {
        showToast(data.error || 'Ошибка удаления сотрудника', true);
      }
    } catch {
      showToast('Ошибка подключения к серверу', true);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      {/* Тост уведомление */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            background: toastIsError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(34, 197, 94, 0.95)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'var(--accent, #4ade80)' }}>
            🛡️ Состав Администрации (Staff)
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Управление командой проекта, добавление подопечных и просмотр должностей
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={styles.actionBtnPrimary}
          style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>➕</span> Добавить сотрудника
        </button>
      </div>

      {/* Карточки сотрудников */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Загрузка состава...</div>
      ) : staffList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', border: '1px dashed #333', borderRadius: '12px' }}>
          В составе администрации пока нет записанных сотрудников. Добавьте первого через кнопку выше!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {staffList.map((stf) => (
            <div
              key={stf.id}
              style={{
                background: 'var(--bg-card, #0d120d)',
                border: '1px solid var(--border-card, #1e261e)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  {stf.avatarPath ? (
                    <img
                      src={stf.avatarPath}
                      alt={stf.displayName}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent)' }}
                    />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                      {stf.displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>@{stf.slug}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{stf.displayName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 'bold', marginTop: '2px' }}>
                      Должность: {stf.position}
                    </div>
                  </div>
                </div>

                {stf.notes && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#d1d5db', marginBottom: '12px', fontStyle: 'italic' }}>
                    "{stf.notes}"
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#737373' }}>
                  Добавлен: {new Date(stf.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleRemoveStaff(stf)}
                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                >
                  Исключить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка добавления сотрудника */}
      {showAddModal && (
        <div className={styles.formModal}>
          <form className={styles.formBox} onSubmit={handleAddStaff} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--accent, #4ade80)' }}>➕ Назначение в Состав</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className={styles.cancelBtn} style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>ID или Slug Пользователя *</label>
              <input
                type="text"
                className={styles.formInput}
                value={staffUserId}
                onChange={(e) => setStaffUserId(e.target.value)}
                placeholder="например: user_slug..."
                required
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Должность / Роль *</label>
              <input
                type="text"
                className={styles.formInput}
                value={staffPosition}
                onChange={(e) => setStaffPosition(e.target.value)}
                placeholder="Модератор, Поддержка, Куратор..."
                required
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Заметки / Обязанности (Необязательно)</label>
              <textarea
                className={styles.formInput}
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Заметки о сотруднике, его обязанности..."
                rows={3}
              />
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => setShowAddModal(false)} className={styles.cancelBtn}>Отмена</button>
              <button type="submit" disabled={adding} className={styles.actionBtnPrimary}>
                {adding ? 'Сохранение...' : 'Добавить сотрудника'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
