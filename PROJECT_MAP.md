# 🕸️ Hoshizune v4 — Карта Проекта, Паутина Модулей и Журнал Изменений

> **Назначение файла:** Единый источник правды (Single Source of Truth) по кодовой базе Hoshizune v4. Содержит архитектурную паутину взаимосвязей, историю всех доработок, правила безопасности и план будущих улучшений.

---

## 🧭 1. Архитектурная «Паутина» Модулей

```
                           [ Клиентский Браузер ]
                                     │
                                     ▼
                   [ proxy.js (Next.js 16 Middleware) ]
         ┌───────────────────────────┴───────────────────────────┐
         │                                                       │
         ▼                                                       ▼
[ Публичный фронтенд / API ]                             [ /admin/* & /api/admin/* ]
  • /bio/[slug]                                            • Валидация admin-config.json
  • /auth (Login, Register, Verify)                        • Проверка IP (Вайтлист)
  • /subscription (Тарифы)                                 • Cookie hoshizune_admin_session
  • /s/[code] (Сокращатель)                                • Изоляция от обычных сессий
  • /api/upload (Magic Bytes)                              • Единый 404 на неавторизованные
         │                                                       │
         └───────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
                        [ Серверные Репозитории (lib/) ]
  ┌──────────────────────────────────┼──────────────────────────────────┐
  │                                  │                                  │
  ▼                                  ▼                                  ▼
[ bio-repository.js ]     [ subscription-repository.js ]   [ short-links-repository.js ]
  • toPublicProfile()       • SUBSCRIPTION_PLANS             • createShortLink()
  • sanitizeLinks()         • getPlanById()                  • getShortLinkById()
  • getAllProfilesAdmin()   • createSubscription()           • deleteShortLink()
  • CRUD профилей           • extendSubscription()           • Фильтр приватных сетей
  • Счётчик просмотров      • revokeSubscription()           • Блок-лист системных путей
  │                                  │                                  │
  └──────────────────────────────────┼──────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
       [ user-repository.js ]                 [ rate-limiter.js ]
         • createUser (is_verified=0)           • checkRateLimit()
         • hashPassword()                       • Lockout (15 мин)
         • verifyPassword()                     • Троттлинг логина / админки
         • Ротация account_token                • Лимит создания коротких ссылок
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │
                                     ▼
                     [ email-service.js (Коды 2FA) ]
                       • createEmailVerificationCode()
                       • verifyEmailCode() (6 цифр, TTL 15м)
                                     │
                                     ▼
                      [ SQLite База: data/hoshizune.db ]
```

---

## 🛠️ 2. Точные Команды Развертывания

### На локальном ПК (отправка изменений и бэкап):
```bash
# 1. Отправка в основной репозиторий GitHub
git add .
git commit -m "update: project changes"
git push origin main

# 2. Бэкап в отдельный репозиторий бэкапа (как раньше)
git push backup main
```

### На сервере (VPS) — если уже находитесь в папке репозитория:
```bash
git pull && node scripts/security-cleanup.js && npm run build && pm2 restart hoshizune-dev
```

По шагам:
```bash
git pull
node scripts/security-cleanup.js
npm run build
pm2 restart hoshizune-dev
```

---

## 📜 3. Журнал Выполненных Работ (Changelog)

### [2026-09-10] — Устранение 10 уязвимостей безопасности (Аудит 2026-08-21)
1. **[Critical] Защита PII и токенов (`/api/bio`)**:
   - Внедрен `toPublicProfile` со строгим allowlist полей.
   - Поля `userEmail` и `accountToken` исключены из публичной выдачи.
   - Выделена отдельная функция `getAllProfilesAdmin()` для панели управления.
2. **[Critical] Защита активации VIP-подписок (`/api/subscription/activate`)**:
   - Создан серверный каталог `SUBSCRIPTION_PLANS` (`vip_start` 30д, `vip_pro` 90д, `vip_lifetime` 3650д).
   - Клиент передает только `planId`. Прямая бесплатная активация возвращает HTTP 402.
3. **[High] Stored XSS через SVG-аватар (`/api/upload`)**:
   - Запрещен SVG и `image/svg+xml`.
   - Внедрена бинарная проверка Magic Bytes (JPEG, PNG, GIF, WebP, AVIF).
   - Добавлен парсер, блокирующий теги `<svg`, `<?xml`, `<script`, `xmlns`.
   - Настроена изолированная CSP для `/uploads/*`.
4. **[High] Защита сокращателя ссылок (`/api/shorten`)**:
   - Добавлена обязательная авторизация.
   - Внедрен блок-лист системных путей (`auth`, `admin`, `api`, `login`, `settings`, `s` и др.).
   - Внедрен фильтр целевых хостов (запрет `127.0.0.1`, `localhost`, `169.254.169.254`, `10.*`, `192.168.*`, `::1`).
   - Добавлен эндпоинт `DELETE /api/shorten` и лимит 10 ссылок/час.
5. **[High] Внедрение Rate Limiting (`lib/rate-limiter.js`)**:
   - Троттлинг на `/api/auth/login`: макс. 5 ошибок за 5 мин, затем блокировка на 10 мин + задержка против timing-атак.
   - Строгий Lockout на `/api/admin/auth`: макс. 5 попыток за 15 мин, затем блокировка на 15 мин (HTTP 429).
   - Лимит на повторную отправку кодов: 1 запрос в 60 сек.
