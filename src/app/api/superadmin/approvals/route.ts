import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  SUPERADMIN_COOKIE_NAME,
  SUPERADMIN_EMAIL,
  verifySuperAdminToken,
  sendInstitutionApprovedEmail,
  sendInstitutionRejectedEmail,
} from '@/lib/superadmin-service';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SUPERADMIN_COOKIE_NAME)?.value;
    const isValid = await verifySuperAdminToken(token);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    let query = supabase
      .from('profiles')
      .select('id, institution_id, institution_code, institution_name, email, approval_status, approved_at, approved_by, rejection_reason, created_at, updated_at, subscription_status')
      .neq('id', 'guest-session')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('approval_status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error fetching registrations.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SUPERADMIN_COOKIE_NAME)?.value;
    const isValid = await verifySuperAdminToken(token);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin session required.' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action as 'approve' | 'reject' | 'suspend' | 'reactivate';
    const institutionId = body.institutionId;
    const reason = body.reason;

    if (!institutionId) {
      return NextResponse.json({ error: 'Missing institutionId.' }, { status: 400 });
    }

    // 1. APPROVE ACTION
    if (action === 'approve') {
      let assignedCode = '';
      let collegeName = 'Institution';
      let adminEmail = '';

      // Try RPC first
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('approve_institution', {
          p_institution_id: institutionId,
          p_admin_email: SUPERADMIN_EMAIL,
        });

        if (!rpcErr && rpcData && rpcData.success) {
          assignedCode = rpcData.institution_code;
          collegeName = rpcData.institution_name;
          adminEmail = rpcData.institution_email;
        }
      } catch (_) {}

      // Fallback if RPC not yet created
      if (!assignedCode) {
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id, email, institution_name, institution_code')
          .eq('id', institutionId)
          .single();

        if (profErr || !prof) {
          return NextResponse.json({ error: 'Institution profile not found.' }, { status: 404 });
        }

        adminEmail = (prof.email || '').trim().toLowerCase();
        collegeName = prof.institution_name || 'Institution';

        // Check reinstatement rule
        const { data: existingReg } = await supabase
          .from('institution_code_registry')
          .select('institution_code')
          .eq('institution_email', adminEmail)
          .maybeSingle();

        if (existingReg?.institution_code) {
          assignedCode = existingReg.institution_code;
          await supabase
            .from('institution_code_registry')
            .update({ institution_id: institutionId, institution_name: collegeName, updated_at: new Date().toISOString() })
            .eq('institution_code', assignedCode);
        } else {
          // Allocate next sequential 3-digit code
          const { data: rows } = await supabase
            .from('institution_code_registry')
            .select('institution_code')
            .order('institution_code', { ascending: false })
            .limit(20);

          let maxNum = 0;
          if (rows) {
            for (const r of rows) {
              const n = parseInt(r.institution_code, 10);
              if (!isNaN(n) && n > maxNum) maxNum = n;
            }
          }
          assignedCode = String(maxNum + 1).padStart(3, '0');

          await supabase.from('institution_code_registry').insert({
            institution_code: assignedCode,
            institution_name: collegeName,
            institution_email: adminEmail,
            institution_id: institutionId,
          });
        }

        // Update profile
        await supabase
          .from('profiles')
          .update({
            approval_status: 'approved',
            institution_code: assignedCode,
            institution_id: institutionId,
            approved_by: SUPERADMIN_EMAIL,
            approved_at: new Date().toISOString(),
            rejection_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', institutionId);
      }

      // Notify Institution Administrator via SendGrid
      if (adminEmail && assignedCode) {
        sendInstitutionApprovedEmail(adminEmail, collegeName, assignedCode).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        institution_code: assignedCode,
        message: `Institution successfully approved with Institution Code: ${assignedCode}`,
      });
    }

    // 2. REJECT ACTION
    if (action === 'reject') {
      const cleanReason = (reason || '').trim() || 'Institution registration rejected by administrator.';

      try {
        await supabase.rpc('reject_institution', {
          p_institution_id: institutionId,
          p_admin_email: SUPERADMIN_EMAIL,
          p_reason: cleanReason,
        });
      } catch (_) {
        await supabase
          .from('profiles')
          .update({
            approval_status: 'rejected',
            rejection_reason: cleanReason,
            approved_by: SUPERADMIN_EMAIL,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', institutionId);
      }

      // Fetch profile to dispatch rejection email
      const { data: prof } = await supabase
        .from('profiles')
        .select('email, institution_name')
        .eq('id', institutionId)
        .maybeSingle();

      if (prof?.email) {
        sendInstitutionRejectedEmail(prof.email, prof.institution_name || 'Institution', cleanReason).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: 'Institution registration rejected.',
      });
    }

    // 3. SUSPEND ACTION
    if (action === 'suspend') {
      const cleanReason = (reason || '').trim() || 'Operations suspended by Super Admin.';
      await supabase
        .from('profiles')
        .update({
          approval_status: 'suspended',
          rejection_reason: cleanReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', institutionId);

      return NextResponse.json({
        success: true,
        action: 'suspended',
        message: 'Institution operations suspended.',
      });
    }

    // 4. REACTIVATE ACTION
    if (action === 'reactivate') {
      await supabase
        .from('profiles')
        .update({
          approval_status: 'approved',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', institutionId);

      return NextResponse.json({
        success: true,
        action: 'reactivated',
        message: 'Institution reactivated successfully.',
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Super Admin Approval Error:', err);
    return NextResponse.json({ error: err?.message || 'Error processing request.' }, { status: 500 });
  }
}

