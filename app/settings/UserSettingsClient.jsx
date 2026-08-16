'use client';

/**
 * Клиентский компонент пользовательских настроек.
 * Поддерживает конструктор собственных визуальных тем, выбор из 10+ пресетов,
 * настройку расположения и режима фиксации бара времени (Moscow Clock Bar) и глобальное применение.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TerminalCard from '@/components/ui/TerminalCard';
import {
  THEME_PRESETS,
  getThemePreset,
  getCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
} from '@/lib/theme-presets';
import { applyGlobalTheme, applyVisualFx, applyFontSettings } from '@/components/ThemeProvider';

const CLOCK_POSITIONS = [
  { id: 'bottom-center', name: '⬇️ По центру внизу' },
  { id: 'bottom-left', name: '↙️ Слева внизу' },
  { id: 'bottom-right', name: '↘️ Справа внизу' },
  { id: 'top-center', name: '⬆️ По центру вверху' },
  { id: 'top-left', name: '↖️ Слева вверху' },
  { id: 'top-right', name: '↗️ Справа вверху' },
];

export default function UserSettingsClient() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accentColor, setAccentColor] = useState('#ffffff');
  const [showAuthorThemes, setShowAuthorThemes] = useState(true);
  const [customThemes, setCustomThemes] = useState([]);

  /* Состояние визуальных эффектов оформления */
  const [glassFx, setGlassFx] = useState(false);
  const [liquidFx, setLiquidFx] = useState(false);
  const [mirrorFx, setMirrorFx] = useState(false);

  /* Состояние типографики и шрифта */
  const [fontSize, setFontSize] = useState('100%');
  const [fontFamily, setFontFamily] = useState('jetbrains');
  const [enableAnimations, setEnableAnimations] = useState(true);

  useEffect(() => {
    const savedAnim = localStorage.getItem('enable_animations');
    if (savedAnim === 'false') {
      setEnableAnimations(false);
      document.body.classList.add('no-animations');
    }
  }, []);

  // Настройки бара времени
  const [clockPosition, setClockPosition] = useState('bottom-center');
  const [clockIsFixed, setClockIsFixed] = useState(true);

  // Поля конструктора кастомной темы
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('Моя Неоновая Тема');
  const [customAccent, setCustomAccent] = useState('#ec4899');
  const [customBgPage, setCustomBgPage] = useState('#09090b');
  const [customBgCard, setCustomBgCard] = useState('#18181b');
  const [customBorder, setCustomBorder] = useState('#ec4899');
  const [customTextPrimary, setCustomTextPrimary] = useState('#f4f4f5');
  const [customTextMuted, setCustomTextMuted] = useState('#a1a1aa');

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      setFetching(true);
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (data.user) {
          setCurrentUser(data.user);
        }
        if (data.profile) {
          setProfile(data.profile);
          setAccentColor(data.profile.accentColor || '#ffffff');
        }

        const savedShowThemes = localStorage.getItem('hoshizune_show_author_themes');
        if (savedShowThemes === 'false') {
          setShowAuthorThemes(false);
        }

        const savedClock = localStorage.getItem('hoshizune_clock_settings');
        if (savedClock) {
          const parsed = JSON.parse(savedClock);
          if (parsed.position) setClockPosition(parsed.position);
          if (typeof parsed.isFixed === 'boolean') setClockIsFixed(parsed.isFixed);
        }

        setGlassFx(localStorage.getItem('hoshizune_glass_fx') === 'true');
        setLiquidFx(localStorage.getItem('hoshizune_liquid_fx') === 'true');
        setMirrorFx(localStorage.getItem('hoshizune_mirror_fx') === 'true');

        const savedFontSize = localStorage.getItem('hoshizune_font_size');
        if (savedFontSize) setFontSize(savedFontSize);

        const savedFontFamily = localStorage.getItem('hoshizune_font_family');
        if (savedFontFamily) setFontFamily(savedFontFamily);

        setCustomThemes(getCustomThemes());
      } catch (err) {
        console.error('Ошибка загрузки настроек:', err);
      } finally {
        setFetching(false);
      }
    }

    loadData();

    function handleFxChange() {
      setGlassFx(localStorage.getItem('hoshizune_glass_fx') === 'true');
      setLiquidFx(localStorage.getItem('hoshizune_liquid_fx') === 'true');
      setMirrorFx(localStorage.getItem('hoshizune_mirror_fx') === 'true');
    }

    function handleThemeChange(e) {
      const theme = e.detail?.theme || localStorage.getItem('hoshizune_user_theme');
      if (theme) {
        setAccentColor(theme);
      }
    }

    function handleFontChange(e) {
      if (e.detail?.fontSize) setFontSize(e.detail.fontSize);
      if (e.detail?.fontFamily) setFontFamily(e.detail.fontFamily);
    }

    window.addEventListener('hoshizune-fx-change', handleFxChange);
    window.addEventListener('hoshizune-theme-change', handleThemeChange);
    window.addEventListener('hoshizune-font-change', handleFontChange);

    return () => {
      window.removeEventListener('hoshizune-fx-change', handleFxChange);
      window.removeEventListener('hoshizune-theme-change', handleThemeChange);
      window.removeEventListener('hoshizune-font-change', handleFontChange);
    };
  }, []);

  const activePreset = getThemePreset(accentColor);
  const allThemesList = [...customThemes, ...THEME_PRESETS];

  const handleChangeFontSize = (val) => {
    setFontSize(val);
    localStorage.setItem('hoshizune_font_size', val);
    applyFontSettings(val, fontFamily);
    window.dispatchEvent(
      new CustomEvent('hoshizune-font-change', { detail: { fontSize: val, fontFamily } })
    );
  };

  const handleChangeFontFamily = (val) => {
    setFontFamily(val);
    localStorage.setItem('hoshizune_font_family', val);
    applyFontSettings(fontSize, val);
    window.dispatchEvent(
      new CustomEvent('hoshizune-font-change', { detail: { fontSize, fontFamily: val } })
    );
  };

  const handleSelectTheme = (themePreset) => {
    setAccentColor(themePreset.accent);
    localStorage.setItem('hoshizune_device_theme', themePreset.accent);
    localStorage.setItem('hoshizune_user_theme', themePreset.accent);
    applyGlobalTheme(themePreset.accent);
    window.dispatchEvent(
      new CustomEvent('hoshizune-theme-change', { detail: { theme: themePreset.accent } })
    );
  };

  const handleSyncThemeCloud = async () => {
    setSaving(true);
    try {
      if (profile) {
        await fetch(`/api/bio/${profile.slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accentColor }),
        });
      }
      localStorage.setItem('hoshizune_device_theme', accentColor);
      localStorage.setItem('hoshizune_user_theme', accentColor);
      setSuccessMsg('Текущая тема устройства синхронизирована с облаком!');
    } catch {
      setError('Ошибка при синхронизации темы с облаком');
    } finally {
      setSaving(false);
    }
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

  const handleClockChangeSetting = (newPos, newFixed) => {
    setClockPosition(newPos);
    setClockIsFixed(newFixed);
    const clockObj = { position: newPos, isFixed: newFixed };
    localStorage.setItem('hoshizune_clock_settings', JSON.stringify(clockObj));
    window.dispatchEvent(
      new CustomEvent('hoshizune-clock-change', { detail: clockObj })
    );
  };

  const handleCreateCustomTheme = (e) => {
    e.preventDefault();
    if (!customName.trim()) {
      setError('Укажите название вашей темы!');
      return;
    }

    const created = saveCustomTheme({
      name: customName.trim(),
      accent: customAccent,
      bgPage: customBgPage,
      bgCard: customBgCard,
      border: customBorder,
      glow: `${customAccent}33`,
      textPrimary: customTextPrimary,
      textMuted: customTextMuted,
    });

    const updatedCustoms = getCustomThemes();
    setCustomThemes(updatedCustoms);
    setIsCreatingCustom(false);
    handleSelectTheme(created);
    setSuccessMsg(`Кастомная тема «${created.name}» успешно создана и применена!`);
  };

  const handleDeleteCustom = (e, themeId) => {
    e.stopPropagation();
    deleteCustomTheme(themeId);
    setCustomThemes(getCustomThemes());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      localStorage.setItem('hoshizune_show_author_themes', showAuthorThemes ? 'true' : 'false');
      localStorage.setItem('hoshizune_user_theme', accentColor);
      localStorage.setItem('hoshizune_glass_fx', glassFx ? 'true' : 'false');
      localStorage.setItem('hoshizune_liquid_fx', liquidFx ? 'true' : 'false');
      localStorage.setItem('hoshizune_mirror_fx', mirrorFx ? 'true' : 'false');
      localStorage.setItem('hoshizune_font_size', fontSize);
      localStorage.setItem('hoshizune_font_family', fontFamily);
      applyGlobalTheme(accentColor);
      applyVisualFx(glassFx, liquidFx, mirrorFx);
      applyFontSettings(fontSize, fontFamily);

      window.dispatchEvent(
        new CustomEvent('hoshizune-theme-change', { detail: { theme: accentColor } })
      );
      window.dispatchEvent(new CustomEvent('hoshizune-fx-change'));
      window.dispatchEvent(
        new CustomEvent('hoshizune-font-change', { detail: { fontSize, fontFamily } })
      );

      const clockObj = { position: clockPosition, isFixed: clockIsFixed };
      localStorage.setItem('hoshizune_clock_settings', JSON.stringify(clockObj));
      window.dispatchEvent(
        new CustomEvent('hoshizune-clock-change', { detail: clockObj })
      );

      if (profile) {
        const res = await fetch('/api/bio', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profile.id,
            slug: profile.slug,
            displayName: profile.displayName,
            accentColor,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Ошибка сохранения темы');
          setSaving(false);
          return;
        }
      }

      setSuccessMsg('Настройки, тема и положение бара времени успешно сохранены!');
    } catch {
      setError('Ошибка сети при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <main className="page">
        <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          ⟳ Загрузка настроек...
        </div>
      </main>
    );
  }

  return (
    <main
      className="page"
      style={{
        '--accent': activePreset.accent,
        '--bg-card': activePreset.bgCard,
        '--border-card': activePreset.border,
        '--text-primary': activePreset.textPrimary,
        '--text-muted': activePreset.textMuted,
        backgroundColor: activePreset.bgPage,
        color: activePreset.textPrimary,
        minHeight: '100vh',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <TerminalCard title="settings@hoshizune: ~">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, color: activePreset.textPrimary }}>
              ⚙ Настройки оформления и интерфейса
            </h2>
            <button
              type="button"
              className="modal-btn"
              onClick={() => setIsCreatingCustom(!isCreatingCustom)}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderColor: activePreset.accent,
                color: activePreset.accent,
              }}
            >
              {isCreatingCustom ? '✕ Закрыть конструктор' : '✨ Создать свою тему'}
            </button>
          </div>

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
              {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--accent-glow, rgba(255,255,255,0.1))',
                border: '1px solid var(--accent, rgba(255,255,255,0.3))',
                color: 'var(--accent)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Форма создания кастомной темы */}
          {isCreatingCustom ? (
            <form onSubmit={handleCreateCustomTheme} style={{ marginBottom: 20 }}>
              <div
                style={{
                  padding: 14,
                  background: activePreset.bgCard,
                  border: `1px solid ${activePreset.border}`,
                  borderRadius: 8,
                }}
              >
                <div className="section-label" style={{ color: activePreset.accent, marginBottom: 12 }}>
                  // Конструктор персональной темы
                </div>

                <div className="modal-field">
                  <label>Название темы</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="например: Cyber Violet"
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12,
                    marginTop: 10,
                  }}
                >
                  <div>
                    <label style={{ fontSize: 11, color: activePreset.textMuted }}>Акцентный цвет</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <input
                        type="color"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        className="modal-input"
                        value={customAccent}
                        onChange={(e) => setCustomAccent(e.target.value)}
                        style={{ fontSize: 11, padding: '4px 6px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: activePreset.textMuted }}>Фон страницы</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <input
                        type="color"
                        value={customBgPage}
                        onChange={(e) => setCustomBgPage(e.target.value)}
                        style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        className="modal-input"
                        value={customBgPage}
                        onChange={(e) => setCustomBgPage(e.target.value)}
                        style={{ fontSize: 11, padding: '4px 6px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: activePreset.textMuted }}>Фон карточек</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <input
                        type="color"
                        value={customBgCard}
                        onChange={(e) => setCustomBgCard(e.target.value)}
                        style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        className="modal-input"
                        value={customBgCard}
                        onChange={(e) => setCustomBgCard(e.target.value)}
                        style={{ fontSize: 11, padding: '4px 6px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: activePreset.textMuted }}>Цвет границ</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <input
                        type="color"
                        value={customBorder}
                        onChange={(e) => setCustomBorder(e.target.value)}
                        style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        className="modal-input"
                        value={customBorder}
                        onChange={(e) => setCustomBorder(e.target.value)}
                        style={{ fontSize: 11, padding: '4px 6px' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button type="submit" className="modal-btn primary" style={{ background: customAccent, color: '#000' }}>
                    💾 Сохранить и применить
                  </button>
                  <button
                    type="button"
                    className="modal-btn"
                    onClick={() => setIsCreatingCustom(false)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          <form onSubmit={handleSave}>
            {/* Блок выбора визуальной темы */}
            <div className="modal-field">
              <label style={{ color: activePreset.textMuted }}>
                ВИЗУАЛЬНАЯ ТЕМА И ЦВЕТОВОЙ АКЦЕНТ ({allThemesList.length} ТЕМ)
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                  marginTop: 10,
                }}
              >
                {allThemesList.map((t) => {
                  const isSelected =
                    accentColor.toLowerCase() === t.accent.toLowerCase() ||
                    activePreset.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTheme(t)}
                      style={{
                        padding: '10px 12px',
                        background: t.bgCard,
                        border: `1.5px solid ${isSelected ? t.accent : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: isSelected ? `0 0 12px ${t.glow}` : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: t.accent,
                            border: t.id === 'total_black' ? '1px solid #ffffff' : 'none',
                            boxShadow: `0 0 8px ${t.accent}`,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '12px',
                            color: t.textPrimary || '#ffffff',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: isSelected ? 'bold' : 'normal',
                          }}
                        >
                          {t.name}
                        </span>
                      </div>

                      {t.isCustom && (
                        <span
                          onClick={(e) => handleDeleteCustom(e, t.id)}
                          title="Удалить кастомную тему"
                          style={{
                            color: '#f87171',
                            fontSize: 11,
                            padding: '2px 4px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="modal-btn"
                  onClick={handleSyncThemeCloud}
                  style={{
                    background: activePreset.bgCard,
                    color: activePreset.textPrimary,
                    border: `1px solid ${activePreset.accent}`,
                    fontSize: '12px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  ☁️ Синхронизировать тему со всеми устройствами
                </button>
              </div>
            </div>

            {/* Блок настройки системного бара времени */}
            <div
              className="modal-field"
              style={{
                borderTop: `1px solid ${activePreset.border}`,
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <label style={{ color: activePreset.textMuted, marginBottom: 8, display: 'block' }}>
                ПОЛОЖЕНИЕ И ФИКСАЦИЯ БАРА СИСТЕМНОГО ВРЕМЕНИ (MOSCOW TIME BAR)
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                {CLOCK_POSITIONS.map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => handleClockChangeSetting(pos.id, clockIsFixed)}
                    style={{
                      padding: '8px 10px',
                      background: clockPosition === pos.id ? activePreset.accent : activePreset.bgCard,
                      color: clockPosition === pos.id ? (activePreset.id === 'pure_light' ? '#fff' : '#000') : activePreset.textPrimary,
                      border: `1px solid ${clockPosition === pos.id ? activePreset.accent : activePreset.border}`,
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: clockPosition === pos.id ? 'bold' : 'normal',
                    }}
                  >
                    {pos.name}
                  </button>
                ))}
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: activePreset.textPrimary,
                  marginTop: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={clockIsFixed}
                  onChange={(e) => handleClockChangeSetting(clockPosition, e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: activePreset.accent,
                    cursor: 'pointer',
                  }}
                />
                <span>Зафиксировать бар времени (снятие галочки включает свободное перетаскивание мышью по экрану)</span>
              </label>
            </div>

            {/* Секция настройки стеклянных и зеркальных визуальных эффектов */}
            <div
              className="modal-field"
              style={{
                borderTop: `1px solid ${activePreset.border}`,
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <label style={{ color: activePreset.textMuted, marginBottom: 10, display: 'block' }}>
                ✨ СТЕКЛЯННЫЕ И ЗЕРКАЛЬНЫЕ ЭФФЕКТЫ ИНТЕРФЕЙСА
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleToggleGlassFx(!glassFx)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: `1.5px solid ${glassFx ? activePreset.accent : 'rgba(255,255,255,0.15)'}`,
                    background: glassFx ? 'var(--accent-glow, rgba(74,222,128,0.15))' : 'rgba(0,0,0,0.3)',
                    color: glassFx ? activePreset.accent : activePreset.textMuted,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    fontWeight: glassFx ? 'bold' : 'normal',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {glassFx ? '☑' : '☐'} Стекло (Blur)
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLiquidFx(!liquidFx)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: `1.5px solid ${liquidFx ? activePreset.accent : 'rgba(255,255,255,0.15)'}`,
                    background: liquidFx ? 'var(--accent-glow, rgba(74,222,128,0.15))' : 'rgba(0,0,0,0.3)',
                    color: liquidFx ? activePreset.accent : activePreset.textMuted,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    fontWeight: liquidFx ? 'bold' : 'normal',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {liquidFx ? '☑' : '☐'} Liquid Glass
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleMirrorFx(!mirrorFx)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: `1.5px solid ${mirrorFx ? activePreset.accent : 'rgba(255,255,255,0.15)'}`,
                    background: mirrorFx ? 'var(--accent-glow, rgba(74,222,128,0.15))' : 'rgba(0,0,0,0.3)',
                    color: mirrorFx ? activePreset.accent : activePreset.textMuted,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    fontWeight: mirrorFx ? 'bold' : 'normal',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mirrorFx ? '☑' : '☐'} Зеркало
                </button>
              </div>
            </div>

            {/* Секция настройки шрифта и типографики */}
            <div
              className="modal-field"
              style={{
                borderTop: `1px solid ${activePreset.border}`,
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <label style={{ color: activePreset.textMuted, marginBottom: 10, display: 'block' }}>
                🔤 НАСТРОЙКИ ТИПОГРАФИКИ И ШРИФТА
              </label>

              {/* Выбор размера шрифта */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: activePreset.textMuted, marginBottom: 6, display: 'block' }}>
                  Размер шрифта интерфейса:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {[
                    { id: '90%', label: 'Мелкий (90%)' },
                    { id: '100%', label: 'Обычный' },
                    { id: '110%', label: 'Крупный' },
                    { id: '120%', label: 'Макс (120%)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChangeFontSize(item.id)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 6,
                        border: `1.5px solid ${fontSize === item.id ? activePreset.accent : 'rgba(255,255,255,0.15)'}`,
                        background: fontSize === item.id ? 'var(--accent-glow, rgba(255,255,255,0.15))' : 'rgba(0,0,0,0.3)',
                        color: fontSize === item.id ? activePreset.accent : activePreset.textMuted,
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        fontWeight: fontSize === item.id ? 'bold' : 'normal',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Выбор гарнитуры шрифта */}
              <div>
                <label style={{ fontSize: 11, color: activePreset.textMuted, marginBottom: 6, display: 'block' }}>
                  Гарнитура шрифта (Font Family):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {[
                    { id: 'jetbrains', label: 'JetBrains Mono', font: "'JetBrains Mono', monospace" },
                    { id: 'inter', label: 'Inter (Sans-serif)', font: "'Inter', sans-serif" },
                    { id: 'firacode', label: 'Fira Code', font: "'Fira Code', monospace" },
                    { id: 'robotomono', label: 'Roboto Mono', font: "'Roboto Mono', monospace" },
                    { id: 'outfit', label: 'Outfit (Modern)', font: "'Outfit', sans-serif" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChangeFontFamily(item.id)}
                      style={{
                        padding: '10px 10px',
                        borderRadius: 8,
                        border: `1.5px solid ${fontFamily === item.id ? activePreset.accent : 'rgba(255,255,255,0.15)'}`,
                        background: fontFamily === item.id ? 'var(--accent-glow, rgba(255,255,255,0.15))' : 'rgba(0,0,0,0.3)',
                        color: fontFamily === item.id ? activePreset.accent : activePreset.textPrimary,
                        fontSize: 12,
                        fontFamily: item.font,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: fontFamily === item.id ? 'bold' : 'normal',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Опция отображения тем других авторов */}
            <div
              className="modal-field"
              style={{
                borderTop: `1px solid ${activePreset.border}`,
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <label style={{ color: activePreset.textMuted, marginBottom: 8, display: 'block' }}>
                ОТОБРАЖЕНИЕ ТЕМ ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: activePreset.textPrimary,
                }}
              >
                <input
                  type="checkbox"
                  checked={showAuthorThemes}
                  onChange={(e) => setShowAuthorThemes(e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: activePreset.accent,
                    cursor: 'pointer',
                  }}
                />
                <span>Отображать оригинальную тему автора при просмотре чужих профилей</span>
              </label>
            </div>

            {/* Опция анимаций и FX */}
            <div
              className="modal-field"
              style={{
                borderTop: `1px solid ${activePreset.border}`,
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <label style={{ color: activePreset.textMuted, marginBottom: 8, display: 'block' }}>
                АНИМАЦИИ И ВИЗУАЛЬНЫЕ ЭФФЕКТЫ
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: activePreset.textPrimary,
                }}
              >
                <input
                  type="checkbox"
                  checked={enableAnimations}
                  onChange={(e) => {
                    setEnableAnimations(e.target.checked);
                    if (e.target.checked) {
                      document.body.classList.remove('no-animations');
                      localStorage.setItem('enable_animations', 'true');
                    } else {
                      document.body.classList.add('no-animations');
                      localStorage.setItem('enable_animations', 'false');
                    }
                  }}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: activePreset.accent,
                    cursor: 'pointer',
                  }}
                />
                <span>Включить микро-анимации наведения для кнопок и карточек профилей</span>
              </label>
            </div>

            {/* Действия */}
            <div className="modal-actions" style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="modal-btn"
                onClick={() => {
                  if (window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/');
                  }
                }}
                style={{
                  borderColor: activePreset.border,
                  color: activePreset.textPrimary,
                }}
              >
                ← Назад
              </button>
              <button
                type="button"
                className="modal-btn"
                onClick={() => router.push('/')}
                style={{
                  borderColor: activePreset.border,
                  color: activePreset.textPrimary,
                }}
              >
                🏠 На главную
              </button>
              <button
                type="submit"
                className="modal-btn primary"
                disabled={saving}
                style={{
                  background: activePreset.accent,
                  color: activePreset.id === 'pure_light' ? '#000000' : '#ffffff',
                  fontWeight: 'bold',
                  textShadow: activePreset.id === 'pure_light' ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.6)',
                }}
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>
          </form>
        </TerminalCard>
      </div>
    </main>
  );
}
