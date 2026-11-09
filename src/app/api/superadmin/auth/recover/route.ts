import { NextRequest, NextResponse } from 'next/server';
import { SUPERADMIN_EMAIL, SUPERADMIN_RECOVERY_EMAIL, sendSuperAdminRecoveryEmail } from '@/lib/superadmin-service';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (email !== SUPERADMIN_EMAIL) {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    // 1. Send Supabase Auth password reset email
    try {
      await supabase.auth.resetPasswordForEmail(SUPERADMIN_EMAIL, {
        redirectTo: 'https://www.dutyflow.in/reset-password',
      });
    } catch (_) {}

    // 2. Dispatch notification to recovery email
    await sendSuperAdminRecoveryEmail();

    return NextResponse.json({
      success: true,
      message: `Password recovery instructions have been dispatched to ${SUPERADMIN_EMAIL} and security notification delivered to ${SUPERADMIN_RECOVERY_EMAIL}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error processing recovery.' }, { status: 500 });
  }
}

