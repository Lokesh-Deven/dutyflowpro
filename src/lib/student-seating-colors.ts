/**
 * Subject Color Palette & Utility for Student Seating Plan
 * Provides consistent, high-contrast, accessible light background colors
 * for subject identification across visual seating layouts and PDF exports.
 */

export interface SubjectColorPalette {
  id: string;
  name: string;
  // CSS Hex colors for guaranteed inline rendering
  bgCss: string;            // Light background e.g. '#E0F2FE'
  textCss: string;          // Dark readable text e.g. '#082F49'
  borderCss: string;        // Defined border e.g. '#7DD3FC'
  seatBgCss: string;        // Very soft tint for seat card e.g. '#F0F9FF'
  accentBorderCss: string;  // Top indicator bar e.g. '#0284c7'
  dotColor: string;         // Dot indicator e.g. '#0284c7'
  // Tailwind utility classes
  bgLight: string;
  textDark: string;
  border: string;
  badge: string;
  // PDF export RGB colors
  pdfBg: [number, number, number];
  pdfText: [number, number, number];
  pdfBorder: [number, number, number];
}

export const SUBJECT_PALETTES: SubjectColorPalette[] = [
  {
    id: 'sky',
    name: 'Sky Blue',
    bgCss: '#E0F2FE',
    textCss: '#082F49',
    borderCss: '#7DD3FC',
    seatBgCss: '#F0F9FF',
    accentBorderCss: '#0284c7',
    dotColor: '#0284c7',
    bgLight: 'bg-sky-100',
    textDark: 'text-sky-950',
    border: 'border-sky-300',
    badge: 'bg-sky-100 text-sky-950 border-sky-300',
    pdfBg: [224, 242, 254],
    pdfText: [8, 47, 73],
    pdfBorder: [186, 230, 253],
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    bgCss: '#FEF3C7',
    textCss: '#451A03',
    borderCss: '#FCD34D',
    seatBgCss: '#FFFBEB',
    accentBorderCss: '#d97706',
    dotColor: '#d97706',
    bgLight: 'bg-amber-100',
    textDark: 'text-amber-950',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-950 border-amber-300',
    pdfBg: [254, 243, 199],
    pdfText: [69, 26, 3],
    pdfBorder: [252, 211, 77],
  },
  {
    id: 'emerald',
    name: 'Mint Emerald',
    bgCss: '#D1FAE5',
    textCss: '#022C22',
    borderCss: '#6EE7B7',
    seatBgCss: '#ECFDF5',
    accentBorderCss: '#059669',
    dotColor: '#059669',
    bgLight: 'bg-emerald-100',
    textDark: 'text-emerald-950',
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    pdfBg: [209, 250, 229],
    pdfText: [2, 44, 34],
    pdfBorder: [110, 231, 183],
  },
  {
    id: 'purple',
    name: 'Lavender Purple',
    bgCss: '#F3E8FF',
    textCss: '#3B0764',
    borderCss: '#D8B4FE',
    seatBgCss: '#FAF5FF',
    accentBorderCss: '#7c3aed',
    dotColor: '#7c3aed',
    bgLight: 'bg-purple-100',
    textDark: 'text-purple-950',
    border: 'border-purple-300',
    badge: 'bg-purple-100 text-purple-950 border-purple-300',
    pdfBg: [243, 232, 255],
    pdfText: [59, 7, 100],
    pdfBorder: [216, 180, 254],
  },
  {
    id: 'rose',
    name: 'Soft Rose',
    bgCss: '#FFE4E6',
    textCss: '#4C0519',
    borderCss: '#FDA4AF',
    seatBgCss: '#FFF1F2',
    accentBorderCss: '#e11d48',
    dotColor: '#e11d48',
    bgLight: 'bg-rose-100',
    textDark: 'text-rose-950',
    border: 'border-rose-300',
    badge: 'bg-rose-100 text-rose-950 border-rose-300',
    pdfBg: [255, 228, 230],
    pdfText: [76, 5, 25],
    pdfBorder: [254, 205, 211],
  },
  {
    id: 'teal',
    name: 'Light Teal',
    bgCss: '#CCFBF1',
    textCss: '#134E4A',
    borderCss: '#5EEAD4',
    seatBgCss: '#F0FDFA',
    accentBorderCss: '#0d9488',
    dotColor: '#0d9488',
    bgLight: 'bg-teal-100',
    textDark: 'text-teal-950',
    border: 'border-teal-300',
    badge: 'bg-teal-100 text-teal-950 border-teal-300',
    pdfBg: [204, 251, 241],
    pdfText: [19, 78, 74],
    pdfBorder: [153, 246, 228],
  },
  {
    id: 'orange',
    name: 'Peach Orange',
    bgCss: '#FFEDD5',
    textCss: '#431407',
    borderCss: '#FDBA74',
    seatBgCss: '#FFF7ED',
    accentBorderCss: '#ea580c',
    dotColor: '#ea580c',
    bgLight: 'bg-orange-100',
    textDark: 'text-orange-950',
    border: 'border-orange-300',
    badge: 'bg-orange-100 text-orange-950 border-orange-300',
    pdfBg: [255, 237, 213],
    pdfText: [67, 20, 7],
    pdfBorder: [253, 186, 116],
  },
  {
    id: 'indigo',
    name: 'Soft Indigo',
    bgCss: '#E0E7FF',
    textCss: '#1E1B4B',
    borderCss: '#A5B4FC',
    seatBgCss: '#EEF2FF',
    accentBorderCss: '#4f46e5',
    dotColor: '#4f46e5',
    bgLight: 'bg-indigo-100',
    textDark: 'text-indigo-950',
    border: 'border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-950 border-indigo-300',
    pdfBg: [224, 231, 255],
    pdfText: [30, 27, 75],
    pdfBorder: [199, 210, 254],
  },
];

/**
 * Returns a consistent light background color palette for a given subject.
 * If a list of known subjects is provided, maps sequentially to ensure distinct colors.
 * Otherwise, uses a deterministic hash so the same subject always gets the same color.
 */
export function getSubjectColor(
  subjectName?: string,
  knownSubjectNames?: string[]
): SubjectColorPalette {
  if (!subjectName) return SUBJECT_PALETTES[0];

  if (knownSubjectNames && knownSubjectNames.length > 0) {
    const idx = knownSubjectNames.indexOf(subjectName);
    if (idx !== -1) {
      return SUBJECT_PALETTES[idx % SUBJECT_PALETTES.length];
    }
  }

  // Fallback: Deterministic string hash
  let hash = 0;
  const clean = subjectName.trim().toLowerCase();
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SUBJECT_PALETTES.length;
  return SUBJECT_PALETTES[index];
}
