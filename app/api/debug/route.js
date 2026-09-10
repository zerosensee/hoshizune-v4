import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import os from 'os';
import { execSync } from 'child_process';

/**
 * GET /api/debug
 * Предоставляет диагностическую информацию о состоянии сервера и базы данных.
 */
export async function GET() {
  const db = getDatabase();
  const report = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    serverTime: Date.now(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsageMB: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    gitCommit: 'unknown',
    database: {
      connected: false,
      integrity: 'unknown',
      counts: {},
    },
  };

  // 1. Git Commit Hash
  try {
    report.gitCommit = execSync('git rev-parse --short HEAD', { timeout: 1000 }).toString().trim();
  } catch {
    report.gitCommit = 'git-unavailable';
  }

  // 2. Database Checks
  try {
    const integrity = db.prepare('PRAGMA integrity_check').get();
    report.database.connected = true;
    report.database.integrity = integrity?.integrity_check || 'ok';

    const countUsers = db.prepare('SELECT COUNT(*) as c FROM users').get()?.c || 0;
    const countProfiles = db.prepare('SELECT COUNT(*) as c FROM profiles').get()?.c || 0;
    const countBans = db.prepare('SELECT COUNT(*) as c FROM user_bans WHERE is_active = 1').get()?.c || 0;
    const countSubs = db.prepare('SELECT COUNT(*) as c FROM subscriptions').get()?.c || 0;

    report.database.counts = {
      users: countUsers,
      profiles: countProfiles,
      activeBans: countBans,
      subscriptions: countSubs,
    };
  } catch (err) {
    report.database.error = err.message;
  }

  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
