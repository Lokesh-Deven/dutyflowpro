import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ExamResultRecord } from './student-marks-types';
import { getPdfPalette, DEFAULT_PALETTE_ID, PaletteId } from './pdf-palette';
import { SignatoryInfo } from './types';
import { getInvigilatorInitial } from './utils';

// Declare jspdf-autotable extension on jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

export interface GenerateMarksCardPdfOptions {
  record: ExamResultRecord;
  institutionName?: string;
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
  classAverage?: number;
}

export async function generateDigitalMarksCardPdf({
  record,
  institutionName = 'PRE-UNIVERSITY COLLEGE',
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
  classAverage = 80,
}: GenerateMarksCardPdfOptions): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const palette = getPdfPalette(paletteId);
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const leftMargin = 14;
  const rightMargin = 14;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let currentY = 12;

  // 1. Outer Borders
  doc.setDrawColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

  // 2. Institutional Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  doc.text(institutionName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 5.5;

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('STATEMENT OF MARKS / OFFICIAL SCORECARD', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${record.examTitle.toUpperCase()} • ACADEMIC YEAR ${record.academicYear}`,
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 4;

  // Horizontal separator line
  doc.setDrawColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
  currentY += 4.5;

  // 3. Student Biodata & Passport Photo Box
  const biodataStartY = currentY;
  const biodataHeight = 36;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(leftMargin, biodataStartY, contentWidth, biodataHeight, 2, 2, 'FD');

  // Photo box on right
  const photoWidth = 26;
  const photoHeight = 30;
  const photoX = pageWidth - rightMargin - photoWidth - 3;
  const photoY = biodataStartY + 3;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 1.5, 1.5, 'FD');

  if (record.photoUrl && record.photoUrl.startsWith('data:image')) {
    try {
      const format = record.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(record.photoUrl, format, photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1);
    } catch (_) {
      renderMonogram();
    }
  } else {
    renderMonogram();
  }

  function renderMonogram() {
    const initial = getInvigilatorInitial(record.studentName);
    doc.setFillColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.circle(photoX + photoWidth / 2, photoY + photoHeight / 2 - 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(initial, photoX + photoWidth / 2, photoY + photoHeight / 2 + 2.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text('OFFICIAL TRANSCRIPT', photoX + photoWidth / 2, photoY + photoHeight - 2, { align: 'center' });
  }

  // 2-Column Info Fields
  const textStartX = leftMargin + 4;
  const col2X = leftMargin + 82;
  let fieldY = biodataStartY + 6.5;
  const lineSpacing = 5.6;

  const renderField = (label: string, value: string, xPos: number, yPos: number, isHighlight = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, xPos, yPos);

    doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(isHighlight ? palette.rgb.primary[0] : 30, isHighlight ? palette.rgb.primary[1] : 41, isHighlight ? palette.rgb.primary[2] : 59);
    doc.text(value, xPos + 28, yPos);
  };

  renderField('Candidate Name:', record.studentName.toUpperCase(), textStartX, fieldY, true);
  renderField('Register No:', record.registerNumber, col2X, fieldY, true);

  fieldY += lineSpacing;
  renderField('Class & Stream:', `${record.className} • ${record.stream}`, textStartX, fieldY);
  renderField('Combination:', record.combination, col2X, fieldY, true);

  fieldY += lineSpacing;
  renderField('Date of Birth:', record.dob || '—', textStartX, fieldY);
  renderField("Father's Name:", record.fatherName || '—', col2X, fieldY);

  fieldY += lineSpacing;
  renderField('Final Result:', record.resultClassification.toUpperCase(), textStartX, fieldY, true);
  renderField('Class Rank:', record.rank ? `Rank #${record.rank}` : '—', col2X, fieldY);

  currentY = biodataStartY + biodataHeight + 5;

  // 4. Subject-wise Marks Table (autoTable)
  const tableData = record.subjects.map((sub, idx) => [
    idx + 1,
    sub.subjectName + (sub.isTopScoring ? ' ★' : ''),
    sub.category,
    sub.maxMarks,
    sub.passMarks,
    sub.marksScored,
    `${sub.percentage}%`,
    sub.grade,
    sub.status,
  ]);

  // Grand Total Summary Row
  tableData.push([
    '',
    'GRAND TOTAL',
    '',
    record.maxGrandTotal,
    Math.round(record.maxGrandTotal * 0.35),
    record.grandTotal,
    `${record.percentage}%`,
    record.subjects.some((s) => s.status === 'Fail') ? 'F' : 'PASS',
    record.resultClassification.toUpperCase(),
  ]);

  doc.autoTable({
    startY: currentY,
    head: [
      [
        'Sl',
        'Subject Title',
        'Category',
        'Max Marks',
        'Min Pass',
        'Marks Scored',
        'Percentage',
        'Grade',
        'Status',
      ],
    ],
    body: tableData,
    theme: 'grid',
    margin: { left: leftMargin, right: rightMargin },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineWidth: 0.2,
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      8: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
    },
    didParseCell: (data: any) => {
      // Highlight summary row at bottom
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
      }

      // Color code Pass / Fail / Distinction in status column
      if (data.column.index === 8 && data.row.index < tableData.length - 1) {
        const val = String(data.cell.raw).trim();
        if (val === 'Pass') {
          data.cell.styles.textColor = [16, 122, 59]; // green
        } else if (val === 'Fail') {
          data.cell.styles.textColor = [220, 38, 38]; // red
        }
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 5. Result Summary & Analytics Highlight Cards
  const cardWidth = (contentWidth - 6) / 3;
  const cardHeight = 18;

  // Card 1: Grand Total
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(leftMargin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL MARKS OBTAINED', leftMargin + cardWidth / 2, currentY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.grandTotal} / ${record.maxGrandTotal}`, leftMargin + cardWidth / 2, currentY + 11.5, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Aggregate Percentage: ${record.percentage}%`, leftMargin + cardWidth / 2, currentY + 15.5, { align: 'center' });

  // Card 2: Result Classification
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftMargin + cardWidth + 3, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('OVERALL CLASSIFICATION', leftMargin + cardWidth + 3 + cardWidth / 2, currentY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (record.resultClassification === 'Distinction') {
    doc.setTextColor(16, 185, 129); // emerald
  } else if (record.resultClassification === 'First Class') {
    doc.setTextColor(59, 130, 246); // blue
  } else {
    doc.setTextColor(217, 119, 6); // amber
  }
  doc.text(record.resultClassification.toUpperCase(), leftMargin + cardWidth + 3 + cardWidth / 2, currentY + 11.5, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(record.status === 'Pass' ? 'Passed in All Subjects' : 'Needs Backlog Clearance', leftMargin + cardWidth + 3 + cardWidth / 2, currentY + 15.5, { align: 'center' });

  // Card 3: Class Benchmark
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftMargin + (cardWidth + 3) * 2, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CLASS BENCHMARK', leftMargin + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
  const diff = record.percentage - classAverage;
  doc.text(diff >= 0 ? `+${diff.toFixed(1)}% vs Class` : `${diff.toFixed(1)}% vs Class`, leftMargin + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 11.5, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Class Mean: ${classAverage.toFixed(1)}%`, leftMargin + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 15.5, { align: 'center' });

  currentY += cardHeight + 5;

  // 6. Grading Scale Legend & Disclaimer
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, currentY, contentWidth, 14, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('GRADING SCALE & CLASSIFICATION CRITERIA:', leftMargin + 3, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Distinction: >= 85%  |  First Class: 60% - 84.9%  |  Second Class: 50% - 59.9%  |  Pass: 35% - 49.9%  |  Fail: < 35% or Absent in any subject.',
    leftMargin + 3,
    currentY + 8
  );
  doc.text(
    'Grade Scale: A+ (>=90%)  •  A (80-89%)  •  B+ (70-79%)  •  B (60-69%)  •  C+ (50-59%)  •  C (35-49%)  •  F (Fail <35%)',
    leftMargin + 3,
    currentY + 11.5
  );

  // 7. Signatures Footer
  const sigY = pageHeight - 20;

  // Candidate Signature Line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(leftMargin + 4, sigY - 2, leftMargin + 40, sigY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Candidate's Signature", leftMargin + 22, sigY + 2, { align: 'center' });

  // Controller of Examinations Line
  doc.line(pageWidth / 2 - 20, sigY - 2, pageWidth / 2 + 20, sigY - 2);
  doc.text('Controller of Examinations', pageWidth / 2, sigY + 2, { align: 'center' });

  // Principal / Head of Institution
  const principalName = signatory?.name?.trim() || '';
  const principalDesignation = signatory?.designation?.trim() || 'Principal / Head of Institution';
  doc.line(pageWidth - rightMargin - 42, sigY - 2, pageWidth - rightMargin - 4, sigY - 2);
  doc.text(principalDesignation, pageWidth - rightMargin - 23, sigY + 2, { align: 'center' });
  if (principalName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(principalName, pageWidth - rightMargin - 23, sigY + 5.5, { align: 'center' });
  }

  return doc;
}

export async function downloadDigitalMarksCardPdf(options: GenerateMarksCardPdfOptions): Promise<void> {
  const doc = await generateDigitalMarksCardPdf(options);
  const cleanName = options.record.studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanExam = options.record.examTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Marks_Card_${options.record.registerNumber}_${cleanName}_${cleanExam}.pdf`);
}
