import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { StudentMasterProfile } from './student-master-types';
import { ExaminationTimetable, TimetableRow } from './examination-timetable-types';
import { getPdfPalette, DEFAULT_PALETTE_ID, PaletteId } from './pdf-palette';
import { SignatoryInfo } from './types';

export interface HallTicketScheduleItem {
  date: string;
  day: string;
  subjectCode?: string;
  subjectName: string;
  timing: string;
}

export interface GenerateHallTicketOptions {
  institutionName: string;
  examName: string;
  students: StudentMasterProfile[];
  timetable?: ExaminationTimetable | null;
  signatory?: SignatoryInfo;
  paletteId?: PaletteId;
  instructions?: string[];
}

const DEFAULT_INSTRUCTIONS = [
  'Candidates must bring this Hall Ticket and College ID Card to every examination session.',
  'Candidates should occupy their allotted seats at least 15 minutes prior to the commencement of the exam.',
  'No candidate will be allowed into the examination hall 30 minutes after the scheduled start time.',
  'Electronic gadgets including mobile phones, smartwatches, and programmable calculators are strictly prohibited.',
  'Candidates must enter their Register Number and Answer Booklet Serial Number correctly on the attendance sheet.',
];

/**
 * Extracts student schedule rows from an Examination Timetable matching the student's class and combination.
 */
export function getStudentTimetableSchedule(
  student: StudentMasterProfile,
  timetable?: ExaminationTimetable | null
): HallTicketScheduleItem[] {
  if (!timetable || !timetable.rows || timetable.rows.length === 0) {
    // Fallback schedule based on student's combination
    const comb = (student.combination || 'PCMB').toUpperCase();
    const subjects: string[] = ['English', 'Language II'];

    if (comb.includes('PCMB')) subjects.push('Physics', 'Chemistry', 'Mathematics', 'Biology');
    else if (comb.includes('PCMC')) subjects.push('Physics', 'Chemistry', 'Mathematics', 'Computer Science');
    else if (comb.includes('CEBA')) subjects.push('Computer Science', 'Economics', 'Business Studies', 'Accountancy');
    else if (comb.includes('SEBA')) subjects.push('Statistics', 'Economics', 'Business Studies', 'Accountancy');
    else if (comb.includes('HEBA')) subjects.push('History', 'Economics', 'Business Studies', 'Accountancy');
    else subjects.push('Subject 1', 'Subject 2', 'Subject 3', 'Subject 4');

    return subjects.map((subj, idx) => ({
      date: `Day ${idx + 1}`,
      day: 'Session',
      subjectCode: subj.substring(0, 3).toUpperCase(),
      subjectName: subj,
      timing: '09:30 AM – 12:30 PM',
    }));
  }

  const items: HallTicketScheduleItem[] = [];
  const cleanStudentClass = (student.className || '').toUpperCase().replace(/\s+/g, '');

  timetable.rows.forEach((row) => {
    // Find slot matching class
    const slot = row.slots?.find((s) => {
      const cleanCourse = (s.course || '').toUpperCase().replace(/\s+/g, '');
      return cleanCourse === cleanStudentClass || cleanCourse.includes(cleanStudentClass) || cleanStudentClass.includes(cleanCourse);
    }) || row.slots?.[0];

    const subjects = slot?.subjects || row.subjects || [];
    const timingMap = slot?.timings || row.timings || {};
    const firstTiming = Object.values(timingMap)[0];
    const timingStr = firstTiming ? `${firstTiming.startTime} – ${firstTiming.endTime}` : '09:30 AM – 12:30 PM';

    subjects.forEach((subj) => {
      items.push({
        date: row.displayDate || row.date,
        day: row.day,
        subjectCode: subj.substring(0, 3).toUpperCase(),
        subjectName: subj,
        timing: timingStr,
      });
    });
  });

  return items;
}

/**
 * Generates an official A4 Hall Ticket (Admit Card) PDF for one or multiple students.
 */
