import TerminalHeader from './TerminalHeader';

/**
 * Обёртка карточки в стиле терминала.
 * @param {object} props
 * @param {string} [props.title] - Заголовок терминала
 * @param {React.ReactNode} props.children - Содержимое
 * @param {React.ReactNode} [props.footer] - Контент футера
 */
export default function TerminalCard({
  title,
  children,
  footer,
}) {
  return (
    <div className="card">
      <TerminalHeader title={title} />
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="term-footer">{footer}</div>
      )}
    </div>
  );
}
