'use client';

/**
 * Компонент панели московского времени (Moscow Time Bar).
 * Поддерживает:
 * - Зафиксированный режим (Fixed) по углам/центру экрана.
 * - Свободный Drag & Drop режим (когда фиксация отключена): возможность перетаскивать бар по всему экрану мышью или тачем.
 * - Сохранение пользовательской позиции перетаскивания в localStorage.
 * - Идеальное центрирование (top-center / bottom-center).
 */
import { useState, useEffect, useRef } from 'react';

const DEFAULT_SETTINGS = {
  position: 'bottom-center', // bottom-center, bottom-left, bottom-right, top-center, top-left, top-right
  isFixed: true,
};

export default function MoscowClock() {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [mounted, setMounted] = useState(false);
  const [clockSettings, setClockSettings] = useState(DEFAULT_SETTINGS);

  // Свободное перетаскивание (Drag & Drop)
  const [dragPos, setDragPos] = useState(null); // { x: number, y: number }
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ offsetX: 0, offsetY: 0 });

  useEffect(() => {
    setMounted(true);

    function loadSettings() {
      try {
        const saved = localStorage.getItem('hoshizune_clock_settings');
        if (saved) {
          setClockSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
        const savedCoords = localStorage.getItem('hoshizune_clock_drag_coords');
        if (savedCoords) {
          setDragPos(JSON.parse(savedCoords));
        }
      } catch {
        // Игнорируем ошибки доступа
      }
    }

    loadSettings();

    const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    function update() {
      const now = new Date();
      setTimeStr(timeFormatter.format(now));
      setDateStr(dateFormatter.format(now));
    }

    update();
    const interval = setInterval(update, 1000);

    function handleClockChange(e) {
      if (e.detail) {
        setClockSettings((prev) => {
          const next = { ...prev, ...e.detail };
          // Если включили фиксацию или сменили пресет — сбрасываем ручное перетаскивание
          if (next.isFixed) {
            setDragPos(null);
            try {
              localStorage.removeItem('hoshizune_clock_drag_coords');
            } catch {}
          }
          return next;
        });
      } else {
        loadSettings();
      }
    }

    window.addEventListener('hoshizune-clock-change', handleClockChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hoshizune-clock-change', handleClockChange);
    };
  }, []);

  // Обработчики драг-энд-дропа
  const handleMouseDown = (e) => {
    if (clockSettings.isFixed) return;
    if (e.button !== 0) return; // Левая кнопка

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
  };

  const handleTouchStart = (e) => {
    if (clockSettings.isFixed) return;
    const touch = e.touches[0];
    if (!touch) return;

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e) {
      const newX = e.clientX - dragStartRef.current.offsetX;
      const newY = e.clientY - dragStartRef.current.offsetY;

      const maxX = window.innerWidth - 120;
      const maxY = window.innerHeight - 40;
      const boundedX = Math.max(10, Math.min(newX, maxX));
      const boundedY = Math.max(10, Math.min(newY, maxY));

      const newPos = { x: boundedX, y: boundedY };
      setDragPos(newPos);
      try {
        localStorage.setItem('hoshizune_clock_drag_coords', JSON.stringify(newPos));
      } catch {}
    }

    function handleTouchMove(e) {
      const touch = e.touches[0];
      if (!touch) return;

      const newX = touch.clientX - dragStartRef.current.offsetX;
      const newY = touch.clientY - dragStartRef.current.offsetY;

      const maxX = window.innerWidth - 120;
      const maxY = window.innerHeight - 40;
      const boundedX = Math.max(10, Math.min(newX, maxX));
      const boundedY = Math.max(10, Math.min(newY, maxY));

      const newPos = { x: boundedX, y: boundedY };
      setDragPos(newPos);
      try {
        localStorage.setItem('hoshizune_clock_drag_coords', JSON.stringify(newPos));
      } catch {}
    }

    function handleDragEnd() {
      setIsDragging(false);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  if (!mounted || !timeStr) return null;

  const { position, isFixed } = clockSettings;

  // Базовые стили для позиционирования
  const styleObj = {
    position: 'fixed',
    width: 'max-content',
    zIndex: 9999,
    userSelect: 'none',
    touchAction: 'none',
    cursor: isFixed ? 'default' : (isDragging ? 'grabbing' : 'grab'),
    transition: isDragging ? 'none' : 'transform 0.2s ease, top 0.2s ease, left 0.2s ease, bottom 0.2s ease',
  };

  // Если фиксация отключена и сохранены координаты драга
  if (!isFixed && dragPos) {
    styleObj.left = `${dragPos.x}px`;
    styleObj.top = `${dragPos.y}px`;
    styleObj.bottom = 'auto';
    styleObj.right = 'auto';
    styleObj.transform = 'none';
  } else {
    // Режим фиксированных позиций (или по умолчанию)
    switch (position) {
      case 'bottom-left':
        styleObj.bottom = '16px';
        styleObj.left = '16px';
        styleObj.top = 'auto';
        styleObj.right = 'auto';
        styleObj.transform = 'none';
        break;
      case 'bottom-right':
        styleObj.bottom = '16px';
        styleObj.right = '16px';
        styleObj.top = 'auto';
        styleObj.left = 'auto';
        styleObj.transform = 'none';
        break;
      case 'top-center':
        styleObj.top = '16px';
        styleObj.left = '50%';
        styleObj.bottom = 'auto';
        styleObj.right = 'auto';
        styleObj.transform = 'translateX(-50%)';
        break;
      case 'top-left':
        styleObj.top = '16px';
        styleObj.left = '16px';
        styleObj.bottom = 'auto';
        styleObj.right = 'auto';
        styleObj.transform = 'none';
        break;
      case 'top-right':
        styleObj.top = '16px';
        styleObj.right = '16px';
        styleObj.bottom = 'auto';
        styleObj.left = 'auto';
        styleObj.transform = 'none';
        break;
      case 'bottom-center':
      default:
        styleObj.bottom = '16px';
        styleObj.left = '50%';
        styleObj.top = 'auto';
        styleObj.right = 'auto';
        styleObj.transform = 'translateX(-50%)';
        break;
    }
  }

  return (
    <aside aria-label="Системное время" style={styleObj}>
      <div
        className="clock-bar"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        title={isFixed ? 'Бар зафиксирован' : 'Удерживайте и перетаскивайте бар в любое место экрана'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 18px',
          background: 'var(--bg-card, rgba(10, 12, 10, 0.92))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${isDragging ? 'var(--accent, #4ade80)' : 'var(--border-card, rgba(74, 222, 128, 0.3))'}`,
          borderRadius: '24px',
          fontSize: '12px',
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          color: 'var(--text-primary, #c8d0c0)',
          boxShadow: isDragging
            ? '0 12px 36px rgba(0,0,0,0.7), 0 0 16px var(--accent, #4ade80)'
            : '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 12px var(--border-card)',
          letterSpacing: '0.05em',
          userSelect: 'none',
          pointerEvents: 'auto',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <span
          style={{
            color: 'var(--accent, #4ade80)',
            fontWeight: 700,
          }}
        >
          $
        </span>
        <span style={{ color: 'var(--text-muted, #6a8a6a)', fontSize: '11px' }}>
          time:
        </span>
        <span
          style={{
            color: 'var(--text-primary, #ffffff)',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '1px',
          }}
        >
          {timeStr}
        </span>
        <span
          style={{
            color: 'var(--accent, #4ade80)',
            fontSize: '10px',
            fontWeight: 700,
            background: 'var(--border-card, rgba(74, 222, 128, 0.15))',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid var(--border-card, rgba(74, 222, 128, 0.3))',
          }}
        >
          MSK
        </span>
        <span style={{ color: 'var(--text-muted, rgba(255, 255, 255, 0.2))' }}>|</span>
        <span style={{ color: 'var(--text-muted, #5a7a5a)', fontSize: '11px' }}>
          {dateStr}
        </span>
        {!isFixed && (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--accent, #4ade80)',
              marginLeft: '4px',
              opacity: 0.8,
            }}
          >
            ✥
          </span>
        )}
      </div>
    </aside>
  );
}
