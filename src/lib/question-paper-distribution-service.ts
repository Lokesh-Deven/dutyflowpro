import * as XLSX from 'xlsx';
import { SeatingAllocationRecord, RoomSeatingPlan, PhysicalBench, BenchPositionSeat, StudentRecord } from './student-seating-types';

export interface RoomSubjectDistributionItem {
  id: string;
  roomNo: string;
  subjectName: string;
  subjectCode?: string;
  section: string;
  regNoFrom: string;
  regNoTo: string;
  studentCount: number;
  questionPapersRequired: number; // 1 Student = 1 Question Paper
  studentRollNumbers: string[];
}

export interface RoomDistributionSummary {
  roomNo: string;
  cleanRoomNo: string;
  totalStudents: number;
  totalQuestionPapers: number;
  subjects: string[];
  items: RoomSubjectDistributionItem[];
}

export interface SubjectOverallRequirement {
  subjectName: string;
  subjectCode?: string;
  totalStudents: number;
  totalQuestionPapers: number;
  roomCount: number;
  rooms: string[];
}

export interface QuestionPaperDistributionResult {
  examinationName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  institutionName: string;
  totalRooms: number;
  totalStudents: number;
  totalQuestionPapers: number;
  subjectRequirements: SubjectOverallRequirement[];
  rooms: RoomDistributionSummary[];
}

/**
 * Natural comparator for roll numbers / register numbers (e.g. "1001", "1002", "ENG-01", etc.)
 */
export function compareRollNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Process a SeatingAllocationRecord and generate the room-wise question paper distribution
 */
export function generateQuestionPaperDistribution(
  allocation: SeatingAllocationRecord,
  institutionName: string = 'Institution Name'
): QuestionPaperDistributionResult {
  const roomSummaries: RoomDistributionSummary[] = [];
  const subjectMap = new Map<string, { totalStudents: number; totalPapers: number; rooms: Set<string> }>();

  // Process each room plan
  allocation.roomPlans.forEach((plan) => {
    const seatedStudents: Array<{
      student: StudentRecord;
      subjectName: string;
    }> = [];

    // Collect all seated students
    plan.benches.forEach((bench) => {
      bench.seats.forEach((seat) => {
        if (seat.student && seat.student.rollNo) {
          const sName = seat.subjectName?.trim() || 'General';
          seatedStudents.push({
            student: seat.student,
            subjectName: sName,
          });
        }
      });
    });

    if (seatedStudents.length === 0) {
      return; // Skip empty rooms
    }

    const cleanRoomNo = plan.roomNo.replace(/^Room\s+/i, '').trim();
    const formattedRoomTitle = `Room ${cleanRoomNo}`;

    // Group seated students by subject and section
    const groupKeyMap = new Map<string, {
      subjectName: string;
      section: string;
      students: StudentRecord[];
    }>();

    seatedStudents.forEach(({ student, subjectName }) => {
      const section = (student.section && student.section.trim()) ? student.section.trim() : '—';
      const key = `${subjectName}___${section}`;

      if (!groupKeyMap.has(key)) {
        groupKeyMap.set(key, {
          subjectName,
          section,
          students: [],
        });
      }
      groupKeyMap.get(key)!.students.push(student);
    });

    const items: RoomSubjectDistributionItem[] = [];
    let roomTotalStudents = 0;
    const roomSubjectsSet = new Set<string>();

    groupKeyMap.forEach((group, key) => {
      // Sort students naturally by register / roll number
      group.students.sort((a, b) => compareRollNumbers(a.rollNo, b.rollNo));

      const count = group.students.length;
      const regFrom = group.students[0]?.rollNo || '—';
      const regTo = group.students[group.students.length - 1]?.rollNo || '—';
      const papers = count; // 1 Student = 1 Question Paper

      roomTotalStudents += count;
      roomSubjectsSet.add(group.subjectName);

      items.push({
        id: `${plan.roomId}-${key}`,
        roomNo: formattedRoomTitle,
        subjectName: group.subjectName,
        section: group.section,
        regNoFrom: regFrom,
        regNoTo: regTo,
        studentCount: count,
        questionPapersRequired: papers,
        studentRollNumbers: group.students.map((s) => s.rollNo),
      });

      // Update subject-level overall requirement
      if (!subjectMap.has(group.subjectName)) {
        subjectMap.set(group.subjectName, {
          totalStudents: 0,
          totalPapers: 0,
          rooms: new Set(),
        });
      }
      const subEntry = subjectMap.get(group.subjectName)!;
      subEntry.totalStudents += count;
      subEntry.totalPapers += papers;
      subEntry.rooms.add(formattedRoomTitle);
    });

    // Sort items by subject name then section
    items.sort((a, b) => {
      const subComp = a.subjectName.localeCompare(b.subjectName);
      if (subComp !== 0) return subComp;
      return a.section.localeCompare(b.section);
    });

    roomSummaries.push({
      roomNo: formattedRoomTitle,
      cleanRoomNo,
      totalStudents: roomTotalStudents,
      totalQuestionPapers: roomTotalStudents,
      subjects: Array.from(roomSubjectsSet),
      items,
    });
  });

  // Sort rooms naturally by room number
  roomSummaries.sort((a, b) => compareRollNumbers(a.cleanRoomNo, b.cleanRoomNo));

  // Build subject-wise overall requirements
  const subjectRequirements: SubjectOverallRequirement[] = [];
  subjectMap.forEach((data, subjectName) => {
    subjectRequirements.push({
      subjectName,
      totalStudents: data.totalStudents,
      totalQuestionPapers: data.totalPapers,
      roomCount: data.rooms.size,
      rooms: Array.from(data.rooms).sort(compareRollNumbers),
    });
  });
  subjectRequirements.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const grandTotalStudents = roomSummaries.reduce((sum, r) => sum + r.totalStudents, 0);

  return {
    examinationName: allocation.examination.examName || 'Examination',
    date: allocation.examination.date || '—',
    startTime: allocation.examination.startTime,
    endTime: allocation.examination.endTime,
    institutionName,
    totalRooms: roomSummaries.length,
    totalStudents: grandTotalStudents,
    totalQuestionPapers: grandTotalStudents,
    subjectRequirements,
    rooms: roomSummaries,
  };
}

