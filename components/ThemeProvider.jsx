'use client';

/**
 * Глобальный провайдер визуальных тем для Hoshizune Bio v4.0.
 * Применяет выбранную тему (Emerald, Cyberpunk, Total Black, Ash Slate, Pure Light и др.)
 * ко всем страницам сайта через CSS-переменные в :root.
 */
import { useEffect } from 'react';
import { getThemePreset } from '@/lib/theme-presets';

export function applyGlobalTheme(accentOrThemeId) {
  if (typeof window === 'undefined') return;

  const preset = getThemePreset(accentOrThemeId);
  const root = document.documentElement;

  // 1. Фоны компонентов
  root.style.setProperty('--bg-primary', preset.bgPage);
  root.style.setProperty('--bg-card', preset.bgCard);
  root.style.setProperty('--bg-card-header', preset.bgCard);
  root.style.setProperty('--bg-block', preset.bgPage || preset.bgCard);
  root.style.setProperty('--bg-btn', preset.bgCard);
  root.style.setProperty('--bg-btn-hover', preset.bgCard);

  // 2. Рамки, контуры и разделители
  root.style.setProperty('--border-card', preset.border);
  root.style.setProperty('--border-block', preset.border);
  root.style.setProperty('--border-btn', preset.border);
  root.style.setProperty('--border-btn-hover', preset.accent);
  root.style.setProperty('--border-header', preset.border);
  root.style.setProperty('--border-footer', preset.border);

  // 3. Акцентные цвета и свечение
  root.style.setProperty('--accent', preset.accent);
  root.style.setProperty('--accent-glow', preset.glow || `${preset.accent}33`);

  // 4. Цвета текста, заголовков блоков и нумерации
  root.style.setProperty('--text-primary', preset.textPrimary);
  root.style.setProperty('--text-secondary', preset.textPrimary);
  root.style.setProperty('--text-muted', preset.textMuted);
  root.style.setProperty('--text-dim', preset.textMuted);
  root.style.setProperty('--text-label', preset.accent);
  root.style.setProperty('--text-line-num', preset.textMuted);

  // 5. Точки хедера терминала ("кружочки")
  root.style.setProperty('--dot-red-bg', `${preset.accent}d0`);
  root.style.setProperty('--dot-red-border', preset.accent);
  root.style.setProperty('--dot-yellow-bg', `${preset.accent}75`);
  root.style.setProperty('--dot-yellow-border', preset.accent);
  root.style.setProperty('--dot-green-bg', `${preset.accent}35`);
  root.style.setProperty('--dot-green-border', preset.accent);

  if (preset.id === 'pure_light') {
    document.body.classList.add('theme-pure-light');
  } else {
    document.body.classList.remove('theme-pure-light');
  }
}

export function applyFontSettings(fontSizeVal, fontFamilyVal) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  const size = fontSizeVal || localStorage.getItem('hoshizune_font_size') || '100%';
  const family = fontFamilyVal || localStorage.getItem('hoshizune_font_family') || 'jetbrains';

  // Динамический размер текста на корневом элементе
  const fontPxMap = {
    '90%': '14.5px',
    '100%': '16px',
    '110%': '17.5px',
    '120%': '19px',
  };
  root.style.fontSize = fontPxMap[size] || '16px';
  root.style.setProperty('--font-scale', size);

  // Маппинг гарнитур шрифтов
  const fontMap = {
    jetbrains: "'JetBrains Mono', monospace",
    inter: "'Inter', system-ui, sans-serif",
    firacode: "'Fira Code', monospace",
    robotomono: "'Roboto Mono', monospace",
    outfit: "'Outfit', system-ui, sans-serif",
  };

  const selectedFont = fontMap[family] || fontMap.jetbrains;
  root.style.setProperty('--font-mono', selectedFont);
  root.style.setProperty('--font-sans', selectedFont);
}

export function applyVisualFx(glassFx, liquidFx, mirrorFx) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  const glass = glassFx !== undefined ? glassFx : (localStorage.getItem('hoshizune_glass_fx') === 'true');
  const liquid = liquidFx !== undefined ? liquidFx : (localStorage.getItem('hoshizune_liquid_fx') === 'true');
  const mirror = mirrorFx !== undefined ? mirrorFx : (localStorage.getItem('hoshizune_mirror_fx') === 'true');

  root.setAttribute('data-glass', glass ? 'true' : 'false');
  root.setAttribute('data-liquid', liquid ? 'true' : 'false');
  root.setAttribute('data-mirror', mirror ? 'true' : 'false');
}

export default function ThemeProvider({ children }) {
  useEffect(() => {
    // 1. Инициализация visual fx и настроек шрифтов
    applyVisualFx();
    applyFontSettings();

    // 2. Проверяем сохранённую тему конкретного устройства в localStorage
    const deviceTheme = localStorage.getItem('hoshizune_device_theme') || localStorage.getItem('hoshizune_user_theme');
    if (deviceTheme) {
      applyGlobalTheme(deviceTheme);
    } else {
      applyGlobalTheme('total_black');
    }

    // 4. Подписываемся на события изменения темы, шрифта и эффектов
    function handleThemeChange(event) {
      const newTheme = event.detail?.theme || localStorage.getItem('hoshizune_user_theme');
      if (newTheme) {
        applyGlobalTheme(newTheme);
      }
    }

    function handleFxChange() {
      applyVisualFx();
    }

    function handleFontChange(event) {
      const size = event.detail?.fontSize;
      const family = event.detail?.fontFamily;
      applyFontSettings(size, family);
    }

    window.addEventListener('hoshizune-theme-change', handleThemeChange);
    window.addEventListener('hoshizune-fx-change', handleFxChange);
    window.addEventListener('hoshizune-font-change', handleFontChange);

    return () => {
      window.removeEventListener('hoshizune-theme-change', handleThemeChange);
      window.removeEventListener('hoshizune-fx-change', handleFxChange);
      window.removeEventListener('hoshizune-font-change', handleFontChange);
    };
  }, []);

  return <>{children}</>;
}