export async function generateHallTicketsPdf({
  institutionName,
  examName,
  students,
  timetable,
  signatory,
  paletteId = DEFAULT_PALETTE_ID,
  instructions = DEFAULT_INSTRUCTIONS,
}: GenerateHallTicketOptions): Promise<jsPDF> {
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

  for (let sIdx = 0; sIdx < students.length; sIdx++) {
    if (sIdx > 0) {
      doc.addPage();
    }

    const student = students[sIdx];
    let currentY = 12;

    // Outer Decorative Border
    doc.setDrawColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.setLineWidth(0.8);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

    // Inner Thin Border
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

    // 1. Institutional Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.text(institutionName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 5.5;

    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text(examName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    // Title Capsule Badge
    doc.setFillColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.roundedRect(pageWidth / 2 - 38, currentY - 3.5, 76, 6.5, 1.5, 1.5, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('EXAMINATION HALL TICKET / ADMIT CARD', pageWidth / 2, currentY + 0.8, { align: 'center' });
    currentY += 8;

    // Divider Line
    doc.setDrawColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
    currentY += 4;

    // 2. Candidate Information Card with Photo Box
    const cardY = currentY;
    const cardHeight = 44;
    const photoWidth = 30;
    const photoHeight = 38;

    // Card background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(leftMargin, cardY, contentWidth, cardHeight, 1.5, 1.5, 'FD');

    // Right-side Passport Photo Box
    const photoX = pageWidth - rightMargin - photoWidth - 4;
    const photoY = cardY + 3;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.4);
    doc.rect(photoX, photoY, photoWidth, photoHeight, 'FD');

    let photoRendered = false;
    if (student.photoUrl && student.photoUrl.startsWith('data:image')) {
      try {
        const format = student.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(student.photoUrl, format, photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1);
        photoRendered = true;
      } catch (imgErr) {
        photoRendered = false;
      }
    }

    if (!photoRendered) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('AFFIX RECENT', photoX + photoWidth / 2, photoY + photoHeight / 2 - 3, { align: 'center' });
      doc.text('PASSPORT PHOTO', photoX + photoWidth / 2, photoY + photoHeight / 2 + 1, { align: 'center' });
      doc.text('& ATTEST', photoX + photoWidth / 2, photoY + photoHeight / 2 + 5, { align: 'center' });
    }

    // Left-side Student Data Fields (2 Columns)
    const textStartX = leftMargin + 4;
    const col2X = leftMargin + 72;
    let fieldY = cardY + 6;
    const lineSpacing = 6;

    const renderField = (label: string, value: string, xPos: number, yPos: number, isHighlight: boolean = false) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(label, xPos, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      if (isHighlight) {
        doc.setTextColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
      } else {
        doc.setTextColor(15, 23, 42); // slate-900
      }
      doc.text(value || '—', xPos + 26, yPos);
    };

    renderField('Candidate Name:', student.name.toUpperCase(), textStartX, fieldY, true);
    renderField('Register No:', student.registerNumber, col2X, fieldY, true);
    fieldY += lineSpacing;

    renderField("Father's Name:", student.fatherName || '—', textStartX, fieldY);
    renderField('SATS ID:', student.satsNumber || '—', col2X, fieldY);
    fieldY += lineSpacing;

    renderField('Class / Course:', student.className, textStartX, fieldY);
    renderField('Stream:', student.stream, col2X, fieldY);
    fieldY += lineSpacing;

    renderField('Combination:', student.combination, textStartX, fieldY, true);
    renderField('Gender / DOB:', `${student.gender || '—'}  |  ${student.dob || '—'}`, col2X, fieldY);

    currentY = cardY + cardHeight + 4;

    // 3. Timetable Schedule & Attendance Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('SCHEDULE OF EXAMINATIONS', leftMargin, currentY + 3);
    currentY += 4.5;

    const schedule = getStudentTimetableSchedule(student, timetable);
    const tableBody = schedule.map((item, idx) => [
      idx + 1,
      `${item.date}\n(${item.day})`,
      item.subjectCode || '—',
      item.subjectName,
      item.timing,
      '', // Candidate Sign
      '', // Invigilator Sign
    ]);

    (doc as any).autoTable({
      startY: currentY,
      head: [
        ['#', 'Date & Day', 'Code', 'Subject Name', 'Examination Timing', "Candidate's Sign", "Invigilator's Sign"],
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
        2: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
        3: { fontStyle: 'bold', cellWidth: 50 },
        4: { halign: 'center', cellWidth: 32 },
        5: { halign: 'center', cellWidth: 25 },
        6: { halign: 'center', cellWidth: 25 },
      },
      styles: {
        lineColor: [203, 213, 225],
        lineWidth: 0.25,
      },
      margin: { left: leftMargin, right: rightMargin },
    });

    const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;
    currentY = finalY + 4;

    // 4. Instructions Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(leftMargin, currentY, contentWidth, 30, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(palette.rgb.primary[0], palette.rgb.primary[1], palette.rgb.primary[2]);
    doc.text('IMPORTANT INSTRUCTIONS TO CANDIDATE:', leftMargin + 3, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);

    let instY = currentY + 8;
    instructions.slice(0, 5).forEach((inst, iIdx) => {
      doc.text(`${iIdx + 1}.  ${inst}`, leftMargin + 3, instY);
      instY += 4.2;
    });

    currentY += 34;

    // 5. Signatures Footer
    const sigY = pageHeight - 20;

    // Candidate Signature Line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(leftMargin + 4, sigY - 2, leftMargin + 40, sigY - 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Candidate's Signature", leftMargin + 22, sigY + 2, { align: 'center' });

    // Exam Convener Line
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
  }

  return doc;
}

/**
 * Convenience helper to download Hall Tickets for students directly to the browser.
 */
export async function downloadHallTicketsPdf(options: GenerateHallTicketOptions): Promise<void> {
  const doc = await generateHallTicketsPdf(options);
  const cleanExamName = options.examName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = options.students.length === 1
    ? `Hall_Ticket_${options.students[0].registerNumber}_${cleanExamName}.pdf`
    : `Batch_Hall_Tickets_${options.students.length}_Students_${cleanExamName}.pdf`;

  doc.save(filename);
}
