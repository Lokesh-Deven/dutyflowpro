import { SeatingAllocationRecord, RoomSeatingPlan, PhysicalBench, BenchPositionSeat } from './student-seating-types';

/**
 * Builds a realistic sample allocation record for demonstration if no live allocation is stored.
 * Contains both a 2-Column Room (Room 101) and a 3-Column Room (Room 104)
 * with authentic student records matching college examination rosters.
 */
export function getDemoSeatingAllocation(): SeatingAllocationRecord {
  // 1. Room 101: 2-Column Room (8 left benches, 8 right benches, 2-3 per bench)
  const leftBenchesR101: PhysicalBench[] = [];
  const rightBenchesR101: PhysicalBench[] = [];

  const hindiStudents = [
    { rollNo: '1J55', name: 'SALONI P', section: '1J' },
    { rollNo: '1J56', name: 'SAMYAK A SANGHVI', section: '1J' },
    { rollNo: '1J57', name: 'SANJANA RATHOR', section: '1J' },
    { rollNo: '1J58', name: 'SANJAY KUMAR', section: '1J' },
    { rollNo: '1J62', name: 'SUMAN S', section: '1J' },
    { rollNo: '1J65', name: 'UTSAV KUMAR T', section: '1J' },
    { rollNo: '1J67', name: 'VEER KUMAR L', section: '1J' },
    { rollNo: '1J72', name: 'YOGESH CHOUDHARY', section: '1J' },
    { rollNo: '1J74', name: 'SANJAY KUMAR R', section: '1J' },
  ];

  const sanskritStudents = [
    { rollNo: '1B52', name: 'S JANVI SRADDHA', section: '1B' },
    { rollNo: '1B53', name: 'S MEGHANA', section: '1B' },
    { rollNo: '1B57', name: 'S VARSHA', section: '1B' },
    { rollNo: '1B61', name: 'SAMSANI LAKSHMI', section: '1B' },
    { rollNo: '1B68', name: 'SPOORTHI M', section: '1B' },
    { rollNo: '1B70', name: 'SUMITH K', section: '1B' },
    { rollNo: '1B75', name: 'TANUJA J', section: '1B' },
    { rollNo: '1B76', name: 'TARUN KUMAR B', section: '1B' },
    { rollNo: '1B78', name: 'VIDHYA V', section: '1B' },
    { rollNo: '1D04', name: 'ARPAN KUMAR G', section: '1D' },
    { rollNo: '1D18', name: 'HAMSINI H MANVI', section: '1D' },
    { rollNo: '1D48', name: 'PAROUSIA CAROL', section: '1D' },
    { rollNo: '1D76', name: 'T M YASHRAM GOWDA', section: '1D' },
    { rollNo: '1D78', name: 'THARANG S S', section: '1D' },
    { rollNo: '1E01', name: 'ABHISHEK T S', section: '1E' },
    { rollNo: '1E04', name: 'CHATRIYAN G', section: '1E' },
    { rollNo: '1E05', name: 'CHIRANJEEV ABHISHEK', section: '1E' },
    { rollNo: '1E06', name: 'DHARSHAN E', section: '1E' },
    { rollNo: '1E07', name: 'DIPIKA M', section: '1E' },
    { rollNo: '1E08', name: 'GANESH R', section: '1E' },
    { rollNo: '1E09', name: 'HARSHA RAHUL B', section: '1E' },
    { rollNo: '1E10', name: 'HITAISHI M', section: '1E' },
    { rollNo: '1E11', name: 'JAYANTH V', section: '1E' },
    { rollNo: '1E12', name: 'JEEVITHA K', section: '1E' },
  ];

  let hIdx = 0;
  let sIdx = 0;

  for (let b = 1; b <= 8; b++) {
    const seats: BenchPositionSeat[] = [];

    // Side A
    if (hIdx < hindiStudents.length) {
      const st = hindiStudents[hIdx++];
      seats.push({
        position: 'SIDE_A',
        student: { id: `st-${st.rollNo}`, rollNo: st.rollNo, name: st.name, section: st.section, subjectId: 'subj-hindi' },
        subjectId: 'subj-hindi',
        subjectName: 'Hindi',
      });
    } else if (sIdx < sanskritStudents.length) {
      const st = sanskritStudents[sIdx++];
      seats.push({
        position: 'SIDE_A',
        student: { id: `st-${st.rollNo}`, rollNo: st.rollNo, name: st.name, section: st.section, subjectId: 'subj-sanskrit' },
        subjectId: 'subj-sanskrit',
        subjectName: 'Sanskrit',
      });
    }

    // Center
    if (sIdx < sanskritStudents.length && b <= 5) {
      const st = sanskritStudents[sIdx++];
      seats.push({
        position: 'CENTER',
        student: { id: `st-${st.rollNo}`, rollNo: st.rollNo, name: st.name, section: st.section, subjectId: 'subj-sanskrit' },
        subjectId: 'subj-sanskrit',
        subjectName: 'Sanskrit',
      });
    } else {
      seats.push({ position: 'CENTER', isVacant: true });
    }

    // Side B
    if (hIdx < hindiStudents.length) {
      const st = hindiStudents[hIdx++];
      seats.push({
        position: 'SIDE_B',
        student: { id: `st-${st.rollNo}`, rollNo: st.rollNo, name: st.name, section: st.section, subjectId: 'subj-hindi' },
        subjectId: 'subj-hindi',
        subjectName: 'Hindi',
      });
    } else if (sIdx < sanskritStudents.length) {
      const st = sanskritStudents[sIdx++];
      seats.push({
        position: 'SIDE_B',
        student: { id: `st-${st.rollNo}`, rollNo: st.rollNo, name: st.name, section: st.section, subjectId: 'subj-sanskrit' },
        subjectId: 'subj-sanskrit',
        subjectName: 'Sanskrit',
      });
    }

    leftBenchesR101.push({
      benchNumber: b,
      side: 'LEFT',
      seats,
    });
  }

  for (let b = 1; b <= 8; b++) {
    const seats: BenchPositionSeat[] = [];

    // Side A
    if (sIdx < sanskritStudents.length) {
      const st = sanskritStudents[sIdx++];
      seats.push({
        position: 'SIDE_A',
        student: { id: `st-${st.rollNo}`, rollNo: st.rollNo, name: st.name, section: st.section, subjectId: 'subj-sanskrit' },
        subjectId: 'subj-sanskrit',
        subjectName: 'Sanskrit',
      });
    } else {
      seats.push({ position: 'SIDE_A', isVacant: true });
    }

    // Center
    if (sIdx < sanskritStudents.length) {
      const st = sanskritStudents[sIdx++];
      seats.push({
        position: 'CENTER',
        student: { id: `st-${st.rollNo}`, rollNo: st.rollNo, name: st.name, section: st.section, subjectId: 'subj-sanskrit' },
        subjectId: 'subj-sanskrit',
        subjectName: 'Sanskrit',
      });
    } else {
      seats.push({ position: 'CENTER', isVacant: true });
    }

    // Side B
    if (sIdx < sanskritStudents.length) {
      const st = sanskritStudents[sIdx++];
      seats.push({
        position: 'SIDE_B',
        student: { id: `st-${st.rollNo}`, rollNo: st.rollNo, name: st.name, section: st.section, subjectId: 'subj-sanskrit' },
        subjectId: 'subj-sanskrit',
        subjectName: 'Sanskrit',
      });
    } else {
      seats.push({ position: 'SIDE_B', isVacant: true });
    }

    rightBenchesR101.push({
      benchNumber: b,
      side: 'RIGHT',
      seats,
    });
  }

  const room101Benches = [...leftBenchesR101, ...rightBenchesR101];
  let r101Allocated = 0;
  let r101Vacant = 0;
  room101Benches.forEach((b) =>
    b.seats.forEach((s) => {
      if (s.student) r101Allocated++;
      else r101Vacant++;
    })
  );

  const room101Plan: RoomSeatingPlan = {
    roomId: 'room-demo-101',
    roomNo: '101',
    leftBenches: 8,
    rightBenches: 8,
    totalBenches: 16,
    capacity: 48,
    allocatedCount: r101Allocated,
    vacantCount: r101Vacant,
    status: 'Full',
    benches: room101Benches,
  };

  // 2. Room 104: 3-Column Room (5 Left, 5 Middle, 5 Right)
  const leftBenchesR104: PhysicalBench[] = [];
  const middleBenchesR104: PhysicalBench[] = [];
  const rightBenchesR104: PhysicalBench[] = [];

  const englishStudents = [
    { rollNo: '2E01', name: 'AARAV SHARMA', section: '2E' },
    { rollNo: '2E02', name: 'ANANYA IYER', section: '2E' },
    { rollNo: '2E03', name: 'BHAVESH PATEL', section: '2E' },
    { rollNo: '2E04', name: 'CHETNA REDDY', section: '2E' },
    { rollNo: '2E05', name: 'DEVESH GUPTA', section: '2E' },
    { rollNo: '2E06', name: 'ESHAN VERMA', section: '2E' },
    { rollNo: '2E07', name: 'FARHAN KHAN', section: '2E' },
    { rollNo: '2E08', name: 'GAYATRI NAIR', section: '2E' },
    { rollNo: '2E09', name: 'HARSHIT JOSHI', section: '2E' },
    { rollNo: '2E10', name: 'ISHITA DESHMUKH', section: '2E' },
  ];

  const mathStudents = [
    { rollNo: '2M01', name: 'JAYESH CHAUHAN', section: '2M' },
    { rollNo: '2M02', name: 'KAVYA SRINIVAS', section: '2M' },
    { rollNo: '2M03', name: 'LOKESH DEVEN', section: '2M' },
    { rollNo: '2M04', name: 'MANISH TIWARI', section: '2M' },
    { rollNo: '2M05', name: 'NIDHI AGARWAL', section: '2M' },
    { rollNo: '2M06', name: 'OMKAR BHAT', section: '2M' },
    { rollNo: '2M07', name: 'PRANAV MENON', section: '2M' },
    { rollNo: '2M08', name: 'RICHA PANDEY', section: '2M' },
    { rollNo: '2M09', name: 'SAHIL SHAIKH', section: '2M' },
    { rollNo: '2M10', name: 'TANVI CHOPRA', section: '2M' },
  ];

  const physicsStudents = [
    { rollNo: '2P01', name: 'UTKARSH JAIN', section: '2P' },
    { rollNo: '2P02', name: 'VARUN RAO', section: '2P' },
    { rollNo: '2P03', name: 'YASHASVI SINGH', section: '2P' },
    { rollNo: '2P04', name: 'ZOYA MIRZA', section: '2P' },
    { rollNo: '2P05', name: 'ADITYA ROY', section: '2P' },
  ];

  for (let b = 1; b <= 5; b++) {
    const s1 = englishStudents[(b - 1) * 2];
    const s2 = englishStudents[(b - 1) * 2 + 1];
    leftBenchesR104.push({
      benchNumber: b,
      side: 'LEFT',
      seats: [
        {
          position: 'SIDE_A',
          student: s1 ? { id: `st-${s1.rollNo}`, rollNo: s1.rollNo, name: s1.name, section: s1.section, subjectId: 'subj-english' } : undefined,
          subjectId: 'subj-english',
          subjectName: 'English',
          isVacant: !s1,
        },
        { position: 'CENTER', isVacant: true },
        {
          position: 'SIDE_B',
          student: s2 ? { id: `st-${s2.rollNo}`, rollNo: s2.rollNo, name: s2.name, section: s2.section, subjectId: 'subj-english' } : undefined,
          subjectId: 'subj-english',
          subjectName: 'English',
          isVacant: !s2,
        },
      ],
    });
  }

  for (let b = 1; b <= 5; b++) {
    const s1 = mathStudents[(b - 1) * 2];
    const s2 = mathStudents[(b - 1) * 2 + 1];
    middleBenchesR104.push({
      benchNumber: b,
      side: 'MIDDLE',
      seats: [
        {
          position: 'SIDE_A',
          student: s1 ? { id: `st-${s1.rollNo}`, rollNo: s1.rollNo, name: s1.name, section: s1.section, subjectId: 'subj-math' } : undefined,
          subjectId: 'subj-math',
          subjectName: 'Mathematics',
          isVacant: !s1,
        },
        { position: 'CENTER', isVacant: true },
        {
          position: 'SIDE_B',
          student: s2 ? { id: `st-${s2.rollNo}`, rollNo: s2.rollNo, name: s2.name, section: s2.section, subjectId: 'subj-math' } : undefined,
          subjectId: 'subj-math',
          subjectName: 'Mathematics',
          isVacant: !s2,
        },
      ],
    });
  }

  for (let b = 1; b <= 5; b++) {
    const s1 = physicsStudents[b - 1];
    rightBenchesR104.push({
      benchNumber: b,
      side: 'RIGHT',
      seats: [
        {
          position: 'SIDE_A',
          student: s1 ? { id: `st-${s1.rollNo}`, rollNo: s1.rollNo, name: s1.name, section: s1.section, subjectId: 'subj-physics' } : undefined,
          subjectId: 'subj-physics',
          subjectName: 'Physics',
          isVacant: !s1,
        },
        { position: 'CENTER', isVacant: true },
        { position: 'SIDE_B', isVacant: true },
      ],
    });
  }

  const room104Benches = [...leftBenchesR104, ...middleBenchesR104, ...rightBenchesR104];
  let r104Allocated = 0;
  let r104Vacant = 0;
  room104Benches.forEach((b) =>
    b.seats.forEach((s) => {
      if (s.student) r104Allocated++;
      else r104Vacant++;
    })
  );

  const room104Plan: RoomSeatingPlan = {
    roomId: 'room-demo-104',
    roomNo: '104',
    leftBenches: 5,
    middleBenches: 5,
    rightBenches: 5,
    totalBenches: 15,
    capacity: 45,
    allocatedCount: r104Allocated,
    vacantCount: r104Vacant,
    status: 'Full',
    benches: room104Benches,
  };

  return {
    id: 'demo-seating-allocation',
    name: 'Midterm Examination 2026',
    examination: {
      examId: 'exam-midterm-2026',
      examName: 'Midterm Examination 2026',
      date: '2026-12-10',
      startTime: '11:00 AM',
      endTime: '12:30 PM',
    },
    subjectIds: ['subj-hindi', 'subj-sanskrit', 'subj-english', 'subj-math', 'subj-physics'],
    pattern: '3_PER_BENCH',
    positionMapping: {
      SIDE_A: 'subj-hindi',
      CENTER: 'subj-sanskrit',
      SIDE_B: 'subj-hindi',
    },
    roomIds: ['room-demo-101', 'room-demo-104'],
    roomPlans: [room101Plan, room104Plan],
    subjectStats: [
      { subjectId: 'subj-hindi', subjectName: 'Hindi', totalStudents: 9, allocatedCount: 9, status: 'Complete' },
      { subjectId: 'subj-sanskrit', subjectName: 'Sanskrit', totalStudents: 24, allocatedCount: 24, status: 'Complete' },
      { subjectId: 'subj-english', subjectName: 'English', totalStudents: 10, allocatedCount: 10, status: 'Complete' },
      { subjectId: 'subj-math', subjectName: 'Mathematics', totalStudents: 10, allocatedCount: 10, status: 'Complete' },
      { subjectId: 'subj-physics', subjectName: 'Physics', totalStudents: 5, allocatedCount: 5, status: 'Complete' },
    ],
    summary: {
      totalStudents: 58,
      totalRooms: 2,
      totalCapacity: 93,
      allocatedStudents: 58,
      vacantSeats: 35,
      unallocatedStudents: 0,
      isReady: true,
      issues: [],
    },
    status: 'Finalized',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

