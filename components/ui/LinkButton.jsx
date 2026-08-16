/**
 * Кнопка-ссылка: иконка + текст + стрелка.
 * GPU-оптимизирована (will-change, contain).
 * Без лишних тегов/обозначений.
 * @param {object} props
 * @param {string} props.label - Текст кнопки
 * @param {string} props.href - URL ссылки
 * @param {string} [props.icon] - SVG иконка (строка)
 * @param {number} [props.delay] - Задержка анимации
 */
export default function LinkButton({
  label,
  href,
  icon,
  delay = 0,
}) {
  return (
    <a
      className="btn"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        animationDelay: `${delay * 0.08}s`,
      }}
    >
      {icon && (
        <span
          className="btn-icon"
          dangerouslySetInnerHTML={{ __html: icon }}
        />
      )}
      <span className="btn-label">{label}</span>
      <span className="btn-arrow">→</span>
    </a>
  );
}
