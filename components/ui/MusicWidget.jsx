'use client';

/**
 * Музыкальный виджет (MusicWidget) для Hoshizune Bio v4.0.
 * Поддерживает встраивание треков из Spotify, SoundCloud, YouTube и прямых MP3/аудио ссылок.
 */
import { useState } from 'react';

export default function MusicWidget({ musicUrl, trackTitle }) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!musicUrl) return null;

  const cleanUrl = musicUrl.trim();

  // 1. Spotify Embed
  if (cleanUrl.includes('spotify.com')) {
    let spotifyEmbedUrl = cleanUrl;
    if (!cleanUrl.includes('/embed/')) {
      spotifyEmbedUrl = cleanUrl.replace('spotify.com/', 'spotify.com/embed/');
    }

    return (
      <div style={{ marginTop: 14, borderRadius: '12px', overflow: 'hidden' }}>
        <iframe
          src={spotifyEmbedUrl}
          width="100%"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ borderRadius: '12px', border: 'none' }}
        />
      </div>
    );
  }

  // 2. SoundCloud Embed
  if (cleanUrl.includes('soundcloud.com')) {
    const soundcloudEmbedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      cleanUrl
    )}&color=%234ade80&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;

    return (
      <div style={{ marginTop: 14, borderRadius: '12px', overflow: 'hidden' }}>
        <iframe
          width="100%"
          height="120"
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
          src={soundcloudEmbedUrl}
          style={{ borderRadius: '12px', border: 'none' }}
        />
      </div>
    );
  }

  // 3. YouTube Embed
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    let videoId = '';
    if (cleanUrl.includes('youtu.be/')) {
      videoId = cleanUrl.split('youtu.be/')[1]?.split('?')[0];
    } else if (cleanUrl.includes('v=')) {
      videoId = cleanUrl.split('v=')[1]?.split('&')[0];
    }

    if (videoId) {
      return (
        <div style={{ marginTop: 14, borderRadius: '12px', overflow: 'hidden' }}>
          <iframe
            width="100%"
            height="180"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube track"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: '12px', border: 'none' }}
          />
        </div>
      );
    }
  }

  // 4. Прямой HTML5 Audio Player (MP3/WAV/OGG)
  return (
    <div
      style={{
        marginTop: 14,
        padding: '10px 14px',
        background: 'var(--bg-card, #0f1210)',
        border: '1px solid var(--border-card, #1e2420)',
        borderRadius: 'var(--radius-md, 8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--accent, #4ade80)', fontSize: 14 }}>🎵</span>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary, #ffffff)',
            fontWeight: 500,
          }}
        >
          {trackTitle || 'Фоновый аудиотрек'}
        </span>
      </div>
      <audio
        controls
        src={cleanUrl}
        style={{
          width: '100%',
          height: '32px',
          borderRadius: '4px',
          outline: 'none',
        }}
      />
    </div>
  );
}
