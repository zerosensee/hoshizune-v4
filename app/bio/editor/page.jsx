'use client';

/**
 * Страница создания и редактирования Bio-профиля.
 * Выбор кастомных тем (Cyberpunk, Matrix, Synthwave, Monokai и др.),
 * интеграция встроенного плеера (MusicWidget), привязка до 3-х почт.
 */
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TerminalCard from '@/components/ui/TerminalCard';
import { USER_STATUSES, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import { THEME_PRESETS } from '@/lib/theme-presets';

const PRESET_SERVICES = [
  { id: 'discord', label: 'Discord', placeholder: 'https://discord.gg/yourserver' },
  { id: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/user/...' },
  { id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/yourusername' },
  { id: 'steam', label: 'Steam', placeholder: 'https://steamcommunity.com/id/...' },
];

/**
 * Обнаружение анимированных файлов WebP (чанки ANIM/ANMF) и GIF
 * для предотвращения потери кадров при отрисовке на HTML5 Canvas.
 */
async function isAnimatedWebpOrGif(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (type === 'image/gif' || name.endsWith('.gif')) {
    return true;
  }

  if (type.includes('webp') || name.endsWith('.webp')) {
    try {
      const buffer = await file.slice(0, 4096).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const text = String.fromCharCode(...bytes);
      if (text.includes('ANIM') || text.includes('ANMF')) {
        return true;
      }
    } catch {}
  }
  return false;
}

/**
 * Автоматическое клиентское сжатие тяжелых статичных файлов
 * с пропуском анимированных WebP/GIF для сохранения всех кадров анимации.
 */
async function compressImageIfNeeded(file) {
  if (!file) return file;

  // Если файл анимированный (GIF / Animated WebP) — отдаем оригинал без сжатия в Canvas
  const isAnimated = await isAnimatedWebpOrGif(file);
  if (isAnimated) {
    console.log('[AvatarUpload] Обнаружен анимированный WebP/GIF! Сохраняем все кадры анимации без сжатия.');
    return file;
  }

  if (file.size <= 10 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      const MAX_DIM = 2048;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
              type: 'image/webp',
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/webp',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

function BioEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get('slug');

  const [currentUser, setCurrentUser] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bioText, setBioText] = useState('');
  const [status, setStatus] = useState(USER_STATUSES.ONLINE);
  const [avatarPath, setAvatarPath] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [pinnedTrack, setPinnedTrack] = useState('');
  const [links, setLinks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const [presetUrls, setPresetUrls] = useState({
    discord: '',
    spotify: '',
    telegram: '',
    steam: '',
  });

  const [userEmails, setUserEmails] = useState([]);
  const [newVirtualEmail, setNewVirtualEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function initData() {
      setFetching(true);
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();

        if (!meData.user) {
          router.push('/auth');
          return;
        }

        setCurrentUser(meData.user);
        setUserEmails(meData.user.emails || []);

        let targetProfile = null;
        if (editSlug) {
          const res = await fetch(`/api/bio?slug=${encodeURIComponent(editSlug)}`);
          if (res.ok) {
            targetProfile = await res.json();
          }
        } else if (meData.profile) {
          targetProfile = meData.profile;
        }

        if (targetProfile) {
          setProfileId(targetProfile.id);
          setSlug(targetProfile.slug);
          setDisplayName(targetProfile.displayName);
          setBioText(targetProfile.bioText || '');
          setStatus(targetProfile.status || USER_STATUSES.ONLINE);
          setAvatarPath(targetProfile.avatarPath || '');
          const localTheme = (typeof window !== 'undefined' && (localStorage.getItem('hoshizune_device_theme') || localStorage.getItem('hoshizune_user_theme'))) || 'total_black';
          setAccentColor(targetProfile.accentColor || localTheme);
          setMusicUrl(targetProfile.musicUrl || '');
          setPinnedTrack(targetProfile.pinnedTrack || '');
          setIsEditing(true);

          const existingLinks = targetProfile.links || [];
          const custom = [];
          const presets = { discord: '', spotify: '', telegram: '', steam: '' };

          for (const link of existingLinks) {
            const key = link.label?.toLowerCase();
            if (key && presets.hasOwnProperty(key)) {
              presets[key] = link.url;
            } else {
              custom.push(link);
            }
          }

          setPresetUrls(presets);
          setLinks(custom);
        } else {
          setDisplayName(meData.user.displayName || '');
        }
      } catch (err) {
        console.error('Ошибка инициализации редактора:', err);
      } finally {
        setFetching(false);
      }
    }

    initData();
  }, [editSlug, router]);

  async function handleAvatarUpload(e) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    if (rawFile.size > 500 * 1024 * 1024) {
      setError('Размер файла превышает 500 МБ!');
      return;
    }

    setUploading(true);
    setError('');

    // Оптимизируем файл перед отправкой если он тяжелый
    const file = await compressImageIfNeeded(rawFile);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target?.result;
      if (base64Data) {
        setAvatarPath(base64Data);
      }

      try {
        const formData = new FormData();
        formData.append('avatar', file);

        let res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.status === 413) {
          setError('Ошибка 413 (Request Entity Too Large): Nginx сервера отклонил файл. Добавьте client_max_body_size 500M; в /etc/nginx/nginx.conf!');
          return;
        }

        // Если мультипарт не прошёл — отправляем резервный JSON Base64
        if (!res.ok && base64Data && file.size < 25 * 1024 * 1024) {
          console.warn('[AvatarUpload] Multipart не прошёл, прокручиваем фолбек через JSON Base64...');
          res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              base64: base64Data,
            }),
          });
        }

        let data;
        try {
          data = await res.json();
        } catch {
          setError(`Ошибка ответа сервера (${res.status})`);
          return;
        }

        if (!res.ok) {
          setError(data.error || 'Ошибка загрузки аватара');
        } else if (data.avatarPath) {
          setAvatarPath(data.avatarPath);
        }
      } catch {
        setError('Ошибка сети при загрузке аватара');
      } finally {
        setUploading(false);
      }
    };

    reader.onerror = () => {
      setError('Ошибка чтения локального файла');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  }

  function handleAddLink() {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setLinks([
      ...links,
      { label: newLinkLabel.trim(), url: newLinkUrl.trim(), icon: '' },
    ]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  }

  function handleRemoveLink(index) {
    setLinks(links.filter((_, i) => i !== index));
  }

  async function handleAddVirtualEmail() {
    if (!newVirtualEmail.trim()) return;
    setAddingEmail(true);
    setError('');

    try {
      const res = await fetch('/api/auth/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newVirtualEmail.trim(), isVirtual: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка добавления почты');
      } else {
        setUserEmails([...userEmails, data.email]);
        setNewVirtualEmail('');
        setSuccessMsg('Виртуальная почта успешно привязана!');
      }
    } catch {
      setError('Ошибка сети при добавлении почты');
    } finally {
      setAddingEmail(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!slug.trim() || !displayName.trim()) {
      setError('Укажите URL (slug) и Имя!');
      return;
    }

    setLoading(true);

    const finalLinks = [...links];
    for (const preset of PRESET_SERVICES) {
      const url = presetUrls[preset.id]?.trim();
      if (url) {
        finalLinks.unshift({
          label: preset.label,
          url,
          icon: preset.id,
        });
      }
    }

    try {
      const payload = {
        id: profileId,
        slug: slug.trim().toLowerCase(),
        displayName: displayName.trim(),
        bioText,
        status,
        avatarPath,
        accentColor,
        musicUrl: musicUrl.trim() || null,
        pinnedTrack: pinnedTrack.trim() || null,
        links: finalLinks,
      };

      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/bio', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Не удалось сохранить профиль');
      } else {
        setSuccessMsg(isEditing ? 'Профиль успешно обновлён!' : 'Профиль успешно создан!');
        const redirectSlug = data.profile?.slug || data.slug || slug;
        setTimeout(() => {
          router.push(`/bio/${redirectSlug}`);
        }, 1000);
      }
    } catch {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <main className="page">
        <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          ⟳ Загрузка редактора...
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="page">
        <div style={{ width: '100%', maxWidth: 520 }}>
          <TerminalCard title={isEditing ? `editor@hoshizune: /bio/${slug}` : 'editor@hoshizune: create'}>
            <h2
              style={{
                fontSize: 16,
                marginBottom: 16,
                color: 'var(--text-primary)',
              }}
            >
              {isEditing ? 'Редактирование вашего Bio' : 'Создание вашего Bio-профиля'}
            </h2>

            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  color: '#f87171',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.3)',
                  color: '#4ade80',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSave}>
              {/* Поле Slug */}
              <div className="modal-field">
                <label>Персональный URL (slug)</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="например: cyber_node"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>

              {/* Поле Display Name */}
              <div className="modal-field">
                <label>Отображаемое имя</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="starlight_v4"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              {/* Выбор Кастомной Цветовой Темы */}
              <div className="modal-field">
                <label>Визуальная тема и цветовой акцент</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAccentColor(t.accent)}
                      style={{
                        padding: '8px 10px',
                        background: t.bgCard,
                        border: `1px solid ${
                          accentColor.toLowerCase() === t.accent.toLowerCase()
                            ? t.accent
                            : 'rgba(255,255,255,0.1)'
                        }`,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow:
                          accentColor.toLowerCase() === t.accent.toLowerCase()
                            ? `0 0 8px ${t.glow}`
                            : 'none',
                      }}
                    >
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: t.accent,
                          border: t.id === 'total_black' ? '1px solid #ffffff' : 'none',
                          boxShadow: `0 0 8px ${t.accent}`,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          color: t.textPrimary || '#ffffff',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Музыкальный виджет (Spotify / SoundCloud / MP3) */}
              <div
                className="modal-field"
                style={{
                  borderTop: '1px solid var(--border-block)',
                  paddingTop: 12,
                  marginTop: 12,
                }}
              >
                <label>Встроенный трек (Spotify, SoundCloud или URL аудиофайла)</label>
                <input
                  type="url"
                  className="modal-input"
                  placeholder="https://open.spotify.com/track/..."
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Название трека (например: Perturbator - Future Club)"
                  value={pinnedTrack}
                  onChange={(e) => setPinnedTrack(e.target.value)}
                />
              </div>

              {/* Онлайн-статус */}
              <div className="modal-field">
                <label>Онлайн-статус</label>
                <div className="status-selector">
                  {Object.values(USER_STATUSES).map((st) => (
                    <button
                      type="button"
                      key={st}
                      className={`status-option ${status === st ? 'active' : ''}`}
                      onClick={() => setStatus(st)}
                    >
                      <span
                        className="status-option-dot"
                        style={{ background: STATUS_COLORS[st] }}
                      />
                      {STATUS_LABELS[st]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Загрузка аватара */}
              <div className="modal-field">
                <label>Аватар (до 20 МБ)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ fontSize: 12, color: 'var(--text-muted)' }}
                />
              </div>

              {/* Описание о себе */}
              <div className="modal-field">
                <label>Информация о себе (Bio)</label>
                <textarea
                  className="modal-input"
                  placeholder="Напишите несколько строк о себе..."
                  rows={3}
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                />
              </div>

              {/* Блок предложенных социальных сервисов */}
              <div className="modal-field">
                <label>Предложенные сервисы (незаполненные не отображаются)</label>
                {PRESET_SERVICES.map((srv) => (
                  <div key={srv.id} style={{ marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: accentColor,
                        display: 'block',
                        marginBottom: 2,
                      }}
                    >
                      ◉ {srv.label}
                    </span>
                    <input
                      type="url"
                      className="modal-input"
                      placeholder={srv.placeholder}
                      value={presetUrls[srv.id] || ''}
                      onChange={(e) =>
                        setPresetUrls({
                          ...presetUrls,
                          [srv.id]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Пользовательские ссылки */}
              <div className="modal-field">
                <label>Другие ссылки</label>

                {links.map((link, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        flex: 1,
                      }}
                    >
                      {link.label} — {link.url}
                    </span>
                    <button
                      type="button"
                      className="modal-btn"
                      onClick={() => handleRemoveLink(idx)}
                      style={{ padding: '2px 8px', fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Название"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="url"
                    className="modal-input"
                    placeholder="https://..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="modal-btn"
                    onClick={handleAddLink}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Привязанные email-адреса аккаунта */}
              <div
                className="modal-field"
                style={{
                  borderTop: '1px solid var(--border-block)',
                  paddingTop: 14,
                  marginTop: 14,
                }}
              >
                <label>Почты аккаунта (до 3-х почт)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {userEmails.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{item.email}</span>
                      <span style={{ color: item.isPrimary ? accentColor : 'var(--text-muted)' }}>
                        {item.isPrimary ? '[Основная]' : item.isVirtual ? '[Виртуальная]' : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {userEmails.length < 3 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="email"
                      className="modal-input"
                      placeholder="alias@hoshizune.space"
                      value={newVirtualEmail}
                      onChange={(e) => setNewVirtualEmail(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="modal-btn"
                      onClick={handleAddVirtualEmail}
                      disabled={addingEmail}
                    >
                      + Привязать
                    </button>
                  </div>
                )}
              </div>

              {/* Кнопки действий */}
              <div className="modal-actions" style={{ marginTop: 24, display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="modal-btn"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.history.length > 1) {
                      router.back();
                    } else {
                      router.push('/');
                    }
                  }}
                >
                  ← Назад
                </button>
                <button
                  type="button"
                  className="modal-btn"
                  onClick={() => router.push('/')}
                >
                  🏠 На главную
                </button>
                <button
                  type="submit"
                  className="modal-btn primary"
                  disabled={loading}
                >
                  {loading ? 'Сохранение...' : 'Сохранить Bio'}
                </button>
              </div>
            </form>
          </TerminalCard>
        </div>
      </main>
    </>
  );
}

export default function BioEditorPage() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            ⏳ Загрузка редактора...
          </div>
        </main>
      }
    >
      <BioEditorInner />
    </Suspense>
  );
}
