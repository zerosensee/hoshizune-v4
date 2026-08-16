'use client';

/**
 * Клиентский компонент формы входа в администраторскую панель.
 * Терминальная стилистика. Без внешних зависимостей.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Форма авторизации администратора.
 */
export default function LoginClient() {
  const router = useRouter();
  const inputRef = useRef(null);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState([
    '> Hoshizune Admin Panel v4.0',
    '> Требуется аутентификация...',
    '> Введите пароль для продолжения.',
    '',
  ]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!password || loading) return;

      setLoading(true);
      setError('');
      setLines((prev) => [
        ...prev,
        `> Проверка пароля...`,
      ]);

      try {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        const data = await res.json();

        if (res.ok) {
          setLines((prev) => [
            ...prev,
            '> Аутентификация успешна.',
            '> Перенаправление...',
          ]);
          setTimeout(() => {
            window.location.href = '/admin';
          }, 300);
        } else {
          setLines((prev) => [
            ...prev,
            `> ОШИБКА: ${data.error || 'Неверный пароль'}`,
          ]);
          setError(data.error || 'Неверный пароль');
          setPassword('');
        }
      } catch {
        setLines((prev) => [
          ...prev,
          '> ОШИБКА: Сбой подключения к серверу.',
        ]);
        setError('Ошибка подключения');
      } finally {
        setLoading(false);
      }
    },
    [password, loading, router],
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #000000)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', monospace",
      padding: '20px',
    }}>
      {/* Фоновое свечение */}
      <div style={{
        position: 'fixed',
        top: '-150px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '300px',
        background:
          'radial-gradient(ellipse, var(--accent-glow, rgba(255,255,255,0.05)) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'var(--bg-card, #000000)',
        border: '1px solid var(--border-card, #262626)',
        borderRadius: '10px',
        overflow: 'hidden',
        animation: 'fadeIn 0.4s ease',
      }}>
        {/* Терминальный хедер */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '12px 16px',
          background: 'var(--bg-block, #050505)',
          borderBottom: '1px solid var(--border-card, #262626)',
        }}>
          {['#3a1a1a', '#2a2a1a', '#1a2a1a'].map((bg, i) => (
            <div key={i} style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: bg,
            }} />
          ))}
          <span style={{
            marginLeft: '8px',
            fontSize: '11px',
            color: 'var(--text-muted, #737373)',
            letterSpacing: '0.05em',
          }}>
            admin.hoshizune.space — bash
          </span>
        </div>

        {/* Терминальный вывод */}
        <div style={{
          padding: '20px 20px 0',
          minHeight: '120px',
        }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              fontSize: '12.5px',
              color: line.startsWith('> ОШИБКА')
                ? '#f87171'
                : line.startsWith('>')
                  ? 'var(--accent, #ffffff)'
                  : 'var(--text-muted, #737373)',
              lineHeight: '1.8',
              opacity: i === lines.length - 1 ? 1 : 0.7,
            }}>
              {line || '\u00a0'}
            </div>
          ))}
        </div>

        {/* Форма ввода пароля */}
        <form
          onSubmit={handleSubmit}
          style={{ padding: '16px 20px 24px' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-block, #050505)',
            border: `1px solid ${error ? 'rgba(248,113,113,0.4)' : 'var(--border-card, #262626)'}`,
            borderRadius: '6px',
            padding: '0 12px',
            transition: 'border-color 0.15s ease',
          }}>
            <span style={{ color: 'var(--accent, #ffffff)', fontSize: '13px' }}>
              $
            </span>
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="введите пароль..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary, #ffffff)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                letterSpacing: '0.1em',
              }}
            />
            {password && (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showPassword ? 'var(--accent, #ffffff)' : 'var(--text-muted, #737373)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '2px 4px',
                  lineHeight: 1,
                  transition: 'color 0.15s ease',
                }}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            )}
            {loading && (
              <span style={{
                color: 'var(--accent, #ffffff)',
                fontSize: '12px',
                animation: 'blink 1s step-end infinite',
              }}>
                ▌
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border-card, #262626)',
              background: loading
                ? 'transparent'
                : 'var(--accent-glow, rgba(255, 255, 255, 0.1))',
              color: loading ? 'var(--text-muted, #737373)' : 'var(--accent, #ffffff)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12.5px',
              cursor: loading || !password ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: !password ? 0.5 : 1,
            }}
          >
            {loading ? '▌ Проверка...' : '→ Войти'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
