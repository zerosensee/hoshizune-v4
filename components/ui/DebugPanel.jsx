'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Панель дебаг-логов и системной диагностики (Debug HUD).
 * Собирает информацию об ошибках в консоли, статусе сети, текущей теме,
 * версии коммита на сервере и позволяет скопировать весь отчёт в буфер обмена в один клик.
 */
export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [serverDiag, setServerDiag] = useState(null);
  const [copied, setCopied] = useState(false);
  const logsRef = useRef([]);

  // Перехват console.error и window.onerror для сбора логов
  useEffect(() => {
    function addLog(type, message, details = null) {
      const entry = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        type,
        message: typeof message === 'object' ? JSON.stringify(message) : String(message),
        details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
      };
      logsRef.current = [entry, ...logsRef.current].slice(0, 30);
      setLogs([...logsRef.current]);
    }

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

    function handleWindowError(event) {
      addLog('error', event.message, `${event.filename}:${event.lineno}:${event.colno}`);
    }

    function handleUnhandledRejection(event) {
      addLog('unhandled_promise', event.reason?.message || event.reason || 'Unhandled Promise Rejection');
    }

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = origConsoleError;
      console.warn = origConsoleWarn;
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
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

  // Сборка полного текстового отчёта для отправки агенту
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
      cssAccent: root ? root.style.getPropertyValue('--accent') : '',
      cssBgPrimary: root ? root.style.getPropertyValue('--bg-primary') : '',
      cssBgCard: root ? root.style.getPropertyValue('--bg-card') : '',
    };

    const lines = [
      '### 🐞 Отчёт Дебаг-Диагностики Hoshizune',
      `* **Время клиента:** ${new Date().toISOString()}`,
      `* **Текущий URL:** ${clientInfo.url}`,
      `* **Разрешение:** ${clientInfo.viewport} (Экран: ${clientInfo.screen})`,
      `* **Браузер / UA:** ${clientInfo.userAgent}`,
      '',
      '#### 🎨 Визуальная Тема:',
      `* **localStorage(hoshizune_user_theme):** \`${clientInfo.storedTheme}\``,
      `* **localStorage(hoshizune_device_theme):** \`${clientInfo.deviceTheme}\``,
      `* **CSS --accent:** \`${clientInfo.cssAccent}\``,
      `* **CSS --bg-primary:** \`${clientInfo.cssBgPrimary}\``,
      `* **CSS --bg-card:** \`${clientInfo.cssBgCard}\``,
      `* **data-glass:** \`${clientInfo.glassFx}\` | **data-liquid:** \`${clientInfo.liquidFx}\``,
      '',
      '#### 🖥️ Состояние Сервера (/api/debug):',
      '```json',
      JSON.stringify(serverDiag || { error: 'Диагностика не загружена' }, null, 2),
      '```',
      '',
      '#### 📋 Последние Ошибки Клиента (Console Logs):',
    ];

    if (logs.length === 0) {
      lines.push('*Ошибок в консоли браузера не зафиксировано.*');
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

  return (
    <>
      {/* Плавающая кнопка вызова отчёта в углу экрана */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Открыть панель дебаг-диагностики"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 99998,
          background: 'rgba(10, 15, 12, 0.85)',
          border: '1px solid var(--accent, #4ade80)',
          color: 'var(--accent, #4ade80)',
          padding: '5px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>🐞</span>
        <span>DEBUG</span>
        {logs.filter((l) => l.type === 'error').length > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '9px',
            }}
          >
            {logs.filter((l) => l.type === 'error').length}
          </span>
        )}
      </button>

      {/* Модальное окно дебаг-логов */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
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
              maxWidth: '680px',
              maxHeight: '85vh',
              background: 'var(--bg-card, #0a0d0a)',
              border: '1px solid var(--border-card, #262626)',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 25px var(--accent-glow, rgba(74, 222, 128, 0.2))',
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
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-card, #262626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🐞</span>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--accent, #4ade80)' }}>
                  Hoshizune Debug & Diagnostics HUD
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #737373)',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Контент */}
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              {/* Серверная информация */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--accent, #4ade80)' }}>
                  🖥️ Сервер VPS (Версия сборки):
                </div>
                {serverDiag ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11px' }}>
                    <div>Коммит: <strong style={{ color: '#facc15' }}>{serverDiag.gitCommit}</strong></div>
                    <div>БД Статус: <strong style={{ color: '#4ade80' }}>{serverDiag.database?.integrity}</strong></div>
                    <div>Аккаунтов в БД: <strong>{serverDiag.database?.counts?.users ?? '—'}</strong></div>
                    <div>Профилей в БД: <strong>{serverDiag.database?.counts?.profiles ?? '—'}</strong></div>
                    <div>Node.js: <strong>{serverDiag.nodeVersion}</strong></div>
                    <div>Uptime: <strong>{serverDiag.uptimeSeconds}с</strong></div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Загрузка статуса сервера...</div>
                )}
              </div>

              {/* Клиентские логи консоли */}
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📋 Журнал ошибок консоли ({logs.length}):</span>
                  {logs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { logsRef.current = []; setLogs([]); }}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '10px', cursor: 'pointer' }}
                    >
                      Очистить
                    </button>
                  )}
                </div>

                <div
                  style={{
                    background: '#000000',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {logs.length === 0 ? (
                    <div style={{ color: '#4b5563', fontStyle: 'italic' }}>Ошибок пока нет. Любые сбои сети или скрипта появятся здесь.</div>
                  ) : (
                    logs.map((l) => (
                      <div key={l.id} style={{ color: l.type === 'error' ? '#f87171' : '#facc15', wordBreak: 'break-word' }}>
                        <span style={{ color: '#6b7280', marginRight: '6px' }}>[{l.time}]</span>
                        <span>{l.message}</span>
                        {l.details && <div style={{ color: '#9ca3af', fontSize: '10px', paddingLeft: '12px' }}>{l.details}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Футер с кнопкой копирования */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-card, #262626)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.4)',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #737373)' }}>
                Нажмите кнопку справа и вставьте лог в чат
              </span>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: copied ? '#22c55e' : 'var(--accent, #4ade80)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? '✓ Скопировано в буфер!' : '📋 Скопировать лог для Агента'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
