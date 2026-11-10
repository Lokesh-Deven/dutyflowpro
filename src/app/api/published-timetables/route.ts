import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ExaminationTimetable, PublishedTimetableRecord } from '@/lib/examination-timetable-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function computeDateRange(rows: any[]): string {
  if (!Array.isArray(rows) || rows.length === 0) return 'No dates scheduled';
  const validDates = rows.filter((r) => Boolean(r.date)).sort((a, b) => a.date.localeCompare(b.date));
  if (validDates.length === 0) return 'No dates scheduled';
  if (validDates.length === 1) return validDates[0].displayDate || validDates[0].date;
  const first = validDates[0].displayDate || validDates[0].date;
  const last = validDates[validDates.length - 1].displayDate || validDates[validDates.length - 1].date;
  return `${first} – ${last}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = (searchParams.get('institutionId') || '').trim();
    const institutionCode = (searchParams.get('institutionCode') || '').trim();

    if (!institutionId && !institutionCode) {
      return NextResponse.json({ success: true, timetables: [] }, { headers: NO_CACHE_HEADERS });
    }

    let query = supabase.from('published_timetables').select('*');

    if (institutionId && institutionCode) {
      query = query.or(`institution_id.eq.${institutionId},institution_code.eq.${institutionCode}`);
    } else if (institutionId) {
      query = query.eq('institution_id', institutionId);
    } else if (institutionCode) {
      query = query.eq('institution_code', institutionCode);
    }

    query = query.order('published_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.warn('published_timetables query note:', error.message);
      return NextResponse.json({ success: true, timetables: [], note: error.message }, { headers: NO_CACHE_HEADERS });
    }

    const formatted: PublishedTimetableRecord[] = (data || []).map((row: any) => {
      const tt: ExaminationTimetable = row.timetable_data;
      const rows = tt?.rows || [];
      const totalDays = rows.filter((r) => r.subjects && r.subjects.length > 0).length;
      const totalSubjects = rows.reduce((acc, r) => acc + (r.subjects ? r.subjects.length : 0), 0);
      const classesCount = tt?.classes?.length || 0;

      return {
        id: row.id,
        institutionId: row.institution_id,
        institutionCode: row.institution_code,
        institutionName: row.institution_name,
        examinationName: row.examination_name,
        timetable: tt,
        dateRange: computeDateRange(rows),
        totalDays,
        totalSubjects,
        classesCount,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
      };
    });

    return NextResponse.json({ success: true, timetables: formatted }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in published-timetables GET:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const timetable: ExaminationTimetable = body.timetable;
    const institutionId = (body.institutionId || '').trim();
    const institutionCode = (body.institutionCode || '').trim();
    const institutionName = (body.institutionName || timetable?.institutionName || 'Institution').trim();

    if (!timetable || !timetable.id || !institutionId) {
      return NextResponse.json(
        { success: false, error: 'Missing timetable or institution identification' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const now = new Date().toISOString();
    const publishedTimetable: ExaminationTimetable = {
      ...timetable,
      isPublished: true,
      publishedAt: now,
      updatedAt: now,
    };

    const payload = {
      id: timetable.id,
      institution_id: institutionId,
      institution_code: institutionCode || null,
      institution_name: institutionName,
      examination_name: timetable.examinationName || 'Examination Timetable',
      timetable_data: publishedTimetable,
      published_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('published_timetables')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase published_timetables upsert note:', error.message);
      return NextResponse.json(
        { success: true, timetable: publishedTimetable, warning: error.message },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, timetable: publishedTimetable },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error in published-timetables POST:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get('id') || '').trim();
    const institutionId = (searchParams.get('institutionId') || '').trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing timetable id' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    let query = supabase.from('published_timetables').delete().eq('id', id);
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { error } = await query;
    if (error) {
      console.warn('Error deleting published timetable:', error.message);
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in published-timetables DELETE:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

