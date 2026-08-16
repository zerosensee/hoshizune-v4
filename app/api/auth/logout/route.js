/**
 * API: Выход из аккаунта.
 * POST /api/auth/logout
 */
import { NextResponse } from 'next/server';
import { clearUserSessionCookie } from '@/lib/user-auth';

export async function POST() {
  await clearUserSessionCookie();
  return NextResponse.json({ success: true });
}
