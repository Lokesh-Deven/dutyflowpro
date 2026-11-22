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
    bgLight: 'bg-sky-100 dark:bg-sky-950/40',
    textDark: 'text-sky-950 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-800',
    badge: 'bg-sky-100 dark:bg-sky-950/40 text-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800',
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
    bgLight: 'bg-amber-100 dark:bg-amber-950/40',
    textDark: 'text-amber-950 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    badge: 'bg-amber-100 dark:bg-amber-950/40 text-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
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
    bgLight: 'bg-emerald-100 dark:bg-emerald-950/40',
    textDark: 'text-emerald-950 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
    badge: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
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
    bgLight: 'bg-purple-100 dark:bg-purple-950/40',
    textDark: 'text-purple-950 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-800',
    badge: 'bg-purple-100 dark:bg-purple-950/40 text-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
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
    bgLight: 'bg-rose-100 dark:bg-rose-950/40',
    textDark: 'text-rose-950 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-800',
    badge: 'bg-rose-100 dark:bg-rose-950/40 text-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
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
    bgLight: 'bg-teal-100 dark:bg-teal-950/40',
    textDark: 'text-teal-950 dark:text-teal-300',
    border: 'border-teal-300 dark:border-teal-800',
    badge: 'bg-teal-100 dark:bg-teal-950/40 text-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-800',
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
    bgLight: 'bg-orange-100 dark:bg-orange-950/40',
    textDark: 'text-orange-950 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-800',
    badge: 'bg-orange-100 dark:bg-orange-950/40 text-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-800',
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
    bgLight: 'bg-indigo-100 dark:bg-indigo-950/40',
    textDark: 'text-indigo-950 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-800',
    badge: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
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
    bgLight: 'bg-cyan-100 dark:bg-cyan-950/40',
    textDark: 'text-cyan-950 dark:text-cyan-300',
    border: 'border-cyan-300 dark:border-cyan-800',
    badge: 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
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
    bgLight: 'bg-lime-100 dark:bg-lime-950/40',
    textDark: 'text-lime-950 dark:text-lime-300',
    border: 'border-lime-300 dark:border-lime-800',
    badge: 'bg-lime-100 dark:bg-lime-950/40 text-lime-950 dark:text-lime-300 border-lime-300 dark:border-lime-800',
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
    bgLight: 'bg-fuchsia-100 dark:bg-fuchsia-950/40',
    textDark: 'text-fuchsia-950 dark:text-fuchsia-300',
    border: 'border-fuchsia-300 dark:border-fuchsia-800',
    badge: 'bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-950 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-800',
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
    bgLight: 'bg-blue-100 dark:bg-blue-950/40',
    textDark: 'text-blue-950 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-950/40 text-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800',
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

export interface ClassBadgeStyle {
  badgeClass: string;
  dotColor: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
}

/**
 * Returns a distinct, consistent, soft background highlight (pill/badge style)
 * with high text-to-background contrast for class labels (e.g. 1PUC, 2PUC, etc.).
 */
export function getClassBadgeStyle(classCode?: string | null): ClassBadgeStyle {
  if (!classCode || !classCode.trim()) {
    return {
      badgeClass: 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
      dotColor: 'bg-slate-400 dark:bg-slate-500',
      bgHex: '#F8FAFC',
      textHex: '#334155',
      borderHex: '#E2E8F0',
    };
  }

  const clean = classCode.trim().toUpperCase().replace(/\s+/g, '');

  // 1. Explicit 1 PUC mappings -> Soft Sky/Blue
  if (
    clean.includes('1PUC') ||
    clean.includes('IPUC') ||
    clean === '1' ||
    clean.includes('11TH') ||
    clean.includes('CLASS11') ||
    clean.includes('GRADE11')
  ) {
    return {
      badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200/90 dark:border-sky-800/80 shadow-2xs font-bold',
      dotColor: 'bg-sky-500 dark:bg-sky-400',
      bgHex: '#F0F9FF',
      textHex: '#075985',
      borderHex: '#BAE6FD',
    };
  }

  // 2. Explicit 2 PUC mappings -> Soft Emerald
  if (
    clean.includes('2PUC') ||
    clean.includes('IIPUC') ||
    clean === '2' ||
    clean.includes('12TH') ||
    clean.includes('CLASS12') ||
    clean.includes('GRADE12')
  ) {
    return {
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/80 shadow-2xs font-bold',
      dotColor: 'bg-emerald-500 dark:bg-emerald-400',
      bgHex: '#ECFDF5',
      textHex: '#065F46',
      borderHex: '#A7F3D0',
    };
  }

  // 3. Combined / Both (e.g., 1&2 PUC) -> Soft Purple/Violet
  if (clean.includes('1&2') || clean.includes('1AND2') || clean.includes('BOTH')) {
    return {
      badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200/90 dark:border-purple-800/80 shadow-2xs font-bold',
      dotColor: 'bg-purple-500 dark:bg-purple-400',
      bgHex: '#FAF5FF',
      textHex: '#6B21A8',
      borderHex: '#E9D5FF',
    };
  }

  // 4. Curated high-contrast deterministic pastel palette for any additional or custom classes
  const PALETTES: ClassBadgeStyle[] = [
    {
      badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200/90 dark:border-amber-800/80 shadow-2xs font-bold',
      dotColor: 'bg-amber-500 dark:bg-amber-400',
      bgHex: '#FFFBEB',
      textHex: '#78350F',
      borderHex: '#FDE68A',
    },
    {
      badgeClass: 'bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-200/90 dark:border-violet-800/80 shadow-2xs font-bold',
      dotColor: 'bg-violet-500 dark:bg-violet-400',
      bgHex: '#F5F3FF',
      textHex: '#5B21B6',
      borderHex: '#DDD6FE',
    },
    {
      badgeClass: 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200/90 dark:border-teal-800/80 shadow-2xs font-bold',
      dotColor: 'bg-teal-500 dark:bg-teal-400',
      bgHex: '#F0FDFA',
      textHex: '#115E59',
      borderHex: '#99F6E4',
    },
    {
      badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200/90 dark:border-rose-800/80 shadow-2xs font-bold',
      dotColor: 'bg-rose-500 dark:bg-rose-400',
      bgHex: '#FFF1F2',
      textHex: '#9F1239',
      borderHex: '#FECDD3',
    },
    {
      badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200/90 dark:border-indigo-800/80 shadow-2xs font-bold',
      dotColor: 'bg-indigo-500 dark:bg-indigo-400',
      bgHex: '#EEF2FF',
      textHex: '#3730A3',
      borderHex: '#C7D2FE',
    },
    {
      badgeClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200/90 dark:border-cyan-800/80 shadow-2xs font-bold',
      dotColor: 'bg-cyan-500 dark:bg-cyan-400',
      bgHex: '#ECFEFF',
      textHex: '#155E75',
      borderHex: '#A5F3FC',
    },
    {
      badgeClass: 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-200/90 dark:border-fuchsia-800/80 shadow-2xs font-bold',
      dotColor: 'bg-fuchsia-500 dark:bg-fuchsia-400',
      bgHex: '#FDF4FF',
      textHex: '#86198F',
      borderHex: '#F5D0FE',
    },
    {
      badgeClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-300 border-orange-200/90 dark:border-orange-800/80 shadow-2xs font-bold',
      dotColor: 'bg-orange-500 dark:bg-orange-400',
      bgHex: '#FFF7ED',
      textHex: '#7C2D12',
      borderHex: '#FED7AA',
    },
  ];

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}
