import XLSX from 'xlsx-js-style';

export interface TimetableTemplateRow {
  date: string;
  subject: string;
  startTime: string;
  endTime: string;
  invigilators: number;
  relievers: number;
}

export interface InvigilatorTemplateRow {
  slNo: number;
  name: string;
  designation: string;
  mobile: string;
  email: string;
}

export const SAMPLE_TIMETABLE_ROWS: TimetableTemplateRow[] = [
  {
    date: '10/03/2027',
    subject: 'English',
    startTime: '10.00 AM',
    endTime: '1.00 PM',
    invigilators: 15,
    relievers: 3,
  },
  {
    date: '11/03/2027',
    subject: 'Physics',
    startTime: '10.00 AM',
    endTime: '1.00 PM',
    invigilators: 10,
    relievers: 2,
  },
  {
    date: '12/03/2027',
    subject: 'Accountancy',
    startTime: '10.00 AM',
    endTime: '1.00 PM',
    invigilators: 12,
    relievers: 2,
  },
];

export const SAMPLE_INVIGILATOR_ROWS: InvigilatorTemplateRow[] = [
  {
    slNo: 1,
    name: 'Mr.Lokesh D',
    designation: 'Lecturer in English',
    mobile: '9000000000',
    email: 'username@gmail.com',
  },
  {
    slNo: 2,
    name: 'Prof. Aurag Narayan',
    designation: 'Department of Physics',
    mobile: '9000000000',
    email: 'username@gmail.com',
  },
  {
    slNo: 3,
    name: 'Dr. Sunaina Rao',
    designation: 'Lecturer in Accountancy',
    mobile: '9000000000',
    email: 'username@gmail.com',
  },
];

/**
 * Generates and triggers download of the Examination Timetable template (.xlsx)
 * Matching the exact structure expected by DutyFlow's examination import parser.
 * Highlights:
 * - Rows 1–2: Institution Name & Examination Name title cells highlighted in soft blue
 * - Row 3: Date (DD/MM/YYYY), Subject, Start Time, End Time, Number of Invigilators, Number of Relievers
 *   highlighted in deep royal blue with bold white text
 */
export function downloadTimetableTemplate() {
  const wb = XLSX.utils.book_new();

  const wsData: any[][] = [
    ['Institution Name', 'Type your Institution name here', '', '', '', ''],
    ['Examination Name', 'Type name of the examination here', '', '', '', ''],
    ['Date (DD/MM/YYYY)', 'Subject', 'Start Time', 'End Time', 'Number of Invigilators', 'Number of Relievers'],
    ['10/03/2027', 'English', '10.00 AM', '1.00 PM', 15, 3],
    ['11/03/2027', 'Physics', '10.00 AM', '1.00 PM', 10, 2],
    ['12/03/2027', 'Accountancy', '10.00 AM', '1.00 PM', 12, 2],
  ];

  // Add empty formatted rows for user entry
  for (let i = 0; i < 15; i++) {
    wsData.push(['', '', '', '', '', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  const headerBorder = {
    top: { style: 'medium', color: { rgb: '1E3A8A' } },
    bottom: { style: 'medium', color: { rgb: '1E3A8A' } },
    left: { style: 'thin', color: { rgb: '60A5FA' } },
    right: { style: 'thin', color: { rgb: '60A5FA' } },
  };

  // 1. Highlight Institution Name & Examination Name titles (Rows 1–2)
  ['A1', 'A2'].forEach(ref => {
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: 'DBEAFE' } }, // Soft Sky Blue highlight
        font: { bold: true, sz: 11, color: { rgb: '1E3A8A' }, name: 'Calibri' },
        alignment: { vertical: 'center', horizontal: 'left' },
        border: thinBorder,
      };
    }
  });

  ['B1', 'B2'].forEach(ref => {
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: 'F0F9FF' } }, // Very subtle ice tint
        font: { italic: true, sz: 10, color: { rgb: '64748B' }, name: 'Calibri' },
        alignment: { vertical: 'center', horizontal: 'left' },
        border: thinBorder,
      };
    }
  });

  // 2. Highlight Row 3 Table Column Headers
  const tableHeaders = ['A3', 'B3', 'C3', 'D3', 'E3', 'F3'];
  tableHeaders.forEach(ref => {
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: '1E40AF' } }, // Deep Professional Royal Blue
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
        alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
        border: headerBorder,
      };
    }
  });

  // 3. Clean border and alignment for sample data rows
  for (let r = 4; r <= 6; r++) {
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, colIdx) => {
      const ref = `${col}${r}`;
      if (ws[ref]) {
        ws[ref].s = {
          font: { sz: 10, name: 'Calibri' },
          alignment: {
            vertical: 'center',
            horizontal: colIdx === 1 ? 'left' : 'center',
          },
          border: thinBorder,
        };
      }
    });
  }

  // Set friendly column widths
  ws['!cols'] = [
    { wch: 22 }, // Date (DD/MM/YYYY)
    { wch: 32 }, // Subject
    { wch: 16 }, // Start Time
    { wch: 16 }, // End Time
    { wch: 24 }, // Number of Invigilators
    { wch: 22 }, // Number of Relievers
  ];

  // Set row heights for better spacing
  ws['!rows'] = [
    { hpt: 24 }, // Row 1
    { hpt: 24 }, // Row 2
    { hpt: 28 }, // Row 3 (Headers)
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Timetable Template');
  XLSX.writeFile(wb, 'examination_timetable_template.xlsx');
}

