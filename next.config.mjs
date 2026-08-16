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
};

export default nextConfig;
