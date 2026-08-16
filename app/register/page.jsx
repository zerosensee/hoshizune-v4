/**
 * Страница регистрации пользователя /register.
 * Обертка над клиентским компонентом AuthClient в режиме регистрации.
 */
import { Suspense } from 'react';
import AuthClient from '../auth/AuthClient';

export const metadata = {
  title: 'Регистрация — Hoshizune',
  description: 'Создание нового аккаунта в системе Hoshizune Bio',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthClient defaultMode="register" />
    </Suspense>
  );
}
