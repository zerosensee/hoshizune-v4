'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Продвинутый «Чёрный ящик» / Дебаггер (Debug Flight Recorder).
 * Автоматически записывает в реальном времени:
 * 1. Сетевые запросы fetch (URL, метод, HTTP-код, тело ответа при ошибке 4xx/5xx).
 * 2. Ошибки загрузки картинок (img 404, аватарки, SVG, CSP блокировки).
 * 3. Логи и предупреждения консоли (console.error, console.warn).
 * 4. Клики и действия пользователя (Breadcrumbs действий).
 * 5. Диагностику сервера (/api/debug — коммит на сервере, аптайм, БД).
 * 6. Кнопка «Скопировать лог для Агента» форматирует всё в готовый Markdown.
 */
export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [serverDiag, setServerDiag] = useState(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('all'); // all, network, error, action
  const logsRef = useRef([]);

  useEffect(() => {
    function addLog(type, message, details = null) {
      const entry = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        type,
        message: typeof message === 'object' ? JSON.stringify(message) : String(message),
        details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
      };
      logsRef.current = [entry, ...logsRef.current].slice(0, 50);
      setLogs([...logsRef.current]);
    }

    // 1. Перехват console.error и console.warn
    const origConsoleError = console.error;
    const origConsoleWarn = console.warn;

    console.error = (...args) => {
      origConsoleError.apply(console, args);
      addLog('error', args[0], args.slice(1));
    };

    console.warn = (...args) => {
      origConsoleWarn.apply(console, args);
      addLog('warn', args[0], args.slice(1));
    };

    // 2. Перехват ошибок загрузки ресурсов (картинки, скрипты, аватарки)
    function handleResourceError(event) {
      if (event.target && event.target.tagName === 'IMG') {
        addLog('img_error', `Сбой загрузки изображения: ${event.target.src || event.target.currentSrc}`, {
          alt: event.target.alt,
          className: event.target.className,
        });
      } else if (event.message) {
        addLog('error', event.message, `${event.filename || ''}:${event.lineno || ''}`);
      }
    }

    function handleUnhandledRejection(event) {
      addLog('promise_error', event.reason?.message || event.reason || 'Unhandled Promise Rejection');
    }

    // 3. Перехват сетевых запросов fetch
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const rawUrl = args[0];
      let url = '';
      if (typeof rawUrl === 'string') {
        url = rawUrl;
      } else if (rawUrl && typeof rawUrl === 'object') {
        url = rawUrl.url || rawUrl.href || rawUrl.pathname || String(rawUrl);
      }
      const method = (args[1]?.method || (rawUrl && typeof rawUrl === 'object' && rawUrl.method) || 'GET').toUpperCase();
      const startTime = Date.now();

      // Не спамим логами самого дебагера
      if (url.includes('/api/debug') || url.includes('/api/heartbeat')) {
        return origFetch.apply(window, args);
      }

      try {
        const response = await origFetch.apply(window, args);
        const duration = Date.now() - startTime;

        if (!response.ok) {
          // Если запрос вернул ошибку (4xx/5xx) — клонируем и читаем тело ошибки
          const cloned = response.clone();
          cloned.text().then((bodyText) => {
            addLog('net_error', `${method} ${url} -> HTTP ${response.status} (${duration}ms)`, {
              response: bodyText.slice(0, 300),
            });
          }).catch(() => {});
        } else {
          addLog('network', `${method} ${url} -> HTTP ${response.status} (${duration}ms)`);
        }

        return response;
      } catch (networkError) {
        addLog('net_fail', `${method} ${url} -> Сетевой сбой: ${networkError.message}`);
        throw networkError;
      }
    };

    // 4. Перехват кликов пользователя (Breadcrumbs)
    function handleUserClick(event) {
      const target = event.target;
      if (!target) return;
      const btn = target.closest('button, a, input[type="submit"]');
      if (btn) {
        const label = (btn.innerText || btn.getAttribute('aria-label') || btn.title || btn.className || '').slice(0, 30);
        addLog('action', `Клик по кнопке: [${label.trim() || 'button'}]`);
      }
    }

    window.addEventListener('error', handleResourceError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('click', handleUserClick, true);

    addLog('system', 'Дебаг-логгер активирован и слушает события.');

    return () => {
      console.error = origConsoleError;
      console.warn = origConsoleWarn;
      window.fetch = origFetch;
      window.removeEventListener('error', handleResourceError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('click', handleUserClick, true);
    };
  }, []);

  // Опрос сервера при открытии панели
  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/debug');
      if (res.ok) {
        const data = await res.json();
        setServerDiag(data);
      } else {
        setServerDiag({ status: 'error', code: res.status });
      }
    } catch (err) {
      setServerDiag({ status: 'network_fail', message: err.message });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  // Сборка полного отчёта Markdown
  const generateMarkdownReport = () => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    const clientInfo = {
      url: typeof window !== 'undefined' ? window.location.href : '',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      storedTheme: typeof localStorage !== 'undefined' ? localStorage.getItem('hoshizune_user_theme') : '',
      deviceTheme: typeof localStorage !== 'undefined' ? localStorage.getItem('hoshizune_device_theme') : '',
      glassFx: typeof localStorage !== 'undefined' ? localStorage.getItem('hoshizune_glass_fx') : '',
      liquidFx: typeof localStorage !== 'undefined' ? localStorage.getItem('hoshizune_liquid_fx') : '',
      cookies: typeof document !== 'undefined' ? document.cookie.split(';').map((c) => c.trim().split('=')[0]).join(', ') : '',
      cssAccent: root ? root.style.getPropertyValue('--accent') : '',
      cssBgPrimary: root ? root.style.getPropertyValue('--bg-primary') : '',
      cssBgCard: root ? root.style.getPropertyValue('--bg-card') : '',
      cssBorder: root ? root.style.getPropertyValue('--border-card') : '',
    };

    const lines = [
      '### 🐞 Полный Дебаг-Отчёт Hoshizune',
      `* **Время съёма лога:** ${new Date().toISOString()}`,
      `* **Страница (URL):** ${clientInfo.url}`,
      `* **Разрешение окна:** ${clientInfo.viewport} (Экран: ${clientInfo.screen})`,
      `* **Браузер:** ${clientInfo.userAgent}`,
      `* **Сессионные Cookie:** \`${clientInfo.cookies || 'нет'}\``,
      '',
      '#### 🎨 Визуальная Тема и CSS-Переменные:',
      `* **Тема в localStorage:** \`${clientInfo.storedTheme}\` (device: \`${clientInfo.deviceTheme}\`)`,
      `* **--accent:** \`${clientInfo.cssAccent}\``,
      `* **--bg-primary:** \`${clientInfo.cssBgPrimary}\``,
      `* **--bg-card:** \`${clientInfo.cssBgCard}\``,
      `* **--border-card:** \`${clientInfo.cssBorder}\``,
      `* **data-glass:** \`${clientInfo.glassFx}\` | **data-liquid:** \`${clientInfo.liquidFx}\``,
      '',
      '#### 🖥️ Диагностика Сервера (/api/debug):',
      '```json',
      JSON.stringify(serverDiag || { error: 'Диагностика сервера не ответила' }, null, 2),
      '```',
      '',
      '#### 📋 Хронологический Журнал Событий (Свежие сверху):',
    ];

    if (logs.length === 0) {
      lines.push('*Журнал пуст.*');
    } else {
      lines.push('```');
      logs.forEach((l) => {
        lines.push(`[${l.time}] [${l.type.toUpperCase()}] ${l.message} ${l.details ? '--> ' + l.details : ''}`);
      });
      lines.push('```');
    }

    return lines.join('\n');
  };

  const handleCopy = () => {
    const report = generateMarkdownReport();
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const filteredLogs = logs.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'error') return ['error', 'img_error', 'promise_error', 'net_error', 'net_fail'].includes(l.type);
    if (filter === 'network') return ['network', 'net_error', 'net_fail'].includes(l.type);
    if (filter === 'action') return l.type === 'action';
    return true;
  });

  return (
    <>
      {/* Кнопка вызова дебагера (в левом нижнем углу) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Открыть панель дебаг-диагностики"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 99998,
          background: 'rgba(10, 15, 12, 0.9)',
          border: '1px solid var(--accent, #4ade80)',
          color: 'var(--accent, #4ade80)',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>🐞</span>
        <span>DEBUG LOGS</span>
        {logs.filter((l) => ['error', 'img_error', 'net_error'].includes(l.type)).length > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '9px',
            }}
          >
            {logs.filter((l) => ['error', 'img_error', 'net_error'].includes(l.type)).length}
          </span>
        )}
      </button>

      {/* Окно дебаг-диагностики */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '740px',
              maxHeight: '90vh',
              background: 'var(--bg-card, #0a0d0a)',
              border: '1px solid var(--border-card, #262626)',
              borderRadius: '12px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.95), 0 0 30px var(--accent-glow, rgba(74, 222, 128, 0.2))',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              color: 'var(--text-primary, #ffffff)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {/* Хедер */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-card, #262626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🐞</span>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent, #4ade80)' }}>
                    Hoshizune Flight Recorder (Дебаггер)
                  </span>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #737373)' }}>
                    Фиксирует запросы, ошибки загрузки, клики и текущую тему
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #737373)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Контент */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              {/* Статус Сервера VPS */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--accent, #4ade80)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🖥️ Статус Сервера VPS</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDiagnostics}
                    style={{ background: 'none', border: '1px solid var(--border-card, #333)', color: 'var(--text-muted)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    🔄 Обновить
                  </button>
                </div>
                {serverDiag ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px' }}>
                    <div>Коммит: <strong style={{ color: '#facc15' }}>{serverDiag.gitCommit}</strong></div>
                    <div>БД Статус: <strong style={{ color: '#4ade80' }}>{serverDiag.database?.integrity}</strong></div>
                    <div>Uptime: <strong>{serverDiag.uptimeSeconds} сек</strong></div>
                    <div>Пользователей: <strong>{serverDiag.database?.counts?.users ?? '—'}</strong></div>
                    <div>Профилей: <strong>{serverDiag.database?.counts?.profiles ?? '—'}</strong></div>
                    <div>Активных банов: <strong>{serverDiag.database?.counts?.activeBans ?? '—'}</strong></div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Опрос сервера...</div>
                )}
              </div>

              {/* Фильтры журнала */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Фильтр:</span>
                {[
                  { id: 'all', label: `Все (${logs.length})` },
                  { id: 'error', label: `Ошибки (${logs.filter((l) => ['error', 'img_error', 'net_error'].includes(l.type)).length})` },
                  { id: 'network', label: 'Сеть (fetch)' },
                  { id: 'action', label: 'Клики' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: filter === tab.id ? 'var(--accent, #4ade80)' : 'rgba(255,255,255,0.05)',
                      color: filter === tab.id ? '#000' : 'var(--text-primary)',
                      border: '1px solid var(--border-card, #333)',
                      cursor: 'pointer',
                      fontWeight: filter === tab.id ? 'bold' : 'normal',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { logsRef.current = []; setLogs([]); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', fontSize: '10px', cursor: 'pointer' }}
                >
                  Очистить
                </button>
              </div>

              {/* Окно журнала событий */}
              <div
                style={{
                  background: '#000000',
                  border: '1px solid #1f2937',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  height: '240px',
                  overflowY: 'auto',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                {filteredLogs.length === 0 ? (
                  <div style={{ color: '#4b5563', fontStyle: 'italic', padding: '10px 0' }}>
                    Событий в этой категории нет.
                  </div>
                ) : (
                  filteredLogs.map((l) => {
                    let color = '#9ca3af';
                    if (['error', 'img_error', 'promise_error', 'net_error', 'net_fail'].includes(l.type)) color = '#f87171';
                    else if (l.type === 'warn') color = '#facc15';
                    else if (l.type === 'action') color = '#38bdf8';
                    else if (l.type === 'network') color = '#4ade80';

                    return (
                      <div key={l.id} style={{ color, wordBreak: 'break-word', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: '#4b5563', marginRight: '6px' }}>[{l.time}]</span>
                        <span style={{ fontWeight: 'bold', marginRight: '6px' }}>[{l.type.toUpperCase()}]</span>
                        <span>{l.message}</span>
                        {l.details && (
                          <div style={{ color: '#6b7280', fontSize: '10px', paddingLeft: '14px', marginTop: '2px' }}>
                            {l.details}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Футер с кнопкой копирования */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-card, #262626)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #737373)' }}>
                Нажмите зелёную кнопку и вставьте скопированный текст в чат
              </div>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: copied ? '#22c55e' : 'var(--accent, #4ade80)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px var(--accent-glow, rgba(74, 222, 128, 0.3))',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? '✓ Отчёт скопирован!' : '📋 Скопировать лог для Агента'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
