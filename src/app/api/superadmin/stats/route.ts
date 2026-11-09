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

    // 2. Direct query fallback with column resilience
    let profiles: any[] = [];
    const fullQuery = await supabase
      .from('profiles')
      .select('id, approval_status, institution_code');

    if (!fullQuery.error && fullQuery.data) {
      profiles = fullQuery.data;
    } else {
      const basicQuery = await supabase.from('profiles').select('id');
      if (basicQuery.data) {
        profiles = basicQuery.data.map((p) => ({
          id: p.id,
          approval_status: 'pending',
          institution_code: '',
        }));
      }
    }

    // Check registry
    const { data: registry } = await supabase.from('institution_code_registry').select('institution_id, institution_code');
    const registeredIds = new Set((registry || []).map((r) => r.institution_id).filter(Boolean));

    const filtered = profiles.filter((p) => p.id !== 'guest-session');
    const total = filtered.length;
    const approved = filtered.filter(
      (p) => p.approval_status === 'approved' || registeredIds.has(p.id) || (p.institution_code && p.approval_status !== 'suspended' && p.approval_status !== 'rejected')
    ).length;
    const suspended = filtered.filter((p) => p.approval_status === 'suspended').length;
    const rejected = filtered.filter((p) => p.approval_status === 'rejected').length;
    const pending = Math.max(0, total - approved - suspended - rejected);

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
    console.error('Error in stats route:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch stats.' }, { status: 500 });
  }
}
