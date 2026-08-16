/**
 * Расширенный набор визуальных тем для Hoshizune Bio v4.0.
 * Включает классические пресеты, AMOLED Total Black, Ash Slate, Pure Light и кастомные пользовательские темы.
 */

export const THEME_PRESETS = [
  {
    id: 'emerald',
    name: 'Emerald Terminal',
    accent: '#4ade80',
    bgCard: '#0d0f0d',
    bgPage: '#080a08',
    border: 'rgba(74, 222, 128, 0.25)',
    glow: 'rgba(74, 222, 128, 0.15)',
    textPrimary: '#ffffff',
    textMuted: '#6a8a6a',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    accent: '#ff007f',
    bgCard: '#12001a',
    bgPage: '#0b0010',
    border: 'rgba(255, 0, 127, 0.3)',
    glow: 'rgba(255, 0, 127, 0.2)',
    textPrimary: '#ffffff',
    textMuted: '#b066d0',
  },
  {
    id: 'matrix',
    name: 'Matrix Code',
    accent: '#00ff66',
    bgCard: '#001100',
    bgPage: '#000800',
    border: 'rgba(0, 255, 102, 0.3)',
    glow: 'rgba(0, 255, 102, 0.2)',
    textPrimary: '#ffffff',
    textMuted: '#00993d',
  },
  {
    id: 'synthwave',
    name: 'Synthwave 84',
    accent: '#00f0ff',
    bgCard: '#1a0933',
    bgPage: '#0f0520',
    border: 'rgba(0, 240, 255, 0.3)',
    glow: 'rgba(0, 240, 255, 0.2)',
    textPrimary: '#ffffff',
    textMuted: '#8b5cf6',
  },
  {
    id: 'monokai',
    name: 'Monokai Pro',
    accent: '#ffd866',
    bgCard: '#19181a',
    bgPage: '#111012',
    border: 'rgba(255, 216, 102, 0.3)',
    glow: 'rgba(255, 216, 102, 0.15)',
    textPrimary: '#ffffff',
    textMuted: '#a09880',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Void',
    accent: '#a855f7',
    bgCard: '#0f0a1c',
    bgPage: '#080510',
    border: 'rgba(168, 85, 247, 0.3)',
    glow: 'rgba(168, 85, 247, 0.2)',
    textPrimary: '#ffffff',
    textMuted: '#7e22ce',
  },
  {
    id: 'amber',
    name: 'Retro Amber',
    accent: '#ffb000',
    bgCard: '#140c00',
    bgPage: '#0a0600',
    border: 'rgba(255, 176, 0, 0.3)',
    glow: 'rgba(255, 176, 0, 0.18)',
    textPrimary: '#ffffff',
    textMuted: '#b37b00',
  },
  {
    id: 'ash',
    name: 'Ash Slate',
    accent: '#94a3b8',
    bgCard: '#1e293b',
    bgPage: '#0f172a',
    border: 'rgba(148, 163, 184, 0.3)',
    glow: 'rgba(148, 163, 184, 0.15)',
    textPrimary: '#f8fafc',
    textMuted: '#64748b',
  },
  {
    id: 'total_black',
    name: 'Total Black',
    accent: '#ffffff',
    bgCard: '#000000',
    bgPage: '#000000',
    border: '#262626',
    glow: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#ffffff',
    textMuted: '#737373',
  },
  {
    id: 'cyber_mix_black',
    name: 'Cyber Mix Black',
    accent: '#38bdf8',
    bgCard: '#000000',
    bgPage: '#000000',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.25)',
    textPrimary: '#ffffff',
    textMuted: '#a855f7',
  },
  {
    id: 'pure_light',
    name: 'Soft Pearl Light',
    accent: '#4f46e5',
    bgCard: '#ffffff',
    bgPage: '#f1f5f9',
    border: '#cbd5e1',
    glow: 'rgba(79, 70, 229, 0.15)',
    textPrimary: '#0f172a',
    textMuted: '#475569',
  },
  {
    id: 'rosegluss',
    name: 'Rosegluss',
    accent: '#f43f5e',
    bgCard: '#1a050d',
    bgPage: '#090104',
    border: 'rgba(244, 63, 94, 0.35)',
    glow: 'rgba(244, 63, 94, 0.25)',
    textPrimary: '#fff1f2',
    textMuted: '#fda4af',
  },
];

/**
 * Получение всех кастомных тем, созданных пользователем.
 * @returns {object[]} Массив пользовательских тем
 */
export function getCustomThemes() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('hoshizune_custom_themes');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Сохранение кастомной темы в localStorage.
 * @param {object} themeData - Объект параметров темы
 * @returns {object} Созданная тема
 */
export function saveCustomTheme(themeData) {
  const current = getCustomThemes();
  const newTheme = {
    id: `custom_${Date.now()}`,
    name: themeData.name || 'Моя тема',
    accent: themeData.accent || '#ec4899',
    bgCard: themeData.bgCard || '#18181b',
    bgPage: themeData.bgPage || '#09090b',
    border: themeData.border || 'rgba(236, 72, 153, 0.3)',
    glow: themeData.glow || 'rgba(236, 72, 153, 0.2)',
    textPrimary: themeData.textPrimary || '#f4f4f5',
    textMuted: themeData.textMuted || '#a1a1aa',
    isCustom: true,
  };

  const updated = [newTheme, ...current];
  localStorage.setItem('hoshizune_custom_themes', JSON.stringify(updated));
  return newTheme;
}

/**
 * Удаление кастомной темы по её ID.
 * @param {string} themeId - ID темы для удаления
 */
export function deleteCustomTheme(themeId) {
  const current = getCustomThemes();
  const updated = current.filter((t) => t.id !== themeId);
  localStorage.setItem('hoshizune_custom_themes', JSON.stringify(updated));
}

/**
 * Поиск темы по ID или значению акцентного цвета.
 * @param {string} themeIdOrAccent - Идентификатор темы или hex-код
 * @returns {object} Найденный пресет или дефолтная тема
 */
export function getThemePreset(themeIdOrAccent) {
  const defaultPreset = THEME_PRESETS.find((t) => t.id === 'total_black') || THEME_PRESETS[0];
  if (!themeIdOrAccent) return defaultPreset;

  const customThemes = getCustomThemes();
  const allThemes = [...customThemes, ...THEME_PRESETS];

  const foundById = allThemes.find((t) => t.id === themeIdOrAccent);
  if (foundById) return foundById;

  const foundByAccent = allThemes.find(
    (t) => t.accent.toLowerCase() === themeIdOrAccent.toLowerCase()
  );
  return foundByAccent || defaultPreset;
}
