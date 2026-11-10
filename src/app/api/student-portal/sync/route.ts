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
  if (p === 'LEFT' || p === 'L' || p === 'SIDE_A') return 'Left';
  if (p === 'RIGHT' || p === 'R' || p === 'SIDE_B') return 'Right';
  if (p === 'CENTER' || p === 'C' || p === 'MIDDLE' || p === 'M') return 'Center';
  return 'Unassigned';
}

/**
 * Builds StudentExaminationDetail array for a given student from raw seating allocations
 */
function extractStudentExaminations(
  allocations: SeatingAllocationRecord[],
  targetRoll: string,
  matchedStudent?: StudentRecord,
  matchedSubject?: StudentSubject
): StudentExaminationDetail[] {
  const cleanRoll = targetRoll.trim().toLowerCase();
  const results: StudentExaminationDetail[] = [];
  const seenKeys = new Set<string>();
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const alloc of allocations) {
    if (!alloc || !Array.isArray(alloc.roomPlans)) continue;

    const examName = alloc.examination?.examName || alloc.name || 'Examination';
    const examDate = alloc.examination?.date || '';
    const startTime = alloc.examination?.startTime || '';
    const endTime = alloc.examination?.endTime || '';
    const timeSlot = startTime && endTime ? `${startTime} – ${endTime}` : startTime || 'Session TBA';
    const { formatted: formattedDate, day: dayOfWeek } = formatExamDate(examDate);

    for (const roomPlan of alloc.roomPlans) {
      if (!roomPlan || !Array.isArray(roomPlan.benches)) continue;

      for (const bench of roomPlan.benches) {
        if (!bench || !Array.isArray(bench.seats)) continue;

        for (const seat of bench.seats) {
          if (!seat || !seat.student) continue;

          const sRoll = (seat.student.rollNo || '').trim().toLowerCase();
          if (sRoll === cleanRoll) {
            const subjectName = seat.subjectName || (matchedSubject ? matchedSubject.name : 'General Subject');
            const dedupeKey = `${examName}-${subjectName}-${examDate}`.toLowerCase();

            if (!seenKeys.has(dedupeKey)) {
              seenKeys.add(dedupeKey);
              const isToday = examDate === todayStr;
              const isUpcoming = examDate >= todayStr;
              const isPast = examDate < todayStr && !isToday;

              results.push({
                id: `exam-${alloc.id}-${roomPlan.roomId}-${bench.benchNumber}-${seat.position}`,
                examId: alloc.id,
                examName,
                date: examDate,
                formattedDate,
                dayOfWeek,
                startTime,
                endTime,
                timeSlot,
                subjectId: seat.student.subjectId || seat.subjectId || matchedSubject?.id || '',
                subjectName,
                subjectCode: seat.student.section || matchedSubject?.code || '',
                courseStream: seat.student.section ? `Section ${seat.student.section}` : 'Standard Stream',
                section: seat.student.section || matchedStudent?.section || 'A',
                studentName: seat.student.name || matchedStudent?.name || 'Student',
                registerNumber: seat.student.rollNo || targetRoll,
                roomNo: String(roomPlan.roomNo),
                roomId: roomPlan.roomId,
                benchNumber: `B${bench.benchNumber}`,
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

  // If student exists in roster but has no seat allocated in current plans, add pending indicator
  if (results.length === 0 && matchedStudent) {
    results.push({
      id: `pending-${matchedStudent.id || matchedStudent.rollNo}`,
      examName: 'Upcoming Examination',
      date: '',
      formattedDate: 'Date Scheduled Soon',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      timeSlot: 'Timetable in progress',
      subjectId: matchedStudent.subjectId || '',
      subjectName: matchedSubject?.name || 'Assigned Subject',
      subjectCode: matchedSubject?.code || '',
      courseStream: matchedSubject?.code || 'Course Roster',
      section: matchedStudent.section || 'A',
      studentName: matchedStudent.name,
      registerNumber: matchedStudent.rollNo,
      roomNo: 'Notice Soon',
      benchNumber: 'Seat Allocation Pending',
      position: 'Unassigned',
      isToday: false,
      isUpcoming: true,
      isPast: false,
      status: 'Pending Allocation',
    });
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
    const institutionCode = (body.institutionCode || '').trim();
    const institutionId = (body.institutionId || '').trim();
    const registerNumber = (body.registerNumber || '').trim();

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

