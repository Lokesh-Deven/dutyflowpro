import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ExaminationTimetable } from './examination-timetable-types';
import { SignatoryInfo } from './types';
import { formatDateToDDMMYYYY } from './examination-timetable-service';
import { PaletteId } from './pdf-palette';

export interface GenerateTimetablePdfOptions {
  timetable: ExaminationTimetable;
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
}

export async function generateExaminationTimetablePdf({
  timetable,
  signatory,
}: GenerateTimetablePdfOptions): Promise<void> {
  // A4 Landscape: 297mm width x 210mm height
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Strict User Specified Margins
  // Top: 3 cm (30 mm)
  // Left: 3 cm (30 mm)
  // Right: 3 cm (30 mm)
  // Bottom: 5 cm (50 mm)
  const leftMargin = 30;
  const rightMargin = 30;
  const topMargin = 30;
  const bottomMargin = 50;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 237 mm
  const maxTableBottomY = pageHeight - bottomMargin; // 160 mm

  // Exact Color Tokens matching the Timetable Preview Sheet
  const COLOR_NAVY_PRIMARY: [number, number, number] = [30, 42, 94];     // #1E2A5E (Institution Name & Table Super-Header)
  const COLOR_NAVY_CLASSES: [number, number, number] = [24, 35, 77];     // #18234D (Class 1, Class 2 Header in Preview)
  const COLOR_NAVY_TIMINGS: [number, number, number] = [36, 51, 112];    // #243370 (Start Time, End Time Header in Preview)
  const COLOR_SLATE_700: [number, number, number] = [51, 65, 85];        // #334155 (Exam Name & Cell Text)
  const COLOR_SLATE_900: [number, number, number] = [15, 23, 42];        // #0F172A (Date & Subject Bold Text)
  const COLOR_SLATE_500: [number, number, number] = [100, 116, 139];     // #64748B (Sl. No. Text)
  const COLOR_SLATE_400: [number, number, number] = [148, 163, 184];     // #94A3B8 (Footnotes & Signatory Disclaimer)
  const COLOR_SLATE_200: [number, number, number] = [226, 232, 240];     // #E2E8F0 (Header Subtext & Cell Grid Borders)
  const COLOR_SLATE_300: [number, number, number] = [203, 213, 225];     // #CBD5E1 (Badge Border & Table Border)
  const COLOR_SLATE_100: [number, number, number] = [241, 245, 249];     // #F1F5F9 (TIMETABLE Badge Fill)
  const COLOR_SLATE_50: [number, number, number] = [248, 250, 252];      // #F8FAFC (Alternating Row Background)
  const COLOR_WHITE: [number, number, number] = [255, 255, 255];
  const COLOR_HEADER_DIVIDER: [number, number, number] = [30, 41, 59];   // #1E293B (Solid border-b-2 border-slate-800)

  // 1. Institution Name (Prominent & Uppercase) — Matching Preview <h1 className="font-headline text-xl font-black uppercase tracking-wide text-[#1E2A5E]">
  let currentY = topMargin + 4;
  const institution = (timetable.institutionName || 'NAME OF THE INSTITUTION').toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(COLOR_NAVY_PRIMARY[0], COLOR_NAVY_PRIMARY[1], COLOR_NAVY_PRIMARY[2]);
  doc.text(institution, pageWidth / 2, currentY, { align: 'center' });

  // 2. Examination Name — Matching Preview <h2 className="font-bold text-sm text-slate-700">
  currentY += 6.0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2]);
  doc.text(timetable.examinationName || 'NAME OF THE EXAMINATION', pageWidth / 2, currentY, { align: 'center' });

  // 3. Permanent Title: TIMETABLE Badge — Matching Preview <span className="bg-slate-100 text-[#1E2A5E] border border-slate-300 font-black text-xs px-3 py-1 rounded tracking-wider uppercase font-headline">TIMETABLE</span>
  currentY += 6.5;
  const titleText = 'TIMETABLE';
  const badgeWidth = 36;
  const badgeHeight = 5.6;

  doc.setFillColor(COLOR_SLATE_100[0], COLOR_SLATE_100[1], COLOR_SLATE_100[2]);
  doc.setDrawColor(COLOR_SLATE_300[0], COLOR_SLATE_300[1], COLOR_SLATE_300[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect((pageWidth - badgeWidth) / 2, currentY - 3.8, badgeWidth, badgeHeight, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.0);
  doc.setTextColor(COLOR_NAVY_PRIMARY[0], COLOR_NAVY_PRIMARY[1], COLOR_NAVY_PRIMARY[2]);
  doc.text(titleText, pageWidth / 2, currentY, { align: 'center' });

  // 4. Solid Header Divider Line — Matching Preview <div className="text-center space-y-1.5 pb-4 border-b-2 border-slate-800">
  currentY += 5.5;
  doc.setDrawColor(COLOR_HEADER_DIVIDER[0], COLOR_HEADER_DIVIDER[1], COLOR_HEADER_DIVIDER[2]);
  doc.setLineWidth(0.55); // border-b-2
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);

  currentY += 4.5; // Gap before table starts

  // 5. Build Dynamic Autotable Headers and Rows
  const classes = timetable.classes && timetable.classes.length > 0
    ? timetable.classes
    : [{ id: 'class-1', name: 'Class 1' }];

  // Multi-tier header:
  // Row 0: Sl. No., Date, Day, Subject (bg-[#1E2A5E]), and Classes (bg-[#18234D])
  const headRow0: any[] = [
    {
      content: 'Sl. No.',
      rowSpan: 2,
      styles: {
        halign: 'center',
        valign: 'middle',
        fillColor: COLOR_NAVY_PRIMARY,
        textColor: COLOR_WHITE,
        fontStyle: 'bold',
        lineColor: COLOR_SLATE_400,
        lineWidth: 0.2,
      },
    },
    {
      content: 'Date',
      rowSpan: 2,
      styles: {
        halign: 'center',
        valign: 'middle',
        fillColor: COLOR_NAVY_PRIMARY,
        textColor: COLOR_WHITE,
        fontStyle: 'bold',
        lineColor: COLOR_SLATE_400,
        lineWidth: 0.2,
      },
    },
    {
      content: 'Day',
      rowSpan: 2,
      styles: {
        halign: 'center',
        valign: 'middle',
        fillColor: COLOR_NAVY_PRIMARY,
        textColor: COLOR_WHITE,
        fontStyle: 'bold',
        lineColor: COLOR_SLATE_400,
        lineWidth: 0.2,
      },
    },
    {
      content: 'Subject',
      rowSpan: 2,
      styles: {
        halign: 'left',
        valign: 'middle',
        fillColor: COLOR_NAVY_PRIMARY,
        textColor: COLOR_WHITE,
        fontStyle: 'bold',
        lineColor: COLOR_SLATE_400,
        lineWidth: 0.2,
      },
    },
  ];

  classes.forEach((c) => {
    headRow0.push({
      content: c.name,
      colSpan: 2,
      styles: {
        halign: 'center',
        valign: 'middle',
        fillColor: COLOR_NAVY_CLASSES, // Deeper navy for Class columns in preview
        textColor: COLOR_WHITE,
        fontStyle: 'bold',
        lineColor: COLOR_SLATE_400,
        lineWidth: 0.2,
      },
    });
  });

  // Row 1: Start Time, End Time for each class (bg-[#243370] text-slate-200)
  const headRow1: any[] = [];
  classes.forEach(() => {
    headRow1.push({
      content: 'Start Time',
      styles: {
        halign: 'center',
        valign: 'middle',
        fillColor: COLOR_NAVY_TIMINGS, // #243370
        textColor: COLOR_SLATE_200,    // text-slate-200
        fontStyle: 'normal',
        lineColor: COLOR_SLATE_400,
        lineWidth: 0.2,
      },
    });
    headRow1.push({
      content: 'End Time',
      styles: {
        halign: 'center',
        valign: 'middle',
        fillColor: COLOR_NAVY_TIMINGS, // #243370
        textColor: COLOR_SLATE_200,    // text-slate-200
        fontStyle: 'normal',
        lineColor: COLOR_SLATE_400,
        lineWidth: 0.2,
      },
    });
  });

  // Body data rows sorted chronologically
  const sortedRows = [...timetable.rows].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  const bodyData = sortedRows.map((row, index) => {
    const displayDate = row.displayDate || formatDateToDDMMYYYY(row.date) || '—';
    const day = row.day || '—';
    const subjectsStr = (row.subjects && row.subjects.length > 0)
      ? row.subjects.join(' / ')
      : '—';

    const rowCells: any[] = [
      String(index + 1),
      displayDate,
      day,
      subjectsStr,
    ];

    const hasExam = Boolean(row.subjects && row.subjects.length > 0);
    classes.forEach((c) => {
      const timing = row.timings ? row.timings[c.id] : undefined;
      const startVal = (!hasExam || !timing?.startTime || timing.startTime === '-' || timing.startTime === '—') ? '-' : timing.startTime;
      const endVal = (!hasExam || !timing?.endTime || timing.endTime === '-' || timing.endTime === '—') ? '-' : timing.endTime;
      rowCells.push(startVal);
      rowCells.push(endVal);
    });

    return rowCells;
  });

  // Intelligent scaling calculation so that table fits strictly between currentY and maxTableBottomY (160 mm)
  const rowCount = Math.max(1, bodyData.length);
  const availableTableHeight = maxTableBottomY - currentY; // around 100mm to 105mm
  const estimatedRowHeight = Math.min(8.5, Math.max(4.5, (availableTableHeight - 14) / rowCount));
  const dynamicFontSize = rowCount > 12 ? 7.5 : rowCount > 8 ? 8.5 : 9;
  const dynamicCellPadding = rowCount > 12 ? 1.4 : rowCount > 8 ? 2.0 : 2.8;

  // Specific column width allocations
  const slNoWidth = 14;
  const dateWidth = 25;
  const dayWidth = 25;
  const classTimingPairWidth = 23 * 2; // 46mm per class
  const totalClassesWidth = classTimingPairWidth * classes.length;
  const subjectWidth = Math.max(45, contentWidth - slNoWidth - dateWidth - dayWidth - totalClassesWidth);

  const columnStyles: Record<number, any> = {
    0: { cellWidth: slNoWidth, halign: 'center' },
    1: { cellWidth: dateWidth, halign: 'center' },
    2: { cellWidth: dayWidth, halign: 'center' },
    3: { cellWidth: subjectWidth, halign: 'left' },
  };

  let colIdx = 4;
  classes.forEach(() => {
    columnStyles[colIdx] = { cellWidth: classTimingPairWidth / 2, halign: 'center' };
    columnStyles[colIdx + 1] = { cellWidth: classTimingPairWidth / 2, halign: 'center' };
    colIdx += 2;
  });

  (doc as any).autoTable({
    startY: currentY,
    margin: { left: leftMargin, right: rightMargin },
    head: [headRow0, headRow1],
    body: bodyData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: dynamicFontSize,
      cellPadding: dynamicCellPadding,
      minCellHeight: estimatedRowHeight,
      lineColor: COLOR_SLATE_200, // exact border-slate-200 cell grid borders
      lineWidth: 0.25,
      textColor: COLOR_SLATE_700,
      valign: 'middle',
    },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        // Alternating row background matching preview: even pure white, odd slate-50/70
        if (data.row.index % 2 === 1) {
          data.cell.styles.fillColor = COLOR_SLATE_50;
        } else {
          data.cell.styles.fillColor = COLOR_WHITE;
        }

        // Cell border styling
        data.cell.styles.lineColor = COLOR_SLATE_200;
        data.cell.styles.lineWidth = 0.25;

        // Typography per column matching preview exactly
        if (data.column.index === 0) {
          // Sl. No. (text-slate-500 font-mono)
          data.cell.styles.textColor = COLOR_SLATE_500;
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 1) {
          // Date (font-bold text-slate-900 font-mono)
          data.cell.styles.textColor = COLOR_SLATE_900;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 2) {
          // Day (text-slate-700)
          data.cell.styles.textColor = COLOR_SLATE_700;
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 3) {
          // Subject (text-left font-bold text-slate-900 px-3)
          data.cell.styles.textColor = COLOR_SLATE_900;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'left';
        } else {
          // Timings (font-mono text-slate-700)
          data.cell.styles.textColor = COLOR_SLATE_700;
          data.cell.styles.halign = 'center';
        }
      }
    },
    tableWidth: contentWidth,
  });

  // 6. Authorised Signatory Section
  // Positioned strictly in the reserved 5 cm (50 mm) bottom area (Y: 160mm to 210mm)
  // At the bottom-right corner aligned with the right content margin (267 mm)
  const signatoryX = pageWidth - rightMargin; // 267 mm
  const signatoryStartY = 175; // comfortably within the 160-210mm bottom margin

  // Left side reference note matching preview
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_SLATE_400[0], COLOR_SLATE_400[1], COLOR_SLATE_400[2]);
  doc.text('DutyFlow Academic Timetable System', leftMargin, signatoryStartY + 9.5, { align: 'left' });

  // Right side Signatory Name / Title matching preview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_SLATE_900[0], COLOR_SLATE_900[1], COLOR_SLATE_900[2]);

  if (signatory?.name && signatory.name.trim().length > 0) {
    doc.text(signatory.name.trim(), signatoryX, signatoryStartY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2]);
    doc.text(
      signatory.designation ? signatory.designation.trim() : 'Authorised Signatory',
      signatoryX,
      signatoryStartY + 4.5,
      { align: 'right' }
    );
  } else {
    doc.text('Authorised Signatory', signatoryX, signatoryStartY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_SLATE_700[0], COLOR_SLATE_700[1], COLOR_SLATE_700[2]);
    doc.text(
      signatory?.designation ? `[${signatory.designation.trim()}]` : '[Principal / Controller of Examinations]',
      signatoryX,
      signatoryStartY + 4.5,
      { align: 'right' }
    );
  }

  // Exact Subtext matching preview: "Digitally Generated Document. Signature Not Required."
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_SLATE_400[0], COLOR_SLATE_400[1], COLOR_SLATE_400[2]);
  doc.text(
    'Digitally Generated Document. Signature Not Required.',
    signatoryX,
    signatoryStartY + 9.5,
    { align: 'right' }
  );

  // Trigger browser download
  const safeFilename = `${(timetable.examinationName || 'Examination').replace(/[^a-zA-Z0-9_-]/g, '_')}_Timetable.pdf`;
  doc.save(safeFilename);
}
