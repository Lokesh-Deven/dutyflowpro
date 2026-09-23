import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SeatingAllocationRecord, RoomSeatingPlan } from './student-seating-types';
import { getPdfPalette, DEFAULT_PALETTE_ID, PaletteId } from './pdf-palette';
import { SignatoryInfo } from './types';
import { formatAppDateWithDay } from './date-utils';

export interface GenerateRoomSeatingPdfOptions {
  allocation: SeatingAllocationRecord;
  roomPlan?: RoomSeatingPlan; // If provided, generates single room. If omitted, generates all rooms.
  institutionName?: string;
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
}

export interface GenerateStudentIndexPdfOptions {
  allocation: SeatingAllocationRecord;
  institutionName?: string;
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
}

/**
 * 1. Generate Room-Wise Seating Plan PDF
 * Physical graphical diagram of Left & Right benches for printing outside examination rooms.
 */
export async function generateRoomSeatingPlanPdf({
  allocation,
  roomPlan,
  institutionName = 'Institution Name',
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
}: GenerateRoomSeatingPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const palette = getPdfPalette(paletteId);

  const roomsToPrint = roomPlan ? [roomPlan] : allocation.roomPlans;
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const leftMargin = 12;
  const rightMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 186 mm

  roomsToPrint.forEach((plan, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage();
    }

    // Top Header Banner
    const bannerY = 10;
    const bannerHeight = 22;
    const stripeHeight = 1.4;

    doc.setFillColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.rect(leftMargin, bannerY, contentWidth, bannerHeight, 'F');

    doc.setFillColor(palette.rgb.stripe[0], palette.rgb.stripe[1], palette.rgb.stripe[2]);
    doc.rect(leftMargin, bannerY + bannerHeight - stripeHeight, contentWidth, stripeHeight, 'F');

    let textY = bannerY + 6.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(institutionName.toUpperCase(), pageWidth / 2, textY, { align: 'center' });

    textY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(230, 235, 245);
    doc.text(
      `${allocation.examination.examName || 'Examination'} • STUDENT SEATING PLAN`,
      pageWidth / 2,
      textY,
      { align: 'center' }
    );

    textY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`EXAMINATION ROOM NO. ${plan.roomNo}`, pageWidth / 2, textY, { align: 'center' });

    // Metadata Card (Left: Date, Subject, Timings | Right: Total Capacity, Allocated, Vacant)
    const metaY = bannerY + bannerHeight + 3.2;
    const metaHeight = 17.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, metaY, contentWidth, metaHeight, 1.5, 1.5, 'FD');

    const formattedDate = formatAppDateWithDay(allocation.examination.date, allocation.examination.date || '—');
    
    // Find unique subjects seated in this room, or fallback to allocation subjects
    const roomSubjectNames = Array.from(
      new Set(
        plan.benches
          .flatMap((b) => b.seats.map((s) => s.subjectName))
          .filter((name): name is string => Boolean(name && name.trim()))
      )
    );
    const rawSubjects = roomSubjectNames.length > 0 
      ? roomSubjectNames.join(', ') 
      : (allocation.subjectStats.map((s) => s.subjectName).join(', ') || 'All Subjects');
    const truncSubjects = rawSubjects.length > 50 ? rawSubjects.substring(0, 47) + '...' : rawSubjects;

    const timingsStr = allocation.examination.startTime && allocation.examination.endTime
      ? `${allocation.examination.startTime} – ${allocation.examination.endTime}`
      : '—';

    const row1Y = metaY + 4.8;
    const row2Y = metaY + 9.5;
    const row3Y = metaY + 14.2;

    const leftValX = leftMargin + 20;
    const rightLabelX = leftMargin + 118;
    const rightValX = rightLabelX + 25;

    // Left Side: Date, Subject, Timings
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text("Date:", leftMargin + 4, row1Y);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, leftValX, row1Y);

    doc.setFont('helvetica', 'bold');
    doc.text("Subject:", leftMargin + 4, row2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(truncSubjects, leftValX, row2Y);

    doc.setFont('helvetica', 'bold');
    doc.text("Timings:", leftMargin + 4, row3Y);
    doc.setFont('helvetica', 'normal');
    doc.text(timingsStr, leftValX, row3Y);

    // Right Side: Total Capacity, Allocated, Vacant
    doc.setFont('helvetica', 'bold');
    doc.text("Total Capacity:", rightLabelX, row1Y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${plan.capacity} Students`, rightValX, row1Y);

    doc.setFont('helvetica', 'bold');
    doc.text("Allocated:", rightLabelX, row2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${plan.allocatedCount} Students`, rightValX, row2Y);

    doc.setFont('helvetica', 'bold');
    doc.text("Vacant:", rightLabelX, row3Y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${plan.vacantCount} Seats`, rightValX, row3Y);

    // ----------------------------------------------------------------
    // Representational Classroom Blackboard Graphic (Front of Room)
    // ----------------------------------------------------------------
    const boardY = metaY + metaHeight + 2.8;
    const boardHeight = 16.5;

    // Wooden Outer Frame
    doc.setFillColor(66, 37, 19); // #422513
    doc.roundedRect(leftMargin, boardY, contentWidth, boardHeight, 1.6, 1.6, 'F');

    // Chalkboard Surface (Classic dark chalkboard green)
    const surfInset = 1.1;
    const surfX = leftMargin + surfInset;
    const surfY = boardY + surfInset;
    const surfW = contentWidth - surfInset * 2;
    const surfH = boardHeight - 2.8;
    doc.setFillColor(20, 45, 35); // #142d23
    doc.roundedRect(surfX, surfY, surfW, surfH, 1, 1, 'F');

    // Inner subtle chalk border
    doc.setDrawColor(42, 78, 62);
    doc.setLineWidth(0.25);
    doc.roundedRect(surfX + 0.8, surfY + 0.8, surfW - 1.6, surfH - 1.6, 0.6, 0.6, 'D');

    // Bottom Wooden Chalk Tray / Ledge
    const trayY = boardY + boardHeight - 1.6;
    doc.setFillColor(49, 27, 13);
    doc.rect(leftMargin + 8, trayY, contentWidth - 16, 1.2, 'F');

    // Felt Chalk Duster on Tray
    doc.setFillColor(146, 64, 14);
    doc.rect(leftMargin + contentWidth - 36, trayY - 0.4, 6.5, 1.2, 'F');

    // White & Yellow Chalk Sticks on Tray
    doc.setFillColor(255, 255, 255);
    doc.rect(leftMargin + contentWidth - 27, trayY - 0.2, 3.5, 0.8, 'F');
    doc.setFillColor(253, 224, 71);
    doc.rect(leftMargin + contentWidth - 22, trayY - 0.2, 3.2, 0.8, 'F');

    // Chalkboard Title (Center Top)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Blackboard • Front of Room (Teacher's Stage)", pageWidth / 2, surfY + 3.8, { align: 'center' });

    // Graphical Two-Column Bench Layout (Left Side vs Right Side)
    const gridTop = boardY + boardHeight + 3;
    const colWidth = (contentWidth - 6) / 2; // ~90 mm per column
    const leftColX = leftMargin;
    const rightColX = leftMargin + colWidth + 6;
    const leftCenterX = leftColX + colWidth / 2;
    const rightCenterX = rightColX + colWidth / 2;
    const centerPageX = pageWidth / 2;

    // Subheaders
    // Left: "Left Side Benches"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(187, 247, 208); // Mint chalk
    doc.text("Left Side Benches", leftCenterX, surfY + 7.6, { align: 'center' });

    // Right: "Right Side Benches"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(187, 247, 208); // Mint chalk
    doc.text("Right Side Benches", rightCenterX, surfY + 7.6, { align: 'center' });

    // Bench counts
    // Left: "(${plan.leftBenches} Benches)"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255); // Crisp white chalk
    doc.text(`(${plan.leftBenches} Benches)`, leftCenterX, surfY + 11.4, { align: 'center' });

    // Right: "(${plan.rightBenches} Benches)"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255); // Crisp white chalk
    doc.text(`(${plan.rightBenches} Benches)`, rightCenterX, surfY + 11.4, { align: 'center' });

    // Center Guidance Note: "Facing the board, benches on your left and right match below"
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(226, 232, 240); // Soft white chalk
    doc.text("Facing the board, benches on your left and right match below", centerPageX, surfY + 9.5, { align: 'center' });

    // Column Headers
    doc.setFillColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.rect(leftColX, gridTop, colWidth, 6, 'F');
    doc.rect(rightColX, gridTop, colWidth, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`LEFT SIDE BENCHES (${plan.leftBenches})`, leftColX + colWidth / 2, gridTop + 4.2, { align: 'center' });
    doc.text(`RIGHT SIDE BENCHES (${plan.rightBenches})`, rightColX + colWidth / 2, gridTop + 4.2, { align: 'center' });

    const maxBenches = Math.max(plan.leftBenches, plan.rightBenches, 1);
    // Dynamic bench row height based on number of benches to comfortably fit A4
    const availableHeight = pageHeight - gridTop - 24; // Leave room for signatory
    const rowHeight = Math.min(16.5, Math.max(8.5, (availableHeight - 8) / maxBenches));

    const leftBenches = plan.benches.filter((b) => b.side === 'LEFT');
    const rightBenches = plan.benches.filter((b) => b.side === 'RIGHT');

    // Helper to render a bench row
    const renderBench = (bench: typeof leftBenches[0], x: number, y: number, w: number, h: number) => {
      // Bench outline
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x, y, w, h - 1.2, 1, 1, 'FD');

      // Bench number badge on left
      const badgeWidth = 9;
      doc.setFillColor(241, 245, 249);
      doc.rect(x, y, badgeWidth, h - 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        String(bench.benchNumber).padStart(2, '0'),
        x + badgeWidth / 2,
        y + (h - 1.2) / 2 + 1,
        { align: 'center' }
      );

      // Seats inside bench
      const seatsAreaWidth = w - badgeWidth;
      const seatSlotWidth = seatsAreaWidth / Math.max(1, bench.seats.length);

      bench.seats.forEach((seat, idx) => {
        const sx = x + badgeWidth + idx * seatSlotWidth;
        const sy = y;

        if (idx > 0) {
          doc.setDrawColor(226, 232, 240);
          doc.line(sx, sy, sx, sy + h - 1.2);
        }

        const midX = sx + seatSlotWidth / 2;
        const isVacant = !seat.student;

        if (isVacant) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.5);
          doc.setTextColor(148, 163, 184);
          doc.text("VACANT", midX, sy + (h - 1.2) / 2 + 1, { align: 'center' });
        } else {
          const isCompact = h < 13.5;
          // Position tag (Side A / Center / Side B)
          const posLabel = seat.position === 'SIDE_A' ? 'A' : seat.position === 'SIDE_B' ? 'B' : 'C';
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(isCompact ? 5 : 5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(posLabel, sx + 2, sy + (isCompact ? 2.8 : 3.2));

          // Roll Number (Prominent)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(isCompact ? 7.5 : 8);
          doc.setTextColor(15, 23, 42);
          doc.text(seat.student!.rollNo, midX, sy + (isCompact ? 4.8 : 5.8), { align: 'center' });

          // Student Name
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(isCompact ? 6 : 6.5);
          doc.setTextColor(51, 65, 85);
          const rawName = seat.student!.name;
          const truncName = rawName.length > 14 ? rawName.substring(0, 13) + '..' : rawName;
          doc.text(truncName, midX, sy + (isCompact ? 8.2 : 9.6), { align: 'center' });

          // Subject Name
          if (!isCompact && seat.subjectName) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.2);
            doc.setTextColor(100, 116, 139);
            const truncSub = seat.subjectName.length > 16 ? seat.subjectName.substring(0, 15) + '.' : seat.subjectName;
            doc.text(truncSub, midX, sy + 13.2, { align: 'center' });
          }
        }
      });
    };

    // Draw Left Benches
    let currentY = gridTop + 8;
    leftBenches.forEach((bench) => {
      renderBench(bench, leftColX, currentY, colWidth, rowHeight);
      currentY += rowHeight;
    });

    // Draw Right Benches
    currentY = gridTop + 8;
    rightBenches.forEach((bench) => {
      renderBench(bench, rightColX, currentY, colWidth, rowHeight);
      currentY += rowHeight;
    });

    // Bottom Signatory
    const sigY = pageHeight - 16;
    const sigName = signatory?.name || 'Chief Superintendent';
    const sigDesig = signatory?.designation || 'Examination Committee / Principal';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(sigName, pageWidth - rightMargin - 4, sigY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(sigDesig, pageWidth - rightMargin - 4, sigY + 4, { align: 'right' });

    // Footer note
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Student Seating Plan • Room ${plan.roomNo} • Page ${pageIndex + 1} of ${roomsToPrint.length}`,
      leftMargin,
      pageHeight - 6
    );
  });

  const fileTitle = roomPlan
    ? `Seating_Plan_Room_${roomPlan.roomNo}`
    : `All_Rooms_Seating_Plan_${allocation.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  doc.save(`${fileTitle}.pdf`);
}

/**
 * 2. Generate Student Seating Index PDF
 * Detailed alphabetical/roll-call tabular index of all student seat allocations.
 */
export async function generateStudentSeatingIndexPdf({
  allocation,
  institutionName = 'Institution Name',
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
}: GenerateStudentIndexPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const palette = getPdfPalette(paletteId);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 12;
  const rightMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Flatten all student seat assignments
  interface FlatAssignment {
    rollNo: string;
    studentName: string;
    section: string;
    subjectName: string;
    roomNo: string;
    benchNumber: string;
    position: string;
  }

  const flatList: FlatAssignment[] = [];

  allocation.roomPlans.forEach((plan) => {
    plan.benches.forEach((bench) => {
      bench.seats.forEach((seat) => {
        if (seat.student) {
          const posLabel =
            seat.position === 'SIDE_A'
              ? 'Side A'
              : seat.position === 'SIDE_B'
              ? 'Side B'
              : 'Center';
          flatList.push({
            rollNo: seat.student.rollNo,
            studentName: seat.student.name,
            section: seat.student.section,
            subjectName: seat.subjectName || '—',
            roomNo: plan.roomNo,
            benchNumber: `${bench.side === 'LEFT' ? 'L' : 'R'}-${String(bench.benchNumber).padStart(2, '0')}`,
            position: posLabel,
          });
        }
      });
    });
  });

  // Sort naturally by Roll No
  flatList.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true, sensitivity: 'base' }));

  // Header Banner
  const bannerY = 10;
  const bannerHeight = 20;
  const stripeHeight = 1.4;

  doc.setFillColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  doc.rect(leftMargin, bannerY, contentWidth, bannerHeight, 'F');

  doc.setFillColor(palette.rgb.stripe[0], palette.rgb.stripe[1], palette.rgb.stripe[2]);
  doc.rect(leftMargin, bannerY + bannerHeight - stripeHeight, contentWidth, stripeHeight, 'F');

  let textY = bannerY + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(institutionName.toUpperCase(), pageWidth / 2, textY, { align: 'center' });

  textY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(230, 235, 245);
  doc.text(
    `${allocation.examination.examName || 'Examination'} • STUDENT SEATING INDEX (${flatList.length} Students)`,
    pageWidth / 2,
    textY,
    { align: 'center' }
  );

  textY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Date: ${allocation.examination.date || '—'}  |  Time: ${allocation.examination.startTime} – ${allocation.examination.endTime}`,
    pageWidth / 2,
    textY,
    { align: 'center' }
  );

  // Table Data
  const rows = flatList.map((item, idx) => [
    (idx + 1).toString(),
    item.rollNo,
    item.studentName,
    item.section,
    item.subjectName,
    item.roomNo,
    item.benchNumber,
    item.position,
  ]);

  (doc as any).autoTable({
    startY: bannerY + bannerHeight + 4,
    head: [['Sl No', 'Roll No', 'Student Name', 'Sec', 'Subject', 'Room', 'Bench', 'Position']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: 'middle',
      minCellHeight: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 46, halign: 'left' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 36, halign: 'left' },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // Footer / Page Numbers
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Student Seating Index • Page ${i} of ${totalPages}`,
      leftMargin,
      pageHeight - 6
    );
  }

  const safeName = allocation.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Student_Seating_Index_${safeName}.pdf`);
}
