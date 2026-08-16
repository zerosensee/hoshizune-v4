'use client';

/**
 * Страница настроек, безопасности и управления паролями администратора.
 * Интерактивное управление белыми списками IP, LAN доступом и паролями учёток.
 */
import { useState, useCallback, useEffect } from 'react';
import styles from '../admin.module.css';
import { applyVisualFx } from '@/components/ThemeProvider';

export default function SettingsClient({ settings: initialSettings }) {
  const [allowedIps, setAllowedIps] = useState(
    initialSettings?.allowedIps || ['*']
  );
  const [allowLocalNetwork, setAllowLocalNetwork] = useState(
    !!initialSettings?.allowLocalNetwork
  );
  const [sessionMaxAge, setSessionMaxAge] = useState(
    initialSettings?.sessionMaxAge || 86400
  );

  /* Визуальные эффекты внешнего вида */
  const [glassFx, setGlassFx] = useState(false);
  const [liquidFx, setLiquidFx] = useState(false);
  const [mirrorFx, setMirrorFx] = useState(false);

  useEffect(() => {
    setGlassFx(localStorage.getItem('hoshizune_glass_fx') === 'true');
    setLiquidFx(localStorage.getItem('hoshizune_liquid_fx') === 'true');
    setMirrorFx(localStorage.getItem('hoshizune_mirror_fx') === 'true');

    // Автоматическая загрузка актуальных синхронизированных настроек из БД
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.allowedIps && Array.isArray(data.allowedIps)) {
          setAllowedIps(data.allowedIps);
        }
        if (typeof data.allowLocalNetwork === 'boolean') {
          setAllowLocalNetwork(data.allowLocalNetwork);
        }
        if (data.sessionMaxAge) {
          setSessionMaxAge(data.sessionMaxAge);
        }
      })
      .catch(() => {});
  }, []);

  const [newIp, setNewIp] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  /* Смена пароля администратора */
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [toast, setToast] = useState(null);

  /** Отображение тост-уведомления */
  const showToast = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleToggleGlassFx = (val) => {
    setGlassFx(val);
    localStorage.setItem('hoshizune_glass_fx', val ? 'true' : 'false');
    applyVisualFx(val, liquidFx, mirrorFx);
    window.dispatchEvent(new CustomEvent('hoshizune-fx-change'));
    showToast(`Эффект стекла: ${val ? 'Включён' : 'Выключен'}`);
  };

  const handleToggleLiquidFx = (val) => {
    setLiquidFx(val);
    localStorage.setItem('hoshizune_liquid_fx', val ? 'true' : 'false');
    applyVisualFx(glassFx, val, mirrorFx);
    window.dispatchEvent(new CustomEvent('hoshizune-fx-change'));
    showToast(`Жидкое стекло (Liquid Glass): ${val ? 'Включено' : 'Выключено'}`);
  };

  const handleToggleMirrorFx = (val) => {
    setMirrorFx(val);
    localStorage.setItem('hoshizune_mirror_fx', val ? 'true' : 'false');
    applyVisualFx(glassFx, liquidFx, val);
    window.dispatchEvent(new CustomEvent('hoshizune-fx-change'));
    showToast(`Эффект зеркала (Mirror Effect): ${val ? 'Включён' : 'Выключен'}`);
  };

  /** Добавление IP адреса */
  const handleAddIp = (e) => {
    e.preventDefault();
    const val = newIp.trim();
    if (!val) return;

    if (allowedIps.includes(val)) {
      showToast('Данный IP уже есть в списке', true);
      return;
    }

    setAllowedIps((prev) => [...prev, val]);
    setNewIp('');
  };

  /** Удаление IP адреса */
  const handleRemoveIp = (ipToRemove) => {
    if (allowedIps.length === 1 && allowedIps[0] === ipToRemove) {
      if (!confirm('Вы действительно хотите удалить последний IP? Доступ может оказаться заблокированным.')) {
        return;
      }
    }
    setAllowedIps((prev) => prev.filter((ip) => ip !== ipToRemove));
  };

  /** Сохранение настроек сетевого доступа */
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowedIps,
          allowLocalNetwork,
          sessionMaxAge: Number(sessionMaxAge),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Настройки доступа и IP-вайтлиста успешно сохранены в БД!');
        if (data.settings) {
          if (Array.isArray(data.settings.allowedIps)) {
            setAllowedIps(data.settings.allowedIps);
          }
          if (typeof data.settings.allowLocalNetwork === 'boolean') {
            setAllowLocalNetwork(data.settings.allowLocalNetwork);
          }
          if (data.settings.sessionMaxAge) {
            setSessionMaxAge(data.settings.sessionMaxAge);
          }
        }
      } else {
        showToast(data.error || 'Ошибка сохранения настроек', true);
      }
    } catch {
      showToast('Сбой подключения при сохранении настроек', true);
    } finally {
      setSavingSettings(false);
    }
  };

  /** Смена пароля администратора */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!adminPassword) {
      showToast('Введите новый пароль', true);
      return;
    }
    if (adminPassword !== confirmPassword) {
      showToast('Пароли не совпадают', true);
      return;
    }
    if (adminPassword.length < 4) {
      showToast('Пароль слишком короткий (минимум 4 символа)', true);
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/admin/users/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: adminPassword,
          changeAdminConfigPassword: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Пароль администратора и учетной записи успешно изменён!');
        setAdminPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error || 'Ошибка изменения пароля', true);
      }
    } catch {
      showToast('Сбой при обновлении пароля', true);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Настройки и Безопасность</div>
        <div className={styles.pageSubtitle}>
          Управление паролями администратора, вайтлистом IP и правами доступа
        </div>
      </div>

      {/* Настройки визуальных эффектов внешнего вида */}
      <div
        style={{
          background: 'var(--bg-card, #0d1210)',
          border: '1px solid var(--border-card, #1a211a)',
          borderRadius: '8px',
          padding: '20px 22px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--accent, #4ade80)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontWeight: 600,
          }}
        >
          ✨ Настройки Внешнего Вида и Стеклянных Эффектов
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {/* Эффект стекла */}
          <div
            onClick={() => handleToggleGlassFx(!glassFx)}
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: `1px solid ${glassFx ? 'var(--accent, #4ade80)' : 'var(--border-card, #262626)'}`,
              background: glassFx ? 'var(--accent-glow, rgba(74, 222, 128, 0.08))' : 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary, #fff)' }}>
                🔍 Эффект Стекла
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #737373)', marginTop: '2px' }}>
                Glassmorphism и размытие фона
              </div>
            </div>
            <span style={{ fontSize: '16px', color: glassFx ? 'var(--accent)' : '#737373' }}>
              {glassFx ? '☑' : '☐'}
            </span>
          </div>

          {/* Жидкое стекло (Liquid Glass) */}
          <div
            onClick={() => handleToggleLiquidFx(!liquidFx)}
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: `1px solid ${liquidFx ? 'var(--accent, #4ade80)' : 'var(--border-card, #262626)'}`,
              background: liquidFx ? 'var(--accent-glow, rgba(74, 222, 128, 0.08))' : 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary, #fff)' }}>
                💧 Жидкое Стекло (Liquid Glass)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #737373)', marginTop: '2px' }}>
                Градиентные переливы и dropdown меню
              </div>
            </div>
            <span style={{ fontSize: '16px', color: liquidFx ? 'var(--accent)' : '#737373' }}>
              {liquidFx ? '☑' : '☐'}
            </span>
          </div>

          {/* Эффект зеркала (Mirror Effect) */}
          <div
            onClick={() => handleToggleMirrorFx(!mirrorFx)}
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: `1px solid ${mirrorFx ? 'var(--accent, #4ade80)' : 'var(--border-card, #262626)'}`,
              background: mirrorFx ? 'var(--accent-glow, rgba(74, 222, 128, 0.08))' : 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary, #fff)' }}>
                🪞 Эффект Зеркала (Mirror)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #737373)', marginTop: '2px' }}>
                Металлический блеск и блики
              </div>
            </div>
            <span style={{ fontSize: '16px', color: mirrorFx ? 'var(--accent)' : '#737373' }}>
              {mirrorFx ? '☑' : '☐'}
            </span>
          </div>
        </div>
      </div>

      {/* Смена пароля администратора */}
      <div
        style={{
          background: 'var(--bg-card, #0d1210)',
          border: '1px solid var(--border-card, #1a211a)',
          borderRadius: '8px',
          padding: '20px 22px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--accent, #4ade80)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontWeight: 600,
          }}
        >
          🔑 Смена Пароля Администратора и Учётной Записи
        </div>

        <form onSubmit={handleChangePassword} style={{ maxWidth: '480px' }}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Новый Пароль</label>
            <input
              type="password"
              className={styles.formInput}
              placeholder="Введите новый пароль..."
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Подтверждение Пароля</label>
            <input
              type="password"
              className={styles.formInput}
              placeholder="Повторите новый пароль..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.actionBtnPrimary}
            disabled={savingPassword}
            style={{ marginTop: '8px' }}
          >
            {savingPassword ? 'Обновление...' : '🔑 Сменить пароль'}
          </button>
        </form>
      </div>

      {/* Управление белыми списками IP */}
      <div
        style={{
          background: 'var(--bg-card, #0d1210)',
          border: '1px solid var(--border-card, #1a211a)',
          borderRadius: '8px',
          padding: '20px 22px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--accent, #4ade80)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontWeight: 600,
          }}
        >
          🛡️ Управление IP Белым Списком (Whitelist)
        </div>

        <form
          onSubmit={handleAddIp}
          style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
        >
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Введите IP адрес (например, 192.168.1.50 или *)..."
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className={styles.actionBtnPrimary}>
            + Добавить IP
          </button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {allowedIps.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#f87171' }}>
              Список пуст — доступ разрешён всем или ограничен локальной сетью
            </div>
          ) : (
            allowedIps.map((ip) => (
              <div
                key={ip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  background: 'var(--accent-glow, rgba(74, 222, 128, 0.12))',
                  border: '1px solid var(--accent, #4ade80)',
                  borderRadius: '6px',
                  color: 'var(--accent, #4ade80)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span>{ip === '*' ? '* (Все IP адреса)' : ip}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveIp(ip)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    fontSize: '12px',
                    lineHeight: 1,
                  }}
                  title="Удалить IP"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Параметры подсети и сессии */}
      <div
        style={{
          background: 'var(--bg-card, #0d1210)',
          border: '1px solid var(--border-card, #1a211a)',
          borderRadius: '8px',
          padding: '20px 22px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--accent, #4ade80)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontWeight: 600,
          }}
        >
          ⚡ Доступ и Срок Действия Сессии
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text-primary, #ffffff)',
            }}
          >
            <input
              type="checkbox"
              checked={allowLocalNetwork}
              onChange={(e) => setAllowLocalNetwork(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent, #4ade80)' }}
            />
            <span>
              Разрешить доступ устройствам из локальной сети (LAN / 192.168.x.x / 10.x.x.x)
            </span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary, #ffffff)', minWidth: '180px' }}>
              Длительность админ-сессии:
            </span>
            <select
              value={sessionMaxAge}
              onChange={(e) => setSessionMaxAge(Number(e.target.value))}
              className={styles.formInput}
              style={{ width: 'auto', padding: '6px 12px' }}
            >
              <option value={3600}>1 час</option>
              <option value={86400}>24 часа (1 день)</option>
              <option value={604800}>7 дней</option>
              <option value={2592000}>30 дней</option>
            </select>
          </div>
        </div>
      </div>

      {/* Кнопка сохранения сетевых настроек */}
      <div style={{ textAlign: 'right' }}>
        <button
          type="button"
          className={styles.actionBtnPrimary}
          onClick={handleSaveSettings}
          disabled={savingSettings}
          style={{ padding: '10px 24px', fontSize: '13px' }}
        >
          {savingSettings ? 'Сохранение настроек...' : '💾 Сохранить сетевые настройки'}
        </button>
      </div>

      {/* Тост */}
      {toast && (
        <div className={toast.isError ? styles.toastError : styles.toast}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
