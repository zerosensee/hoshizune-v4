/**
 * API аналитики для администратора.
 * GET /api/admin/analytics — агрегированная статистика.
 */
import { NextResponse } from 'next/server';
import {
  isAdminAuthorized,
  unauthorizedResponse,
} from '@/lib/admin-auth';
import {
  getGlobalStats,
  getGlobalViewsByDay,
  getViewStats,
  getUniqueViews,
  getTotalViews,
  getTopReferrers,
} from '@/lib/analytics-repository';

/**
 * GET /api/admin/analytics
 * Query params:
 *  - profileId?: string  — если указан, возвращает статистику профиля
 *  - days?: number       — период в днях (по умолчанию 7)
 */
export async function GET(request) {
  if (!(await isAdminAuthorized())) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');
  const days = parseInt(searchParams.get('days') || '7', 10);

  if (profileId) {
    const stats = {
      byDay: getViewStats(profileId, days),
      totalViews: getTotalViews(profileId),
      uniqueViews: getUniqueViews(profileId, days),
      topReferrers: getTopReferrers(profileId, 10),
    };
    return NextResponse.json(stats);
  }

  const global = getGlobalStats(days);
  const byDay = getGlobalViewsByDay(days);

  return NextResponse.json({ ...global, byDay });
}
