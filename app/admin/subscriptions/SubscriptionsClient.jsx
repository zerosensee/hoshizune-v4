'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

export default function SubscriptionsClient() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'active' | 'none'
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Стейт формы выдачи подписки
  const [issueUserId, setIssueUserId] = useState('');
  const [issueEmail, setIssueEmail] = useState('');
  const [issueOrderId, setIssueOrderId] = useState('');
  const [issuePlan, setIssuePlan] = useState('Premium');
  const [issueDays, setIssueDays] = useState(30);
  const [issuing, setIssuing] = useState(false);

  // Тост-уведомления
  const [toastMessage, setToastMessage] = useState(null);
  const [toastIsError, setToastIsError] = useState(false);

  const showToast = (msg, isErr = false) => {
    setToastMessage(msg);
    setToastIsError(isErr);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subscriptions');
      const data = await res.json();
      if (res.ok) {
        setSubscriptions(data.subscriptions || []);
      } else {
        showToast(data.error || 'Ошибка загрузки подписок', true);
      }
    } catch {
      showToast('Сбой подключения к серверу', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const openIssueForUser = (user) => {
    setIssueUserId(user.userSlug || user.userId);
    setIssueEmail(user.email && user.email !== '—' ? user.email : '');
    setShowIssueModal(true);
  };

  // Выдача подписки
  const handleIssue = async (e) => {
    e.preventDefault();
    if (!issueUserId.trim()) {
      showToast('Укажите ID или slug пользователя', true);
      return;
    }
    setIssuing(true);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: issueUserId.trim(),
          email: issueEmail.trim(),
          orderId: issueOrderId.trim(),
          planName: issuePlan,
          durationDays: Number(issueDays),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Подписка "${issuePlan}" успешно выдана!`);
        setShowIssueModal(false);
        setIssueUserId('');
        setIssueEmail('');
        setIssueOrderId('');
        loadSubscriptions();
      } else {
        showToast(data.error || 'Ошибка выдачи подписки', true);
      }
    } catch {
      showToast('Ошибка при запросе к серверу', true);
    } finally {
      setIssuing(false);
    }
  };

  // Продление подписки
  const handleExtend = async (sub, days = 30) => {
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, extraDays: days }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Подписка для @${sub.userSlug} продлена на ${days} дней!`);
        loadSubscriptions();
      } else {
        showToast(data.error || 'Ошибка продления', true);
      }
    } catch {
      showToast('Ошибка сети при продлении', true);
    }
  };

  // Сброс / Отзыв подписки
  const handleRevoke = async (sub) => {
    if (!confirm(`Отозвать подписку пользователя @${sub.userSlug}?`)) return;
    try {
      const res = await fetch(`/api/admin/subscriptions?id=${sub.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Подписка для @${sub.userSlug} отозвана!`);
        loadSubscriptions();
      } else {
        showToast(data.error || 'Ошибка отзыва подписки', true);
      }
    } catch {
      showToast('Ошибка сети при отзыве', true);
    }
  };

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const noSubs = subscriptions.filter((s) => s.status !== 'active');

  const filteredSubs = subscriptions.filter((s) => {
    const matchesSearch =
      (s.userSlug || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.userDisplayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.orderId || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.userId || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === 'active') return s.status === 'active';
    if (filterTab === 'none') return s.status !== 'active';
    return true;
  });

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

      {/* Шапка раздела */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'var(--accent, #4ade80)' }}>
            💎 Управление Подписками
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Полный учет аккаунтов, выдача, продление и отслеживание сроков действия подписок
          </p>
        </div>
        <button
          onClick={() => {
            setIssueUserId('');
            setIssueEmail('');
            setShowIssueModal(true);
          }}
          className={styles.actionBtnPrimary}
          style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>✨</span> Выдать подписку
        </button>
      </div>

      {/* Карточки метрик */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card, #1e261e)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Всего Учётных Записей</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>{subscriptions.length}</div>
        </div>
        <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#4ade80' }}>Активные Подписки</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80', marginTop: '4px' }}>{activeSubs.length}</div>
        </div>
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#f87171' }}>Без Подписки / Истёкшие</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171', marginTop: '4px' }}>{noSubs.length}</div>
        </div>
      </div>

      {/* Переключатели табов и Поиск */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterTab === 'all' ? 'var(--accent, #4ade80)' : 'rgba(255,255,255,0.15)',
              background: filterTab === 'all' ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
              color: filterTab === 'all' ? '#4ade80' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Все аккаунты ({subscriptions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterTab === 'active' ? '#4ade80' : 'rgba(255,255,255,0.15)',
              background: filterTab === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              color: filterTab === 'active' ? '#4ade80' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ● Активные ({activeSubs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('none')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterTab === 'none' ? '#f87171' : 'rgba(255,255,255,0.15)',
              background: filterTab === 'none' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: filterTab === 'none' ? '#f87171' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ○ Без подписки ({noSubs.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Поиск по нику, ID или E-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          style={{ width: '100%', maxWidth: '320px' }}
        />
      </div>

      {/* Таблица подписок */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Загрузка пользователей и подписок...</div>
      ) : filteredSubs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', border: '1px dashed #333', borderRadius: '12px' }}>
          Пользователи не найдены
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-card, #0d120d)', border: '1px solid var(--border-card, #1e261e)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-card, #1e261e)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Пользователь</th>
                <th style={{ padding: '12px 16px' }}>Тариф</th>
                <th style={{ padding: '12px 16px' }}>Статус</th>
                <th style={{ padding: '12px 16px' }}>Дата истечения (Срок)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map((sub) => {
                const daysLeft = sub.expiresAt ? Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
                return (
                  <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                      @{sub.userSlug}
                      <div style={{ fontSize: '11px', color: '#737373', fontWeight: 'normal' }}>{sub.userDisplayName}</div>
                      <div style={{ fontSize: '10px', color: '#525252', fontFamily: 'monospace' }}>ID: {sub.userId}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {sub.status === 'none' ? (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#737373', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }}>
                          Без подписки
                        </span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(250, 204, 21, 0.15)', color: '#facc15', border: '1px solid rgba(250, 204, 21, 0.3)', fontWeight: 'bold', fontSize: '11px' }}>
                          {sub.planName}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {sub.status === 'active' && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '11px', fontWeight: 'bold' }}>
                          ● Активна
                        </span>
                      )}
                      {sub.status === 'expired' && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '11px', fontWeight: 'bold' }}>
                          ✕ Истёкла
                        </span>
                      )}
                      {sub.status === 'revoked' && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '11px', fontWeight: 'bold' }}>
                          ⊘ Отозвана
                        </span>
                      )}
                      {sub.status === 'none' && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(115, 115, 115, 0.15)', color: '#a3a3a3', fontSize: '11px' }}>
                          ○ Отсутствует
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                      {sub.expiresAt ? (
                        <div>
                          <span style={{ color: sub.status === 'active' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                            {new Date(sub.expiresAt).toLocaleDateString()}
                          </span>
                          <div style={{ fontSize: '11px', color: '#737373' }}>
                            {sub.status === 'active' ? `Осталось: ${daysLeft} дн.` : 'Истекла'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#525252' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {sub.status === 'none' ? (
                          <button
                            onClick={() => openIssueForUser(sub)}
                            style={{ padding: '4px 10px', background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.4)', color: '#4ade80', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                          >
                            ✨ Выдать подписку
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleExtend(sub, 30)}
                              style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                              title="Продлить на 30 дней"
                            >
                              +30 дн.
                            </button>
                            {sub.status === 'active' && (
                              <button
                                onClick={() => handleRevoke(sub)}
                                style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                title="Сбросить / Отозвать подписку"
                              >
                                Сброс
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка выдачи подписки */}
      {showIssueModal && (
        <div className={styles.formModal}>
          <form className={styles.formBox} onSubmit={handleIssue} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--accent, #4ade80)' }}>✨ Выдача Подписки</h3>
              <button type="button" onClick={() => setShowIssueModal(false)} className={styles.cancelBtn} style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>ID или Slug Пользователя *</label>
              <input
                type="text"
                className={styles.formInput}
                value={issueUserId}
                onChange={(e) => setIssueUserId(e.target.value)}
                placeholder="slug пользователя или user_id..."
                required
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Тарифный План</label>
              <select className={styles.formInput} value={issuePlan} onChange={(e) => setIssuePlan(e.target.value)}>
                <option value="Premium">⭐ Premium</option>
                <option value="VIP">👑 VIP</option>
                <option value="Ultimate">🔥 Ultimate</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Длительность (в днях)</label>
              <input
                type="number"
                className={styles.formInput}
                value={issueDays}
                onChange={(e) => setIssueDays(e.target.value)}
                min="1"
                required
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Номер Заказа (Необязательно)</label>
              <input
                type="text"
                className={styles.formInput}
                value={issueOrderId}
                onChange={(e) => setIssueOrderId(e.target.value)}
                placeholder="ORD-99201..."
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>E-mail для уведомлений (Необязательно)</label>
              <input
                type="email"
                className={styles.formInput}
                value={issueEmail}
                onChange={(e) => setIssueEmail(e.target.value)}
                placeholder="user@example.com..."
              />
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => setShowIssueModal(false)} className={styles.cancelBtn}>Отмена</button>
              <button type="submit" disabled={issuing} className={styles.actionBtnPrimary}>
                {issuing ? 'Выдача...' : 'Выдать подписку'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
