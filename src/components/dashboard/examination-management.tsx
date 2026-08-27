"use client";

import React, { useMemo, useRef, useState } from 'react';
import type { Examination } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { cn, formatTimeTo12Hour } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Upload,
  Trash2,
  ArrowRight,
  Edit2,
  Clock,
  DoorClosed,
  UserCheck,
  Users,
  BookOpen,
  Building2,
  GraduationCap,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Layers,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { uploadUserFile } from '@/lib/storage-service';

const examSessionSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  startTimeHour: z.string().min(1),
  startTimeMinute: z.string().min(1),
  startTimePeriod: z.string().min(1),
  endTimeHour: z.string().min(1),
  endTimeMinute: z.string().min(1),
  endTimePeriod: z.string().min(1),
  rooms: z.coerce.number().min(1, "At least one room is required."),
  relievers: z.coerce.number().min(0),
});

const examinationSchema = z.object({
  college: z.string().min(1, "College name is required."),
  examName: z.string().min(1, "Examination name is required."),
  date: z.date({ required_error: "A date is required." }),
});

const getColumnValue = (row: any, keys: string[]): any => {
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/gi, '');
    const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/gi, '') === lowerKey);
    if (foundKey && row[foundKey] !== null && row[foundKey] !== undefined) {
      return row[foundKey];
    }
  }
  return null;
};

const excelSerialDateToJSDate = (serial: number) => {
  return new Date(Date.UTC(0, 0, serial - 1));
};

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

