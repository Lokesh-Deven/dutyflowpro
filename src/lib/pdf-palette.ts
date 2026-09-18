export type PaletteId =
  | 'classic-blue'
  | 'professional-teal'
  | 'elegant-burgundy'
  | 'modern-slate'
  | 'academic-green';

export type RGBColor = [number, number, number];

export interface PdfColorPalette {
  id: PaletteId;
  name: string;
  tagline: string;
  description: string;
  isDefault?: boolean;
  // RGB values used by jsPDF
  rgb: {
    primary: RGBColor;         // Hero Header & Footer Fill
    secondary: RGBColor;       // Exam Pill Fill & AutoTable Header Fill
    accent: RGBColor;          // Circular avatar, badges, schedule banner
    accentLight: RGBColor;     // Left accent bar, instructions mini-banner
    stripe: RGBColor;          // Amber / Gold header & footer stripe
    cardBg: RGBColor;          // Profile Card Fill & Alternate Row Fill
    cardBorder: RGBColor;      // Profile Card Border & Table Line Color
    statBoxBg: RGBColor;       // Right Stat Box Fill
    statBoxBorder: RGBColor;   // Right Stat Box Border
    statNumber: RGBColor;      // Allotted Duties 25pt Number Text
    pillBorder: RGBColor;      // Exam Pill Border
    pillText: RGBColor;        // Exam Pill Text
    timingBg: RGBColor;        // Schedule Timing Capsule Fill
    timingBorder: RGBColor;    // Schedule Timing Capsule Border
    timingText: RGBColor;      // Schedule Timing Capsule Text
    footerText: RGBColor;      // Footer Digitally Generated Text
    issuedByText: RGBColor;    // "Issued by" Signatory Text Accent
  };
  // Hex strings for UI card and miniature preview rendering
  hex: {
    primary: string;
    secondary: string;
    accent: string;
    accentLight: string;
    stripe: string;
    cardBg: string;
    cardBorder: string;
    statBoxBg: string;
    statBoxBorder: string;
    statNumber: string;
    textPrimary: string;
    textMuted: string;
    badgeText: string;
  };
}

