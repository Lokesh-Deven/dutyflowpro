import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = (body.userId || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const institutionName = (body.institutionName || '').trim() || 'Institution';

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    // 1. Try RPC function register_pending_institution
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('register_pending_institution', {
        p_user_id: userId,
        p_email: email,
        p_institution_name: institutionName,
      });

      if (!rpcErr && rpcData?.success) {
        return NextResponse.json({ success: true, method: 'rpc', data: rpcData });
      }
    } catch (_) {}

    // 2. Direct table upsert with full columns
    const now = new Date().toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const fullRow: any = {
      id: userId,
      institution_id: userId,
      institution_code: '', // Pending approval
      email,
      institution_name: institutionName,
      approval_status: 'pending',
      subscription_status: 'Free Access',
      subscription_start_date: now,
      subscription_end_date: endDate,
      download_count: 0,
      created_at: now,
      updated_at: now,
    };

    let { error: insertErr } = await supabase.from('profiles').upsert(fullRow, { onConflict: 'id' });

    // 3. Fallback: If newer columns don't exist yet on profiles table, retry with standard columns
    if (insertErr) {
      const basicRow: any = {
        id: userId,
        email,
        institution_name: institutionName,
        subscription_status: 'Free Access',
        download_count: 0,
        created_at: now,
        updated_at: now,
      };
      const retry = await supabase.from('profiles').upsert(basicRow, { onConflict: 'id' });
      if (retry.error) {
        console.warn('Fallback profile insert warning:', retry.error.message || retry.error);
        return NextResponse.json({ success: false, error: retry.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, method: 'table_upsert' });
  } catch (err: any) {
    console.error('Error in register-pending-profile API:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
