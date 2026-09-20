import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { Examination, SessionRoomAllocation, SignatoryInfo, SavedAllotment } from './types';
import { getPdfPalette, DEFAULT_PALETTE_ID, PaletteId } from './pdf-palette';
import { formatAppDateWithDay } from './date-utils';

export interface GenerateMasterRoomPdfOptions {
  examinations: Examination[];
  allotment: SavedAllotment;
  institutionName?: string;
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
}

interface GenerateRoomPdfOptions {
  examination: Examination;
  allocation: SessionRoomAllocation;
  institutionName?: string;
  examName?: string;
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
}

/**
 * 1. Generate Room Allocation PDF
 * Formatted tabular printable document with Invigilators' Duty and Relievers' Duty.
 */
export async function generateRoomAllocationPdf({
  examination,
  allocation,
  institutionName = 'Institution Name',
  examName = 'Examination',
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
}: GenerateRoomPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const palette = getPdfPalette(paletteId);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const leftMargin = 14;
  const rightMargin = 14;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 182 mm

  // Header Banner
  const bannerY = 12;
  const bannerHeight = 25;
  const stripeHeight = 1.4;

  doc.setFillColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  doc.rect(leftMargin, bannerY, contentWidth, bannerHeight, 'F');

  doc.setFillColor(palette.rgb.stripe[0], palette.rgb.stripe[1], palette.rgb.stripe[2]);
  doc.rect(leftMargin, bannerY + bannerHeight - stripeHeight, contentWidth, stripeHeight, 'F');

  let textY = bannerY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(institutionName.toUpperCase(), pageWidth / 2, textY, { align: 'center' });

  textY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(230, 235, 245);
  doc.text(examName, pageWidth / 2, textY, { align: 'center' });

  textY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("EXAMINATION DUTY ROOM ALLOCATION", pageWidth / 2, textY, { align: 'center' });

  // Metadata Box
  const metaY = bannerY + bannerHeight + 4;
  const metaHeight = 16;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(leftMargin, metaY, contentWidth, metaHeight, 1.5, 1.5, 'FD');

  const formattedDate = formatAppDateWithDay(examination.date, 'Examination Date');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  // Col 1: Date
  doc.text("Date:", leftMargin + 4, metaY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, leftMargin + 14, metaY + 6);

  // Col 2: Timings
  doc.setFont('helvetica', 'bold');
  doc.text("Timings:", leftMargin + 100, metaY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${examination.startTime} to ${examination.endTime}`, leftMargin + 115, metaY + 6);

  // Row 2: Subject & Requirements
  doc.setFont('helvetica', 'bold');
  doc.text("Subject:", leftMargin + 4, metaY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(examination.subject, leftMargin + 18, metaY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text("Total Rooms:", leftMargin + 100, metaY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${allocation.invigilatorDuties.length} Rooms  |  ${allocation.relieverDuties.length} Relievers`, leftMargin + 122, metaY + 12);

  // 1. Invigilators' Duty Table
  let currentY = metaY + metaHeight + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text("1. INVIGILATORS' DUTY", leftMargin, currentY);

  currentY += 2;

  const invigilatorRows = allocation.invigilatorDuties.map((duty, idx) => [
    (idx + 1).toString(),
    duty.room,
    duty.invigilatorName,
    duty.designation || '',
    '', // Signature placeholder
  ]);

  (doc as any).autoTable({
    startY: currentY,
    head: [['Sl No', 'Room No', 'Invigilator Name', 'Designation', 'Signature']],
    body: invigilatorRows,
    theme: 'grid',
    headStyles: {
      fillColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      valign: 'middle',
      minCellHeight: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 62, halign: 'left' },
      3: { cellWidth: 42, halign: 'left' },
      4: { cellWidth: 36, halign: 'center' },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check if Relievers' Duty table fits on current page
  if (currentY + 45 > pageHeight) {
    doc.addPage();
    currentY = 16;
  }

  // 2. Relievers' Duty Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text("2. RELIEVERS' DUTY", leftMargin, currentY);

  currentY += 2;

  const relieverRows = allocation.relieverDuties.map((duty, idx) => [
    (idx + 1).toString(),
    duty.relieverName,
    duty.designation || '',
    duty.rooms.join(', '),
    '', // Signature placeholder
  ]);

  (doc as any).autoTable({
    startY: currentY,
    head: [['Sl No', 'Reliever Name', 'Designation', 'Assigned Room Nos', 'Signature']],
    body: relieverRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      valign: 'middle',
      minCellHeight: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 40, halign: 'left' },
      3: { cellWidth: 46, halign: 'left' },
      4: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Signatory Block
  if (currentY + 25 > pageHeight) {
    doc.addPage();
    currentY = 25;
  }

  const sigName = signatory?.name || 'Chief Superintendent';
  const sigDesig = signatory?.designation || 'Principal / Examination In-Charge';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(sigName, pageWidth - rightMargin - 4, currentY + 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(sigDesig, pageWidth - rightMargin - 4, currentY + 16, { align: 'right' });

  // Page Numbers
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `DutyFlow Room Allocation • Page ${i} of ${totalPages}`,
      leftMargin,
      pageHeight - 6
    );
  }

  const safeSubject = examination.subject.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Room_Allocation_${safeSubject}.pdf`);
}

/**
 * 2. Generate Master Room Allocations PDF
 * One single consolidated PDF containing all room allocations across all examination sessions.
 */
export async function generateMasterRoomAllocationsPdf({
  examinations,
  allotment,
  institutionName = 'Institution Name',
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
}: GenerateMasterRoomPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const palette = getPdfPalette(paletteId);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const leftMargin = 14;
  const rightMargin = 14;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 182 mm

  const sortedExams = [...examinations].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.startTime.localeCompare(b.startTime);
  });

  const roomAllocations = allotment.roomAllocations || {};

  sortedExams.forEach((exam, sessionIdx) => {
    if (sessionIdx > 0) {
      doc.addPage();
    }

    const allocation = roomAllocations[exam.id];
    const examTitle = exam.examName || allotment.name || 'Examination';

    // Header Banner
    const bannerY = 12;
    const bannerHeight = 25;
    const stripeHeight = 1.4;

    doc.setFillColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.rect(leftMargin, bannerY, contentWidth, bannerHeight, 'F');

    doc.setFillColor(palette.rgb.stripe[0], palette.rgb.stripe[1], palette.rgb.stripe[2]);
    doc.rect(leftMargin, bannerY + bannerHeight - stripeHeight, contentWidth, stripeHeight, 'F');

    let textY = bannerY + 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(institutionName.toUpperCase(), pageWidth / 2, textY, { align: 'center' });

    textY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(230, 235, 245);
    doc.text(examTitle, pageWidth / 2, textY, { align: 'center' });

    textY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("MASTER ROOM ALLOCATION", pageWidth / 2, textY, { align: 'center' });

    // Metadata Box
    const metaY = bannerY + bannerHeight + 4;
    const metaHeight = 16;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, metaY, contentWidth, metaHeight, 1.5, 1.5, 'FD');

    const formattedDate = formatAppDateWithDay(exam.date, 'Examination Date');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    doc.text("Date:", leftMargin + 4, metaY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, leftMargin + 14, metaY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text("Timings:", leftMargin + 100, metaY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`${exam.startTime} to ${exam.endTime}`, leftMargin + 115, metaY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text("Subject:", leftMargin + 4, metaY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(exam.subject, leftMargin + 18, metaY + 12);

    doc.setFont('helvetica', 'bold');
    doc.text("Status:", leftMargin + 100, metaY + 12);
    doc.setFont('helvetica', 'normal');
    const statusText = allocation?.status === 'Locked'
      ? 'Locked'
      : allocation?.status === 'Generated'
      ? 'Generated'
      : 'Pending Allocation';
    doc.text(statusText, leftMargin + 113, metaY + 12);

    let currentY = metaY + metaHeight + 6;

    if (!allocation || allocation.status === 'Pending' || allocation.invigilatorDuties.length === 0) {
      // Pending notice
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(leftMargin, currentY, contentWidth, 24, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(185, 28, 28);
      doc.text("Room Allocation Pending for this Session", leftMargin + 8, currentY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(127, 29, 29);
      doc.text(`Required Invigilators: ${exam.rooms || 0}  |  Required Relievers: ${exam.relievers || 0}`, leftMargin + 8, currentY + 16);
      currentY += 32;
    } else {
      // 1. Invigilators Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`1. INVIGILATORS' DUTY (${allocation.invigilatorDuties.length} Rooms)`, leftMargin, currentY);

      currentY += 2;

      const invigilatorRows = allocation.invigilatorDuties.map((duty, idx) => [
        (idx + 1).toString(),
        duty.room,
        duty.invigilatorName,
        duty.designation || '',
        '',
      ]);

      (doc as any).autoTable({
        startY: currentY,
        head: [['Sl No', 'Room No', 'Invigilator Name', 'Designation', 'Signature']],
        body: invigilatorRows,
        theme: 'grid',
        headStyles: {
          fillColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [30, 41, 59],
          valign: 'middle',
          minCellHeight: 8.5,
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 62, halign: 'left' },
          3: { cellWidth: 42, halign: 'left' },
          4: { cellWidth: 36, halign: 'center' },
        },
        margin: { left: leftMargin, right: rightMargin },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      if (currentY + 45 > pageHeight) {
        doc.addPage();
        currentY = 16;
      }

      // 2. Relievers Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`2. RELIEVERS' DUTY (${allocation.relieverDuties.length} Relievers)`, leftMargin, currentY);

      currentY += 2;

      const relieverRows = allocation.relieverDuties.map((duty, idx) => [
        (idx + 1).toString(),
        duty.relieverName,
        duty.designation || '',
        duty.rooms.join(', '),
        '',
      ]);

      (doc as any).autoTable({
        startY: currentY,
        head: [['Sl No', 'Reliever Name', 'Designation', 'Assigned Room Nos', 'Signature']],
        body: relieverRows,
        theme: 'grid',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [30, 41, 59],
          valign: 'middle',
          minCellHeight: 8.5,
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 40, halign: 'left' },
          3: { cellWidth: 46, halign: 'left' },
          4: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: leftMargin, right: rightMargin },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Signatory
    if (currentY + 22 > pageHeight) {
      doc.addPage();
      currentY = 20;
    }

    const sigName = signatory?.name || 'Chief Superintendent';
    const sigDesig = signatory?.designation || 'Principal / Examination In-Charge';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(sigName, pageWidth - rightMargin - 4, currentY + 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(sigDesig, pageWidth - rightMargin - 4, currentY + 14, { align: 'right' });
  });

  // Page Numbers
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `DutyFlow Master Room Allocation • ${allotment.name} • Page ${i} of ${totalPages}`,
      leftMargin,
      pageHeight - 6
    );
  }

  const safeName = allotment.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Master_Room_Allocations_${safeName}.pdf`);
}

/**
 * 3. Generate Reliever's Duty Slips PDF
 * Exactly 2 Slips Per Page designed specifically for printing and cutting.
 */
export async function generateRelieverDutySlipsPdf({
  examination,
  allocation,
  institutionName = 'Institution Name',
  examName = 'Examination',
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
}: GenerateRoomPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const palette = getPdfPalette(paletteId);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const leftMargin = 12;
  const rightMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 186 mm

  const relievers = allocation.relieverDuties;
  if (relievers.length === 0) {
    throw new Error("No relievers found in this allocation.");
  }

  // Create room to regular invigilator map
  const roomToInvigilatorMap: Record<string, string> = {};
  allocation.invigilatorDuties.forEach((d) => {
    roomToInvigilatorMap[d.room] = d.invigilatorName;
  });

  const formattedDate = formatAppDateWithDay(examination.date, 'Examination Date');

  // Height allocated for each slip is exactly half page (~134mm)
  const slipHeight = 132;
  const slipPositions = [
    { startY: 8 },    // Top slip
    { startY: 150 },  // Bottom slip
  ];

  relievers.forEach((reliever, idx) => {
    const slotInPage = idx % 2;
    if (idx > 0 && slotInPage === 0) {
      doc.addPage();
    }

    const { startY } = slipPositions[slotInPage];

    // Outer Slip Border
    doc.setDrawColor(180, 190, 205);
    doc.setLineWidth(0.4);
    doc.roundedRect(leftMargin, startY, contentWidth, slipHeight, 2, 2, 'S');

    // Slip Header Box
    const headerH = 18;
    doc.setFillColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.rect(leftMargin, startY, contentWidth, headerH, 'F');

    // Institution Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(institutionName.toUpperCase(), pageWidth / 2, startY + 6, { align: 'center' });

    // Examination Name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(examName, pageWidth / 2, startY + 11, { align: 'center' });

    // Title: RELIEVER'S DUTY SLIP
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("RELIEVER'S DUTY SLIP", pageWidth / 2, startY + 16, { align: 'center' });

    // Reliever Information Grid
    const infoY = startY + headerH + 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    // Row 1
    doc.text("Reliever's Name:", leftMargin + 4, infoY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(reliever.relieverName, leftMargin + 28, infoY + 3.5);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text("Designation:", leftMargin + 105, infoY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.text(reliever.designation || 'Lecturer', leftMargin + 125, infoY + 3.5);

    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.text("Date:", leftMargin + 4, infoY + 8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, leftMargin + 14, infoY + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.text("Timings:", leftMargin + 70, infoY + 8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${examination.startTime} to ${examination.endTime}`, leftMargin + 83, infoY + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.text("Subject:", leftMargin + 130, infoY + 8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(examination.subject, leftMargin + 143, infoY + 8.5);

    // Table of Assigned Rooms
    const tableStartY = infoY + 12;
    const roomRows = reliever.rooms.map((rm, rIdx) => [
      (rIdx + 1).toString(),
      rm,
      roomToInvigilatorMap[rm] || 'Invigilator',
      '', // Blank for handwritten timings
      '', // Blank for handwritten signature
    ]);

    (doc as any).autoTable({
      startY: tableStartY,
      head: [['Sl No', 'Room No', 'Name of the Invigilator', 'Timings', "Invigilator's Sign"]],
      body: roomRows,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 6,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        valign: 'middle',
        minCellHeight: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 64, halign: 'left' },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 34, halign: 'center' },
      },
      margin: { left: leftMargin + 4, right: rightMargin + 4 },
      tableWidth: contentWidth - 8,
    });

    // Slip Bottom: Reliever Signature
    const slipBottomY = startY + slipHeight - 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Verified & Relieved as noted above", leftMargin + 6, slipBottomY + 4);

    doc.setFont('helvetica', 'bold');
    doc.text("Signature of the Reliever:", pageWidth - rightMargin - 52, slipBottomY);
    doc.setFont('helvetica', 'normal');
    doc.text(`(${reliever.relieverName})`, pageWidth - rightMargin - 40, slipBottomY + 5, { align: 'center' });

    // Draw dotted cut line between Slip 1 and Slip 2 if on top slot
    if (slotInPage === 0 && idx + 1 < relievers.length) {
      const cutLineY = 144;
      doc.setDrawColor(160, 174, 192);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(leftMargin, cutLineY, pageWidth - rightMargin, cutLineY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text("✂ - - - - - - - - - - - - - - - - - - - - - - - - - Cut along this line - - - - - - - - - - - - - - - - - - - - - - - - - ✂", pageWidth / 2, cutLineY - 0.5, { align: 'center' });
      doc.setLineDashPattern([], 0); // reset line dash
    }
  });

  const safeSubject = examination.subject.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Reliever_Duty_Slips_${safeSubject}.pdf`);
}
