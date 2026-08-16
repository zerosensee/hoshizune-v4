'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CreatorBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isSubscriptionPage = pathname?.startsWith('/subscription');

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '56px',
        left: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '8px',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {/* Кнопка быстрого перехода в Подписки (скрыта на странице подписок) */}
      {!isSubscriptionPage && (
        <Link
          href="/subscription"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(24, 15, 38, 0.9)',
            border: '1px solid rgba(192, 132, 252, 0.6)',
            borderRadius: '10px',
            boxShadow: '0 4px 18px rgba(192, 132, 252, 0.3)',
            backdropFilter: 'blur(12px)',
            color: '#c084fc',
            fontSize: '11px',
            fontWeight: 'bold',
            textDecoration: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(192, 132, 252, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 18px rgba(192, 132, 252, 0.3)';
          }}
        >
          <span>💎</span>
          <span>Подписка VIP</span>
        </Link>
      )}

      {/* Кнопка с эффектом стекла */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15, 12, 5, 0.9)',
          border: '1px solid rgba(245, 158, 11, 0.6)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Иконка Короля / Переключатель */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fbbf24',
            padding: '8px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
          title={isOpen ? 'Скрыть виджет Создателя' : 'Король сайта @hoshizune'}
        >
          <span>👑</span>
          <span style={{ fontSize: '10px', color: '#f59e0b', transition: 'transform 0.2s ease' }}>
            {isOpen ? '◀' : '▶'}
          </span>
        </button>

        {/* Расширенное меню плашки с ссылкой */}
        {isOpen && (
          <Link
            href="/bio/hoshizune"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingRight: '14px',
              textDecoration: 'none',
              lineHeight: 1.2,
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                color: '#f59e0b',
                letterSpacing: '0.5px',
                fontWeight: '800',
              }}
            >
              Создатель сайта
            </span>
            <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 'bold' }}>
              @hoshizune ↗
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
