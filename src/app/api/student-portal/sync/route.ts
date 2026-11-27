import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StudentExaminationDetail } from '@/lib/student-portal-types';
import { StudentRecord, StudentSubject, SeatingAllocationRecord } from '@/lib/student-seating-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function formatExamDate(dateStr: string): { formatted: string; day: string } {
  if (!dateStr) return { formatted: 'Date TBA', day: '' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { formatted: dateStr, day: '' };
    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
    const formatted = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return { formatted, day };
  } catch (_) {
    return { formatted: dateStr, day: '' };
  }
}

function formatPosition(pos: string | undefined): 'Left' | 'Center' | 'Right' | 'Side A' | 'Side B' | 'Unassigned' {
  if (!pos) return 'Unassigned';
  const p = pos.toUpperCase();
  if (p === 'SIDE_A' || p === 'SIDE A' || p === 'LEFT' || p === 'L') return 'Side A';
  if (p === 'SIDE_B' || p === 'SIDE B' || p === 'RIGHT' || p === 'R') return 'Side B';
  if (p === 'CENTER' || p === 'C' || p === 'MIDDLE' || p === 'M') return 'Center';
  return 'Unassigned';
}

function normalizeStudentRoll(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).trim().replace(/\s+/g, '').toLowerCase();
}

function matchStudentRoll(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const normA = normalizeStudentRoll(a);
  const normB = normalizeStudentRoll(b);
  if (normA === normB) return true;
  const cleanA = normA.replace(/[-_.]/g, '');
  const cleanB = normB.replace(/[-_.]/g, '');
  return cleanA === cleanB;
}

function getStudentRecordRoll(student: any): string {
  if (!student) return '';
  return String(
    student.rollNo ||
    student.rollNumber ||
    student.registerNumber ||
    student.regNo ||
    student.id ||
    ''
  ).trim();
}

/**
 * Builds StudentExaminationDetail array for a given student from raw seating allocations.
 * STRICT VISIBILITY RULE: Only allocations marked as Published (isPublished: true) are shown to students.
 */
