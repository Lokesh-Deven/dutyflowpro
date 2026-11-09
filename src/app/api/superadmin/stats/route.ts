import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  SUPERADMIN_COOKIE_NAME,
  SUPERADMIN_EMAIL,
  verifySuperAdminToken,
} from '@/lib/superadmin-service';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SUPERADMIN_COOKIE_NAME)?.value;
    const isValid = await verifySuperAdminToken(token);

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin session required.' }, { status: 401 });
    }

    // 1. Try RPC get_superadmin_stats first
    try {
      const { data, error } = await supabase.rpc('get_superadmin_stats', {
        p_admin_email: SUPERADMIN_EMAIL,
      });

      if (!error && data) {
        return NextResponse.json({ success: true, stats: data });
      }
    } catch (_) {}

    // 2. Direct query fallback
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, approval_status, institution_code');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (profiles || []).filter((p) => p.id !== 'guest-session');
    const total = filtered.length;
    const pending = filtered.filter((p) => p.approval_status === 'pending' || (!p.approval_status && !p.institution_code)).length;
    const approved = filtered.filter((p) => p.approval_status === 'approved' || (p.institution_code && p.approval_status !== 'suspended' && p.approval_status !== 'rejected')).length;
    const suspended = filtered.filter((p) => p.approval_status === 'suspended').length;

    return NextResponse.json({
      success: true,
      stats: {
        total_institutions: total,
        pending_approvals: pending,
        approved_institutions: approved,
        suspended_institutions: suspended,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch stats.' }, { status: 500 });
  }
}

