'use client';

/**
 * Клиентский компонент запроса и восстановления пароля по токену.
 * Надежная навигация через элементы Link.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TerminalCard from '@/components/ui/TerminalCard';

export default function ResetClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoToken, setDemoToken] = useState('');

  /* Запрос токена восстановления */
  async function handleRequestReset(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка запроса');
      } else {
        setSuccess(data.message);
        if (data.demoToken) {
          setDemoToken(data.demoToken);
        }
      }
    } catch {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  }

  /* Подтверждение нового пароля */
  async function handleConfirmReset(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Не удалось обновить пароль');
      } else {
        setSuccess(data.message);
        setTimeout(() => {
          window.location.href = '/auth';
        }, 1200);
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="page">
        <div style={{ width: '100%', maxWidth: 440 }}>
          <TerminalCard
            title={token ? 'auth@hoshizune: set-new-password' : 'auth@hoshizune: reset-password'}
          >
            <h2
              style={{
                fontSize: 15,
                color: 'var(--text-primary)',
                marginBottom: 16,
              }}
            >
              {token ? 'Установка нового пароля' : 'Восстановление доступа'}
            </h2>

            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  color: '#f87171',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                ✕ {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.3)',
                  color: '#4ade80',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                ✓ {success}
              </div>
            )}

            {token ? (
              <form onSubmit={handleConfirmReset} autoComplete="off">
                <div className="modal-field">
                  <label>Новый пароль (мин. 6 символов)</label>
                  <input
                    type="password"
                    className="modal-input"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <Link
                    href="/auth"
                    className="modal-btn"
                    style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                  >
                    Отмена
                  </Link>
                  <button
                    type="submit"
                    className="modal-btn primary"
                    disabled={loading}
                  >
                    {loading ? 'Сохранение...' : 'Изменить пароль'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRequestReset} autoComplete="off">
                <div className="modal-field">
                  <label>Email-адрес вашего аккаунта</label>
                  <input
                    type="email"
                    className="modal-input"
                    placeholder="user@hoshizune.space"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>

                {demoToken && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      background: 'rgba(250,204,21,0.1)',
                      border: '1px solid rgba(250,204,21,0.3)',
                      borderRadius: 4,
                      fontSize: 11,
                      color: '#facc15',
                    }}
                  >
                    <div>[Тестовый токен генерирован]</div>
                    <Link
                      href={`/auth/reset-password?token=${demoToken}`}
                      style={{ color: '#4ade80', wordBreak: 'break-all' }}
                    >
                      Перейти к установке пароля →
                    </Link>
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <Link
                    href="/auth"
                    className="modal-btn"
                    style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                  >
                    Войти
                  </Link>
                  <button
                    type="submit"
                    className="modal-btn primary"
                    disabled={loading}
                  >
                    {loading ? 'Отправка...' : 'Отправить токен'}
                  </button>
                </div>
              </form>
            )}
          </TerminalCard>
        </div>
      </main>
    </>
  );
}