function extractStudentExaminations(
  allocations: SeatingAllocationRecord[],
  targetRoll: string,
  matchedStudent?: StudentRecord,
  matchedSubject?: StudentSubject
): StudentExaminationDetail[] {
  const cleanRoll = targetRoll.trim();
  const results: StudentExaminationDetail[] = [];
  const seenKeys = new Set<string>();
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const alloc of allocations) {
    const isPub = alloc.isPublished === true || alloc.status === 'Published';
    if (!alloc || !isPub || !Array.isArray(alloc.roomPlans)) continue;

    const examName = alloc.examination?.examName || alloc.name || 'Examination';
    const examDate = alloc.examination?.date || '';
    const startTime = alloc.examination?.startTime || '';
    const endTime = alloc.examination?.endTime || '';
    const timeSlot = startTime && endTime ? `${startTime} – ${endTime}` : startTime || 'Session TBA';
    const { formatted: formattedDate, day: dayOfWeek } = formatExamDate(examDate);

    for (const roomPlan of alloc.roomPlans) {
      if (!roomPlan || !Array.isArray(roomPlan.benches)) continue;

      for (const bench of roomPlan.benches) {
        const seats = bench.seats || (bench as any).positions || [];
        if (!Array.isArray(seats)) continue;

        for (const seat of seats) {
          if (!seat || !seat.student) continue;

          const sStudent = seat.student;
          const sRoll = getStudentRecordRoll(sStudent);
          if (matchStudentRoll(sRoll, cleanRoll)) {
            const subjectName = seat.subjectName || (matchedSubject ? matchedSubject.name : 'General Subject');
            const dedupeKey = `${alloc.id}-${roomPlan.roomId || roomPlan.roomNo}-${bench.benchNumber}-${seat.position}`.toLowerCase();

            if (!seenKeys.has(dedupeKey)) {
              seenKeys.add(dedupeKey);
              const isToday = examDate === todayStr;
              const isUpcoming = examDate >= todayStr;
              const isPast = examDate < todayStr && !isToday;
              const benchLabel = bench.rowLabel || `${bench.side === 'LEFT' ? 'L' : bench.side === 'MIDDLE' ? 'M' : 'R'}${bench.benchNumber}`;

              results.push({
                id: `exam-${alloc.id}-${roomPlan.roomId || roomPlan.roomNo}-${bench.benchNumber}-${seat.position}`,
                examId: alloc.id,
                examName,
                date: examDate,
                formattedDate,
                dayOfWeek,
                startTime,
                endTime,
                timeSlot,
                subjectId: sStudent.subjectId || seat.subjectId || matchedSubject?.id || '',
                subjectName,
                subjectCode: sStudent.section || matchedSubject?.code || '',
                courseStream: sStudent.section ? `Section ${sStudent.section}` : 'Standard Stream',
                section: sStudent.section || matchedStudent?.section || 'A',
                studentName: sStudent.name || matchedStudent?.name || 'Student',
                registerNumber: sStudent.rollNo || targetRoll,
                roomNo: String(roomPlan.roomNo),
                roomId: roomPlan.roomId,
                benchNumber: benchLabel,
                benchSide: bench.side,
                position: formatPosition(seat.position),
                positionSlot: seat.position,
                rowLabel: bench.rowLabel || (bench.rowNumber ? `Row ${bench.rowNumber}` : undefined),
                isToday,
                isUpcoming,
                isPast,
                status: 'Confirmed',
              });
            }
          }
        }
      }
    }
  }

  // Sort: Today first, then Confirmed, then Upcoming by date
  results.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    if (a.status === 'Confirmed' && b.status !== 'Confirmed') return -1;
    if (a.status !== 'Confirmed' && b.status === 'Confirmed') return 1;
    if (a.isUpcoming && !b.isUpcoming) return -1;
    if (!a.isUpcoming && b.isUpcoming) return 1;
    if (a.date && b.date) return a.date.localeCompare(b.date);
    return 0;
  });

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionCode = (searchParams.get('institutionCode') || '').trim();
    const institutionIdParam = (searchParams.get('institutionId') || '').trim();
    const registerNumber = (searchParams.get('registerNumber') || '').trim();

    if (!institutionCode && !institutionIdParam) {
      return NextResponse.json(
        { success: false, error: 'Institution code or id is required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    let institutionId: string = institutionIdParam;
    let resolvedCode: string = institutionCode;
    let institutionName: string = 'Institution';
    let calendarSchedules: any[] = [];
    let publishedTimetables: any[] = [];
    let workspace: any = null;
    let allocations: SeatingAllocationRecord[] = [];

    // Step 1: Attempt fast RPC sync
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_student_portal_sync_data', {
        p_institution_code: institutionCode || '',
        p_institution_id: institutionIdParam || null,
      });

      if (!rpcErr && rpcData && rpcData.success) {
        institutionId = rpcData.institutionId;
        resolvedCode = rpcData.institutionCode;
        institutionName = rpcData.institutionName;
        calendarSchedules = rpcData.calendar || [];
        workspace = rpcData.workspace;
        allocations = rpcData.allocations || [];
      }
    } catch (_) {}

    // Step 2: Fallback to direct queries if RPC was not available or empty
    if (!workspace && !allocations.length) {
      // 2a. Resolve institution info
      if (!institutionId && resolvedCode) {
        const cleanFormatted = resolvedCode.padStart(3, '0');
        const { data: regData } = await supabase
          .from('institution_code_registry')
          .select('institution_id, institution_code, institution_name')
          .eq('institution_code', cleanFormatted)
          .maybeSingle();

        if (regData?.institution_id) {
          institutionId = regData.institution_id;
          resolvedCode = regData.institution_code;
          institutionName = regData.institution_name || 'Institution';
        } else {
          const { data: profData } = await supabase
            .from('profiles')
            .select('id, institution_code, institution_name')
            .eq('institution_code', cleanFormatted)
            .maybeSingle();

          if (profData?.id) {
            institutionId = profData.id;
            resolvedCode = profData.institution_code || cleanFormatted;
            institutionName = profData.institution_name || 'Institution';
          }
        }
      }

      if (institutionId) {
        // 2b. Fetch published calendar
        const { data: calData } = await supabase
          .from('examination_calendar')
          .select('*')
          .or(`institution_id.eq.${institutionId},institution_code.eq.${resolvedCode}`)
          .in('publication_status', ['tentative_published', 'final_published'])
          .order('slot_number', { ascending: true });

        if (calData) calendarSchedules = calData;

        // 2d. Fetch workspace & allocations from saved_allotments
        const { data: allotmentsData } = await supabase
          .from('saved_allotments')
          .select('*')
          .or(`user_id.eq.${institutionId},institution_id.eq.${institutionId}`)
          .order('created_at', { ascending: false });

        if (allotmentsData && Array.isArray(allotmentsData)) {
          for (const row of allotmentsData) {
            if (row.id === `dutyflow_workspace_${institutionId}` && row.assignments?.workspace) {
              workspace = row.assignments.workspace;
            } else if (
              row.assignments?._record_type === 'SeatingAllocation' ||
              row.assignments?.seatingAllocation ||
              (row.id && String(row.id).startsWith('alloc-'))
            ) {
              const alloc = row.assignments?.seatingAllocation || row;
              if (alloc && alloc.id) {
                if (row.status === 'Published' || alloc.status === 'Published' || alloc.isPublished) {
                  alloc.status = 'Published';
                  alloc.isPublished = true;
                }
                allocations.push(alloc);
              }
            }
          }
        }
      }
    }

    // Step 2.5: Always fetch published examination timetables for this institution
    if (institutionId || resolvedCode) {
      try {
        let query = supabase
          .from('published_timetables')
          .select('*')
          .order('published_at', { ascending: false });

        if (institutionId && resolvedCode) {
          query = query.or(`institution_id.eq.${institutionId},institution_code.eq.${resolvedCode}`);
        } else if (institutionId) {
          query = query.eq('institution_id', institutionId);
        } else if (resolvedCode) {
          query = query.eq('institution_code', resolvedCode);
        }

        const { data: ptData } = await query;
        if (ptData && Array.isArray(ptData)) {
          publishedTimetables = ptData.map((row: any) => ({
            id: row.id,
            institutionId: row.institution_id,
            institutionCode: row.institution_code,
            institutionName: row.institution_name,
            examinationName: row.examination_name,
            timetable: row.timetable_data,
            publishedAt: row.published_at,
            updatedAt: row.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Could not query published_timetables in sync route:', err);
      }
    }

    // Step 3: Student-specific resolution
    let matchedStudent: StudentRecord | undefined = undefined;
    let matchedSubject: StudentSubject | undefined = undefined;
    let studentExaminations: StudentExaminationDetail[] = [];

    if (registerNumber) {
      const targetRoll = registerNumber.trim().toLowerCase();

      // Look in workspace student rosters
      if (workspace?.studentsBySubject && typeof workspace.studentsBySubject === 'object') {
        for (const [subjKey, list] of Object.entries(workspace.studentsBySubject)) {
          if (!Array.isArray(list)) continue;
          const found = list.find((s: any) => s?.rollNo && s.rollNo.trim().toLowerCase() === targetRoll);
          if (found) {
            matchedStudent = found;
            const subId = found.subjectId || subjKey;
            if (Array.isArray(workspace?.subjects)) {
              matchedSubject = workspace.subjects.find((s: any) => s.id === subId || s.name === subId);
            }
            break;
          }
        }
      }

      // Look in seating allocations for student seat
      for (const alloc of allocations) {
        if (!alloc || !Array.isArray(alloc.roomPlans)) continue;
        for (const room of alloc.roomPlans) {
          for (const bench of room.benches || []) {
            for (const seat of bench.seats || []) {
              if (seat?.student?.rollNo && seat.student.rollNo.trim().toLowerCase() === targetRoll) {
                if (!matchedStudent) {
                  matchedStudent = seat.student;
                }
                if (!matchedSubject && (seat.student.subjectId || seat.subjectName)) {
                  matchedSubject = {
                    id: seat.student.subjectId || 'subj',
                    name: seat.subjectName || 'Examination Subject',
                    code: seat.student.section || '',
                    expectedStudents: 60,
                    uploadedStudentsCount: 60,
                    createdAt: new Date().toISOString(),
                  };
                }
                break;
              }
            }
            if (matchedStudent && matchedSubject) break;
          }
          if (matchedStudent && matchedSubject) break;
        }
        if (matchedStudent && matchedSubject) break;
      }

      // Extract all examination seating records
      studentExaminations = extractStudentExaminations(
        allocations,
        registerNumber,
        matchedStudent,
        matchedSubject
      );
    }

    return NextResponse.json(
      {
        success: true,
        institutionId,
        institutionCode: resolvedCode,
        institutionName,
        student: matchedStudent || null,
        subject: matchedSubject || null,
        examinations: studentExaminations,
        calendarSchedules,
        publishedTimetables,
        totalAllocations: allocations.length,
        hasWorkspace: Boolean(workspace),
        timestamp: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('Error in student-portal sync API:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = (body.action || '').trim();
    const institutionCode = (body.institutionCode || '').trim();
    const institutionId = (body.institutionId || '').trim();
    const registerNumber = (body.registerNumber || '').trim();

    // 1. Backend Publish Action
    if (action === 'publish' && body.allocation) {
      const alloc: SeatingAllocationRecord = body.allocation;
      const targetInstId = institutionId || body.userId;
      if (alloc && alloc.id && targetInstId) {
        const now = new Date().toISOString();
        const payload: any = {
          id: alloc.id,
          user_id: targetInstId,
          institution_id: targetInstId,
          name: alloc.name,
          status: 'Published',
          invigilators: [],
          examinations: [alloc.examination],
          assignments: {
            _record_type: 'SeatingAllocation',
            seatingAllocation: {
              ...alloc,
              isPublished: true,
              status: 'Published',
              publishedAt: alloc.publishedAt || now,
            },
          },
          created_at: alloc.createdAt || now,
          updated_at: now,
        };

        const { error } = await supabase.from('saved_allotments').upsert(payload);
        if (error) {
          console.warn('API seating allocation publish note:', error.message);
        }
        return NextResponse.json(
          { success: true, published: true, allocation: payload.assignments.seatingAllocation },
          { headers: NO_CACHE_HEADERS }
        );
      }
    }

    // 2. Backend Unpublish Action
    if (action === 'unpublish' && body.allocationId) {
      const allocId = body.allocationId;
      const targetInstId = institutionId || body.userId;
      if (allocId && targetInstId) {
        const { data: existing } = await supabase
          .from('saved_allotments')
          .select('*')
          .eq('id', allocId)
          .maybeSingle();

        if (existing) {
          const currentAlloc = existing.assignments?.seatingAllocation || {};
          const updatedPayload = {
            ...existing,
            status: 'Draft',
            assignments: {
              ...existing.assignments,
              seatingAllocation: {
                ...currentAlloc,
                isPublished: false,
                status: 'Draft',
                publishedAt: undefined,
              },
            },
            updated_at: new Date().toISOString(),
          };
          await supabase.from('saved_allotments').upsert(updatedPayload);
        }
        return NextResponse.json({ success: true, published: false }, { headers: NO_CACHE_HEADERS });
      }
    }

    const getUrl = new URL(req.url);
    if (institutionCode) getUrl.searchParams.set('institutionCode', institutionCode);
    if (institutionId) getUrl.searchParams.set('institutionId', institutionId);
    if (registerNumber) getUrl.searchParams.set('registerNumber', registerNumber);

    return GET(new NextRequest(getUrl.toString(), { headers: req.headers }));
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Invalid request body' },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }
}

