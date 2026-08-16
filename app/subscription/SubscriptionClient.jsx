'use client';

/**
 * Клиентский компонент подписок Hoshizune VIP.
 * Премиум тарифы, преимущество расширенного лимита 20МБ аватарок,
 * VIP бейджи, свечение и мгновенная активация.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreatorBadge from '@/components/ui/CreatorBadge';

export default function SubscriptionClient({ currentUser, initialSubscription }) {
  const router = useRouter();
  const [activeSub, setActiveSub] = useState(initialSubscription);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const handleActivate = async (planName, durationDays) => {
    if (!currentUser) {
      showToast('Сначала войдите в аккаунт!', true);
      return;
    }

    setLoadingPlan(planName);
    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName, durationDays }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Ошибка оформления подписки', true);
      } else {
        setActiveSub(data.subscription);
        showToast(data.message || 'Подписка успешно активирована!');
      }
    } catch {
      showToast('Сетевая ошибка при запросе активации', true);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main, #050705)',
        color: '#ffffff',
        fontFamily: 'var(--font-mono, monospace)',
        padding: '32px 16px 120px 16px',
        position: 'relative',
      }}
    >
      {/* Навигация (отображается через GlobalNavigationWidget), здесь остаётся только правый индикатор пользователя */}
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto 32px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ fontSize: '12px', color: '#a3a3a3' }}>
          {currentUser ? `Вы вошли как: ${currentUser.email}` : 'Гость'}
        </div>
      </div>

      {/* Заголовок страницы */}
      <div style={{ maxWidth: '1000px', margin: '0 auto 40px auto', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(192, 132, 252, 0.12)',
            border: '1px solid rgba(192, 132, 252, 0.3)',
            color: '#c084fc',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '16px',
          }}
        >
          <span>💎 HOSHIZUNE VIP & CREATOR PASS</span>
        </div>
        <h1
          style={{
            fontSize: '36px',
            fontWeight: '900',
            letterSpacing: '-1px',
            margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #c084fc 50%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Разблокируйте Премиум Потенциал
        </h1>
        <p style={{ color: '#a3a3a3', fontSize: '14px', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          Снимите лимиты на загрузку аватаров до 20 МБ, получите эксклюзивный статус 💎 VIP в портфолио и пользуйтесь неограниченными возможностями.
        </p>
      </div>

      {/* Состояние текущей подписки */}
      {activeSub && (
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto 36px auto',
            padding: '20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)',
            border: '1px solid rgba(192, 132, 252, 0.4)',
            boxShadow: '0 10px 30px rgba(192, 132, 252, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '32px' }}>💎</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#c084fc' }}>
                Активная Подписка: {activeSub.planName}
              </div>
              <div style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '2px' }}>
                Действует до: {new Date(activeSub.expiresAt).toLocaleDateString('ru-RU')} (Лимит аватарок 20 МБ разблокирован)
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#22c55e',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            ✓ Активна
          </div>
        </div>
      )}

      {/* Тарифные Планы */}
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto 48px auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Тариф 1 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Старт VIP
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', margin: '12px 0 6px 0', color: '#ffffff' }}>
              199 ₽ <span style={{ fontSize: '13px', color: '#a3a3a3', fontWeight: 'normal' }}>/ месяц</span>
            </div>
            <div style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '20px' }}>
              Идеальный старт для снятия базовых ограничений
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#4ade80' }}>✓</span> 🖼️ Аватарки до 20 МБ (GIF/WebP)
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#4ade80' }}>✓</span> 💎 Плашка VIP в Bio профиле
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#4ade80' }}>✓</span> 🔗 До 50 коротких ссылок
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleActivate('Hoshizune VIP', 30)}
            disabled={loadingPlan === 'Hoshizune VIP'}
            style={{
              marginTop: '28px',
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #38bdf8',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {loadingPlan === 'Hoshizune VIP' ? 'Оформление...' : 'Оформить на 30 дней'}
          </button>
        </div>

        {/* Тариф 2 (ПОПУЛЯРНЫЙ) */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '2px solid #c084fc',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 10px 40px rgba(192, 132, 252, 0.25)',
            position: 'relative',
            transition: 'all 0.3s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              background: 'linear-gradient(90deg, #c084fc, #38bdf8)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '4px 10px',
              borderRadius: '12px',
              textTransform: 'uppercase',
            }}
          >
            Хит Продаж
          </div>

          <div>
            <div style={{ fontSize: '14px', color: '#c084fc', fontWeight: 'bold', textTransform: 'uppercase' }}>
              VIP PRO (3 Месяца)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', margin: '12px 0 6px 0', color: '#ffffff' }}>
              499 ₽ <span style={{ fontSize: '13px', color: '#a3a3a3', fontWeight: 'normal' }}>/ 90 дней</span>
            </div>
            <div style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '20px' }}>
              Максимальная выгода для активных авторов
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#c084fc' }}>✓</span> 🔓 Аватарки до 20 МБ без ограничений
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#c084fc' }}>✓</span> 💎 Фиолетовое свечение профиля
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#c084fc' }}>✓</span> ⚡ Приоритетный статус в каталоге
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#c084fc' }}>✓</span> 🎵 Музыкальный плеер в Bio
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleActivate('VIP PRO', 90)}
            disabled={loadingPlan === 'VIP PRO'}
            style={{
              marginTop: '28px',
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(90deg, #c084fc, #9333ea)',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(192, 132, 252, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            {loadingPlan === 'VIP PRO' ? 'Оформление...' : 'Оформить VIP PRO'}
          </button>
        </div>

        {/* Тариф 3 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(250, 204, 21, 0.3)',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', color: '#facc15', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Founder Lifetime
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', margin: '12px 0 6px 0', color: '#ffffff' }}>
              1490 ₽ <span style={{ fontSize: '13px', color: '#a3a3a3', fontWeight: 'normal' }}>навстагла</span>
            </div>
            <div style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '20px' }}>
              Вечный доступ ко всем будущим функциям сайта
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#facc15' }}>✓</span> 👑 Все привилегии VIP PRO навсегда
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#facc15' }}>✓</span> 🔓 Пожизненный лимит 20 МБ
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#facc15' }}>✓</span> 🏆 Эксклюзивный кастомный титул
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleActivate('Founder Lifetime', 3650)}
            disabled={loadingPlan === 'Founder Lifetime'}
            style={{
              marginTop: '28px',
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #facc15',
              background: 'rgba(250, 204, 21, 0.15)',
              color: '#facc15',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {loadingPlan === 'Founder Lifetime' ? 'Оформление...' : 'Получить навсегда'}
          </button>
        </div>
      </div>

      {/* Виджет Короля и кнопка Быстрого перехода */}
      <CreatorBadge />

      {/* Тост Уведомлений */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            padding: '14px 20px',
            borderRadius: '10px',
            background: toast.isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(192, 132, 252, 0.95)',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {toast.isError ? '❌ ' : '✨ '}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
