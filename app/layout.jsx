import './globals.css';
import MoscowClock from '@/components/ui/MoscowClock';
import ThemeProvider from '@/components/ThemeProvider';
import GlobalNavigationWidget from '@/components/ui/GlobalNavigationWidget';
import DebugPanel from '@/components/ui/DebugPanel';

export const metadata = {
  title: 'Hoshizune — Bio',
  description:
    'Персональная био-платформа. '
    + 'Создай своё мини-био и поделись ссылкой.',
  openGraph: {
    title: 'Hoshizune — Bio',
    description: 'Персональная био-платформа',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning data-glass="false" data-liquid="false" data-mirror="false">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var root = document.documentElement;
                var g = localStorage.getItem('hoshizune_glass_fx') === 'true';
                var l = localStorage.getItem('hoshizune_liquid_fx') === 'true';
                var m = localStorage.getItem('hoshizune_mirror_fx') === 'true';
                root.setAttribute('data-glass', g ? 'true' : 'false');
                root.setAttribute('data-liquid', l ? 'true' : 'false');
                root.setAttribute('data-mirror', m ? 'true' : 'false');

                var presets = {
                  emerald: { accent: '#4ade80', bgPage: '#080a08', bgCard: '#0d0f0d', border: 'rgba(74, 222, 128, 0.25)', glow: 'rgba(74, 222, 128, 0.15)' },
                  cyberpunk: { accent: '#ff007f', bgPage: '#0b0010', bgCard: '#12001a', border: 'rgba(255, 0, 127, 0.3)', glow: 'rgba(255, 0, 127, 0.2)' },
                  matrix: { accent: '#00ff66', bgPage: '#000800', bgCard: '#001100', border: 'rgba(0, 255, 102, 0.3)', glow: 'rgba(0, 255, 102, 0.2)' },
                  synthwave: { accent: '#00f0ff', bgPage: '#0f0520', bgCard: '#1a0933', border: 'rgba(0, 240, 255, 0.3)', glow: 'rgba(0, 240, 255, 0.2)' },
                  monokai: { accent: '#ffd866', bgPage: '#111012', bgCard: '#19181a', border: 'rgba(255, 216, 102, 0.3)', glow: 'rgba(255, 216, 102, 0.15)' },
                  obsidian: { accent: '#a855f7', bgPage: '#080510', bgCard: '#0f0a1c', border: 'rgba(168, 85, 247, 0.3)', glow: 'rgba(168, 85, 247, 0.2)' },
                  amber: { accent: '#ffb000', bgPage: '#0a0600', bgCard: '#140c00', border: 'rgba(255, 176, 0, 0.3)', glow: 'rgba(255, 176, 0, 0.18)' },
                  ash: { accent: '#94a3b8', bgPage: '#0f172a', bgCard: '#1e293b', border: 'rgba(148, 163, 184, 0.3)', glow: 'rgba(148, 163, 184, 0.15)' },
                  total_black: { accent: '#ffffff', bgPage: '#000000', bgCard: '#000000', border: '#262626', glow: 'rgba(255, 255, 255, 0.15)' },
                  cyber_mix_black: { accent: '#38bdf8', bgPage: '#000000', bgCard: '#000000', border: 'rgba(56, 189, 248, 0.35)', glow: 'rgba(56, 189, 248, 0.25)' },
                  pure_light: { accent: '#4f46e5', bgPage: '#f1f5f9', bgCard: '#ffffff', border: '#cbd5e1', glow: 'rgba(79, 70, 229, 0.15)' },
                  rosegluss: { accent: '#f43f5e', bgPage: '#090104', bgCard: '#1a050d', border: 'rgba(244, 63, 94, 0.35)', glow: 'rgba(244, 63, 94, 0.25)' }
                };
                var t = localStorage.getItem('hoshizune_user_theme') || localStorage.getItem('hoshizune_device_theme') || 'total_black';
                var p = presets[t];
                if (!p) {
                  for (var k in presets) {
                    if (presets[k].accent.toLowerCase() === String(t).toLowerCase()) { p = presets[k]; break; }
                  }
                }
                if (!p) p = presets.total_black;
                root.style.setProperty('--accent', p.accent);
                root.style.setProperty('--accent-glow', p.glow);
                root.style.setProperty('--bg-primary', p.bgPage);
                root.style.setProperty('--bg-card', p.bgCard);
                root.style.setProperty('--border-card', p.border);
              } catch(e){}
            })()`,
          }}
        />
      </head>
      <body>
        <div className="noise" />
        <GlobalNavigationWidget />
        <ThemeProvider>{children}</ThemeProvider>
        <MoscowClock />
        <DebugPanel />
      </body>
    </html>
  );
}
