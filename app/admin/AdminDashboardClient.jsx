'use client';

/**
 * Клиентский компонент дашборда администратора.
 * Отображение интерактивных графиков, фигурных диаграмм и статистики.
 */
import { useState } from 'react';
import styles from './admin.module.css';

/**
 * Форматирование числа с разделителями тысяч.
 * @param {number} n - Число
 * @returns {string} Форматированное число
 */
function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

/**
 * Компонент карточки статистики.
 * @param {{ label: string, value: string|number, sub?: string }} props
 */
function StatCard({ label, value, sub }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{fmt(Number(value))}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

/**
 * Расчёт сглаженной кубической кривой Безье для SVG-графика.
 */
function getBezierPath(points) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p0.x + (p1.x - p0.x) / 2;
    const cp2y = p1.y;
    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
  }
  return path;
}

/**
 * Замкнутая область под кривой Безье.
 */
function getAreaPath(points, bottomY) {
  if (points.length < 2) return '';
  const curve = getBezierPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${curve} L ${last.x},${bottomY} L ${first.x},${bottomY} Z`;
}

/**
 * Фигурный плавно-волновой график (Smooth Area Curve Chart).
 * @param {{ data: { day: string, views: number, uniques: number }[] }} props
 */
function SmoothAreaChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const width = 520;
  const height = 160;
  const paddingX = 35;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.views || 0, d.uniques || 0)),
    5
  );

  const pointsViews = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = paddingTop + chartH - ((d.views || 0) / maxVal) * chartH;
    return { x, y, data: d, idx: i };
  });

  const pointsUniques = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = paddingTop + chartH - ((d.uniques || 0) / maxVal) * chartH;
    return { x, y, data: d, idx: i };
  });

  const pathViews = getBezierPath(pointsViews);
  const areaViews = getAreaPath(pointsViews, paddingTop + chartH);

  const pathUniques = getBezierPath(pointsUniques);
  const areaUniques = getAreaPath(pointsUniques, paddingTop + chartH);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleWrap}>
          <div className={styles.chartTitle}>
            <span>≈</span> Трафик и просмотры
          </div>
          <div className={styles.chartSubtitle}>
            Фигурный волновой график активности за 7 дней
          </div>
        </div>
        <div className={styles.chartLegend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: 'var(--accent, #ffffff)' }} />
            <span>Просмотры</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#38bdf8' }} />
            <span>Посетители</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent, #ffffff)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent, #ffffff)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradUniques" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowAccent" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="var(--accent, #ffffff)" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Сетка Y-оси */}
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingTop + chartH * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  fill="#737373"
                  fontSize="9"
                  textAnchor="end"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Заливки областей */}
          <path d={areaViews} fill="url(#gradViews)" />
          <path d={areaUniques} fill="url(#gradUniques)" />

          {/* Кривые линии */}
          <path
            d={pathUniques}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={pathViews}
            fill="none"
            stroke="var(--accent, #ffffff)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#glowAccent)"
          />

          {/* Точки данных и метки X-оси */}
          {pointsViews.map((pt, i) => (
            <g
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            >
              <line
                x1={pt.x}
                y1={paddingTop}
                x2={pt.x}
                y2={paddingTop + chartH}
                stroke={hoveredIdx === i ? 'var(--accent-glow, rgba(255, 255, 255, 0.3))' : 'transparent'}
                strokeDasharray="2 2"
              />

              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 5 : 3.5}
                fill="var(--bg-card, #0d1210)"
                stroke="var(--accent, #ffffff)"
                strokeWidth="2"
              />

              <text
                x={pt.x}
                y={height - 8}
                fill={hoveredIdx === i ? '#ffffff' : '#737373'}
                fontSize="9.5"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {pt.data.day}
              </text>
            </g>
          ))}
        </svg>

        {/* Тултип при наведении */}
        {hoveredIdx !== null && pointsViews[hoveredIdx] && (
          <div
            style={{
              position: 'absolute',
              top: Math.max(10, pointsViews[hoveredIdx].y - 45),
              left: Math.min(width - 120, Math.max(10, pointsViews[hoveredIdx].x - 60)),
              background: 'var(--bg-card, #0a0d0b)',
              border: '1px solid var(--accent, #ffffff)',
              padding: '6px 10px',
              borderRadius: '6px',
              pointerEvents: 'none',
              fontSize: '11px',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 10,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            <div style={{ color: 'var(--accent, #ffffff)', fontWeight: 'bold', marginBottom: '2px' }}>
              {pointsViews[hoveredIdx].data.day}
            </div>
            <div>👁 Просмотры: {pointsViews[hoveredIdx].data.views}</div>
            <div style={{ color: '#38bdf8' }}>👤 Визиты: {pointsViews[hoveredIdx].data.uniques}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Фигурная круговая / кольцевая диаграмма (Curved Donut Chart).
 * @param {{ items: { label: string, value: number, color: string }[] }} props
 */
function CurvedDonutChart({ items }) {
  const [activeIdx, setActiveIdx] = useState(null);

  const total = items.reduce((sum, item) => sum + (item.value || 0), 0);
  const size = 220;
  const strokeWidth = 18;
  const radius = 78;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const slices = items.map((item, idx) => {
    const val = item.value || 0;
    const pct = total > 0 ? val / total : 0;
    const strokeDash = pct * circumference;
    const gap = circumference - strokeDash;
    const offset = -(accumulatedPercent * circumference);

    accumulatedPercent += pct;

    return {
      ...item,
      idx,
      pct: Math.round(pct * 100),
      strokeDash,
      gap,
      offset,
    };
  });

  const activeItem = activeIdx !== null ? items[activeIdx] : null;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleWrap}>
          <div className={styles.chartTitle}>
            <span>◎</span> Состав платформы
          </div>
          <div className={styles.chartSubtitle}>
            Фигурная кольцевая диаграмма ресурсов
          </div>
        </div>
        <span className={styles.chartBadge}>Всего: {total}</span>
      </div>

      <div className={styles.donutContainer}>
        {/* SVG кольцевая диаграмма */}
        <div className={styles.donutSvgWrap}>
          <svg
            viewBox={`0 0 ${size} ${size}`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* Фоновый круг */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            {/* Фигурные скруглённые сегменты кольца */}
            {slices.map((slice) => {
              const isHovered = activeIdx === slice.idx;
              if (slice.pct <= 0) return null;

              return (
                <circle
                  key={slice.idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${Math.max(slice.strokeDash - 4, 1)} ${slice.gap + 4}`}
                  strokeDashoffset={slice.offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                    filter: isHovered ? `drop-shadow(0 0 8px ${slice.color})` : 'none',
                  }}
                  onMouseEnter={() => setActiveIdx(slice.idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                />
              );
            })}
          </svg>

          {/* Текст в центре кольца */}
          <div className={styles.donutCenterText}>
            <div className={styles.donutCenterVal} style={{ color: activeItem ? activeItem.color : '#ffffff' }}>
              {activeItem ? activeItem.value : total}
            </div>
            <div className={styles.donutCenterLabel}>
              {activeItem ? activeItem.label : 'ОБЪЕКТОВ'}
            </div>
          </div>
        </div>

        {/* Интерактивная легенда */}
        <div className={styles.donutLegendList}>
          {slices.map((slice) => {
            const isActive = activeIdx === slice.idx;
            return (
              <div
                key={slice.idx}
                className={`${styles.donutLegendRow} ${isActive ? styles.donutLegendRowActive : ''}`}
                onMouseEnter={() => setActiveIdx(slice.idx)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <div className={styles.donutLegendLeft}>
                  <span
                    className={styles.legendDot}
                    style={{
                      background: slice.color,
                      boxShadow: isActive ? `0 0 8px ${slice.color}` : 'none',
                    }}
                  />
                  <span>{slice.label}</span>
                </div>
                <div className={styles.donutLegendRight}>
                  <span className={styles.donutLegendPct}>{slice.pct}%</span>
                  <span className={styles.donutLegendVal}>{slice.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Дашборд администратора с общей статистикой.
 * @param {{ data: object }} props
 */
export default function AdminDashboardClient({ data = {} }) {
  const {
    profilesCount = 0,
    linksCount = 0,
    totalViews = 0,
    uniqueVisitors = 0,
    topProfiles = [],
    viewsByDay = [],
  } = data || {};

  const donutItems = [
    { label: 'Профили', value: profilesCount, color: 'var(--accent, #ffffff)' },
    { label: 'Ссылки', value: linksCount, color: '#ec4899' },
    { label: 'Просмотры', value: totalViews, color: '#38bdf8' },
    { label: 'Визиты', value: uniqueVisitors, color: '#facc15' },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Дашборд</div>
        <div className={styles.pageSubtitle}>
          Общая статистика платформы
        </div>
      </div>

      {/* Карточки статистики */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Профили"
          value={profilesCount}
          sub="всего"
        />
        <StatCard
          label="Ссылки"
          value={linksCount}
          sub="сокращено"
        />
        <StatCard
          label="Просмотры"
          value={totalViews}
          sub="за 7 дней"
        />
        <StatCard
          label="Уникальных"
          value={uniqueVisitors}
          sub="посетителей"
        />
      </div>

      {/* Интерактивные графики: Фигурный плавно-волновой график + Фигурная кольцевая диаграмма */}
      <div className={styles.chartsGrid}>
        <SmoothAreaChart data={viewsByDay} />
        <CurvedDonutChart items={donutItems} />
      </div>

      {/* Топ профилей */}
      {topProfiles.length > 0 && (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span className={styles.tableHeadTitle}>
              Топ профилей
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Профиль</th>
                <th>Slug</th>
                <th>Просмотры</th>
              </tr>
            </thead>
            <tbody>
              {topProfiles.map((p) => (
                <tr key={p.profile_id}>
                  <td className={styles.tdName}>
                    {p.display_name || 'Без имени'}
                  </td>
                  <td className={styles.tdSlug}>
                    {p.slug ? `@${p.slug}` : '—'}
                  </td>
                  <td>{p.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
