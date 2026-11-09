import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  SUPERADMIN_EMAIL,
  generateSixDigitOtp,
  hashValue,
  sendSuperAdminOtpEmail,
  storeOtpInMemory,
} from '@/lib/superadmin-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (email !== SUPERADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Access Denied.' },
        { status: 403 }
      );
    }

    const otp = generateSixDigitOtp();
    const otpHash = await hashValue(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    storeOtpInMemory(SUPERADMIN_EMAIL, otpHash);

    try {
      await supabase.from('super_admin_otps').insert({
        email: SUPERADMIN_EMAIL,
        otp_hash: otpHash,
        expires_at: expiresAt,
      });
    } catch (e) {
      console.warn('Warning inserting OTP to DB (in-memory OTP active):', e);
    }

    const res = await sendSuperAdminOtpEmail(otp);
    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Failed to dispatch code.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${SUPERADMIN_EMAIL}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error resending code.' }, { status: 500 });
  }
}

