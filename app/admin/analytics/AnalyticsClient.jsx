'use client';

/**
 * Клиентский компонент аналитики.
 * Графики просмотров, топ профилей, переключение периодов.
 */
import { useState } from 'react';
import styles from '../admin.module.css';

/**
 * Компонент Bar-chart из CSS.
 * @param {{ data: {day: string, views: number}[] }} props
 */
function BarChart({ data }) {
  const maxVal = Math.max(...data.map((d) => d.views), 1);

  if (data.length === 0) {
    return (
      <div className={styles.emptyState} style={{ padding: '24px' }}>
        Нет данных за выбранный период
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className={styles.sparklineBars} style={{ height: '120px' }}>
        {data.map((d) => (
          <div
            key={d.day}
            className={styles.sparklineBar}
            style={{
              height: `${Math.max((d.views / maxVal) * 100, 3)}%`,
              position: 'relative',
            }}
            title={`${d.day}: ${d.views}`}
          />
        ))}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: 'var(--text-muted, #737373)',
        paddingTop: '4px',
      }}>
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   stats7: object,
 *   stats30: object,
 *   byDay7: object[],
 *   byDay30: object[]
 * }} props
 */
export default function AnalyticsClient({
  stats7,
  stats30,
  byDay7,
  byDay30,
}) {
  const [period, setPeriod] = useState(7);

  const stats = period === 7 ? stats7 : stats30;
  const byDay = period === 7 ? byDay7 : byDay30;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Аналитика</div>
        <div className={styles.pageSubtitle}>
          Статистика просмотров платформы
        </div>
      </div>

      {/* Переключатель периода */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
      }}>
        {[7, 30].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: period === p
                ? '1px solid var(--accent, #4ade80)'
                : '1px solid var(--border-card, #262626)',
              background: period === p
                ? 'var(--accent-glow, rgba(74, 222, 128, 0.15))'
                : 'transparent',
              color: period === p ? 'var(--accent, #4ade80)' : 'var(--text-muted, #737373)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {p} дней
          </button>
        ))}
      </div>

      {/* Карточки */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Просмотры</div>
          <div className={styles.statValue}>
            {stats.totalViews}
          </div>
          <div className={styles.statSub}>за {period} дней</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Уникальных</div>
          <div className={styles.statValue}>
            {stats.uniqueVisitors}
          </div>
          <div className={styles.statSub}>посетителей</div>
        </div>
      </div>

      {/* График */}
      <div className={styles.sparklineWrap}>
        <div className={styles.sparklineTitle}>
          Просмотры по дням (за {period} дней)
        </div>
        <BarChart data={byDay} />
      </div>

      {/* Топ профилей */}
      {stats.topProfiles?.length > 0 && (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span className={styles.tableHeadTitle}>
              Топ профилей по просмотрам
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Профиль</th>
                <th>Slug</th>
                <th>Просмотры</th>
              </tr>
            </thead>
            <tbody>
              {stats.topProfiles.map((p, i) => (
                <tr key={p.profile_id}>
                  <td className={styles.tdMuted}>{i + 1}</td>
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
