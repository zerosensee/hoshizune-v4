import './globals.css';
import MoscowClock from '@/components/ui/MoscowClock';
import ThemeProvider from '@/components/ThemeProvider';

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

                var t = localStorage.getItem('hoshizune_user_theme') || 'total_black';
                if (t === 'emerald') {
                  root.style.setProperty('--accent', '#4ade80');
                  root.style.setProperty('--accent-glow', 'rgba(74, 222, 128, 0.25)');
                  root.style.setProperty('--bg-primary', '#080a08');
                  root.style.setProperty('--bg-card', '#0d0f0d');
                  root.style.setProperty('--border-card', 'rgba(74, 222, 128, 0.25)');
                } else if (t === 'cyberpunk') {
                  root.style.setProperty('--accent', '#ff007f');
                  root.style.setProperty('--accent-glow', 'rgba(255, 0, 127, 0.25)');
                  root.style.setProperty('--bg-primary', '#0b0010');
                  root.style.setProperty('--bg-card', '#12001a');
                  root.style.setProperty('--border-card', 'rgba(255, 0, 127, 0.3)');
                } else if (t === 'total_black') {
                  root.style.setProperty('--accent', '#ffffff');
                  root.style.setProperty('--accent-glow', 'rgba(255, 255, 255, 0.15)');
                  root.style.setProperty('--bg-primary', '#000000');
                  root.style.setProperty('--bg-card', '#000000');
                  root.style.setProperty('--border-card', '#262626');
                } else if (t === 'cyber_mix_black') {
                  root.style.setProperty('--accent', '#38bdf8');
                  root.style.setProperty('--accent-glow', 'rgba(56, 189, 248, 0.25)');
                  root.style.setProperty('--bg-primary', '#000000');
                  root.style.setProperty('--bg-card', '#000000');
                  root.style.setProperty('--border-card', 'rgba(56, 189, 248, 0.35)');
                }
              } catch(e){}
            })()`,
          }}
        />
      </head>
      <body>
        <div className="noise" />
        <ThemeProvider>{children}</ThemeProvider>
        <MoscowClock />
      </body>
    </html>
  );
}
