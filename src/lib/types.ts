export type Invigilator = {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
  isPartTime: boolean;
  availableDays?: string[];
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
