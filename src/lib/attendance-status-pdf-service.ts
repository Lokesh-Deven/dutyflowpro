import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { RoomAttendanceSubmission } from './invigilator-portal-types';
import { getPdfPalette, DEFAULT_PALETTE_ID, PaletteId } from './pdf-palette';
import { SignatoryInfo } from './types';

export interface RoomStatusReportItem {
  roomNo: string;
  invigilator: string;
  subject: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  source: 'Invigilator' | 'Admin' | 'Manual' | 'Pending';
  status: 'Completed' | 'Pending';
  submittedAt?: string;
}

export interface GenerateAttendanceStatusPdfOptions {
  institutionName: string;
  examName: string;
  dateStr: string;
  sessionTime: string;
  items: RoomStatusReportItem[];
  submissions: RoomAttendanceSubmission[];
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
}

export async function generateAttendanceStatusPdf({
  institutionName,
  examName,
  dateStr,
  sessionTime,
  items,
  submissions,
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
}: GenerateAttendanceStatusPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const palette = getPdfPalette(paletteId);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const leftMargin = 12;
  const rightMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 186 mm

  let currentY = 14;

  // 1. Institutional Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(institutionName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFontSize(11);
  doc.setTextColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  doc.text(examName, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('CENTRAL ROOM ATTENDANCE STATUS & ABSENTEES REPORT', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  // Horizontal Divider Line
  doc.setDrawColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  doc.setLineWidth(0.6);
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
  currentY += 4;

  // 2. Metadata Bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`Date: ${dateStr}`, leftMargin, currentY);
  doc.text(`Session Timings: ${sessionTime}`, leftMargin + 65, currentY);
  doc.text(`Generated: ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`, pageWidth - rightMargin, currentY, { align: 'right' });
  currentY += 6;

  // 3. KPI Executive Summary Box
  let totalRooms = items.length;
  let completedRooms = items.filter((i) => i.status === 'Completed').length;
  let totalStudents = 0;
  let totalPresent = 0;
  let totalAbsent = 0;

  items.forEach((i) => {
    totalStudents += i.totalStudents;
    totalPresent += i.presentCount;
    totalAbsent += i.absentCount;
  });

  const rate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(leftMargin, currentY, contentWidth, 14, 2, 2, 'FD');

  const colW = contentWidth / 5;
  const kpiData = [
    { label: 'TOTAL ROOMS', val: `${completedRooms} / ${totalRooms}` },
    { label: 'TOTAL STRENGTH', val: `${totalStudents}` },
    { label: 'TOTAL PRESENT', val: `${totalPresent}` },
    { label: 'TOTAL ABSENT', val: `${totalAbsent}` },
    { label: 'ATTENDANCE RATE', val: `${rate}%` },
  ];

  kpiData.forEach((kpi, idx) => {
    const kpiX = leftMargin + idx * colW + colW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX, currentY + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(idx === 3 && totalAbsent > 0 ? 225 : 15, idx === 3 && totalAbsent > 0 ? 29 : 23, idx === 3 && totalAbsent > 0 ? 72 : 42);
    doc.text(kpi.val, kpiX, currentY + 11, { align: 'center' });
  });

  currentY += 18;

  // 4. Room-wise Attendance Completion Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. ROOM-WISE COMPLETION & COLLECTION SOURCE', leftMargin, currentY);
  currentY += 2;

  const roomTableBody = items.map((item, idx) => [
    idx + 1,
    `Room ${item.roomNo}`,
    item.invigilator,
    item.subject,
    item.totalStudents,
    item.presentCount,
    item.absentCount,
    item.source === 'Pending' ? 'Pending Entry' : `Via ${item.source}`,
    item.status.toUpperCase(),
  ]);

  (doc as any).autoTable({
    startY: currentY,
    head: [
      ['#', 'Room No', 'Allocated Invigilator', 'Subject', 'Total', 'Present', 'Absent', 'Collection Source', 'Status'],
    ],
    body: roomTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      2: { cellWidth: 42 },
      3: { cellWidth: 32 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'center', cellWidth: 14 },
      7: { halign: 'center', cellWidth: 26 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. Absentees Section
  // Compile all absentees from submissions
  const absenteesList: {
    rollNo: string;
    studentName: string;
    section: string;
    subject: string;
    roomNo: string;
    bench: string;
  }[] = [];

  submissions.forEach((sub) => {
    sub.records?.forEach((rec) => {
      if (rec.status === 'Absent') {
        absenteesList.push({
          rollNo: rec.registerNumber,
          studentName: rec.studentName,
          section: rec.section,
          subject: rec.subject || sub.subjectName,
          roomNo: sub.roomNo,
          bench: rec.benchNumber || '—',
        });
      }
    });
  });

  // Sort by room then rollNo
  absenteesList.sort((a, b) => {
    if (a.roomNo !== b.roomNo) return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
    return a.rollNo.localeCompare(b.rollNo);
  });

  // Check if we need page break for Absentees
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`2. DETAILED ABSENTEES ROSTER (${absenteesList.length} Candidates)`, leftMargin, currentY);
  currentY += 2;

  if (absenteesList.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Nil absentees. 100% attendance recorded across all examination rooms.', leftMargin, currentY + 5);
    currentY += 12;
  } else {
    const absenteesTableBody = absenteesList.map((st, idx) => [
      idx + 1,
      st.studentName,
      st.section,
      st.rollNo,
      st.subject,
      `Room ${st.roomNo}`,
      st.bench,
      'ABSENT',
    ]);

    (doc as any).autoTable({
      startY: currentY,
      head: [['#', 'Student Name', 'Section', 'Roll No', 'Subject', 'Room No', 'Bench', 'Status']],
      body: absenteesTableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [225, 29, 72], // Rose red
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold', cellWidth: 46 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
        4: { cellWidth: 38 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 16 },
        7: { halign: 'center', fontStyle: 'bold', textColor: [225, 29, 72], cellWidth: 14 },
      },
      margin: { left: leftMargin, right: rightMargin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. Signatory Footer
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 20;
  }

  const sigY = Math.max(currentY + 10, pageHeight - 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Left: Superintendent
  doc.text('Verified by Invigilation Control Room', leftMargin, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Date & Verification Seal', leftMargin, sigY + 5);

  // Right: Chief Signatory
  const sigName = signatory?.name || 'Chief Superintendent';
  const sigDesig = signatory?.designation || 'Principal / Controller of Examinations';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(sigName, pageWidth - rightMargin, sigY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(sigDesig, pageWidth - rightMargin, sigY + 5, { align: 'right' });

  // Save PDF
  doc.save(`DutyFlow_Attendance_Status_Report_${dateStr}.pdf`);
}
