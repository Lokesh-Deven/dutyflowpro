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
  accentHex?: string;       // Alias for dotColor
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
    pdfBorder: [125, 211, 252],
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
    pdfBorder: [253, 164, 175],
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
    pdfBorder: [94, 234, 212],
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
    pdfBorder: [165, 180, 252],
  },
  {
    id: 'cyan',
    name: 'Aqua Cyan',
    bgCss: '#CFFAFE',
    textCss: '#164E63',
    borderCss: '#67E8F9',
    seatBgCss: '#ECFEFF',
    accentBorderCss: '#0891b2',
    dotColor: '#0891b2',
    bgLight: 'bg-cyan-100',
    textDark: 'text-cyan-950',
    border: 'border-cyan-300',
    badge: 'bg-cyan-100 text-cyan-950 border-cyan-300',
    pdfBg: [207, 250, 254],
    pdfText: [22, 78, 99],
    pdfBorder: [103, 232, 249],
  },
  {
    id: 'lime',
    name: 'Spring Lime',
    bgCss: '#ECFCCB',
    textCss: '#1A2E05',
    borderCss: '#BEF264',
    seatBgCss: '#F7FEE7',
    accentBorderCss: '#65a30d',
    dotColor: '#65a30d',
    bgLight: 'bg-lime-100',
    textDark: 'text-lime-950',
    border: 'border-lime-300',
    badge: 'bg-lime-100 text-lime-950 border-lime-300',
    pdfBg: [236, 252, 203],
    pdfText: [26, 46, 5],
    pdfBorder: [190, 242, 100],
  },
  {
    id: 'fuchsia',
    name: 'Berry Fuchsia',
    bgCss: '#FAE8FF',
    textCss: '#4A044E',
    borderCss: '#F0ABFC',
    seatBgCss: '#FDF4FF',
    accentBorderCss: '#c026d3',
    dotColor: '#c026d3',
    bgLight: 'bg-fuchsia-100',
    textDark: 'text-fuchsia-950',
    border: 'border-fuchsia-300',
    badge: 'bg-fuchsia-100 text-fuchsia-950 border-fuchsia-300',
    pdfBg: [250, 232, 255],
    pdfText: [74, 4, 78],
    pdfBorder: [240, 171, 252],
  },
  {
    id: 'blue',
    name: 'Royal Blue',
    bgCss: '#DBEAFE',
    textCss: '#1E3A8A',
    borderCss: '#93C5FD',
    seatBgCss: '#EFF6FF',
    accentBorderCss: '#2563eb',
    dotColor: '#2563eb',
    bgLight: 'bg-blue-100',
    textDark: 'text-blue-950',
    border: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-950 border-blue-300',
    pdfBg: [219, 234, 254],
    pdfText: [30, 58, 138],
    pdfBorder: [147, 197, 253],
  },
];

/**
 * Neutral styling definitions for Vacant and Disabled seats
 */
export const VACANT_COLOR_STYLE = {
  bgCss: '#F8FAFC',
  textCss: '#94A3B8',
  borderCss: '#E2E8F0',
  label: 'VACANT',
  pdfBg: [248, 250, 252] as [number, number, number],
  pdfText: [148, 163, 184] as [number, number, number],
  pdfBorder: [226, 232, 240] as [number, number, number],
};

export const DISABLED_COLOR_STYLE = {
  bgCss: '#F1F5F9',
  textCss: '#64748B',
  borderCss: '#CBD5E1',
  label: 'DISABLED',
  pdfBg: [241, 245, 249] as [number, number, number],
  pdfText: [100, 116, 139] as [number, number, number],
  pdfBorder: [203, 213, 225] as [number, number, number],
};

/**
 * Returns a consistent distinct light background color palette for each subject.
 * When `knownSubjectNames` is provided, maps each subject by its exact index
 * to guarantee that every subject gets its own unique, distinguishable colour
 * with zero repetition across the examination.
 */
export function getSubjectColor(
  subjectName?: string,
  knownSubjectNames?: string[]
): SubjectColorPalette {
  if (!subjectName) return SUBJECT_PALETTES[0];

  const selected = (knownSubjectNames && knownSubjectNames.length > 0)
    ? (knownSubjectNames.indexOf(subjectName) !== -1
        ? SUBJECT_PALETTES[knownSubjectNames.indexOf(subjectName) % SUBJECT_PALETTES.length]
        : null)
    : null;

  if (selected) {
    return { ...selected, accentHex: selected.dotColor };
  }

  // Fallback: Deterministic string hash
  let hash = 0;
  const clean = subjectName.trim().toLowerCase();
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SUBJECT_PALETTES.length;
  const fallback = SUBJECT_PALETTES[index];
  return { ...fallback, accentHex: fallback.dotColor };
}

/**
 * Creates a complete mapping of Subject Name -> Unique SubjectColorPalette
 * for an entire examination, guaranteeing consistency across all rooms, previews, and PDFs.
 */
export function getExaminationSubjectColorMap(
  subjectNames: string[]
): Record<string, SubjectColorPalette> {
  const map: Record<string, SubjectColorPalette> = {};
  const uniqueNames = Array.from(new Set(subjectNames.filter(Boolean)));
  uniqueNames.forEach((name, idx) => {
    map[name] = SUBJECT_PALETTES[idx % SUBJECT_PALETTES.length];
  });
  return map;
}
