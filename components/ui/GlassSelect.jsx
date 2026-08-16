'use client';

/**
 * Кастомное выпадающее меню (Dropdown) с поддержкой Liquid Glass и зеркального эффекта.
 * Абсолютно заменяет стандартные браузерные <select> на интерактивное жидкое стекло.
 */
import { useState, useRef, useEffect } from 'react';

export default function GlassSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Выберите...',
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Кнопка-триггер выпадающего списка */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="glass-select-trigger"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'var(--bg-primary, rgba(13, 18, 16, 0.85))',
          border: '1px solid var(--border-card, rgba(255, 255, 255, 0.18))',
          color: 'var(--text-primary, #ffffff)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 0 15px var(--accent-glow, rgba(74, 222, 128, 0.3))' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {selectedOption ? (
            <>
              {selectedOption.badgeText && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: selectedOption.color || 'var(--accent)',
                    background: `${selectedOption.color || 'var(--accent)'}20`,
                    border: `1px solid ${selectedOption.color || 'var(--accent)'}50`,
                  }}
                >
                  {selectedOption.badgeText}
                </span>
              )}
              <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted, #737373)' }}>{placeholder}</span>
          )}
        </div>

        <span
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            fontSize: '12px',
            color: 'var(--accent, #ffffff)',
            marginLeft: '8px',
          }}
        >
          ▼
        </span>
      </button>

      {/* Выпадающее меню с жидким стеклом */}
      {isOpen && (
        <div
          className="liquid-glass-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            borderRadius: '10px',
            maxHeight: '240px',
            overflowY: 'auto',
            padding: '6px',
            background: 'var(--bg-card, rgba(13, 18, 16, 0.95))',
            border: '1px solid var(--border-card, rgba(255, 255, 255, 0.22))',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 25px var(--accent-glow, rgba(255, 255, 255, 0.2))',
            animation: 'dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className="liquid-glass-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '3px',
                  fontSize: '12.5px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isSelected ? 'var(--accent, #ffffff)' : 'var(--text-primary, #ffffff)',
                  background: isSelected ? 'var(--accent-glow, rgba(255, 255, 255, 0.15))' : 'transparent',
                  border: isSelected ? '1px solid var(--accent, rgba(255, 255, 255, 0.4))' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {opt.badgeText && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 'bold',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        color: opt.color || 'var(--accent)',
                        background: `${opt.color || 'var(--accent)'}20`,
                        border: `1px solid ${opt.color || 'var(--accent)'}40`,
                      }}
                    >
                      {opt.badgeText}
                    </span>
                  )}
                  <span>{opt.label}</span>
                </div>

                {isSelected && (
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent, #ffffff)' }}>
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
