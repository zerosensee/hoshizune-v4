import { Suspense } from 'react';
import AuthClient from './AuthClient';

export const metadata = {
  title: 'Авторизация — Hoshizune',
  description: 'Вход и регистрация в системе Hoshizune Bio',
};

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthClient />
    </Suspense>
  );
}
