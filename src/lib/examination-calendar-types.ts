export type ExaminationDateType = 'tentative' | 'final';

export type ExaminationPublicationStatus = 'draft' | 'tentative_published' | 'final_published';

export interface ExaminationScheduleItem {
  id?: string;
  slot_number: number; // 1 to 10
  exam_name: string;
  start_date: string; // YYYY-MM-DD or empty
  end_date: string;   // YYYY-MM-DD or empty
  total_marks: number | string;
  date_type: ExaminationDateType;
  publication_status: ExaminationPublicationStatus;
  tentative_start_date?: string | null;
  tentative_end_date?: string | null;
  published_at?: string | null;
  institution_id: string;
  institution_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExaminationConflict {
  conflictingSlot: number;
  conflictingExamName: string;
  conflictingStartDate: string;
  conflictingEndDate: string;
}

