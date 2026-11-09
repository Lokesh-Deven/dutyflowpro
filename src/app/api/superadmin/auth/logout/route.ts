import { NextResponse } from 'next/server';
import { SUPERADMIN_COOKIE_NAME } from '@/lib/superadmin-service';

export async function POST() {
  const response = NextResponse.json({ success: true, redirectUrl: '/superadmin' });
  response.cookies.delete(SUPERADMIN_COOKIE_NAME);
  return response;
}