export const PDF_PALETTES: Record<PaletteId, PdfColorPalette> = {
  'classic-blue': {
    id: 'classic-blue',
    name: 'Classic Blue',
    tagline: 'Navy + Royal Blue + Light Blue + White',
    description: 'The standard formal academic scheme. Crisp royal blue and navy with golden accents.',
    isDefault: true,
    rgb: {
      primary: [55, 48, 163],       // #3730A3
      secondary: [67, 56, 202],     // #4338CA
      accent: [79, 70, 229],        // #4F46E5
      accentLight: [14, 165, 233],  // #0EA5E9
      stripe: [245, 158, 11],       // #F59E0B
      cardBg: [248, 250, 255],      // #F8FAFF
      cardBorder: [224, 231, 255],  // #E0E7FF
      statBoxBg: [238, 242, 255],   // #EEF2FF
      statBoxBorder: [199, 210, 254], // #C7D2FE
      statNumber: [55, 48, 163],    // #3730A3
      pillBorder: [165, 180, 252],  // #A5B4FC
      pillText: [254, 240, 138],    // #FEF08A
      timingBg: [236, 254, 255],    // #ECFEFF
      timingBorder: [165, 243, 252],// #A5F3FC
      timingText: [8, 145, 178],    // #0891B2
      footerText: [224, 231, 255],  // #E0E7FF
      issuedByText: [8, 145, 178],  // #0891B2
    },
    hex: {
      primary: '#3730A3',
      secondary: '#4338CA',
      accent: '#4F46E5',
      accentLight: '#0EA5E9',
      stripe: '#F59E0B',
      cardBg: '#F8FAFF',
      cardBorder: '#E0E7FF',
      statBoxBg: '#EEF2FF',
      statBoxBorder: '#C7D2FE',
      statNumber: '#3730A3',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      badgeText: '#FEF08A',
    },
  },
  'professional-teal': {
    id: 'professional-teal',
    name: 'Professional Teal',
    tagline: 'Deep Teal + Teal + Soft Aqua + White',
    description: 'Modern and balanced. Rich deep teal headers with clean aqua highlights.',
    rgb: {
      primary: [15, 76, 92],        // #0F4C5C
      secondary: [14, 116, 144],    // #0E7490
      accent: [13, 148, 136],       // #0D9488
      accentLight: [20, 184, 166],  // #14B8A6
      stripe: [245, 158, 11],       // #F59E0B
      cardBg: [240, 253, 250],      // #F0FDFA
      cardBorder: [204, 251, 241],  // #CCFBF1
      statBoxBg: [240, 253, 250],   // #F0FDFA
      statBoxBorder: [153, 246, 228], // #99F6E4
      statNumber: [15, 76, 92],     // #0F4C5C
      pillBorder: [153, 246, 228],  // #99F6E4
      pillText: [254, 240, 138],    // #FEF08A
      timingBg: [240, 253, 250],    // #F0FDFA
      timingBorder: [153, 246, 228],// #99F6E4
      timingText: [15, 118, 110],   // #0F766E
      footerText: [204, 251, 241],  // #CCFBF1
      issuedByText: [13, 148, 136], // #0D9488
    },
    hex: {
      primary: '#0F4C5C',
      secondary: '#0E7490',
      accent: '#0D9488',
      accentLight: '#14B8A6',
      stripe: '#F59E0B',
      cardBg: '#F0FDFA',
      cardBorder: '#CCFBF1',
      statBoxBg: '#F0FDFA',
      statBoxBorder: '#99F6E4',
      statNumber: '#0F4C5C',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      badgeText: '#FEF08A',
    },
  },
  'elegant-burgundy': {
    id: 'elegant-burgundy',
    name: 'Elegant Burgundy',
    tagline: 'Burgundy + Maroon + Soft Rose + Cream',
    description: 'Distinguished university feel. Deep burgundy tones paired with warm rose undertones.',
    rgb: {
      primary: [88, 18, 37],        // #581225
      secondary: [136, 19, 55],     // #881337
      accent: [159, 18, 57],        // #9F1239
      accentLight: [190, 24, 93],   // #BE185D
      stripe: [245, 158, 11],       // #F59E0B
      cardBg: [255, 241, 242],      // #FFF1F2
      cardBorder: [255, 228, 230],  // #FFE4E6
      statBoxBg: [255, 241, 242],   // #FFF1F2
      statBoxBorder: [254, 205, 211], // #FECDD3
      statNumber: [88, 18, 37],     // #581225
      pillBorder: [254, 205, 211],  // #FECDD3
      pillText: [254, 240, 138],    // #FEF08A
      timingBg: [255, 241, 242],    // #FFF1F2
      timingBorder: [254, 205, 211],// #FECDD3
      timingText: [159, 18, 57],    // #9F1239
      footerText: [255, 228, 230],  // #FFE4E6
      issuedByText: [159, 18, 57],  // #9F1239
    },
    hex: {
      primary: '#581225',
      secondary: '#881337',
      accent: '#9F1239',
      accentLight: '#BE185D',
      stripe: '#F59E0B',
      cardBg: '#FFF1F2',
      cardBorder: '#FFE4E6',
      statBoxBg: '#FFF1F2',
      statBoxBorder: '#FECDD3',
      statNumber: '#581225',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      badgeText: '#FEF08A',
    },
  },
  'modern-slate': {
    id: 'modern-slate',
    name: 'Modern Slate',
    tagline: 'Charcoal + Slate Blue + Light Slate + White',
    description: 'Sleek executive aesthetic. Charcoal slate structure with refined silver-blue tones.',
    rgb: {
      primary: [30, 41, 59],        // #1E293B
      secondary: [51, 65, 85],      // #334155
      accent: [71, 85, 105],        // #475569
      accentLight: [14, 165, 233],  // #0EA5E9
      stripe: [245, 158, 11],       // #F59E0B
      cardBg: [248, 250, 252],      // #F8FAFC
      cardBorder: [226, 232, 240],  // #E2E8F0
      statBoxBg: [241, 245, 249],   // #F1F5F9
      statBoxBorder: [203, 213, 225], // #CBD5E1
      statNumber: [30, 41, 59],     // #1E293B
      pillBorder: [148, 163, 184],  // #94A3B8
      pillText: [254, 240, 138],    // #FEF08A
      timingBg: [241, 245, 249],    // #F1F5F9
      timingBorder: [203, 213, 225],// #CBD5E1
      timingText: [30, 41, 59],     // #1E293B
      footerText: [226, 232, 240],  // #E2E8F0
      issuedByText: [14, 165, 233], // #0EA5E9
    },
    hex: {
      primary: '#1E293B',
      secondary: '#334155',
      accent: '#475569',
      accentLight: '#0EA5E9',
      stripe: '#F59E0B',
      cardBg: '#F8FAFC',
      cardBorder: '#E2E8F0',
      statBoxBg: '#F1F5F9',
      statBoxBorder: '#CBD5E1',
      statNumber: '#1E293B',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      badgeText: '#FEF08A',
    },
  },
  'academic-green': {
    id: 'academic-green',
    name: 'Academic Green',
    tagline: 'Deep Green + Emerald + Soft Sage + White',
    description: 'Authoritative botanical academic style. Deep pine green headers with emerald highlights.',
    rgb: {
      primary: [20, 83, 45],        // #14532D
      secondary: [22, 101, 52],     // #166534
      accent: [5, 150, 105],        // #059669
      accentLight: [16, 185, 129],  // #10B981
      stripe: [245, 158, 11],       // #F59E0B
      cardBg: [240, 253, 244],      // #F0FDF4
      cardBorder: [220, 252, 231],  // #DCFCE7
      statBoxBg: [240, 253, 244],   // #F0FDF4
      statBoxBorder: [167, 243, 208], // #A7F3D0
      statNumber: [20, 83, 45],     // #14532D
      pillBorder: [167, 243, 208],  // #A7F3D0
      pillText: [254, 240, 138],    // #FEF08A
      timingBg: [240, 253, 244],    // #F0FDF4
      timingBorder: [167, 243, 208],// #A7F3D0
      timingText: [4, 120, 87],     // #047857
      footerText: [220, 252, 231],  // #DCFCE7
      issuedByText: [5, 150, 105],  // #059669
    },
    hex: {
      primary: '#14532D',
      secondary: '#166534',
      accent: '#059669',
      accentLight: '#10B981',
      stripe: '#F59E0B',
      cardBg: '#F0FDF4',
      cardBorder: '#DCFCE7',
      statBoxBg: '#F0FDF4',
      statBoxBorder: '#A7F3D0',
      statNumber: '#14532D',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      badgeText: '#FEF08A',
    },
  },
};

export const DEFAULT_PALETTE_ID: PaletteId = 'classic-blue';

export const ALL_PALETTES: PdfColorPalette[] = Object.values(PDF_PALETTES);

export function getPdfPalette(id?: string | null): PdfColorPalette {
  if (id && id in PDF_PALETTES) {
    return PDF_PALETTES[id as PaletteId];
  }
  return PDF_PALETTES[DEFAULT_PALETTE_ID];
}
