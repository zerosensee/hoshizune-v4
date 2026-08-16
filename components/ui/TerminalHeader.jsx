/**
 * Хедер карточки-терминала (три цветные точки).
 * @param {object} props
 * @param {string} [props.title] - Заголовок терминала
 */
export default function TerminalHeader({ title }) {
  return (
    <div className="term-header">
      <span className="term-dot red" />
      <span className="term-dot yellow" />
      <span className="term-dot green" />
      {title && (
        <span className="term-title">{title}</span>
      )}
    </div>
  );
}
