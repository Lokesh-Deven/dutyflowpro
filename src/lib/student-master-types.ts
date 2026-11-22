export type StudentStream = 'Science' | 'Commerce' | 'Arts' | string;

export type StudentGender = 'Male' | 'Female' | 'Other' | string;

export interface StudentMasterProfile {
  id: string;
  name: string;
  registerNumber: string; // Primary unique identifier e.g. '24PU0101'
  satsNumber?: string;    // SATS ID / State Student ID or Admission ID
  className: string;      // e.g. '1PUC', '2PUC', '1 PUC', '2 PUC'
  stream: StudentStream;  // Science, Commerce, Arts
  combination: string;    // e.g. 'PCMB', 'PCMC', 'CEBA', 'HEBA'
  dob?: string;           // Date of Birth: YYYY-MM-DD or DD.MM.YYYY
  gender?: StudentGender; // Male, Female, Other
  fatherName?: string;    // Father's or Parent's Name
  photoUrl?: string;      // Base64 data URL or remote public URL
  createdAt: string;
  updatedAt: string;
}

export interface BulkUploadParseResult {
  validProfiles: StudentMasterProfile[];
  totalRows: number;
  duplicateCount: number;
  errors: { row: number; reason: string }[];
}

export interface BulkPhotoMatchResult {
  matchedCount: number;
  unmatchedCount: number;
  matchedRegisterNumbers: string[];
  unmatchedFileNames: string[];
}
