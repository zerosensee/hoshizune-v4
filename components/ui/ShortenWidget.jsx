'use client';

/**
 * Публичный виджет сокращения ссылок.
 * Поддерживает кастомные пути и выбор срока жизни (TTL):
 * 1 час, 6 часов, 12 часов, 1 день, 3 дня, 7 дней, 14 дней, навсегда.
 */
import { useState, useCallback, useRef } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

import TerminalHeader from '@/components/ui/TerminalHeader';

const EXPIRATION_OPTIONS = [
  { label: 'Навсегда', value: null },
  { label: '1 час', value: 3600 },
  { label: '6 часов', value: 21600 },
  { label: '12 часов', value: 43200 },
  { label: '1 день', value: 86400 },
  { label: '3 дня', value: 259200 },
  { label: '7 дней', value: 604800 },
  { label: '14 дней', value: 1209600 },
];

export default function ShortenWidget() {
  const inputRef = useRef(null);
  const [customCode, setCustomCode] = useState('');
  const [expiresIn, setExpiresIn] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleShorten = useCallback(async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    const url = inputRef.current?.value?.trim();
    if (!url || loading) return;

    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          customCode: customCode.trim() || undefined,
          expiresIn,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data.link);
      } else {
        setError(data.error || 'Ошибка сокращения');
      }
    } catch (err) {
      console.error('Ошибка сокращения ссылки:', err);
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  }, [loading, customCode, expiresIn]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleShorten(e);
      }
    },
    [handleShorten]
  );

  const handleCopy = useCallback(async () => {
    if (!result?.fullShortUrl) return;
    const ok = await copyToClipboard(result.fullShortUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setError('Не удалось скопировать ссылку в буфер обмена');
    }
  }, [result]);

  return (
    <div
      className="card"
      style={{
        width: '100%',
        maxWidth: '480px',
        marginTop: '12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'visible',
        position: 'relative',
        zIndex: 5,
      }}
    >
      {/* Хедер терминала с закруглёнными верхними углами */}
      <TerminalHeader title="link-shortener — public" />

      {/* Тело */}
      <div className="card-body" style={{ padding: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-label)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            // сокращение ссылок
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {showAdvanced ? '▲ Скрыть настройки' : '▼ Опции (TTL / Slug)'}
          </button>
        </div>

        {/* Поле ввода URL */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
          <input
            ref={inputRef}
            type="url"
            className="modal-input"
            placeholder="https://your-long-url.com/..."
            onKeyDown={handleKeyDown}
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              padding: '9px 12px',
              background: 'var(--bg-block)',
              border: `1px solid ${
                error ? 'rgba(248,113,113,0.4)' : 'var(--border-block)'
              }`,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            className="modal-btn primary"
            onClick={handleShorten}
            disabled={loading}
            style={{
              flexShrink: 0,
              padding: '9px 16px',
              background: 'var(--accent-glow, rgba(255,255,255,0.08))',
              border: '1px solid var(--accent, rgba(255,255,255,0.2))',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.5 : 1,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading ? '...' : '→ Сократить'}
          </button>
        </div>

        {/* Дополнительные опции: кастомный slug и время жизни ссылки */}
        {showAdvanced && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-block)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div>
              <label
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Кастомный путь после /s/ (slug)
              </label>
              <input
                type="text"
                className="modal-input"
                placeholder="my-link-name"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: 'var(--bg-block)',
                  border: '1px solid var(--border-block)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Срок жизни ссылки (TTL)
              </label>
              <select
                className="modal-input"
                value={expiresIn === null ? 'null' : String(expiresIn)}
                onChange={(e) =>
                  setExpiresIn(
                    e.target.value === 'null' ? null : Number(e.target.value)
                  )
                }
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: 'var(--bg-block)',
                  border: '1px solid var(--border-block)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '11.5px',
              color: '#f87171',
            }}
          >
            ✕ {error}
          </div>
        )}

        {/* Результат */}
        {result && (
          <div
            style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              background: 'var(--accent-glow, rgba(255,255,255,0.05))',
              border: '1px solid var(--accent, rgba(255,255,255,0.15))',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--accent)',
                letterSpacing: '0.02em',
                wordBreak: 'break-all',
              }}
            >
              {result.fullShortUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: '4px 10px',
                background: copied ? 'var(--accent-glow)' : 'transparent',
                border: `1px solid ${
                  copied ? 'var(--accent)' : 'var(--accent-glow)'
                }`,
                borderRadius: '4px',
                color: 'var(--accent)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? '✓ Скопировано' : '⧉ Копировать'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
