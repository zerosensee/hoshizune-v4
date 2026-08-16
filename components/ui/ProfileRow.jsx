import OnlineIndicator from './OnlineIndicator';
import BadgesContainer from './BadgesContainer';
import { getLevelBadge } from '@/lib/level-utils';

const STATUS_TEXT = {
  online: 'В сети',
  inactive: 'Неактивен',
  dnd: 'Не беспокоить',
  offline: 'Не в сети',
};

/**
 * Строка профиля: аватар + имя + уровень + ролевые/титульные бейджи + онлайн-статус.
 * @param {object} props
 * @param {string} props.displayName - Имя пользователя
 * @param {string} [props.avatarPath] - Путь к аватару
 * @param {string} props.effectiveStatus - Статус
 * @param {number} [props.level] - Уровень
 * @param {object[]} [props.badges] - Массив бейджей ролей и титулов
 * @param {string} [props.role] - Запасная роль
 * @param {string} [props.titleId] - Запасной титул
 */
export default function ProfileRow({
  displayName,
  avatarPath,
  effectiveStatus,
  level = 1,
  badges = [],
  role,
  titleId,
}) {
  const badge = getLevelBadge(level);

  // Формируем список бейджей, если переданы роли напрмую
  let displayBadges = Array.isArray(badges) ? [...badges] : [];

  if (displayBadges.length === 0 && (role || titleId)) {
    if (role && role !== 'user') {
      const roleMap = {
        owner: { badgeText: 'OWNER', color: '#ff4757', name: 'Владелец' },
        admin: { badgeText: 'ADMIN', color: '#facc15', name: 'Администратор' },
        support: { badgeText: 'SUPPORT', color: '#38bdf8', name: 'Поддержка' },
      };
      if (roleMap[role]) {
        displayBadges.push(roleMap[role]);
      }
    }
    if (titleId && titleId !== role) {
      displayBadges.push({
        badgeText: titleId.toUpperCase(),
        color: '#a855f7',
        name: titleId,
      });
    }
  }

  return (
    <div className="profile-row">
      <div className="avatar-wrap">
        {avatarPath ? (
          <img
            className="avatar-img"
            src={avatarPath}
            alt={displayName}
            loading="lazy"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            className="avatar-img"
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--bg-block, #09090b)',
              display: 'block',
            }}
          >
            <rect width="64" height="64" fill="var(--bg-block, #09090b)" />
            <circle cx="32" cy="24" r="12" fill="var(--accent, #ffffff)" />
            <path
              d="M12 56C12 45 21 40 32 40C43 40 52 45 52 56"
              fill="none"
              stroke="var(--accent, #ffffff)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <div className="profile-info">
        <div className="name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
          <span style={{ flexShrink: 0 }}>{displayName}</span>

          {/* Бейдж уровня */}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '4px',
              color: badge.color,
              background: badge.background,
              border: badge.border,
              boxShadow: badge.glow,
              letterSpacing: '0.5px',
              flexShrink: 0,
            }}
          >
            LVL {badge.level}
          </span>

          {/* Иерархические бейджи системных ролей и титулов (ограничение до 2 штук + список +N) */}
          <BadgesContainer badges={displayBadges} maxVisible={2} size="normal" />

          <span className="cursor" style={{ flexShrink: 0 }}>_</span>
        </div>
        <div className="status">
          <OnlineIndicator status={effectiveStatus} />
          {STATUS_TEXT[effectiveStatus] || 'Не в сети'}
        </div>
      </div>
    </div>
  );
}