export function ExaminationManagement() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { examinations, setExaminations } = useAllotment();
  const { user, profile } = useAuth();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  const [sessionDetails, setSessionDetails] = useState({
    subject: '',
    startTimeHour: '09',
    startTimeMinute: '00',
    startTimePeriod: 'AM',
    endTimeHour: '12',
    endTimeMinute: '00',
    endTimePeriod: 'PM',
    rooms: 1,
    relievers: 0,
  });

  const form = useForm<z.infer<typeof examinationSchema>>({
    resolver: zodResolver(examinationSchema),
    defaultValues: {
      college: '',
      examName: '',
    },
  });

  React.useEffect(() => {
    const institution = profile?.institution_name || (user?.user_metadata?.institution_name as string);
    if (institution && !form.getValues('college')) {
      form.setValue('college', institution);
    }
  }, [profile, user, form]);

  const totalRooms = useMemo(() => examinations.reduce((acc, exam) => acc + exam.rooms, 0), [examinations]);
  const totalRelievers = useMemo(() => examinations.reduce((acc, exam) => acc + exam.relievers, 0), [examinations]);

  const formatTime = (hour: string, minute: string, period: string) => {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
  }

  const parseTimeToParts = (time: string) => {
    const [hour24, minute] = time.split(':');
    let h = parseInt(hour24, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return {
      hour: h.toString().padStart(2, '0'),
      minute: minute,
      period: period
    };
  };

  function onSaveExamination() {
    const examinationData = form.getValues();
    const validation = examinationSchema.safeParse(examinationData);
    const sessionValidation = examSessionSchema.safeParse({
      ...sessionDetails,
      subject: sessionDetails.subject || 'None',
      rooms: Number(sessionDetails.rooms),
      relievers: Number(sessionDetails.relievers)
    });

    if (!validation.success || !sessionValidation.success) {
      if (!validation.success) {
        validation.error.errors.forEach(err => {
          form.setError(err.path[0] as keyof z.infer<typeof examinationSchema>, { message: err.message });
        });
      }
      if (!sessionValidation.success) {
        toast({ title: "Session Details Invalid", description: sessionValidation.error.errors[0].message, variant: "destructive" });
      }
      return;
    }

    if (editingExamId) {
      setExaminations(prev => prev.map(exam => exam.id === editingExamId ? {
        ...exam,
        college: examinationData.college,
        examName: examinationData.examName,
        date: examinationData.date,
        subject: sessionDetails.subject || 'None',
        startTime: formatTime(sessionDetails.startTimeHour, sessionDetails.startTimeMinute, sessionDetails.startTimePeriod),
        endTime: formatTime(sessionDetails.endTimeHour, sessionDetails.endTimeMinute, sessionDetails.endTimePeriod),
        rooms: Number(sessionDetails.rooms),
        relievers: Number(sessionDetails.relievers),
      } : exam));
      toast({ title: "Examination Updated", description: "The changes have been saved." });
      setEditingExamId(null);
    } else {
      const newExamination: Examination = {
        id: `exam-${Date.now()}`,
        college: examinationData.college,
        examName: examinationData.examName,
        date: examinationData.date,
        subject: sessionDetails.subject || 'None',
        startTime: formatTime(sessionDetails.startTimeHour, sessionDetails.startTimeMinute, sessionDetails.startTimePeriod),
        endTime: formatTime(sessionDetails.endTimeHour, sessionDetails.endTimeMinute, sessionDetails.endTimePeriod),
        rooms: Number(sessionDetails.rooms),
        relievers: Number(sessionDetails.relievers),
      };
      setExaminations(prev => [...prev, newExamination]);
      toast({ title: "Examination Added", description: `${sessionDetails.subject} on ${format(examinationData.date, "PPP")} has been added.` });
    }

    // Reset session form but keep college/exam names as they are usually same for multiple entries
    setSessionDetails(prev => ({
      ...prev,
      subject: '',
      rooms: 1,
      relievers: 0,
    }));
  }

  const handleEdit = (exam: Examination) => {
    form.setValue('college', exam.college);
    form.setValue('examName', exam.examName);
    form.setValue('date', exam.date);

    const startParts = parseTimeToParts(exam.startTime);
    const endParts = parseTimeToParts(exam.endTime);

    setSessionDetails({
      subject: exam.subject,
      startTimeHour: startParts.hour,
      startTimeMinute: startParts.minute,
      startTimePeriod: startParts.period,
      endTimeHour: endParts.hour,
      endTimeMinute: endParts.minute,
      endTimePeriod: endParts.period,
      rooms: exam.rooms,
      relievers: exam.relievers,
    });

    setEditingExamId(exam.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    setExaminations(prev => prev.filter(exam => exam.id !== id));
    if (editingExamId === id) setEditingExamId(null);
    toast({ title: "Examination Removed", variant: "destructive" });
  }

  const handleBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("The uploaded Excel workbook does not contain any sheets.");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 1. Extract raw 2D grid of rows
        const rawGrid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rawGrid || rawGrid.length === 0) {
          throw new Error("The uploaded Excel sheet is empty.");
        }

        const clean = (val: any) => String(val ?? '').trim();
        const normalize = (val: any) => clean(val).toLowerCase().replace(/[^a-z0-9]/g, '');

        // 2. Extract Institution Name and Examination Name from top metadata rows (if present)
        let detectedCollege = '';
        let detectedExamName = '';

        for (let r = 0; r < Math.min(rawGrid.length, 15); r++) {
          const row = rawGrid[r];
          if (!row || !Array.isArray(row)) continue;

          for (let c = 0; c < row.length; c++) {
            const cellText = clean(row[c]);
            const norm = normalize(cellText);

            // Detect Institution Name
            if (!detectedCollege && (norm.includes('institution') || norm.includes('collegename') || norm.includes('nameofinstitution') || (norm.includes('college') && !norm.includes('universitycollege')))) {
              if (cellText.includes(':')) {
                const parts = cellText.split(':');
                if (parts[1] && clean(parts[1])) {
                  detectedCollege = clean(parts[1]);
                }
              }
              if (!detectedCollege) {
                for (let nextC = c + 1; nextC < row.length; nextC++) {
                  if (clean(row[nextC])) {
                    detectedCollege = clean(row[nextC]);
                    break;
                  }
                }
              }
            }

            // Detect Examination Name
            if (!detectedExamName && (norm.includes('examinationname') || norm.includes('examname') || norm.includes('nameoftheexamination') || norm === 'examination' || norm === 'examinationdetails')) {
              if (cellText.includes(':')) {
                const parts = cellText.split(':');
                if (parts[1] && clean(parts[1])) {
                  detectedExamName = clean(parts[1]);
                }
              }
              if (!detectedExamName) {
                for (let nextC = c + 1; nextC < row.length; nextC++) {
                  if (clean(row[nextC])) {
                    detectedExamName = clean(row[nextC]);
                    break;
                  }
                }
              }
            }
          }
        }

        // 3. Dynamically find the Table Header row
        let headerRowIndex = -1;
        let colDateIdx = -1;
        let colSubjectIdx = -1;
        let colStartTimeIdx = -1;
        let colEndTimeIdx = -1;
        let colTimingsIdx = -1;
        let colRoomsIdx = -1;
        let colRelieversIdx = -1;

        for (let r = 0; r < Math.min(rawGrid.length, 20); r++) {
          const row = rawGrid[r];
          if (!row || !Array.isArray(row)) continue;

          let dIdx = -1;
          let sIdx = -1;
          let stIdx = -1;
          let etIdx = -1;
          let tIdx = -1;
          let rmIdx = -1;
          let relIdx = -1;

          for (let c = 0; c < row.length; c++) {
            const cell = clean(row[c]);
            const norm = normalize(cell);
            if (!norm) continue;

            if (dIdx === -1 && (norm === 'date' || norm.includes('examdate') || norm.includes('sessiondate') || norm === 'dates')) {
              dIdx = c;
            } else if (sIdx === -1 && (norm === 'subject' || norm.includes('subjectname') || norm.includes('paper') || norm.includes('course') || norm.includes('subjectpaper') || norm === 'subjects')) {
              sIdx = c;
            } else if (stIdx === -1 && (norm === 'starttime' || norm === 'fromtime' || norm === 'start' || norm === 'sessionstart' || norm === 'from')) {
              stIdx = c;
            } else if (etIdx === -1 && (norm === 'endtime' || norm === 'totime' || norm === 'end' || norm === 'sessionend' || norm === 'to')) {
              etIdx = c;
            } else if (tIdx === -1 && (norm === 'timings' || norm === 'time' || norm === 'sessiontime' || norm === 'examtiming' || norm === 'examtimings' || norm === 'sessiontimings')) {
              tIdx = c;
            } else if (rmIdx === -1 && (norm.includes('room') || norm.includes('invigilator') || norm.includes('hall') || norm.includes('roomsrequired') || norm.includes('roomsalloted') || norm.includes('numberofroomsinvigilators'))) {
              rmIdx = c;
            } else if (relIdx === -1 && (norm.includes('reliever') || norm.includes('relieversrequired') || norm.includes('relievercount') || norm.includes('numberofrelievers'))) {
              relIdx = c;
            }
          }

          // A valid timetable header row must contain at least Date and Subject columns
          if (dIdx !== -1 && sIdx !== -1) {
            headerRowIndex = r;
            colDateIdx = dIdx;
            colSubjectIdx = sIdx;
            colStartTimeIdx = stIdx;
            colEndTimeIdx = etIdx;
            colTimingsIdx = tIdx;
            colRoomsIdx = rmIdx;
            colRelieversIdx = relIdx;
            break;
          }
        }

        // If no timetable headers were identified, show a clear error
        if (headerRowIndex === -1 || colDateIdx === -1 || colSubjectIdx === -1) {
          throw new Error("Invalid file format. The uploaded Excel sheet does not contain examination timetable columns (e.g., Date, Subject, Timings, Rooms/Invigilators). Please upload a valid examination timetable file.");
        }

        // 4. Flexible date & time parsers
        const parseFlexibleDate = (raw: any): Date | null => {
          if (!raw) return null;
          if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
          if (typeof raw === 'number') {
            const utc = new Date(Date.UTC(0, 0, raw - 1));
            return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
          }
          if (typeof raw === 'string') {
            const trimmed = raw.trim();
            // Match DD/MM/YY, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
            const dmy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
            if (dmy) {
              const day = parseInt(dmy[1], 10);
              const month = parseInt(dmy[2], 10) - 1;
              let year = parseInt(dmy[3], 10);
              if (year < 100) year += 2000;
              const dt = new Date(year, month, day);
              if (!isNaN(dt.getTime())) return dt;
            }
            const standard = new Date(trimmed);
            if (!isNaN(standard.getTime())) return standard;
          }
          return null;
        };

        const parseFlexibleTime = (raw: any, fallback = '10:00'): string => {
          if (raw === undefined || raw === null || raw === '') return fallback;
          if (typeof raw === 'number') {
            const totalSecs = Math.round(raw * 86400);
            const hrs = Math.floor(totalSecs / 3600) % 24;
            const mins = Math.floor((totalSecs % 3600) / 60);
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          }
          if (typeof raw === 'string') {
            const str = raw.trim();
            // Format 10.00 AM / 01.00 PM / 10:00 AM / 1:00 PM / 10.00 / 13.00 / 10:00 / 13:00
            const matchAmPm = str.match(/^(\d{1,2})[:\.](\d{2})\s*(AM|PM|am|pm)?$/i);
            if (matchAmPm) {
              let h = parseInt(matchAmPm[1], 10);
              const m = matchAmPm[2];
              const period = matchAmPm[3]?.toUpperCase();
              if (period === 'PM' && h < 12) h += 12;
              if (period === 'AM' && h === 12) h = 0;
              return `${h.toString().padStart(2, '0')}:${m}`;
            }
            const standard = new Date(`01/01/1970 ${str.replace(/\./g, ':')}`);
            if (!isNaN(standard.getTime())) {
              return format(standard, 'HH:mm');
            }
          }
          return fallback;
        };

        const parseNumberSafe = (raw: any, fallback = 1): number => {
          if (typeof raw === 'number') return isNaN(raw) ? fallback : raw;
          if (typeof raw === 'string') {
            const cleanStr = raw.replace(/[^0-9]/g, '');
            const num = parseInt(cleanStr, 10);
            return isNaN(num) ? fallback : num;
          }
          return fallback;
        };

        // 5. Parse Data Rows
        const newExams: Examination[] = [];
        const collegeFinal = detectedCollege || form.getValues('college') || 'Carmel Pre-University College';
        const examNameFinal = detectedExamName || form.getValues('examName') || 'Annual Examination';

        for (let r = headerRowIndex + 1; r < rawGrid.length; r++) {
          const row = rawGrid[r];
          if (!row || !Array.isArray(row)) continue;

          const subjectRaw = clean(row[colSubjectIdx]);
          if (!subjectRaw || normalize(subjectRaw) === 'total' || normalize(subjectRaw) === 'grandtotal') {
            continue;
          }

          const dateRaw = row[colDateIdx];
          const parsedDate = parseFlexibleDate(dateRaw);
          if (!parsedDate) continue;

          let startTime = '10:00';
          let endTime = '13:00';

          if (colStartTimeIdx !== -1 && row[colStartTimeIdx] !== undefined && clean(row[colStartTimeIdx])) {
            startTime = parseFlexibleTime(row[colStartTimeIdx], '10:00');
          }
          if (colEndTimeIdx !== -1 && row[colEndTimeIdx] !== undefined && clean(row[colEndTimeIdx])) {
            endTime = parseFlexibleTime(row[colEndTimeIdx], '13:00');
          }

          // If start and end times were combined in a single timing column e.g. "10.00 AM - 01.00 PM"
          if (colTimingsIdx !== -1 && (!row[colStartTimeIdx] || !row[colEndTimeIdx]) && row[colTimingsIdx]) {
            const timingStr = clean(row[colTimingsIdx]);
            const split = timingStr.split(/[-–—to]/i).map(s => s.trim());
            if (split.length >= 2) {
              startTime = parseFlexibleTime(split[0], '10:00');
              endTime = parseFlexibleTime(split[1], '13:00');
            }
          }

          const rooms = colRoomsIdx !== -1 ? parseNumberSafe(row[colRoomsIdx], 1) : 1;
          const relievers = colRelieversIdx !== -1 ? parseNumberSafe(row[colRelieversIdx], 0) : 0;

          newExams.push({
            id: `exam-bulk-${Date.now()}-${r}`,
            college: collegeFinal,
            examName: examNameFinal,
            subject: subjectRaw,
            date: parsedDate,
            startTime,
            endTime,
            rooms: Math.max(1, rooms),
            relievers: Math.max(0, relievers),
          });
        }

        if (newExams.length === 0) {
          throw new Error("No valid examination timetable sessions found in the uploaded file. Please make sure the dates and subjects are properly specified.");
        }

        // 6. Update Web Page Input Fields with detected Institution Name and Examination Name
        if (detectedCollege) {
          form.setValue('college', detectedCollege, { shouldValidate: true, shouldDirty: true });
        }
        if (detectedExamName) {
          form.setValue('examName', detectedExamName, { shouldValidate: true, shouldDirty: true });
        }
        if (newExams.length > 0 && newExams[0].date) {
          form.setValue('date', newExams[0].date, { shouldValidate: true, shouldDirty: true });
        }

        // 7. Update examinations state
        setExaminations(prev => [...prev, ...newExams]);

        // 8. Save uploaded Excel file to Supabase Storage per user
        if (user?.id) {
          uploadUserFile({
            file,
            fileName: file.name,
            fileType: 'excel',
            category: 'upload',
            subCategory: 'examinations',
            userId: user.id,
            metadata: {
              examCount: newExams.length,
              college: collegeFinal,
              examName: examNameFinal,
            },
          }).then(({ error }) => {
            if (!error) {
              toast({
                title: "Cloud Backup Complete",
                description: `"${file.name}" was successfully saved to your Supabase storage.`,
              });
            }
          });
        }

        toast({
          title: "Import Successful",
          description: `Imported ${newExams.length} examination sessions${detectedCollege ? ` for "${detectedCollege}"` : ''}.`,
        });

      } catch (error: any) {
        console.error("Error processing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: error.message || "Could not parse the Excel file. Please upload a valid examination timetable.",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSessionDetailChange = (field: keyof typeof sessionDetails, value: string | number) => {
    setSessionDetails(prev => ({ ...prev, [field]: value }));
  }

  const handleContinue = () => {
    if (examinations.length > 0) {
      router.push(`/dashboard/invigilators`);
    } else {
      toast({
        variant: "destructive",
        title: "No Examinations",
        description: "Please add at least one examination to continue.",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Card: Examination Details */}
      <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />
        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="font-headline text-xl font-bold tracking-tight">Examination Details</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Configure your institution, examination schedule, and session requirements</p>
              </div>
            </div>
            {editingExamId && (
              <Badge className="bg-[#F59E0B]/15 text-[#D97706] dark:text-[#FBBF24] border-[#F59E0B]/30 font-semibold px-3 py-1 text-xs">
                Editing Examination
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2">
          <Form {...form}>
            <form className="space-y-5">
              {/* Main Grid of all Examination and Session Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* 1. Institution Name */}
                <div className="md:col-span-6 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#4F46E5] dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <Building2 className="h-4 w-4" />
                    <span>Name of the Institution</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="college"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            placeholder="Type your School / College Name..."
                            {...field}
                            className="bg-background dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/80 focus-visible:border-[#4F46E5] focus-visible:ring-1 focus-visible:ring-[#4F46E5] transition-colors rounded-lg h-9 font-medium text-sm text-foreground"
                          />
                        </FormControl>
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 2. Examination Name */}
                <div className="md:col-span-6 bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#0891B2] dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                    <GraduationCap className="h-4 w-4" />
                    <span>Name of the Examination</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="examName"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Annual Examination - March 2027"
                            className="bg-background dark:bg-slate-900 border-cyan-200 dark:border-cyan-800/80 focus-visible:border-[#0891B2] focus-visible:ring-1 focus-visible:ring-[#0891B2] transition-colors rounded-lg h-9 font-medium text-sm text-foreground"
                          />
                        </FormControl>
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 3. Date for Session */}
                <div className="md:col-span-6 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#4F46E5] dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Date for Session</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="space-y-0 flex flex-col">
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-medium bg-background dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-50/50 dark:hover:bg-slate-800 rounded-lg h-9 text-sm transition-colors",
                                  !field.value && "text-muted-foreground font-normal"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-[#4F46E5] shrink-0" />
                                {field.value ? (
                                  <span className="font-semibold text-foreground">{format(field.value, "PPP")}</span>
                                ) : (
                                  <span>Select exam date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border-border" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setIsCalendarOpen(false);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 4. Subject */}
                <div className="md:col-span-6 bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#0891B2] dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                    <BookOpen className="h-4 w-4" />
                    <span>Subject</span>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Type or select a subject..."
                      value={sessionDetails.subject}
                      onChange={(e) => handleSessionDetailChange('subject', e.target.value)}
                      list="subject-options"
                      className="bg-background dark:bg-slate-900 border-cyan-200 dark:border-cyan-800/80 focus-visible:border-[#0891B2] focus-visible:ring-1 focus-visible:ring-[#0891B2] transition-colors rounded-lg h-9 font-medium text-sm text-foreground"
                    />
                  </div>
                  <datalist id="subject-options">
                    <option value="Accountancy" />
                    <option value="Basic Mathematics" />
                    <option value="Biology" />
                    <option value="Business Studies" />
                    <option value="Chemistry" />
                    <option value="Computer Science" />
                    <option value="Economics" />
                    <option value="Electronics" />
                    <option value="English" />
                    <option value="Geography" />
                    <option value="Hindi" />
                    <option value="History" />
                    <option value="Home Science" />
                    <option value="Kannada" />
                    <option value="Logic" />
                    <option value="None" />
                    <option value="Political Science" />
                    <option value="Sanskrit" />
                    <option value="Sociology" />
                    <option value="Statistics" />
                  </datalist>
                </div>

                {/* 5. Invigilator Count */}
                <div className="col-span-1 sm:col-span-6 md:col-span-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#4F46E5] dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <Users className="h-4 w-4" />
                    <span>NO. OF INVIGILATORS</span>
                  </div>
                  <Select
                    value={sessionDetails.rooms.toString()}
                    onValueChange={(value) => handleSessionDetailChange('rooms', parseInt(value, 10))}
                  >
                    <SelectTrigger className="bg-background dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 rounded-lg h-9 font-semibold text-[#4F46E5] dark:text-indigo-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 dark:border-slate-800">
                      {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'Invigilator' : 'Invigilators'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. Reliever Count */}
                <div className="col-span-1 sm:col-span-6 md:col-span-3 bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#0891B2] dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                    <UserCheck className="h-4 w-4" />
                    <span>No. of Relievers</span>
                  </div>
                  <Select
                    value={sessionDetails.relievers.toString()}
                    onValueChange={(value) => handleSessionDetailChange('relievers', parseInt(value, 10))}
                  >
                    <SelectTrigger className="bg-background dark:bg-slate-900 border-cyan-200 dark:border-cyan-800 rounded-lg h-9 font-semibold text-[#0891B2] dark:text-cyan-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 dark:border-slate-800">
                      {Array.from({ length: 20 }, (_, i) => i).map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'Reliever' : 'Relievers'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 7. Timings Selector Grid */}
                <div className="col-span-1 md:col-span-6 bg-muted/40 border border-border/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-4 w-4 text-[#F59E0B]" />
                    <span>Session Timings</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Start Time */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4F46E5]" /> Start Time
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <Select value={sessionDetails.startTimeHour} onValueChange={(v) => handleSessionDetailChange('startTimeHour', v)}>
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>{hours.map(h => <SelectItem key={`st-h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={sessionDetails.startTimeMinute} onValueChange={(v) => handleSessionDetailChange('startTimeMinute', v)}>
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>{minutes.map(m => <SelectItem key={`st-m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={sessionDetails.startTimePeriod} onValueChange={(v) => handleSessionDetailChange('startTimePeriod', v)}>
                          <SelectTrigger className="h-8 text-xs bg-background font-semibold"><SelectValue /></SelectTrigger>
                          <SelectContent>{periods.map(p => <SelectItem key={`st-p-${p}`} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* End Time */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0891B2]" /> End Time
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <Select value={sessionDetails.endTimeHour} onValueChange={(v) => handleSessionDetailChange('endTimeHour', v)}>
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>{hours.map(h => <SelectItem key={`et-h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={sessionDetails.endTimeMinute} onValueChange={(v) => handleSessionDetailChange('endTimeMinute', v)}>
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>{minutes.map(m => <SelectItem key={`et-m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={sessionDetails.endTimePeriod} onValueChange={(v) => handleSessionDetailChange('endTimePeriod', v)}>
                          <SelectTrigger className="h-8 text-xs bg-background font-semibold"><SelectValue /></SelectTrigger>
                          <SelectContent>{periods.map(p => <SelectItem key={`et-p-${p}`} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex flex-wrap justify-end items-center pt-4 gap-3 border-t border-border/60">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />

                {editingExamId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingExamId(null);
                      setSessionDetails(prev => ({ ...prev, subject: '', rooms: 1, relievers: 0 }));
                    }}
                    className="rounded-lg"
                  >
                    Cancel Edit
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={onSaveExamination}
                  className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold shadow-sm rounded-lg transition-all"
                >
                  {editingExamId ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Update Examination
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Examination
                    </>
                  )}
                </Button>

                {!editingExamId && (
                  <>
                    <span className="text-xs uppercase font-medium text-muted-foreground px-1">or</span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBulkUploadClick}
                      className="border-[#0891B2]/40 text-[#0891B2] hover:bg-[#0891B2]/10 dark:text-cyan-400 font-semibold rounded-lg shadow-sm"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import from Excel
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Added Examinations Modern Card */}
      <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0891B2] via-[#4F46E5] to-[#F59E0B]" />
        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-[#0891B2] dark:text-cyan-300">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="font-headline text-xl font-bold tracking-tight">Added Examinations</CardTitle>
              </div>
            </div>

            {examinations.length > 0 && (
              <Badge className="w-fit bg-[#0891B2]/10 text-[#0891B2] dark:text-cyan-300 border-[#0891B2]/30 px-3 py-1 font-semibold rounded-full text-xs">
                {examinations.length} {examinations.length === 1 ? 'Session Added' : 'Sessions Added'}
              </Badge>
            )}
          </div>

          {/* Quick Metrics Bar when exams exist */}
          {examinations.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="bg-muted/40 dark:bg-muted/20 border border-border/60 rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-muted-foreground">Total Sessions</div>
                <div className="text-xl font-bold text-[#4F46E5] mt-0.5">{examinations.length}</div>
              </div>
              <div className="bg-muted/40 dark:bg-muted/20 border border-border/60 rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-muted-foreground">Total Duties/Invigilators</div>
                <div className="text-xl font-bold text-[#4F46E5] mt-0.5">{totalRooms}</div>
              </div>
              <div className="bg-muted/40 dark:bg-muted/20 border border-border/60 rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-muted-foreground">Total Relievers</div>
                <div className="text-xl font-bold text-[#F59E0B] mt-0.5">{totalRelievers}</div>
              </div>
              <div className="bg-muted/40 dark:bg-muted/20 border border-border/60 rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-muted-foreground">Total Staff Needed</div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{totalRooms + totalRelievers}</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2">
          <div className="rounded-xl border border-border/70 overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/70">
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground w-14">#</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Date & Day</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Subject</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Timings</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Invigilators</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Relievers</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examinations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 rounded-full bg-muted text-muted-foreground/60">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">No examinations added yet</p>
                          <p className="text-xs text-muted-foreground">Fill in the session details above or import from Excel.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  examinations.map((exam, index) => (
                    <TableRow
                      key={exam.id}
                      className={cn(
                        "transition-colors hover:bg-muted/40",
                        index % 2 === 1 && "bg-muted/15"
                      )}
                    >
                      <TableCell className="font-medium text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-sm">{format(new Date(exam.date), "dd/MM/yyyy")}</div>
                          <div className="text-[11px] text-muted-foreground">{format(new Date(exam.date), "EEEE")}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm text-foreground">{exam.subject}</span>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs font-medium text-muted-foreground">
                          <Clock className="h-3 w-3 text-[#F59E0B]" />
                          <span>{formatTimeTo12Hour(exam.startTime)} – {formatTimeTo12Hour(exam.endTime)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                          {exam.rooms}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-[#0891B2] dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-100 dark:border-cyan-900/50">
                          {exam.relievers}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-[#4F46E5] hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                            onClick={() => handleEdit(exam)}
                            title="Edit session"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(exam.id)}
                            title="Remove session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {examinations.length > 0 && (
                <TableFooter className="bg-muted/60 border-t-2 border-border font-medium">
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold text-xs uppercase tracking-wider text-foreground">
                      Total Requirements
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm text-[#4F46E5]">
                      {totalRooms}
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm text-[#0891B2]">
                      {totalRelievers}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {totalRooms + totalRelievers} Total
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>

        <CardFooter className="justify-end px-6 py-4 bg-muted/10 border-t border-border/60">
          <Button
            type="button"
            size="lg"
            className="bg-[#4F46E5] hover:bg-[#4338ca] text-white shadow-sm font-semibold rounded-lg transition-all flex items-center gap-2"
            onClick={handleContinue}
          >
            <span>Continue to Invigilator Details</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
