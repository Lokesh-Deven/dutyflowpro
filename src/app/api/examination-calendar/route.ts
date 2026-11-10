import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ExaminationScheduleItem } from '@/lib/examination-calendar-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = (searchParams.get('institutionId') || '').trim();
    const institutionCode = (searchParams.get('institutionCode') || '').trim();
    const role = (searchParams.get('role') || 'admin').trim().toLowerCase();

    if (!institutionId && !institutionCode) {
      return NextResponse.json({ success: true, data: [] }, { headers: NO_CACHE_HEADERS });
    }

    let query = supabase.from('examination_calendar').select('*');

    if (institutionId && institutionCode) {
      query = query.or(`institution_id.eq.${institutionId},institution_code.eq.${institutionCode}`);
    } else if (institutionId) {
      query = query.eq('institution_id', institutionId);
    } else if (institutionCode) {
      query = query.eq('institution_code', institutionCode);
    }

    // Students only see published dates (tentative or final)
    if (role === 'student') {
      query = query.in('publication_status', ['tentative_published', 'final_published']);
    }

    query = query.order('slot_number', { ascending: true });

    const { data, error } = await query;

    if (error) {
      // Table might not exist yet before SQL migration is executed
      console.warn('Note: examination_calendar query notice:', error.message);
      return NextResponse.json({ success: true, data: [], note: error.message }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, data: data || [] }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error fetching examination calendar:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const institutionId = (body.institutionId || '').trim();
    const institutionCode = (body.institutionCode || '').trim();
    const items: ExaminationScheduleItem[] = body.items || [];

    if (!institutionId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing institutionId or examination items' }, { status: 400 });
    }

    const rows = items.map((item) => ({
      institution_id: institutionId,
      institution_code: institutionCode || item.institution_code || null,
      slot_number: item.slot_number,
      exam_name: item.exam_name || `Examination ${item.slot_number}`,
      start_date: item.start_date ? item.start_date : null,
      end_date: item.end_date ? item.end_date : null,
      total_marks: item.total_marks ? parseInt(String(item.total_marks), 10) : null,
      date_type: item.date_type || 'tentative',
      publication_status: item.publication_status || 'draft',
      tentative_start_date: item.tentative_start_date || null,
      tentative_end_date: item.tentative_end_date || null,
      published_at: item.published_at || null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('examination_calendar')
      .upsert(rows, { onConflict: 'institution_id, slot_number' });

    // Targeted deletion when a specific slot is explicitly removed by the user
    if (body.deletedSlotNumber) {
      try {
        await supabase
          .from('examination_calendar')
          .delete()
          .eq('institution_id', institutionId)
          .eq('slot_number', body.deletedSlotNumber);
      } catch (_) {}
    }

    if (error) {
      console.warn('Supabase examination_calendar upsert warning:', error.message);
      return NextResponse.json({ success: true, count: rows.length, warning: error.message });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err: any) {
    console.error('Error saving examination calendar:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
