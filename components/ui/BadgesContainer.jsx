'use client';

import { useState, useRef, useEffect } from 'react';

export default function BadgesContainer({ badges = [], maxVisible = 2, size = 'normal' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const scrollRef = useRef(null);
  const containerRef = useRef(null);

  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownWidth = 220;
      let left = rect.left;
      if (rect.left + dropdownWidth > window.innerWidth - 20) {
        left = Math.max(10, rect.right - dropdownWidth);
      }
      setDropdownPos({
        top: Math.min(window.innerHeight - 200, rect.bottom + 6),
        left: Math.max(10, left),
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dropdownWidth = 220;
        let left = rect.left;
        if (rect.left + dropdownWidth > window.innerWidth - 20) {
          left = Math.max(10, rect.right - dropdownWidth);
        }
        setDropdownPos({
          top: Math.min(window.innerHeight - 200, rect.bottom + 6),
          left: Math.max(10, left),
        });
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isPinned) return;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsPinned(false);
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPinned]);

  if (!Array.isArray(badges) || badges.length === 0) {
    return null;
  }

  const visibleBadges = badges.slice(0, maxVisible);
  const extraBadges = badges.slice(maxVisible);

  const fontSize = size === 'small' ? '9.5px' : '10px';
  const padding = size === 'small' ? '1px 5px' : '2px 6px';

  const handleWheel = (e) => {
    if (scrollRef.current && e.shiftKey) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        maxWidth: '100%',
        verticalAlign: 'middle',
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      {/* Флекс-контейнер видимых бейджей с поддержкой переноса */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'wrap',
          maxWidth: '100%',
          flexShrink: 1,
          minWidth: 0,
        }}
      >
        {visibleBadges.map((b, idx) => {
          const bColor = b.color || '#4ade80';
          return (
            <span
              key={b.id || b.badgeText || idx}
              style={{
                fontSize,
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 'bold',
                padding,
                borderRadius: '4px',
                color: bColor,
                background: `${bColor}1f`,
                border: `1px solid ${bColor}50`,
                boxShadow: `0 0 6px ${bColor}20`,
                textTransform: 'uppercase',
                flexShrink: 0,
                letterSpacing: '0.5px',
              }}
              title={b.name ? `${b.isSystem ? 'Системная роль' : 'Титул'}: ${b.name}` : b.badgeText}
            >
              {b.badgeText}
            </span>
          );
        })}
      </div>

      {/* Выпадающий список оставшихся бейджей */}
      {extraBadges.length > 0 && (
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            display: 'inline-block',
            flexShrink: 0,
            zIndex: isOpen ? 99999 : 'auto',
          }}
          onMouseLeave={() => {
            if (!isPinned) {
              setIsOpen(false);
            }
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isPinned) {
                setIsPinned(false);
                setIsOpen(false);
              } else {
                setIsPinned(true);
                setIsOpen(true);
              }
            }}
            onMouseEnter={() => {
              if (!isPinned) {
                setIsOpen(true);
              }
            }}
            style={{
              fontSize,
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 'bold',
              padding,
              borderRadius: '4px',
              color: 'var(--accent, #ffffff)',
              background: isPinned
                ? 'var(--accent-glow, rgba(255, 255, 255, 0.3))'
                : 'var(--accent-glow, rgba(255, 255, 255, 0.15))',
              border: isPinned
                ? '1px solid var(--accent, #ffffff)'
                : '1px solid var(--accent, rgba(255, 255, 255, 0.3))',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              zIndex: 10,
              position: 'relative',
              boxShadow: isPinned ? '0 0 8px var(--accent-glow)' : 'none',
            }}
            title="Нажмите для закрепления меню всех ролей и титулов"
          >
            +{extraBadges.length} ▾
          </button>

          {isOpen && (
            <div
              className="liquid-glass-dropdown"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                position: 'fixed',
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
                zIndex: 9999999,
                background: 'var(--bg-card, rgba(13, 18, 16, 0.98))',
                border: '1px solid var(--border-card, rgba(255, 255, 255, 0.25))',
                borderRadius: '8px',
                padding: '10px 12px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.95), 0 0 20px var(--accent-glow, rgba(74, 222, 128, 0.2))',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minWidth: '200px',
                maxWidth: '280px',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                animation: 'dropdownFadeIn 0.15s ease-out',
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent, #ffffff)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Доп. роли и титулы:
              </div>
              {extraBadges.map((b, idx) => {
                const bColor = b.color || '#4ade80';
                return (
                  <div
                    key={b.id || b.badgeText || idx}
                    className="liquid-glass-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      background: `${bColor}18`,
                      border: `1px solid ${bColor}40`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 'bold',
                        color: bColor,
                        fontFamily: 'var(--font-mono, monospace)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        background: `${bColor}20`,
                      }}
                    >
                      {b.badgeText}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-primary, #ffffff)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {b.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
