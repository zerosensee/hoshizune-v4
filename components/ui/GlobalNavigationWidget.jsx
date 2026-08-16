'use client';

/**
 * Глобальный плавающий виджет навигации Hoshizune v4.
 * Автоматически отображается на всех страницах сайта кроме главной ("/").
 * Предоставляет кнопки "← Назад", "🏠 На главную" и "💎 VIP Подписка"
 * в стиле Liquid Glass с микро-анимациями.
 */
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GlobalNavigationWidget() {
  const pathname = usePathname();
  const router = useRouter();

  // Не отображаем плавающую панель на главной и в админ-панели (у админки своё меню)
  if (pathname === '/' || pathname.startsWith('/admin')) {
    return null;
  }

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'var(--font-mono, monospace)',
        animation: 'slideUpToast 0.3s ease-out',
      }}
    >
      {/* Кнопка "← Назад" */}
      <button
        type="button"
        onClick={handleBack}
        style={{
          background: 'rgba(10, 15, 12, 0.85)',
          border: '1px solid var(--accent, rgba(255, 255, 255, 0.25))',
          color: 'var(--text-primary, #ffffff)',
          padding: '8px 14px',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent, #4ade80)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 24px var(--accent-glow, rgba(74, 222, 128, 0.3))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent, rgba(255, 255, 255, 0.25))';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
        }}
        title="Вернуться на предыдущую страницу"
      >
        <span>←</span>
        <span>Назад</span>
      </button>

      {/* Кнопка "🏠 На главную" */}
      <Link
        href="/"
        style={{
          background: 'rgba(10, 15, 12, 0.85)',
          border: '1px solid var(--accent, rgba(74, 222, 128, 0.4))',
          color: 'var(--accent, #4ade80)',
          padding: '8px 14px',
          borderRadius: '10px',
          textDecoration: 'none',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--accent-glow, rgba(74, 222, 128, 0.2))';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 24px var(--accent-glow, rgba(74, 222, 128, 0.4))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(10, 15, 12, 0.85)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
        }}
        title="Перейти на главную страницу"
      >
        <span>🏠</span>
        <span>На главную</span>
      </Link>

      {/* Кнопка "💎 VIP Подписка" */}
      <Link
        href="/subscription"
        style={{
          background: 'rgba(24, 15, 38, 0.85)',
          border: '1px solid rgba(192, 132, 252, 0.5)',
          color: '#c084fc',
          padding: '8px 14px',
          borderRadius: '10px',
          textDecoration: 'none',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(192, 132, 252, 0.25)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(192, 132, 252, 0.25)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(192, 132, 252, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(24, 15, 38, 0.85)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(192, 132, 252, 0.25)';
        }}
        title="Перейти в раздел подписок"
      >
        <span>💎</span>
        <span>VIP</span>
      </Link>
    </div>
  );
}
