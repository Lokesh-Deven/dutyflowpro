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
    const password = (body.password || '').trim();

    // 1. Strict identity check
    if (email !== SUPERADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Access Denied: This portal is exclusively for the authorized Super Administrator.' },
        { status: 403 }
      );
    }

    if (!password) {
      return NextResponse.json({ error: 'Please enter your Super Admin password.' }, { status: 400 });
    }

    // 2. Authenticate against Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const msg = authError?.message || '';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        return NextResponse.json(
          { error: 'Invalid Super Admin password. Please check your password and try again.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: msg || 'Invalid Super Admin credentials.' },
        { status: 401 }
      );
    }

    // 3. Generate 6-digit 2FA OTP
    const otp = generateSixDigitOtp();
    const otpHash = await hashValue(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 4. Store OTP in database & in-memory cache for resilient verification
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

    // 5. Send OTP to Super Admin email via SendGrid
    const emailResult = await sendSuperAdminOtpEmail(otp);
    if (!emailResult.success) {
      console.warn('SendGrid OTP delivery warning:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      step: '2fa_required',
      email: SUPERADMIN_EMAIL,
      message: `A 6-digit security verification code has been sent to ${SUPERADMIN_EMAIL}.`,
    });
  } catch (err: any) {
    console.error('Super Admin Login Error:', err);
    return NextResponse.json(
      { error: err?.message || 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}