6. **[Medium] Реализация Email-верификации**:
   - Регистрация с `is_verified = 0`.
   - Создан эндпоинт `POST /api/auth/verify-code` (6-значный код, лимит 5 попыток).
   - Удалена утечка `demoCode` из ответа `/api/auth/resend-code`.
   - Неподтвержденные аккаунты блокируются при входе.
7. **[Medium] Устранение энумерации**:
   - Регистрация возвращает нейтральный ответ о свободных email.
   - В `proxy.js` убран пропуск обычных пользователей к админке: неавторизованные запросы к `/api/admin/*` получают единый 404 «Маршрут не найден».
8. **[Medium] Настройка Security-заголовков**:
   - В `next.config.mjs` отключен заголовок `X-Powered-By: Next.js`.
   - Настроены CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.
9. **[Low] Защита от опасных URL-схем в профиле**:
   - `sanitizeLinks` отклоняет `javascript:`, `data:`, `file:`, `vbscript:`. Разрешены только `http:` и `https:`.
10. **[Low] Усиление паролей и закрытие `/settings`**:
    - Минимальная длина пароля — 8 символов + проверка по словарю простых паролей.
    - В `app/settings/page.jsx` добавлен серверный редирект на `/auth`.
11. **Очистка артефактов тестирования**:
    - Создан скрипт `scripts/security-cleanup.js`.
    - Ротированы все `account_token` пользователей.
    - Удалены тестовые аккаунты (`hoshizune_6f06`, `xss`, `matst`), тестовые подписки и тестовые короткие ссылки.
12. **[UI/UX Fix] Устранение мерцания анимированного WebP аватара**:
    - Замена `decoding="async"` на `decoding="sync"` в `ProfileRow.jsx` (устранение сброса кадрового буфера Chromium при 128 кадрах).
    - Удаление `transform: translateZ(0)` и `backfaceVisibility: hidden`, сбрасывавших GPU-слои при repaint.
    - Замена чёрного фона обёртки на `background: transparent`, добавление `contain: paint` и `isolation: isolate`.
    - Оборачивание `ProfileRow` в `React.memo` от холостых рендеров.
13. **[Critical Fix] Восстановление отображения аватарок (`next.config.mjs`)**:
    - Удалён ошибочный заголовок `Content-Security-Policy: default-src 'none'; sandbox;` с пути `/uploads/*`, из-за которого браузер блокировал показ загруженных аватаров в виде чёрного квадрата.
14. **[UI Fix] Исправление выпадающего меню доп. ролей и титулов (`BadgesContainer.jsx`, `globals.css`)**:
    - Меню переведено на абсолютное позиционирование `position: absolute; top: calc(100% + 6px); left: 0;`, привязанное прямо к бейджу `+N`, устранив улетание на край экрана.
    - В `globals.css` снят конфликтный `position: relative !important` со стиля `.liquid-glass-dropdown`.
15. **[Admin & Moderation Fix] Каскадное удаление аккаунтов и разблокировка прав модерации**:
    - Функция `deleteProfile` в `lib/bio-repository.js` переписана в атомарную транзакцию: каскадно удаляет пользователя из `users`, `user_emails`, `user_sessions`, `subscriptions`, `short_links`, `user_bans`, `comments`, `staff_members` и `profiles`. После перезагрузки удалённые аккаунты больше никогда не появляются.
    - В `app/api/admin/users/role/route.js` снят искусственный блок `role !== 'owner'`. Теперь любой авторизованный админ может выдавать и менять роли/титулы. Снята блокировка с кнопки `Управление ролями и титулами` в `ProfilesClient.jsx`.
    - В `app/api/admin/users/bans/route.js` и `lib/admin-auth.js` исправлена проверка полномочий: сессия администратора теперь имеет полный доступ к банам/разбанам и модерации любых не-владельцев.
    - В `scripts/security-cleanup.js` убраны алиасы Next.js, скрипт гарантированно отрабатывает в чистом Node.js на сервере.

---

### [Предыдущие этапы разработки]
- **Оптимизация аватаров:** клиентское сжатие картинок в WebP 2048px, сохранение циклов анимаций GIF/WebP (ANIM/ANMF чанки), single-pass multipart чтение.
- **Инфраструктура Next.js 16:** миграция с `middleware.js` на `proxy.js`, автоудаление устаревшего middleware в сборке.
- **Админ-панель:** IP-вайтлист в `admin-config.json`, управление профилями, подписками, ролями, сессиями и аналитикой.
- **Система ролей и бейджей:** строгая иерархия (Owner > Admin > Support > User), косметические титулы и бейджи.
- **Телеметрия:** сбор IP, OS, браузера, устройства и heartbeat авто-онлайн статуса.

---

## 🚀 4. Будущие Наработки (Roadmap)

- [ ] **Реальный платёжный шлюз (ЮKassa / CryptoCloud / Tinkoff)**:
  - Создание вебхука `/api/subscription/webhook` с криптографической проверкой подписи.
  - Автоматический перевод подписки в статус `active` после успешной оплаты.
- [ ] **Интеграция боевого SMTP (Resend / Mailgun / Yandex)**:
  - Подключение отправки реальных email-сообщений через Nodemailer / Resend API для доставки 6-значных кодов верификации.
- [ ] **Музыкальный Bio-виджет и аудиоплеер**:
  - Фоновое воспроизведение треков в профилях пользователей с кастомным неоновым эквалайзером.
- [ ] **Двухфакторная аутентификация (2FA / TOTP)**:
  - Генерация QR-кодов для Google Authenticator / Aegis для аккаунтов администраторов и владельца.
- [ ] **Расширенная аналитика коротких ссылок**:
  - Географическое распределение кликов, графики по устройствам и реферерам в личном кабинете.
