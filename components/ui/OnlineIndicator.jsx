/**
 * Индикатор онлайн-статуса (цветная точка).
 * @param {object} props
 * @param {string} props.status - Эффективный статус
 */
export default function OnlineIndicator({ status }) {
  const className = [
    'status-dot',
    status === 'inactive' ? 'inactive' : '',
    status === 'dnd' ? 'dnd' : '',
    status === 'offline' ? 'offline' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={className} />;
}
