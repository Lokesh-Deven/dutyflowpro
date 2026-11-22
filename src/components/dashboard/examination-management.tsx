"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { formatAppDate, parseAppDate } from '@/lib/date-utils';
import { cn, formatTimeTo12Hour } from '@/lib/utils';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { useStudentSeating } from '@/lib/student-seating-context';
import {
  getActiveTimetable,
  getSavedTimetables,
  fetchTimetablesFromCloud,
} from '@/lib/examination-timetable-service';
import type { ExaminationTimetable, TimetableRow } from '@/lib/examination-timetable-types';
import type { Examination } from '@/lib/types';
import type { SeatingAllocationRecord, StudentSubject } from '@/lib/student-seating-types';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays,
  Clock,
  DoorOpen,
  Users,
  UserCheck,
  Edit2,
  Trash2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Plus,
  FileText,
  Building2,
  GraduationCap,
  Calendar,
} from 'lucide-react';

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

/**
 * Match a timetable session by Date and Subject to records in Seating Allocations
 */
function findMatchingAllocationRooms(
  sessionDate: Date | string,
  subjectTitle: string,
  allocations: SeatingAllocationRecord[],
  studentSubjects: StudentSubject[] = []
): number {
  if (!allocations || allocations.length === 0) return 0;

  let isoDate = '';
  let ddmmyyyyDate = '';

  if (sessionDate instanceof Date) {
    if (!isNaN(sessionDate.getTime())) {
      isoDate = sessionDate.toISOString().split('T')[0];
      ddmmyyyyDate = format(sessionDate, 'dd.MM.yyyy');
    }
  } else if (typeof sessionDate === 'string') {
    const clean = sessionDate.trim();
    if (clean.includes('.')) {
      ddmmyyyyDate = clean;
      const parts = clean.split('.');
      if (parts.length === 3) {
        isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else {
      isoDate = clean.split('T')[0];
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        ddmmyyyyDate = `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
      }
    }
  }

  const subjectTokens = (subjectTitle || '')
    .toLowerCase()
    .split(/[\s,\/&\-_+()]+/)
    .filter((t) => t.length > 2);

  // 1. Strict priority: Match both Date AND Subject
  const matchedOnBoth = allocations.filter((alloc) => {
    const aDate = (alloc.examination?.date || '').trim();
    const dateMatches =
      aDate === isoDate ||
      aDate === ddmmyyyyDate ||
      (isoDate && aDate.startsWith(isoDate));
    if (!dateMatches) return false;

    const allocSubjectNames = (alloc.subjectIds || []).map((sid) => {
      const foundSubj = studentSubjects.find((s) => s.id === sid);
      return (foundSubj ? foundSubj.name : sid).toLowerCase();
    });
    const allocName = (alloc.name || '').toLowerCase();
    const allocExamName = (alloc.examination?.examName || '').toLowerCase();

    const hasSubjectMatch =
      subjectTokens.length === 0 ||
      subjectTokens.some(
        (tok) =>
          allocSubjectNames.some((asn) => asn.includes(tok)) ||
          allocName.includes(tok) ||
          allocExamName.includes(tok)
      );

    return hasSubjectMatch;
  });

  if (matchedOnBoth.length > 0) {
    return matchedOnBoth.reduce((max, a) => {
      const roomCount = a.summary?.totalRooms || a.roomPlans?.length || a.roomIds?.length || 0;
      return Math.max(max, roomCount);
    }, 0);
  }

  // 2. Secondary priority: Match on Date alone
  const matchedOnDate = allocations.filter((alloc) => {
    const aDate = (alloc.examination?.date || '').trim();
    return aDate === isoDate || aDate === ddmmyyyyDate || (isoDate && aDate.startsWith(isoDate));
  });

  if (matchedOnDate.length > 0) {
    return matchedOnDate.reduce((max, a) => {
      const roomCount = a.summary?.totalRooms || a.roomPlans?.length || a.roomIds?.length || 0;
      return Math.max(max, roomCount);
    }, 0);
  }

  // 3. Fallback: Match on Subject name alone
  if (subjectTokens.length > 0) {
    const matchedOnSubject = allocations.filter((alloc) => {
      const allocSubjectNames = (alloc.subjectIds || []).map((sid) => {
        const foundSubj = studentSubjects.find((s) => s.id === sid);
        return (foundSubj ? foundSubj.name : sid).toLowerCase();
      });
      const allocName = (alloc.name || '').toLowerCase();
      return subjectTokens.some(
        (tok) =>
          allocSubjectNames.some((asn) => asn.includes(tok)) ||
          allocName.includes(tok)
      );
    });

    if (matchedOnSubject.length > 0) {
      return matchedOnSubject.reduce((max, a) => {
        const roomCount = a.summary?.totalRooms || a.roomPlans?.length || a.roomIds?.length || 0;
        return Math.max(max, roomCount);
      }, 0);
    }
  }

  return 0;
}

const parseTimeToParts = (time: string) => {
  if (!time) return { hour: '10', minute: '00', period: 'AM' };
  const cleanTime = time.trim();
  const match = cleanTime.match(/^(\d{1,2})[:\.](\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    let p = match[3]?.toUpperCase();
    if (p) {
      if (h === 0) h = 12;
      return { hour: h.toString().padStart(2, '0'), minute: m, period: p };
    } else {
      p = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return { hour: h.toString().padStart(2, '0'), minute: m, period: p };
    }
  }
  return { hour: '10', minute: '00', period: 'AM' };
};

const formatTimeFromParts = (hour: string, minute: string, period: string) => {
  return `${hour}:${minute} ${period}`;
};

export function ExaminationManagement() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { examinations, setExaminations } = useAllotment();
  const { allocations, subjects: studentSubjects } = useStudentSeating();

  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTimetable, setActiveTimetable] = useState<ExaminationTimetable | null>(null);

  // Edit Dialog State
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    subject: '',
    dateStr: '',
    startTimeHour: '10',
    startTimeMinute: '00',
    startTimePeriod: 'AM',
    endTimeHour: '01',
    endTimeMinute: '00',
    endTimePeriod: 'PM',
    rooms: 1,
    relievers: 0,
  });

  // Add Custom Session Dialog State
  const [isAddCustomDialogOpen, setIsAddCustomDialogOpen] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    subject: '',
    dateStr: new Date().toISOString().split('T')[0],
    startTimeHour: '10',
    startTimeMinute: '00',
    startTimePeriod: 'AM',
    endTimeHour: '01',
    endTimeMinute: '00',
    endTimePeriod: 'PM',
    rooms: 1,
    relievers: 0,
  });

  // Delete Dialog State
  const [examToDelete, setExamToDelete] = useState<Examination | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Clear All Alert State
  const [isClearAllAlertOpen, setIsClearAllAlertOpen] = useState(false);

  const institutionName = useMemo(() => {
    return (
      (profile?.institution_name && profile.institution_name !== 'Guest Profile'
        ? profile.institution_name
        : null) ||
      (user?.user_metadata?.institution_name as string) ||
      'Seshadripuram Independent Pre-University College'
    );
  }, [profile, user]);

  /**
   * Builds Examination sessions from Timetable and Seating Allocation data
   */
  const buildSessionsFromTimetable = useCallback(
    (timetable: ExaminationTimetable): Examination[] => {
      if (!timetable || !timetable.rows || timetable.rows.length === 0) {
        return [];
      }

      const generated: Examination[] = [];

      timetable.rows.forEach((row: TimetableRow, rowIndex: number) => {
        if (!row.date) return;
        const sessionDate = parseAppDate(row.date) || new Date(`${row.date}T00:00:00`);

        const slots = Array.isArray(row.slots) && row.slots.length > 0 ? row.slots : null;

        if (slots) {
          slots.forEach((slot, slotIndex) => {
            const subject =
              Array.isArray(slot.subjects) && slot.subjects.length > 0
                ? slot.subjects.join(' / ')
                : slot.course || 'Examination Session';

            let startTime = '10:00 AM';
            let endTime = '01:00 PM';
            if (slot.timings) {
              const timingKeys = Object.keys(slot.timings);
              if (timingKeys.length > 0 && slot.timings[timingKeys[0]]) {
                startTime = slot.timings[timingKeys[0]].startTime || startTime;
                endTime = slot.timings[timingKeys[0]].endTime || endTime;
              }
            }

            const roomsAllocated = findMatchingAllocationRooms(
              row.date,
              subject,
              allocations,
              studentSubjects
            );
            // Default invigilators required strictly to rooms allocated (or 1 if none yet allocated)
            const invigilatorsRequired = Math.max(1, roomsAllocated || 1);
            // Standard ratio: 1 reliever per 5 rooms
            const relieversRequired = Math.ceil((roomsAllocated || 0) / 5);

            generated.push({
              id: `tt-${row.id || rowIndex}-slot-${slot.id || slotIndex}`,
              date: sessionDate,
              subject,
              startTime,
              endTime,
              rooms: invigilatorsRequired,
              relievers: relieversRequired,
              roomsAllocated,
              college: timetable.institutionName || institutionName,
              examName: timetable.examinationName || 'Examination',
            });
          });
        } else {
          // Fallback if rows do not have nested slots
          const subject =
            Array.isArray(row.subjects) && row.subjects.length > 0
              ? row.subjects.join(' / ')
              : row.course || 'Examination Session';

          let startTime = '10:00 AM';
          let endTime = '01:00 PM';
          if (row.timings) {
            const timingKeys = Object.keys(row.timings);
            if (timingKeys.length > 0 && row.timings[timingKeys[0]]) {
              startTime = row.timings[timingKeys[0]].startTime || startTime;
              endTime = row.timings[timingKeys[0]].endTime || endTime;
            }
          }

          const roomsAllocated = findMatchingAllocationRooms(
            row.date,
            subject,
            allocations,
            studentSubjects
          );
          const invigilatorsRequired = Math.max(1, roomsAllocated || 1);
          const relieversRequired = Math.ceil((roomsAllocated || 0) / 5);

          generated.push({
            id: `tt-${row.id || rowIndex}`,
            date: sessionDate,
            subject,
            startTime,
            endTime,
            rooms: invigilatorsRequired,
            relievers: relieversRequired,
            roomsAllocated,
            college: timetable.institutionName || institutionName,
            examName: timetable.examinationName || 'Examination',
          });
        }
      });

      return generated;
    },
    [allocations, studentSubjects, institutionName]
  );

  /**
   * Pulls the active or latest timetable and populates the examination schedule
   */
  const syncWithTimetable = useCallback(
    async (manual: boolean = false) => {
      setIsSyncing(true);
      try {
        const userId = user?.id;
        let timetable = getActiveTimetable(userId);
        if (!timetable) {
          const saved = getSavedTimetables(userId);
          if (saved.length > 0) {
            timetable = saved[0];
          }
        }

        if (!timetable && userId) {
          try {
            const cloudTimetables = await fetchTimetablesFromCloud(userId);
            if (cloudTimetables.length > 0) {
              timetable = cloudTimetables[0];
            }
          } catch (err) {
            console.warn('Cloud timetable fetch error:', err);
          }
        }

        if (!timetable || !timetable.rows || timetable.rows.length === 0) {
          if (manual) {
            toast({
              title: 'No Timetable Found',
              description:
                'No examination timetable is configured yet. Please configure and publish a timetable under "Examination Timetable".',
              variant: 'destructive',
            });
          }
          setIsSyncing(false);
          return;
        }

        setActiveTimetable(timetable);
        const sessions = buildSessionsFromTimetable(timetable);

        if (sessions.length > 0) {
          setExaminations(sessions);
          if (manual) {
            toast({
              title: 'Schedule Synchronized',
              description: `Loaded ${sessions.length} sessions from "${timetable.examinationName}". Room allocations and invigilator defaults have been synchronized.`,
            });
          }
        }
      } catch (err: any) {
        console.error('Error synchronizing timetable:', err);
        if (manual) {
          toast({
            title: 'Sync Failed',
            description: err?.message || 'Could not synchronize timetable data.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [user, buildSessionsFromTimetable, setExaminations, toast]
  );

  // Auto-populate when examinations is empty on initial mount
  useEffect(() => {
    if (examinations.length === 0) {
      syncWithTimetable(false);
    } else {
      const active = getActiveTimetable(user?.id);
      if (active) setActiveTimetable(active);
    }
  }, [examinations.length, syncWithTimetable, user]);

  // Backfill or update rooms allocated when allocations load/change
  useEffect(() => {
    if (examinations.length > 0 && allocations.length > 0) {
      let changed = false;
      const updated = examinations.map((exam) => {
        const matched = findMatchingAllocationRooms(
          exam.date,
          exam.subject,
          allocations,
          studentSubjects
        );

        if (exam.roomsAllocated !== matched) {
          changed = true;
          return {
            ...exam,
            roomsAllocated: matched,
            // If rooms was left untouched or at default, auto-update 1:1
            rooms: exam.roomsAllocated === undefined || exam.rooms === (exam.roomsAllocated || 1)
              ? Math.max(1, matched || 1)
              : exam.rooms,
            relievers: exam.roomsAllocated === undefined || exam.relievers === Math.ceil((exam.roomsAllocated || 0) / 5)
              ? Math.ceil((matched || 0) / 5)
              : exam.relievers,
          };
        }
        return exam;
      });

      if (changed) {
        setExaminations(updated);
      }
    }
  }, [allocations, studentSubjects, examinations, setExaminations]);

  // Total Metric Calculations
  const totalRoomsAllocated = useMemo(
    () => examinations.reduce((acc, exam) => acc + (exam.roomsAllocated || 0), 0),
    [examinations]
  );
  const totalInvigilatorsRequired = useMemo(
    () => examinations.reduce((acc, exam) => acc + exam.rooms, 0),
    [examinations]
  );
  const totalRelieversRequired = useMemo(
    () => examinations.reduce((acc, exam) => acc + exam.relievers, 0),
    [examinations]
  );
  const totalStaffNeeded = useMemo(
    () => totalInvigilatorsRequired + totalRelieversRequired,
    [totalInvigilatorsRequired, totalRelieversRequired]
  );

  // Handler for row dropdown change (Invigilators Required)
  const handleInvigilatorsChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setExaminations((prev) =>
      prev.map((exam) => (exam.id === id ? { ...exam, rooms: num } : exam))
    );
  };

  // Handler for row dropdown change (Relievers Required)
  const handleRelieversChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setExaminations((prev) =>
      prev.map((exam) => (exam.id === id ? { ...exam, relievers: num } : exam))
    );
  };

  // Open Edit Dialog
  const handleOpenEdit = (exam: Examination) => {
    setEditingExam(exam);
    const startParts = parseTimeToParts(exam.startTime);
    const endParts = parseTimeToParts(exam.endTime);

    setEditForm({
      subject: exam.subject,
      dateStr: format(new Date(exam.date), 'yyyy-MM-dd'),
      startTimeHour: startParts.hour,
      startTimeMinute: startParts.minute,
      startTimePeriod: startParts.period,
      endTimeHour: endParts.hour,
      endTimeMinute: endParts.minute,
      endTimePeriod: endParts.period,
      rooms: exam.rooms,
      relievers: exam.relievers,
    });
    setIsEditDialogOpen(true);
  };

  // Save Edit Changes
  const handleSaveEdit = () => {
    if (!editingExam) return;
    if (!editForm.subject.trim()) {
      toast({
        title: 'Subject Required',
        description: 'Please enter a valid subject title.',
        variant: 'destructive',
      });
      return;
    }

    const parsedDate = editForm.dateStr
      ? new Date(`${editForm.dateStr}T00:00:00`)
      : editingExam.date;

    const formattedStartTime = formatTimeFromParts(
      editForm.startTimeHour,
      editForm.startTimeMinute,
      editForm.startTimePeriod
    );
    const formattedEndTime = formatTimeFromParts(
      editForm.endTimeHour,
      editForm.endTimeMinute,
      editForm.endTimePeriod
    );

    setExaminations((prev) =>
      prev.map((e) =>
        e.id === editingExam.id
          ? {
              ...e,
              subject: editForm.subject.trim(),
              date: parsedDate,
              startTime: formattedStartTime,
              endTime: formattedEndTime,
              rooms: editForm.rooms,
              relievers: editForm.relievers,
            }
          : e
      )
    );

    setIsEditDialogOpen(false);
    setEditingExam(null);
    toast({
      title: 'Session Updated',
      description: `Updated examination session for ${editForm.subject}.`,
    });
  };

  // Open Delete Confirmation
  const handleOpenDelete = (exam: Examination) => {
    setExamToDelete(exam);
    setIsDeleteDialogOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!examToDelete) return;
    setExaminations((prev) => prev.filter((e) => e.id !== examToDelete.id));
    setIsDeleteDialogOpen(false);
    toast({
      title: 'Session Removed',
      description: `Removed "${examToDelete.subject}" from this allocation schedule.`,
    });
    setExamToDelete(null);
  };

  // Clear All Examinations
  const handleClearAllExaminations = () => {
    setExaminations([]);
    setIsClearAllAlertOpen(false);
    toast({
      title: 'All Sessions Cleared',
      description: 'The examination schedule has been cleared.',
      variant: 'destructive',
    });
  };

  // Add Custom Session
  const handleSaveNewSession = () => {
    if (!newSessionForm.subject.trim()) {
      toast({
        title: 'Subject Required',
        description: 'Please specify the subject for this session.',
        variant: 'destructive',
      });
      return;
    }

    const sessionDate = newSessionForm.dateStr
      ? new Date(`${newSessionForm.dateStr}T00:00:00`)
      : new Date();

    const formattedStartTime = formatTimeFromParts(
      newSessionForm.startTimeHour,
      newSessionForm.startTimeMinute,
      newSessionForm.startTimePeriod
    );
    const formattedEndTime = formatTimeFromParts(
      newSessionForm.endTimeHour,
      newSessionForm.endTimeMinute,
      newSessionForm.endTimePeriod
    );

    const roomsAllocated = findMatchingAllocationRooms(
      newSessionForm.dateStr,
      newSessionForm.subject,
      allocations,
      studentSubjects
    );

    const newExam: Examination = {
      id: `custom-exam-${Date.now()}`,
      date: sessionDate,
      subject: newSessionForm.subject.trim(),
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      rooms: newSessionForm.rooms,
      relievers: newSessionForm.relievers,
      roomsAllocated,
      college: activeTimetable?.institutionName || institutionName,
      examName: activeTimetable?.examinationName || 'Examination',
    };

    setExaminations((prev) => [...prev, newExam]);
    setIsAddCustomDialogOpen(false);
    setNewSessionForm({
      subject: '',
      dateStr: new Date().toISOString().split('T')[0],
      startTimeHour: '10',
      startTimeMinute: '00',
      startTimePeriod: 'AM',
      endTimeHour: '01',
      endTimeMinute: '00',
      endTimePeriod: 'PM',
      rooms: 1,
      relievers: 0,
    });
    toast({
      title: 'Custom Session Added',
      description: `Added ${newExam.subject} to the schedule.`,
    });
  };

  // Navigate to Invigilator Selection Step
  const handleContinue = () => {
    if (examinations.length === 0) {
      toast({
        title: 'No Examination Sessions',
        description: 'Please synchronize or add at least one examination session to proceed.',
        variant: 'destructive',
      });
      return;
    }
    router.push('/dashboard/invigilators');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6342e8] dark:text-purple-400 bg-[#6342e8]/10 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-md">
              Invigilation Duty
            </span>
            {activeTimetable && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                • {activeTimetable.examinationName}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Duty Allocation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Examination schedule and room counts auto-populated from Examination Timetable and Seating Allocation.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => syncWithTimetable(true)}
            disabled={isSyncing}
            className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all h-9 gap-1.5"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-[#6342e8]', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Timetable'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddCustomDialogOpen(true)}
            className="rounded-xl border-purple-200 dark:border-purple-800/60 text-[#6342e8] dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100/70 text-xs font-semibold transition-all h-9 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Session</span>
          </Button>

          <AlertDialog open={isClearAllAlertOpen} onOpenChange={setIsClearAllAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={examinations.length === 0}
                className="rounded-xl border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-medium transition-all h-9 gap-1.5 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Clear All Examination Details?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Are you sure you want to clear all {examinations.length} scheduled sessions? You can re-sync from your Examination Timetable anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-2">
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllExaminations}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Sessions</span>
            <CalendarDays className="h-4 w-4 text-[#6342e8]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {examinations.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Exam slots configured</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Rooms Allocated</span>
            <DoorOpen className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalRoomsAllocated}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">From seating allocations</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Invigilators Required</span>
            <Users className="h-4 w-4 text-[#6342e8]" />
          </div>
          <div className="text-2xl font-bold text-[#6342e8]">
            {totalInvigilatorsRequired}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">1:1 room match (customizable)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Relievers Required</span>
            <UserCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {totalRelieversRequired}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Standard: 1 per 5 rooms</p>
        </div>
      </div>

      {/* Main Schedule Table Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />
        <CardHeader className="pb-4 pt-5 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-400 shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Examination Schedule
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Synchronized sessions with room counts and invigilator requirements.
                </p>
              </div>
            </div>

            {examinations.length > 0 && (
              <Badge className="w-fit bg-[#6342e8]/10 text-[#6342e8] dark:text-purple-300 border-[#6342e8]/20 px-3 py-1 font-semibold rounded-full text-xs">
                {examinations.length} {examinations.length === 1 ? 'Session Scheduled' : 'Sessions Scheduled'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f8f9fc] dark:bg-slate-800/60 hover:bg-[#f8f9fc] border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 w-12 text-center">
                    #
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[150px]">
                    Date & Day
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[180px]">
                    Subject
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[160px]">
                    Timings
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center min-w-[140px]">
                    Rooms Allocated
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center min-w-[150px]">
                    Invigilators Required
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center min-w-[150px]">
                    Relievers Required
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-24">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {examinations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/70 text-[#6342e8] flex items-center justify-center">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-base text-slate-800 dark:text-slate-200">
                            No Examination Sessions Found
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Click below to synchronize directly from your Examination Timetable, or add a custom examination session.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => syncWithTimetable(true)}
                            className="bg-[#6342e8] hover:bg-[#5232d6] text-white rounded-xl text-xs font-semibold gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Sync from Timetable</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddCustomDialogOpen(true)}
                            className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Custom Session</span>
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  examinations.map((exam, index) => {
                    const examDateObj = new Date(exam.date);
                    const dayName = !isNaN(examDateObj.getTime())
                      ? format(examDateObj, 'EEEE')
                      : '';
                    const roomsCount = exam.roomsAllocated ?? 0;

                    return (
                      <TableRow
                        key={exam.id}
                        className={cn(
                          'transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40',
                          index % 2 === 1 && 'bg-slate-50/30 dark:bg-slate-800/20'
                        )}
                      >
                        {/* 1. # (Serial Number) */}
                        <TableCell className="text-center font-semibold text-xs text-slate-500">
                          {index + 1}
                        </TableCell>

                        {/* 2. DATE & DAY */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                              {formatAppDate(exam.date)}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {dayName}
                            </div>
                          </div>
                        </TableCell>

                        {/* 3. SUBJECT */}
                        <TableCell>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {exam.subject}
                          </div>
                        </TableCell>

                        {/* 4. TIMINGS */}
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                            <span>
                              {formatTimeTo12Hour(exam.startTime, true)} – {formatTimeTo12Hour(exam.endTime, true)}
                            </span>
                          </div>
                        </TableCell>

                        {/* 5. ROOMS ALLOCATED */}
                        <TableCell className="text-center">
                          {roomsCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <DoorOpen className="h-3.5 w-3.5" />
                              <span>{roomsCount} {roomsCount === 1 ? 'Room' : 'Rooms'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 font-normal">
                              0 Rooms
                            </span>
                          )}
                        </TableCell>

                        {/* 6. INVIGILATORS REQUIRED (Dropdown 1-50, Auto-defaulted to rooms count) */}
                        <TableCell className="text-center">
                          <Select
                            value={exam.rooms.toString()}
                            onValueChange={(val) => handleInvigilatorsChange(exam.id, val)}
                          >
                            <SelectTrigger className="h-8.5 w-24 mx-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl shadow-2xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-56 rounded-xl border-slate-200 dark:border-slate-800">
                              {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={n.toString()} className="text-xs">
                                  {n} {n === 1 ? 'Invigilator' : 'Invigilators'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* 7. RELIEVERS REQUIRED (Dropdown 0-50, Pre-filled 1 per 5 rooms) */}
                        <TableCell className="text-center">
                          <Select
                            value={exam.relievers.toString()}
                            onValueChange={(val) => handleRelieversChange(exam.id, val)}
                          >
                            <SelectTrigger className="h-8.5 w-24 mx-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl shadow-2xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-56 rounded-xl border-slate-200 dark:border-slate-800">
                              {Array.from({ length: 51 }, (_, i) => i).map((n) => (
                                <SelectItem key={n} value={n.toString()} className="text-xs">
                                  {n} {n === 1 ? 'Reliever' : 'Relievers'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* 8. ACTIONS */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(exam)}
                              title="Edit Session"
                              className="h-8 w-8 text-slate-500 hover:text-[#6342e8] hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(exam)}
                              title="Delete Session"
                              className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>

              {examinations.length > 0 && (
                <TableFooter className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 font-medium">
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Total Requirements
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {totalRoomsAllocated} {totalRoomsAllocated === 1 ? 'Room' : 'Rooms'}
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm text-[#6342e8]">
                      {totalInvigilatorsRequired}
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm text-amber-600 dark:text-amber-400">
                      {totalRelieversRequired}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs text-purple-700 dark:text-purple-300">
                      {totalStaffNeeded} Total Staff
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {examinations.length > 0
              ? `Ready to allocate faculty for ${examinations.length} sessions (${totalStaffNeeded} total duties).`
              : 'Add or synchronize sessions before continuing.'}
          </div>

          <Button
            type="button"
            size="lg"
            className="bg-[#6342e8] hover:bg-[#5232d6] text-white shadow-xs font-semibold rounded-xl transition-all flex items-center gap-2 w-full sm:w-auto"
            onClick={handleContinue}
          >
            <span>Continue to Invigilator Details</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Session Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Edit Examination Session
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Modify the subject title, date, timings, or staff requirements for this session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Subject Title
              </Label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g. Mathematics, English..."
                className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-sm font-medium"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Session Date
              </Label>
              <Input
                type="date"
                value={editForm.dateStr}
                onChange={(e) => setEditForm((prev) => ({ ...prev, dateStr: e.target.value }))}
                className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-sm font-medium"
              />
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-3">
              {/* Start Time */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Start Time
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Select
                    value={editForm.startTimeHour}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, startTimeHour: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={editForm.startTimeMinute}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, startTimeMinute: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={editForm.startTimePeriod}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, startTimePeriod: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs font-semibold rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  End Time
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Select
                    value={editForm.endTimeHour}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, endTimeHour: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={editForm.endTimeMinute}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, endTimeMinute: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={editForm.endTimePeriod}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, endTimePeriod: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs font-semibold rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Invigilators & Relievers */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invigilators Required
                </Label>
                <Select
                  value={editForm.rooms.toString()}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, rooms: parseInt(v, 10) }))}
                >
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? 'Invigilator' : 'Invigilators'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Relievers Required
                </Label>
                <Select
                  value={editForm.relievers.toString()}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, relievers: parseInt(v, 10) }))}
                >
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    {Array.from({ length: 51 }, (_, i) => i).map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? 'Reliever' : 'Relievers'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              className="bg-[#6342e8] hover:bg-[#5232d6] text-white rounded-xl"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Session Dialog */}
      <Dialog open={isAddCustomDialogOpen} onOpenChange={setIsAddCustomDialogOpen}>
        <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Add Custom Examination Session
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Add an ad-hoc session or additional test to this duty allocation schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Subject Title
              </Label>
              <Input
                value={newSessionForm.subject}
                onChange={(e) => setNewSessionForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. Computer Science Practical, Viva..."
                className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Session Date
              </Label>
              <Input
                type="date"
                value={newSessionForm.dateStr}
                onChange={(e) => setNewSessionForm((p) => ({ ...p, dateStr: e.target.value }))}
                className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Start Time
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Select
                    value={newSessionForm.startTimeHour}
                    onValueChange={(v) => setNewSessionForm((p) => ({ ...p, startTimeHour: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={newSessionForm.startTimeMinute}
                    onValueChange={(v) => setNewSessionForm((p) => ({ ...p, startTimeMinute: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={newSessionForm.startTimePeriod}
                    onValueChange={(v) => setNewSessionForm((p) => ({ ...p, startTimePeriod: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs font-semibold rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  End Time
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Select
                    value={newSessionForm.endTimeHour}
                    onValueChange={(v) => setNewSessionForm((p) => ({ ...p, endTimeHour: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={newSessionForm.endTimeMinute}
                    onValueChange={(v) => setNewSessionForm((p) => ({ ...p, endTimeMinute: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={newSessionForm.endTimePeriod}
                    onValueChange={(v) => setNewSessionForm((p) => ({ ...p, endTimePeriod: v }))}
                  >
                    <SelectTrigger className="h-8.5 text-xs font-semibold rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invigilators Required
                </Label>
                <Select
                  value={newSessionForm.rooms.toString()}
                  onValueChange={(v) => setNewSessionForm((p) => ({ ...p, rooms: parseInt(v, 10) }))}
                >
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? 'Invigilator' : 'Invigilators'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Relievers Required
                </Label>
                <Select
                  value={newSessionForm.relievers.toString()}
                  onValueChange={(v) => setNewSessionForm((p) => ({ ...p, relievers: parseInt(v, 10) }))}
                >
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    {Array.from({ length: 51 }, (_, i) => i).map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? 'Reliever' : 'Relievers'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddCustomDialogOpen(false)}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveNewSession}
              className="bg-[#6342e8] hover:bg-[#5232d6] text-white rounded-xl"
            >
              Add Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Delete Examination Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to remove &quot;{examToDelete?.subject}&quot; on{' '}
              {examToDelete?.date ? formatAppDate(examToDelete.date) : ''} from this duty allocation plan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
