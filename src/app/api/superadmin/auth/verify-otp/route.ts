import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  SUPERADMIN_EMAIL,
  SUPERADMIN_COOKIE_NAME,
  hashValue,
  createSuperAdminToken,
  verifyOtpFromMemory,
} from '@/lib/superadmin-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();

    if (email !== SUPERADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Access Denied: Unauthorized email address.' },
        { status: 403 }
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit verification code.' },
        { status: 400 }
      );
    }

    const inputHash = await hashValue(otp);
    const nowIso = new Date().toISOString();

    // 1. Verify against super_admin_otps table
    const { data: records, error: fetchErr } = await supabase
      .from('super_admin_otps')
      .select('id, otp_hash, expires_at')
      .eq('email', SUPERADMIN_EMAIL)
      .gte('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(5);

    let isValid = false;
    let matchingId: string | null = null;

    if (!fetchErr && records && records.length > 0) {
      for (const rec of records) {
        if (rec.otp_hash === inputHash) {
          isValid = true;
          matchingId = rec.id;
          break;
        }
      }
    }

    // Fallback: Check in-memory OTP cache
    if (!isValid && verifyOtpFromMemory(SUPERADMIN_EMAIL, inputHash)) {
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please check your email or request a new code.' },
        { status: 401 }
      );
    }

    // Clean up verified OTP
    if (matchingId) {
      await supabase.from('super_admin_otps').delete().eq('id', matchingId);
    }

    // 2. Generate signed Super Admin session token
    const token = await createSuperAdminToken();

    const response = NextResponse.json({
      success: true,
      email: SUPERADMIN_EMAIL,
      redirectUrl: '/superadmin/dashboard',
    });

    // 3. Set secure HTTP-only cookie
    response.cookies.set({
      name: SUPERADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (err: any) {
    console.error('Super Admin OTP Verification Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to verify 2FA code.' },
      { status: 500 }
    );
  }
}

