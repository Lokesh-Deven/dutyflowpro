export type Invigilator = {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
  isAvailableAllDays: boolean;
  availableExamIds: string[];
};

export type Examination = {
  id:string;
  date: Date;
  subject: string;
  startTime: string;
  endTime: string;
  rooms: number;
  relievers: number;
  college: string;
  examName: string;
};

export interface AllotmentResult {
  assignments: Record<string, string[]>; // invigilatorId -> examId[]
}

export type SavedAllotment = {
  id: string;
  name: string;
  invigilators: Invigilator[];
  examinations: Examination[];
  assignments: AllotmentResult['assignments'];
  createdAt: Date;
  status: 'Draft' | 'Finalized';
}
