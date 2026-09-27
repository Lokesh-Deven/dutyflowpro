import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QuestionPaperDistributionResult } from './question-paper-distribution-service';
import { getPdfPalette, DEFAULT_PALETTE_ID, PaletteId } from './pdf-palette';
import { SignatoryInfo } from './types';
import { formatAppDateWithDay, formatTimingRange12Hour } from './date-utils';

export interface GenerateQPDistributionPdfOptions {
  data: QuestionPaperDistributionResult;
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
}

export async function generateQuestionPaperDistributionPdf({
  data,
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
}: GenerateQPDistributionPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const palette = getPdfPalette(paletteId);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const leftMargin = 12;
  const rightMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 186 mm

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
  doc.text((data.institutionName || 'INSTITUTION').toUpperCase(), pageWidth / 2, textY, { align: 'center' });

  textY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(230, 235, 245);
  doc.text(
    `${data.examinationName || 'Examination'} • QUESTION PAPER DISTRIBUTION LIST`,
    pageWidth / 2,
    textY,
    { align: 'center' }
  );

  textY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const formattedDate = formatAppDateWithDay(data.date, data.date || '—');
  const formattedTime = formatTimingRange12Hour(data.startTime, data.endTime, '–');
  doc.text(
    `Date: ${formattedDate}${formattedTime ? `  |  Timings: ${formattedTime}` : ''}`,
    pageWidth / 2,
    textY,
    { align: 'center' }
  );

  // Distribution Summary Card
  const summaryY = bannerY + bannerHeight + 3.5;
  const summaryHeight = 19;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, summaryY, contentWidth, summaryHeight, 1.5, 1.5, 'FD');

  // Summary Metrics: Total Rooms | Total Students | Total Question Papers
  const colWidth = contentWidth / 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);

  doc.text('TOTAL EXAMINATION ROOMS', leftMargin + colWidth * 0.5, summaryY + 4.5, { align: 'center' });
  doc.text('TOTAL STUDENTS ALLOCATED', leftMargin + colWidth * 1.5, summaryY + 4.5, { align: 'center' });
  doc.text('TOTAL QUESTION PAPERS REQUIRED', leftMargin + colWidth * 2.5, summaryY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  doc.text(String(data.totalRooms), leftMargin + colWidth * 0.5, summaryY + 10.5, { align: 'center' });
  doc.text(String(data.totalStudents), leftMargin + colWidth * 1.5, summaryY + 10.5, { align: 'center' });

  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(String(data.totalQuestionPapers), leftMargin + colWidth * 2.5, summaryY + 10.5, { align: 'center' });

  // Subject-wise Breakdown line in the summary
  const subjectBreakdownText = data.subjectRequirements
    .map((s) => `${s.subjectName}: ${s.totalQuestionPapers} papers`)
    .join('  •  ');
  const truncSubjects = subjectBreakdownText.length > 110 ? subjectBreakdownText.substring(0, 107) + '...' : subjectBreakdownText;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Rule: 1 Student = 1 Question Paper  |  Subject Breakdown: ${truncSubjects}`,
    pageWidth / 2,
    summaryY + 16,
    { align: 'center' }
  );

  // Build Table Rows
  // Flatten rooms and their items
  const tableRows: any[] = [];

  data.rooms.forEach((room) => {
    const isMultiSubject = room.items.length > 1;

    room.items.forEach((item, index) => {
      tableRows.push([
        index === 0 ? room.roomNo : '', // Only print room name once per room block
        item.subjectName,
        item.section,
        item.regNoFrom,
        item.regNoTo,
        item.studentCount.toString(),
        item.questionPapersRequired.toString(),
      ]);
    });

    // If multiple subjects in this room, add a subtotal row for the room
    if (isMultiSubject) {
      tableRows.push([
        {
          content: `${room.roomNo} Total: ${room.totalStudents} Students  →  ${room.totalQuestionPapers} Question Papers`,
          colSpan: 7,
          styles: {
            fontStyle: 'bold',
            halign: 'center',
            fillColor: [241, 245, 249],
            textColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
            fontSize: 7.5,
          },
        },
      ]);
    }
  });

  // Grand Total Row
  tableRows.push([
    {
      content: `GRAND TOTAL: ${data.totalRooms} Rooms  |  ${data.totalStudents} Students  |  ${data.totalQuestionPapers} Question Papers Required`,
      colSpan: 7,
      styles: {
        fontStyle: 'bold',
        halign: 'center',
        fillColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
        textColor: [255, 255, 255],
        fontSize: 8.5,
      },
    },
  ]);

  (doc as any).autoTable({
    startY: summaryY + summaryHeight + 3.5,
    head: [
      [
        'Room',
        'Subject(s)',
        'Section',
        'Reg No. From',
        'Reg No. To',
        'Students',
        'Question Papers Required',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      valign: 'middle',
      minCellHeight: 6,
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 46, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: leftMargin, right: rightMargin, bottom: 25 },
    didDrawPage: (dataHook: any) => {
      // Footer page numbering
      const totalPagesExp = '{total_pages_count_string}';
      const str = `Page ${dataHook.pageNumber} of ${totalPagesExp}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated by DutyFlow • Question Paper Distribution List • ${str}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  // Calculate position for signatory on final page
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (finalY + 22 > pageHeight) {
    doc.addPage();
  }

  const signY = (finalY + 22 > pageHeight) ? 35 : finalY;

  // Signatures: Center Superintendent & Chief Superintendent
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  // Left Signatory (Room Distribution Officer / Examination Clerk)
  doc.text('Examination In-Charge / Clerk', leftMargin + 8, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Signature & Verification Stamp', leftMargin + 8, signY + 4.5);

  // Right Signatory (Chief Superintendent / Principal)
  const rightSignX = pageWidth - rightMargin - 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(signatory?.name || 'Chief Superintendent', rightSignX, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(signatory?.designation || 'Controller of Examinations', rightSignX, signY + 4.5);

  if (typeof (doc as any).putTotalPages === 'function') {
    (doc as any).putTotalPages('{total_pages_count_string}');
  }

  const safeFilename = `${data.examinationName.replace(/[^a-z0-9]/gi, '_')}_Question_Paper_Distribution.pdf`;
  doc.save(safeFilename);
}
