'use client';

/**
 * Клиентский компонент авторизации и регистрации пользователя.
 * Полная система с 6-значным кодом подтверждения почты.
 * Табы работают через React state без изменения URL для избежания перезагрузки.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TerminalCard from '@/components/ui/TerminalCard';

export default function AuthClient({ defaultMode = 'login' }) {
  const searchParams = useSearchParams();

  const getInitialMode = () => {
    const paramMode = searchParams?.get('mode') || searchParams?.get('tab');
    if (paramMode === 'login' || paramMode === 'register' || paramMode === 'verify') {
      return paramMode;
    }
    return defaultMode;
  };

  const [mode, setMode] = useState(getInitialMode); // 'login' | 'register' | 'verify'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isVerify = mode === 'verify';

  function switchToLogin(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMode('login');
    setError('');
    setMessage('');
  }

  function switchToRegister(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMode('register');
    setError('');
    setMessage('');
  }

  /* Отправка формы входа / регистрации */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { email: email.trim(), password }
      : { email: email.trim(), password, displayName: displayName.trim() };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          setVerifyEmail(data.email || email.trim());
          if (data.demoCode) setDemoCode(data.demoCode);
          setMode('verify');
          setMessage('Введите 6-значный код подтверждения, отправленный на вашу почту.');
        } else {
          setError(data.error || (isLogin ? 'Ошибка входа' : 'Ошибка регистрации'));
        }
      } else {
        if (data.requiresVerification) {
          setVerifyEmail(data.email || email.trim());
          if (data.demoCode) setDemoCode(data.demoCode);
          setMode('verify');
          setMessage('Код подтверждения отправлен на ваш email-адрес.');
        } else {
          window.location.href = '/';
        }
      }
    } catch {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  }

  /* Проверка 6-значного кода */
  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifyEmail || email.trim(),
          code: code.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Неверный код подтверждения');
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Ошибка при проверке кода');
    } finally {
      setLoading(false);
    }
  }

  /* Повторная отправка кода */
  async function handleResendCode() {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail || email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Не удалось отправить новый код');
      } else {
        if (data.demoCode) setDemoCode(data.demoCode);
        setMessage(data.message || 'Новый код успешно отправлен!');
      }
    } catch {
      setError('Ошибка повторной отправки кода');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="page">
        <div style={{ width: '100%', maxWidth: 440 }}>
          <TerminalCard
            title={
              isVerify
                ? 'auth@hoshizune: email-verification'
                : isLogin
                  ? 'auth@hoshizune: login'
                  : 'auth@hoshizune: register'
            }
          >
            {/* Переключатель табов: только через state, без URL-перехода */}
            {!isVerify && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '20px',
                  borderBottom: '1px solid var(--border-block)',
                  paddingBottom: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={switchToLogin}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: isLogin
                      ? '1px solid var(--accent, #4ade80)'
                      : '1px solid var(--border-btn, #161c16)',
                    background: isLogin
                      ? 'rgba(74, 222, 128, 0.12)'
                      : 'var(--bg-btn, #0d0f0d)',
                    color: isLogin ? 'var(--accent, #4ade80)' : 'var(--text-muted, #6a8a6a)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: isLogin ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={switchToRegister}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: isRegister
                      ? '1px solid var(--accent, #4ade80)'
                      : '1px solid var(--border-btn, #161c16)',
                    background: isRegister
                      ? 'rgba(74, 222, 128, 0.12)'
                      : 'var(--bg-btn, #0d0f0d)',
                    color: isRegister ? 'var(--accent, #4ade80)' : 'var(--text-muted, #6a8a6a)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: isRegister ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Регистрация
                </button>
              </div>
            )}

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

            {message && (
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
                ✓ {message}
              </div>
            )}

            {/* ЭКРАН ВЕРИФИКАЦИИ КОДА */}
            {isVerify ? (
              <form onSubmit={handleVerifyCode} autoComplete="off">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Код подтверждения отправлен на:{' '}
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {verifyEmail || email}
                  </span>
                </div>

                {demoCode && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(250,204,21,0.1)',
                      border: '1px solid rgba(250,204,21,0.3)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      color: '#facc15',
                      marginBottom: 16,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <div>[SMTP — демонстрационный режим]</div>
                    <div style={{ marginTop: 4 }}>
                      Ваш код:{' '}
                      <strong style={{ color: '#4ade80', fontSize: 16, letterSpacing: 4 }}>
                        {demoCode}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="modal-field">
                  <label>6-значный код из письма</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="123456"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      letterSpacing: '6px',
                      fontSize: '18px',
                      textAlign: 'center',
                      fontWeight: '700',
                    }}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Отправить новый код
                  </button>
                  <button
                    type="button"
                    onClick={switchToLogin}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Отмена
                  </button>
                </div>

                <button
                  type="submit"
                  className="modal-btn primary"
                  disabled={loading || code.length < 6}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  {loading ? 'Проверка...' : 'Подтвердить код →'}
                </button>
              </form>
            ) : (
              /* ЭКРАН ВХОДА / РЕГИСТРАЦИИ */
              <form onSubmit={handleSubmit} autoComplete="off">
                {isRegister && (
                  <div className="modal-field">
                    <label>Имя пользователя (Никнейм)</label>
                    <input
                      id="auth-display-name"
                      name="display-name-field"
                      type="text"
                      className="modal-input"
                      placeholder="cyber_ghost (необязательно)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                )}

                <div className="modal-field">
                  <label>Email-адрес</label>
                  <input
                    id="auth-email"
                    name="email-field"
                    type="email"
                    className="modal-input"
                    placeholder="user@hoshizune.space"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="modal-field">
                  <label>Пароль (мин. 6 символов)</label>
                  <input
                    id="auth-password"
                    name="password-field"
                    type="password"
                    className="modal-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {isLogin && (
                  <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 12 }}>
                    <Link
                      href="/auth/reset-password"
                      style={{
                        fontSize: 11,
                        color: 'var(--accent)',
                        textDecoration: 'none',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      Забыли пароль?
                    </Link>
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: 20, display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="modal-btn"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.history.length > 1) {
                        window.history.back();
                      } else {
                        window.location.href = '/';
                      }
                    }}
                  >
                    ← Назад
                  </button>
                  <Link
                    href="/"
                    className="modal-btn"
                    style={{
                      textDecoration: 'none',
                      display: 'inline-block',
                      textAlign: 'center',
                      lineHeight: '26px',
                    }}
                  >
                    🏠 На главную
                  </Link>
                  <button
                    type="submit"
                    className="modal-btn primary"
                    disabled={loading}
                  >
                    {loading
                      ? 'Подождите...'
                      : isLogin
                        ? 'Войти'
                        : 'Зарегистрироваться'}
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
