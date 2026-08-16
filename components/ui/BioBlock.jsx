/**
 * Блок с пронумерованными строками описания.
 * @param {object} props
 * @param {string[]} props.lines - Массив строк био
 */
export default function BioBlock({ lines }) {
  if (!lines || lines.length === 0) return null;

  return (
    <div className="bio-block">
      {lines.map((line, i) => (
        <div className="bio-line" key={i}>
          <span className="bio-num">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="bio-text">{line}</span>
        </div>
      ))}
    </div>
  );
}