/**
 * Generates and triggers download of the Invigilator List template (.xlsx)
 * Matching the exact structure expected by DutyFlow's invigilator import parser.
 * Highlights:
 * - Row 1: Sl No, Name, Designation / Department, Mobile No, Email ID
 *   highlighted in signature purple/indigo with bold white text
 */
export function downloadInvigilatorTemplate() {
  const wb = XLSX.utils.book_new();

  const wsData: any[][] = [
    ['Sl No', 'Name', 'Designation / Department', 'Mobile No', 'Email ID'],
    [1, 'Mr.Lokesh D', 'Lecturer in English', '9000000000', 'username@gmail.com'],
    [2, 'Prof. Aurag Narayan', 'Department of Physics', '9000000000', 'username@gmail.com'],
    [3, 'Dr. Sunaina Rao', 'Lecturer in Accountancy', '9000000000', 'username@gmail.com'],
  ];

  // Add pre-numbered rows 4 to 25
  for (let i = 4; i <= 25; i++) {
    wsData.push([i, '', '', '', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  const invHeaderBorder = {
    top: { style: 'medium', color: { rgb: '4338CA' } },
    bottom: { style: 'medium', color: { rgb: '4338CA' } },
    left: { style: 'thin', color: { rgb: '818CF8' } },
    right: { style: 'thin', color: { rgb: '818CF8' } },
  };

  // 1. Highlight Row 1 Table Column Headers
  const invHeaders = ['A1', 'B1', 'C1', 'D1', 'E1'];
  invHeaders.forEach(ref => {
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: '6342E8' } }, // DutyFlow Signature Violet / Purple
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
        alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
        border: invHeaderBorder,
      };
    }
  });

  // 2. Clean border and alignment for data rows
  for (let r = 2; r <= 26; r++) {
    ['A', 'B', 'C', 'D', 'E'].forEach((col, colIdx) => {
      const ref = `${col}${r}`;
      if (ws[ref]) {
        ws[ref].s = {
          font: { sz: 10, name: 'Calibri' },
          alignment: {
            vertical: 'center',
            horizontal: colIdx === 0 ? 'center' : (colIdx === 3 ? 'center' : 'left'),
          },
          border: thinBorder,
        };
      }
    });
  }

  // Set friendly column widths
  ws['!cols'] = [
    { wch: 10 }, // Sl No
    { wch: 28 }, // Name
    { wch: 34 }, // Designation / Department
    { wch: 18 }, // Mobile No
    { wch: 30 }, // Email ID
  ];

  // Set row height for header
  ws['!rows'] = [
    { hpt: 28 }, // Header row
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Invigilators Template');
  XLSX.writeFile(wb, 'invigilators_template.xlsx');
}
