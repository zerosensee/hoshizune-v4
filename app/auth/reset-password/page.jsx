import { Suspense } from 'react';
import ResetClient from './ResetClient';

export const metadata = {
  title: 'Восстановление пароля — Hoshizune',
  description: 'Сброс и установка нового пароля в Hoshizune Bio',
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            ⟳ Загрузка...
          </div>
        </main>
      }
    >
      <ResetClient />
    </Suspense>
  );
}
