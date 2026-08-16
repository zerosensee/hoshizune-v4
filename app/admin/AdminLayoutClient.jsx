'use client';

/**
 * Клиентский компонент layout для администратора.
 * Боковая навигация + хедер в терминальном стиле.
 */
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './admin.module.css';
import { THEME_PRESETS, getCustomThemes } from '@/lib/theme-presets';
import { applyGlobalTheme, applyVisualFx } from '@/components/ThemeProvider';

/** Пункты бокового меню */
const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Дашборд',
    icon: '◈',
    exact: true,
  },
  {
    href: '/admin/profiles',
    label: 'Профили',
    icon: '◉',
  },
  {
    href: '/admin/roles',
    label: 'Роли и Титулы',
    icon: '👑',
  },
  {
    href: '/admin/subscriptions',
    label: 'Подписки',
    icon: '💎',
  },
  {
    href: '/admin/staff',
    label: 'Состав',
    icon: '🛡️',
  },
  {
    href: '/admin/links',
    label: 'Ссылки',
    icon: '◎',
  },
  {
    href: '/admin/analytics',
    label: 'Аналитика',
    icon: '◐',
  },
  {
    href: '/admin/settings',
    label: 'Настройки',
    icon: '◈',
  },
];

export default function AdminLayoutClient({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState('total_black');

  const [glassFx, setGlassFx] = useState(false);
  const [liquidFx, setLiquidFx] = useState(false);
  const [mirrorFx, setMirrorFx] = useState(false);
  const [animationsFx, setAnimationsFx] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('hoshizune_user_theme') || 'total_black';
    setActiveThemeId(saved);
    applyGlobalTheme(saved);

    const g = localStorage.getItem('hoshizune_glass_fx') === 'true';
    const l = localStorage.getItem('hoshizune_liquid_fx') === 'true';
    const m = localStorage.getItem('hoshizune_mirror_fx') === 'true';
    const anim = localStorage.getItem('hoshizune_animations_fx') !== 'false';
    setGlassFx(g);
    setLiquidFx(l);
    setMirrorFx(m);
    setAnimationsFx(anim);
    applyVisualFx(g, l, m);

    if (!anim) {
      document.body.classList.add('no-animations');
    } else {
      document.body.classList.remove('no-animations');
    }

    const handleThemeChange = (e) => {
      const t = e.detail?.theme || localStorage.getItem('hoshizune_user_theme') || 'total_black';
      setActiveThemeId(t);
      applyGlobalTheme(t);
    };

    const handleFxChange = () => {
      const gState = localStorage.getItem('hoshizune_glass_fx') === 'true';
      const lState = localStorage.getItem('hoshizune_liquid_fx') === 'true';
      const mState = localStorage.getItem('hoshizune_mirror_fx') === 'true';
      setGlassFx(gState);
      setLiquidFx(lState);
      setMirrorFx(mState);
      applyVisualFx(gState, lState, mState);
    };

    window.addEventListener('hoshizune-theme-change', handleThemeChange);
    window.addEventListener('hoshizune-fx-change', handleFxChange);

    return () => {
      window.removeEventListener('hoshizune-theme-change', handleThemeChange);
      window.removeEventListener('hoshizune-fx-change', handleFxChange);
    };
  }, []);

  const handleSelectTheme = (themeId) => {
    setActiveThemeId(themeId);
    localStorage.setItem('hoshizune_user_theme', themeId);
    applyGlobalTheme(themeId);
    window.dispatchEvent(new CustomEvent('hoshizune-theme-change', { detail: { theme: themeId } }));
  };

  const handleToggleGlassFx = (val) => {
    setGlassFx(val);
    localStorage.setItem('hoshizune_glass_fx', val ? 'true' : 'false');
    applyVisualFx(val, liquidFx, mirrorFx);
    window.dispatchEvent(new CustomEvent('hoshizune-fx-change'));
  };

  const handleToggleLiquidFx = (val) => {
    setLiquidFx(val);
    localStorage.setItem('hoshizune_liquid_fx', val ? 'true' : 'false');
    applyVisualFx(glassFx, val, mirrorFx);
    window.dispatchEvent(new CustomEvent('hoshizune-fx-change'));
  };

  const handleToggleMirrorFx = (val) => {
    setMirrorFx(val);
    localStorage.setItem('hoshizune_mirror_fx', val ? 'true' : 'false');
    applyVisualFx(glassFx, liquidFx, val);
    window.dispatchEvent(new CustomEvent('hoshizune-fx-change'));
  };

  const handleToggleAnimationsFx = (val) => {
    setAnimationsFx(val);
    localStorage.setItem('hoshizune_animations_fx', val ? 'true' : 'false');
    if (!val) {
      document.body.classList.add('no-animations');
    } else {
      document.body.classList.remove('no-animations');
    }
  };

  const handleLogout = useCallback(async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoggingOut(true);
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch {
      // Игнорируем сетевые ошибки
    }
    document.cookie = 'hoshizune_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = '/admin/login';
  }, []);

  const allThemes = [...THEME_PRESETS, ...getCustomThemes()];

  return (
    <div className={styles.shell} style={{ background: 'var(--bg-primary, #080b09)', color: 'var(--text-primary, #e8f0e0)' }}>
      {/* Боковая панель */}
      <aside className={styles.sidebar} style={{ background: 'var(--bg-card, #090c0a)', borderColor: 'var(--border-card, #1a211a)' }}>
        <div className={styles.sidebarBrand} style={{ borderColor: 'var(--border-card, #141914)' }}>
          <span className={styles.brandAccent} style={{ color: 'var(--accent, #4ade80)' }}>⬡</span>
          <span className={styles.brandName} style={{ color: 'var(--text-primary, #e8f0e0)' }}>hoshizune</span>
          <span className={styles.brandSub} style={{ color: 'var(--accent, #4ade80)' }}>admin</span>
          
          {/* Кнопка настройки темы (шестерёнка) */}
          <button
            type="button"
            onClick={() => setShowThemeModal(true)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid var(--border-card, rgba(74, 222, 128, 0.2))',
              borderRadius: '6px',
              color: 'var(--accent, #4ade80)',
              fontSize: '14px',
              padding: '4px 8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Настройка темы оформления админки"
          >
            ⚙️
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? `${styles.navItem} ${styles.navItemActive}`
                    : styles.navItem
                }
                style={
                  active
                    ? { color: 'var(--accent, #4ade80)', background: 'var(--accent-glow, rgba(74, 222, 128, 0.06))' }
                    : { color: 'var(--text-muted, #737373)' }
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className={styles.navIndicator} style={{ background: 'var(--accent, #4ade80)', boxShadow: `0 0 8px var(--accent)` }} />
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-card, #141914)', marginTop: 'auto' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--accent, rgba(74, 222, 128, 0.25))',
              background: 'var(--accent-glow, rgba(74, 222, 128, 0.06))',
              color: 'var(--accent, #4ade80)',
              fontSize: '12px',
              textDecoration: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'all 0.15s ease',
            }}
          >
            <span>←</span>
            <span>На главный сайт</span>
          </Link>
        </div>

        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
          disabled={loggingOut}
          style={{ borderTopColor: 'var(--border-card, #141914)', color: 'var(--text-muted, #3a5a3a)' }}
        >
          <span>{loggingOut ? '...' : '⏻'}</span>
          <span>Выйти</span>
        </button>
      </aside>

      {/* Основной контент */}
      <main className={styles.main}>
        <div className={styles.mainInner}>{children}</div>
      </main>

      {/* Модальное окно выбора визуальной темы для админки */}
      {showThemeModal && (
        <div className={styles.formModal}>
          <div
            className={styles.formBox}
            style={{
              maxWidth: '560px',
              background: 'var(--bg-card, #0d120d)',
              border: '1px solid var(--border-card, #1a211a)',
              color: 'var(--text-primary, #fff)',
            }}
          >
            <div className={styles.formTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚙️ Выбор темы оформления Панели</span>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #9ca3af)', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginBottom: 14 }}>
              Выберите визуальную тему. Все панели, таблицы и роли админки моментально подстраиваются под выбранную палитру!
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: '360px', overflowY: 'auto' }}>
              {allThemes.map((preset) => {
                const isActive = activeThemeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectTheme(preset.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: isActive
                        ? `2px solid ${preset.accent}`
                        : `1px solid ${preset.border}`,
                      background: preset.bgCard,
                      color: preset.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isActive ? `0 0 12px ${preset.accent}40` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: preset.accent,
                        boxShadow: `0 0 6px ${preset.accent}`,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, fontWeight: 'bold', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {preset.name}
                      </div>
                      <div style={{ fontSize: 10, color: preset.textMuted }}>
                        {preset.id === 'total_black' ? 'Дефолт Total Black' : preset.id === 'cyber_mix_black' ? 'Black + Neon Mix' : preset.id}
                      </div>
                    </div>
                    {isActive && <span style={{ color: preset.accent, fontSize: 14 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Блок настройки визуальных эффектов */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-card, #1a211a)' }}>
              <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--accent, #4ade80)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                ✨ Эффекты Стекла и Зеркала
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleToggleGlassFx(!glassFx)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${glassFx ? 'var(--accent)' : 'var(--border-card)'}`,
                    background: glassFx ? 'var(--accent-glow, rgba(74,222,128,0.15))' : 'transparent',
                    color: glassFx ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  {glassFx ? '☑' : '☐'} Стекло
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLiquidFx(!liquidFx)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${liquidFx ? 'var(--accent)' : 'var(--border-card)'}`,
                    background: liquidFx ? 'var(--accent-glow, rgba(74,222,128,0.15))' : 'transparent',
                    color: liquidFx ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  {liquidFx ? '☑' : '☐'} Liquid Glass
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleMirrorFx(!mirrorFx)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${mirrorFx ? 'var(--accent)' : 'var(--border-card)'}`,
                    background: mirrorFx ? 'var(--accent-glow, rgba(74,222,128,0.15))' : 'transparent',
                    color: mirrorFx ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  {mirrorFx ? '☑' : '☐'} Зеркало
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleAnimationsFx(!animationsFx)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${animationsFx ? 'var(--accent)' : 'var(--border-card)'}`,
                    background: animationsFx ? 'var(--accent-glow, rgba(74,222,128,0.15))' : 'transparent',
                    color: animationsFx ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    gridColumn: 'span 3',
                    marginTop: '4px',
                  }}
                >
                  {animationsFx ? '⚡ Анимации кнопок и профилей ВКЛ' : '🚫 Анимации ВЫКЛ (Статический режим)'}
                </button>
              </div>
            </div>

            <div className={styles.formActions} style={{ marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent, #ffffff)',
                  color: 'var(--bg-card, #000000)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  boxShadow: '0 4px 16px var(--accent-glow, rgba(255, 255, 255, 0.4))',
                  transition: 'transform 0.15s ease, boxShadow 0.15s ease, filter 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                  e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-glow, rgba(255, 255, 255, 0.6))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.filter = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow, rgba(255, 255, 255, 0.4))';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
              >
                <span>✓</span>
                <span>Готово</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
