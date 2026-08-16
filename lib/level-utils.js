/**
 * Вспомогательная система уровней (Level System) для Hoshizune Bio v4.0.
 * Рассчитывает цвета плашки, градиенты и названия статусов в зависимости от уровня пользователя.
 */

/**
 * Получение настроек стилей бейджа уровня.
 * @param {number} level - Уровень (от 1 до 999+)
 * @returns {object} Объект параметров бейджа
 */
export function getLevelBadge(level = 1) {
  const lvlNum = Math.max(1, parseInt(level, 10) || 1);

  if (lvlNum >= 100) {
    return {
      level: lvlNum,
      title: 'MYTHIC',
      color: '#f43f5e',
      background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(217, 70, 239, 0.25))',
      border: '1px solid #f43f5e',
      glow: '0 0 10px rgba(244, 63, 94, 0.4)',
    };
  }

  if (lvlNum >= 75) {
    return {
      level: lvlNum,
      title: 'LEGENDARY',
      color: '#facc15',
      background: 'rgba(250, 204, 21, 0.15)',
      border: '1px solid rgba(250, 204, 21, 0.4)',
      glow: '0 0 8px rgba(250, 204, 21, 0.3)',
    };
  }

  if (lvlNum >= 50) {
    return {
      level: lvlNum,
      title: 'EPIC',
      color: '#c084fc',
      background: 'rgba(192, 132, 252, 0.15)',
      border: '1px solid rgba(192, 132, 252, 0.4)',
      glow: '0 0 8px rgba(192, 132, 252, 0.25)',
    };
  }

  if (lvlNum >= 25) {
    return {
      level: lvlNum,
      title: 'RARE',
      color: '#38bdf8',
      background: 'rgba(56, 189, 248, 0.15)',
      border: '1px solid rgba(56, 189, 248, 0.4)',
      glow: '0 0 6px rgba(56, 189, 248, 0.2)',
    };
  }

  if (lvlNum >= 10) {
    return {
      level: lvlNum,
      title: 'UNCOMMON',
      color: '#4ade80',
      background: 'rgba(74, 222, 128, 0.15)',
      border: '1px solid rgba(74, 222, 128, 0.3)',
      glow: 'none',
    };
  }

  return {
    level: lvlNum,
    title: 'NOVICE',
    color: '#94a3b8',
    background: 'rgba(148, 163, 184, 0.12)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    glow: 'none',
  };
}