/**
 * Creates an authentic sample seating allocation to demonstrate Question Paper Distribution
 * featuring exact cases: single subject rooms and multiple subjects in one room (e.g. Room 105: English 18 + Economics 12 = 30)
 */
export function createSampleSeatingAllocation(
  institutionName: string = 'Institution Name',
  examinationName: string = 'Midterm Examination 2026'
): SeatingAllocationRecord {
  const dateStr = new Date().toISOString().split('T')[0];

  const buildBenchSeats = (
    students: Array<{ name: string; rollNo: string; section: string; subject: string }>
  ): PhysicalBench[] => {
    const benches: PhysicalBench[] = [];
    const benchesCount = Math.max(10, Math.ceil(students.length / 2));

    let studentIndex = 0;
    for (let b = 1; b <= benchesCount; b++) {
      const seats: BenchPositionSeat[] = [];

      // Left seat (Side A)
      if (studentIndex < students.length) {
        const s = students[studentIndex++];
        seats.push({
          position: 'SIDE_A',
          subjectName: s.subject,
          student: {
            id: `stud-${s.rollNo}`,
            subjectId: `subj-${s.subject.toLowerCase()}`,
            name: s.name,
            section: s.section,
            rollNo: s.rollNo,
          },
        });
      }

      // Right seat (Side B)
      if (studentIndex < students.length) {
        const s = students[studentIndex++];
        seats.push({
          position: 'SIDE_B',
          subjectName: s.subject,
          student: {
            id: `stud-${s.rollNo}`,
            subjectId: `subj-${s.subject.toLowerCase()}`,
            name: s.name,
            section: s.section,
            rollNo: s.rollNo,
          },
        });
      }

      benches.push({
        benchNumber: b,
        side: b % 2 === 1 ? 'LEFT' : 'RIGHT',
        seats,
      });
    }

    return benches;
  };

  // 1. Room 101: English (1A) - 30 Students (1001 to 1030)
  const room101Students = Array.from({ length: 30 }, (_, i) => {
    const num = 1001 + i;
    return {
      name: `Student ${num}`,
      rollNo: num.toString(),
      section: '1A',
      subject: 'English',
    };
  });

  // 2. Room 102: Kannada (1B) - 35 Students (2001 to 2035)
  const room102Students = Array.from({ length: 35 }, (_, i) => {
    const num = 2001 + i;
    return {
      name: `Student ${num}`,
      rollNo: num.toString(),
      section: '1B',
      subject: 'Kannada',
    };
  });

  // 3. Room 105: Multi-Subject: English (1A) 18 Students (1031-1048) + Economics (1C) 12 Students (3001-3012) = 30 Total
  const room105English = Array.from({ length: 18 }, (_, i) => {
    const num = 1031 + i;
    return {
      name: `Student ${num}`,
      rollNo: num.toString(),
      section: '1A',
      subject: 'English',
    };
  });
  const room105Economics = Array.from({ length: 12 }, (_, i) => {
    const num = 3001 + i;
    return {
      name: `Student ${num}`,
      rollNo: num.toString(),
      section: '1C',
      subject: 'Economics',
    };
  });
  const room105Students = [...room105English, ...room105Economics];

  // 4. Room 106: Mathematics (1D) - 28 Students (4001 to 4028)
  const room106Students = Array.from({ length: 28 }, (_, i) => {
    const num = 4001 + i;
    return {
      name: `Student ${num}`,
      rollNo: num.toString(),
      section: '1D',
      subject: 'Mathematics',
    };
  });

  const roomPlans: RoomSeatingPlan[] = [
    {
      roomId: 'room-plan-101',
      roomNo: '101',
      leftBenches: 10,
      rightBenches: 10,
      totalBenches: 20,
      capacity: 40,
      allocatedCount: 30,
      vacantCount: 10,
      status: 'Partial',
      benches: buildBenchSeats(room101Students),
    },
    {
      roomId: 'room-plan-102',
      roomNo: '102',
      leftBenches: 10,
      rightBenches: 10,
      totalBenches: 20,
      capacity: 40,
      allocatedCount: 35,
      vacantCount: 5,
      status: 'Partial',
      benches: buildBenchSeats(room102Students),
    },
    {
      roomId: 'room-plan-105',
      roomNo: '105',
      leftBenches: 10,
      rightBenches: 10,
      totalBenches: 20,
      capacity: 40,
      allocatedCount: 30,
      vacantCount: 10,
      status: 'Partial',
      benches: buildBenchSeats(room105Students),
    },
    {
      roomId: 'room-plan-106',
      roomNo: '106',
      leftBenches: 10,
      rightBenches: 10,
      totalBenches: 20,
      capacity: 40,
      allocatedCount: 28,
      vacantCount: 12,
      status: 'Partial',
      benches: buildBenchSeats(room106Students),
    },
  ];

  const totalAllocated = 30 + 35 + 30 + 28; // 123 students

  return {
    id: `alloc-sample-qp-${Date.now()}`,
    name: `${examinationName} - Room Seating Plan`,
    examination: {
      examName: examinationName,
      date: dateStr,
      startTime: '09:00',
      endTime: '12:00',
    },
    subjectIds: ['subj-eng', 'subj-kan', 'subj-eco', 'subj-mat'],
    pattern: '2_PER_BENCH',
    positionMapping: {
      SIDE_A: 'subj-eng',
      CENTER: '',
      SIDE_B: 'subj-eco',
    },
    roomIds: ['room-plan-101', 'room-plan-102', 'room-plan-105', 'room-plan-106'],
    roomPlans,
    subjectStats: [
      { subjectId: 'subj-eng', subjectName: 'English', totalStudents: 48, allocatedCount: 48, status: 'Complete' },
      { subjectId: 'subj-kan', subjectName: 'Kannada', totalStudents: 35, allocatedCount: 35, status: 'Complete' },
      { subjectId: 'subj-eco', subjectName: 'Economics', totalStudents: 12, allocatedCount: 12, status: 'Complete' },
      { subjectId: 'subj-mat', subjectName: 'Mathematics', totalStudents: 28, allocatedCount: 28, status: 'Complete' },
    ],
    summary: {
      totalStudents: totalAllocated,
      totalRooms: 4,
      totalCapacity: 160,
      allocatedStudents: totalAllocated,
      vacantSeats: 37,
      unallocatedStudents: 0,
      isReady: true,
      issues: [],
    },
    status: 'Finalized',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Export Question Paper Distribution to Excel (.xlsx) file
 */
export function exportQuestionPaperDistributionExcel(data: QuestionPaperDistributionResult): void {
  const wb = XLSX.utils.book_new();

  const sheetData: any[][] = [];

  // Title & Metadata
  sheetData.push([data.institutionName.toUpperCase()]);
  sheetData.push([`${data.examinationName} - QUESTION PAPER DISTRIBUTION LIST`]);
  sheetData.push([`Date: ${data.date}`, `Timings: ${data.startTime || '—'} to ${data.endTime || '—'}`]);
  sheetData.push([]);

  // Summary
  sheetData.push(['DISTRIBUTION SUMMARY']);
  sheetData.push(['Total Examination Rooms', data.totalRooms]);
  sheetData.push(['Total Students Allocated', data.totalStudents]);
  sheetData.push(['Total Question Papers Required', data.totalQuestionPapers, '(Calculation: 1 Student = 1 Question Paper)']);
  sheetData.push([]);

  // Subject-wise Breakdown
  sheetData.push(['SUBJECT-WISE REQUIREMENT']);
  sheetData.push(['Subject', 'Rooms Count', 'Students', 'Question Papers Required']);
  data.subjectRequirements.forEach((sub) => {
    sheetData.push([sub.subjectName, sub.roomCount, sub.totalStudents, sub.totalQuestionPapers]);
  });
  sheetData.push([]);

  // Room-wise Detailed Distribution Table
  sheetData.push(['ROOM-WISE QUESTION PAPER DISTRIBUTION']);
  sheetData.push([
    'Room',
    'Subject(s)',
    'Section',
    'Register No. From',
    'Register No. To',
    'Students',
    'Question Papers Required',
    'Total Papers for Room',
    'Superintendent / Invigilator Sign',
  ]);

  data.rooms.forEach((room) => {
    room.items.forEach((item, index) => {
      sheetData.push([
        index === 0 ? room.roomNo : '',
        item.subjectName,
        item.section,
        item.regNoFrom,
        item.regNoTo,
        item.studentCount,
        item.questionPapersRequired,
        index === 0 ? room.totalQuestionPapers : '',
        '',
      ]);
    });
  });

  // Grand Total Row
  sheetData.push([]);
  sheetData.push([
    'GRAND TOTAL',
    '',
    '',
    '',
    '',
    data.totalStudents,
    data.totalQuestionPapers,
    data.totalQuestionPapers,
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 16 }, // Room
    { wch: 24 }, // Subject
    { wch: 12 }, // Section
    { wch: 18 }, // Reg From
    { wch: 18 }, // Reg To
    { wch: 12 }, // Students
    { wch: 24 }, // QP Required
    { wch: 22 }, // Total for Room
    { wch: 30 }, // Sign
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'QP Distribution');

  const filename = `${data.examinationName.replace(/[^a-z0-9]/gi, '_')}_Question_Paper_Distribution.xlsx`;
  XLSX.writeFile(wb, filename);
}

