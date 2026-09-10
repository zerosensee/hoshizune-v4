import fs from 'fs';
import path from 'path';

// Автоматическое удаление устаревшего middleware.js для устранения конфликта в Next.js 16
const deprecatedMiddlewarePath = path.join(process.cwd(), 'middleware.js');
if (fs.existsSync(deprecatedMiddlewarePath)) {
  try {
    fs.unlinkSync(deprecatedMiddlewarePath);
  } catch {
    // Игнорируем ошибки доступа
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  allowedDevOrigins: ['127.0.0.1', 'localhost', '198.18.0.1'],

  // Скрытие заголовка X-Powered-By: Next.js
  poweredByHeader: false,

  // Комплексный набор Security-заголовков
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; sandbox;",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              "media-src 'self' data: blob: https:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
