import { ImageResponse } from 'next/og';
import { getProfileBySlug } from '@/lib/bio-repository';

export const runtime = 'nodejs';
export const alt = 'Hoshizune Bio Card';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }) {
  const { slug } = await params;
  const profile = getProfileBySlug(slug);

  const displayName = profile?.displayName || slug;
  const bioText = profile?.bioText || 'Digital presence on Hoshizune';
  const views = profile?.viewCount || 0;
  const accent = profile?.accentColor || '#4ade80';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          color: '#ffffff',
          position: 'relative',
          padding: '60px',
        }}
      >
        {/* Декоративная рамка терминала */}
        <div
          style={{
            position: 'absolute',
            inset: '30px',
            border: `2px solid ${accent}40`,
            borderRadius: '16px',
            background: '#0d0f0d',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px',
            boxShadow: `0 0 60px ${accent}20`,
          }}
        >
          {/* Хедер терминала */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '20px',
              marginBottom: '30px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#f87171',
                }}
              />
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#facc15',
                }}
              />
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: accent,
                }}
              />
            </div>
            <div style={{ color: accent, fontSize: '24px' }}>
              hoshizune.space/bio/{slug}
            </div>
          </div>

          {/* Контент профиля */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '16px',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: '28px',
                color: '#a0a0a0',
                maxWidth: '900px',
                lineHeight: '1.4',
                marginBottom: '30px',
              }}
            >
              {bioText.slice(0, 140)}
            </div>
          </div>

          {/* Футер */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '20px',
              fontSize: '20px',
              color: '#707070',
            }}
          >
            <div>$ view count: {views}</div>
            <div style={{ color: accent }}>✓ HOSHIZUNE BIO PLATFORM</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
