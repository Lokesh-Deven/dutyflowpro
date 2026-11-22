"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAllotment } from '@/lib/allotment-context';
import {
  ExaminationTimetable,
  TimetableClassColumn,
  TimetableRow,
  TimetableSlot,
  ExaminationStatus,
} from '@/lib/examination-timetable-types';
import {
  createNewTimetable,
  getSavedTimetables,
  fetchTimetablesFromCloud,
  saveTimetable,
  deleteTimetable,
  toggleLockTimetable,
  activateTimetable,
  deactivateTimetable,
  getActiveTimetableId,
  getActiveTimetable,
  getTimetableEffectiveStatus,
  setTimetableStatus,
  formatDateToDDMMYYYY,
  getDayFromDate,
  sortTimetableRows,
  normalizeTimetableRows,
  normalizeTimetable,
  isEndTimeValid,
  DEFAULT_SUBJECT_OPTIONS,
  DEFAULT_COURSE_OPTIONS,
  publishTimetableToStudentPortal,
} from '@/lib/examination-timetable-service';
import { generateExaminationTimetablePdf } from '@/lib/examination-timetable-pdf';
import { CourseSelectorPopover } from '@/components/dashboard/timetable/course-selector-popover';
import { SubjectSelectorPopover } from '@/components/dashboard/timetable/subject-selector-popover';
import { TimePickerInput } from '@/components/dashboard/timetable/time-picker-input';
import { TimetablePreviewDialog } from '@/components/dashboard/timetable/timetable-preview-dialog';
import { SavedTimetablesList } from '@/components/dashboard/timetable/saved-timetables-list';
import { ApprovalRestrictionDialog } from '@/components/dashboard/approval-restriction-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CalendarClock,
  Plus,
  Trash2,
  Save,
  Eye,
  Download,
  Lock,
  Unlock,
  Building,
  GraduationCap,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Globe,
  CheckCircle2,
  Loader2,
  PlayCircle,
  PauseCircle,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExaminationTimetablePage() {
  const { user, profile, isApproved } = useAuth();
  const { signatory, pdfPaletteId } = useAllotment();
  const { toast } = useToast();
  const [isRestrictionDialogOpen, setIsRestrictionDialogOpen] = useState(false);

  const userId = user?.id || profile?.id;

  // Auto-fetch default institution name
  const defaultInstitutionName = useMemo(() => {
    return (
      (profile?.institution_name && profile.institution_name !== 'Guest Profile' ? profile.institution_name : null) ||
      (user?.user_metadata?.institution_name as string) ||
      (user?.email ? user.email.split('@')[0] : "GOVERNMENT PU COLLEGE")
    );
  }, [profile, user]);

  // Active Timetable State
  const [timetable, setTimetable] = useState<ExaminationTimetable>(() =>
    createNewTimetable(defaultInstitutionName)
  );

  // Saved Timetables List
  const [savedTimetables, setSavedTimetables] = useState<ExaminationTimetable[]>([]);
  // Active operational timetable ID across modules (only one active at a time)
  const [activeTimetableId, setActiveTimetableId] = useState<string | null>(null);

  // Dialog States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);
  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'activate' | 'deactivate';
    target: ExaminationTimetable | null;
  }>({
    open: false,
    type: 'activate',
    target: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Custom subjects pool added by user
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  // Custom courses pool added by user
  const [customCourses, setCustomCourses] = useState<string[]>([]);

  // Initial Load from localStorage cache & Supabase central database
  useEffect(() => {
    let isMounted = true;
    const initialList = getSavedTimetables(userId);
    setSavedTimetables(initialList);
    const curActiveId = getActiveTimetableId(userId);
    setActiveTimetableId(curActiveId);

    if (initialList.length > 0) {
      setTimetable(normalizeTimetable(initialList[0]));
    } else {
      setTimetable(createNewTimetable(defaultInstitutionName));
    }

    if (userId) {
      fetchTimetablesFromCloud(userId).then((cloudList) => {
        if (!isMounted) return;
        setSavedTimetables(cloudList);
        const cloudActiveId = getActiveTimetableId(userId);
        setActiveTimetableId(cloudActiveId);
        if (cloudList.length > 0) {
          setTimetable((prev) => {
            const match = cloudList.find((t) => t.id === prev.id);
            return match ? normalizeTimetable(match) : normalizeTimetable(cloudList[0]);
          });
        }
      }).catch((err) => {
        console.error('Failed to load timetables from cloud:', err);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [userId, defaultInstitutionName]);

  // Synchronize active examination changes in real-time across tabs and modules
  useEffect(() => {
    const handleActiveChanged = (e: any) => {
      const detail = e.detail;
      if (detail && detail.activeTimetableId !== undefined) {
        setActiveTimetableId(detail.activeTimetableId);
        setSavedTimetables(getSavedTimetables(userId));
        if (detail.timetable && timetable.id === detail.timetable.id) {
          setTimetable(detail.timetable);
        }
      } else {
        const cur = getActiveTimetableId(userId);
        setActiveTimetableId(cur);
        setSavedTimetables(getSavedTimetables(userId));
      }
    };

    window.addEventListener('dutyflow:active-timetable-changed', handleActiveChanged);
    return () => {
      window.removeEventListener('dutyflow:active-timetable-changed', handleActiveChanged);
    };
  }, [userId, timetable.id]);

  // Cross-device auto-refresh on window focus or visibility change
  useEffect(() => {
    if (!userId) return;

    const handleRefresh = () => {
      fetchTimetablesFromCloud(userId).then((cloudList) => {
        setSavedTimetables(cloudList);
        if (cloudList.length > 0) {
          setTimetable((prev) => {
            if (hasUnsavedChanges) return prev;
            const match = cloudList.find((t) => t.id === prev.id);
            return match || prev;
          });
        }
      }).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId, hasUnsavedChanges]);

  // Combined available subjects
  const allAvailableSubjects = useMemo(() => {
    return Array.from(new Set([...DEFAULT_SUBJECT_OPTIONS, ...customSubjects])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [customSubjects]);

  // Combined available courses across all schedule slots
  const allAvailableCourses = useMemo(() => {
    const rowCourses: string[] = [];
    (timetable.rows || []).forEach((r) => {
      const slots = r.slots && r.slots.length > 0 ? r.slots : [{ course: r.course }];
      slots.forEach((s) => {
        const c = s.course?.trim();
        if (c && !DEFAULT_COURSE_OPTIONS.includes(c)) {
          rowCourses.push(c);
        }
      });
    });
    return Array.from(new Set([...customCourses, ...rowCourses])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [timetable.rows, customCourses]);

  // Handlers for Institution & Exam Name
  const handleInstitutionChange = (val: string) => {
    if (timetable.isLocked) return;
    setTimetable((prev) => ({ ...prev, institutionName: val }));
    setHasUnsavedChanges(true);
  };

  const handleExamNameChange = (val: string) => {
    if (timetable.isLocked) return;
    setTimetable((prev) => ({ ...prev, examinationName: val }));
    setHasUnsavedChanges(true);
  };

  // Class Columns Handlers
  const handleAddClass = () => {
    if (timetable.isLocked) return;
    const newClassNumber = (timetable.classes?.length || 0) + 1;
    const newClassId = `class-${Date.now()}`;
    const newClass: TimetableClassColumn = {
      id: newClassId,
      name: `Class ${newClassNumber}`,
    };

    setTimetable((prev) => {
      // Default timings for all existing rows and their slots
      const updatedRows = prev.rows.map((row) => {
        const updatedSlots = (row.slots || []).map((slot) => ({
          ...slot,
          timings: {
            ...slot.timings,
            [newClassId]: {
              startTime: '10:00 AM',
              endTime: '01:00 PM',
            },
          },
        }));

        return {
          ...row,
          slots: updatedSlots,
          timings: {
            ...row.timings,
            [newClassId]: {
              startTime: '10:00 AM',
              endTime: '01:00 PM',
            },
          },
        };
      });

      return {
        ...prev,
        classes: [...prev.classes, newClass],
        rows: updatedRows,
      };
    });
    setHasUnsavedChanges(true);
    toast({
      title: "Class Added",
      description: `Added ${newClass.name} column to the timetable.`,
    });
  };

  const handleRemoveClass = (classId: string) => {
    if (timetable.isLocked) return;
    if (timetable.classes.length <= 1) {
      toast({
        variant: "destructive",
        title: "Cannot Remove Class",
        description: "Timetable must contain at least one class column.",
      });
      return;
    }

    setTimetable((prev) => {
      const updatedClasses = prev.classes.filter((c) => c.id !== classId);
      const updatedRows = prev.rows.map((r) => {
        const updatedSlots = (r.slots || []).map((slot) => {
          const tCopy = { ...slot.timings };
          delete tCopy[classId];
          return { ...slot, timings: tCopy };
        });

        const timingsCopy = { ...r.timings };
        delete timingsCopy[classId];

        return {
          ...r,
          slots: updatedSlots,
          timings: timingsCopy,
        };
      });

      return {
        ...prev,
        classes: updatedClasses,
        rows: updatedRows,
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateClassName = (classId: string, name: string) => {
    if (timetable.isLocked) return;
    setTimetable((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === classId ? { ...c, name } : c)),
    }));
    setHasUnsavedChanges(true);
  };

  // Row & Schedule Slot Controls
  // Add a brand new Examination Date (with an initial schedule slot)
  const handleAddDateRow = () => {
    if (timetable.isLocked) return;
    const newRowId = `row-${Date.now()}`;

    // Compute next suggested date based on last row
    let nextDateIso = '';
    const lastRow = timetable.rows[timetable.rows.length - 1];
    if (lastRow?.date) {
      const d = new Date(lastRow.date);
      d.setDate(d.getDate() + 1);
      nextDateIso = d.toISOString().split('T')[0];
    } else {
      nextDateIso = new Date().toISOString().split('T')[0];
    }

    const defaultTimings: Record<string, { startTime: string; endTime: string }> = {};
    timetable.classes.forEach((c) => {
      defaultTimings[c.id] = {
        startTime: '-',
        endTime: '-',
      };
    });

    const lastSlot = lastRow?.slots?.[lastRow.slots.length - 1];
    const defaultCourse = lastSlot?.course || lastRow?.course || '1&2 PUC';

    const initialSlot: TimetableSlot = {
      id: `slot-${Date.now()}-1`,
      course: defaultCourse,
      subjects: [],
      timings: defaultTimings,
    };

    const newRow: TimetableRow = {
      id: newRowId,
      date: nextDateIso,
      displayDate: formatDateToDDMMYYYY(nextDateIso),
      day: getDayFromDate(nextDateIso),
      course: initialSlot.course,
      subjects: initialSlot.subjects,
      timings: initialSlot.timings,
      slots: [initialSlot],
    };

    setTimetable((prev) => {
      const updatedRows = sortTimetableRows([...prev.rows, newRow]);
      return {
        ...prev,
        rows: updatedRows,
      };
    });
    setHasUnsavedChanges(true);
    toast({
      title: "Examination Date Added",
      description: `Added ${formatDateToDDMMYYYY(nextDateIso)} to the schedule.`,
    });
  };

  // Add multiple schedule rows under an existing Date & Day
  const handleAddSlotToDate = (rowId: string) => {
    if (timetable.isLocked) return;

    setTimetable((prev) => {
      const updatedRows = prev.rows.map((r) => {
        if (r.id !== rowId) return r;

        const currentSlots = r.slots && r.slots.length > 0
          ? r.slots
          : [{ id: `slot-${r.id}-1`, course: r.course || '1&2 PUC', subjects: r.subjects || [], timings: r.timings || {} }];

        const lastSlot = currentSlots[currentSlots.length - 1];

        const defaultTimings: Record<string, { startTime: string; endTime: string }> = {};
        prev.classes.forEach((c) => {
          defaultTimings[c.id] = {
            startTime: '-',
            endTime: '-',
          };
        });

        const newSlot: TimetableSlot = {
          id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          course: lastSlot?.course || '1&2 PUC',
          subjects: [],
          timings: defaultTimings,
        };

        const nextSlots = [...currentSlots, newSlot];

        return {
          ...r,
          slots: nextSlots,
          course: nextSlots[0]?.course,
          subjects: nextSlots[0]?.subjects,
          timings: nextSlots[0]?.timings,
        };
      });

      return {
        ...prev,
        rows: updatedRows,
      };
    });

    setHasUnsavedChanges(true);
    toast({
      title: "Schedule Slot Added",
      description: "Added a new examination schedule under this date.",
    });
  };

  // Delete a specific schedule/slot from a date
  const handleDeleteSlot = (rowId: string, slotId: string) => {
    if (timetable.isLocked) return;

    setTimetable((prev) => {
      const targetRow = prev.rows.find((r) => r.id === rowId);
      if (!targetRow) return prev;

      const currentSlots = targetRow.slots && targetRow.slots.length > 0
        ? targetRow.slots
        : [{ id: `slot-${targetRow.id}-1`, course: targetRow.course, subjects: targetRow.subjects || [], timings: targetRow.timings || {} }];

      // If more than 1 slot on this date, just remove this slot
      if (currentSlots.length > 1) {
        const nextSlots = currentSlots.filter((s) => s.id !== slotId);
        return {
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  slots: nextSlots,
                  course: nextSlots[0]?.course,
                  subjects: nextSlots[0]?.subjects,
                  timings: nextSlots[0]?.timings,
                }
              : r
          ),
        };
      }

      // If only 1 slot on this date, deleting it deletes the date row
      if (prev.rows.length <= 1) {
        toast({
          variant: "destructive",
          title: "Cannot Delete",
          description: "Timetable must have at least one examination date.",
        });
        return prev;
      }

      return {
        ...prev,
        rows: prev.rows.filter((r) => r.id !== rowId),
      };
    });

    setHasUnsavedChanges(true);
  };

  const handleDateChange = (rowId: string, newDateIso: string) => {
    if (timetable.isLocked) return;
    const displayDate = formatDateToDDMMYYYY(newDateIso);
    const day = getDayFromDate(newDateIso);

    setTimetable((prev) => {
      const modified = prev.rows.map((r) =>
        r.id === rowId ? { ...r, date: newDateIso, displayDate, day } : r
      );
      return {
        ...prev,
        rows: sortTimetableRows(modified),
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSlotCourseChange = (rowId: string, slotId: string, course: string) => {
    if (timetable.isLocked) return;
    setTimetable((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        const currentSlots = r.slots && r.slots.length > 0
          ? r.slots
          : [{ id: slotId, course: r.course, subjects: r.subjects || [], timings: r.timings || {} }];
        const nextSlots = currentSlots.map((s) => (s.id === slotId ? { ...s, course } : s));
        return {
          ...r,
          slots: nextSlots,
          course: nextSlots[0]?.course,
        };
      }),
    }));
    setHasUnsavedChanges(true);
  };

  const handleSlotSubjectsChange = (rowId: string, slotId: string, subjects: string[]) => {
    if (timetable.isLocked) return;
    setTimetable((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        const currentSlots = r.slots && r.slots.length > 0
          ? r.slots
          : [{ id: slotId, course: r.course, subjects: r.subjects || [], timings: r.timings || {} }];
        const nextSlots = currentSlots.map((s) => {
          if (s.id !== slotId) return s;
          const nowHas = subjects.length > 0;
          const updatedTimings = { ...s.timings };
          if (!nowHas) {
            prev.classes.forEach((c) => {
              updatedTimings[c.id] = { startTime: '-', endTime: '-' };
            });
          } else {
            prev.classes.forEach((c) => {
              const cur = updatedTimings[c.id];
              if (!cur || !cur.startTime || cur.startTime === '-' || cur.startTime === '—') {
                updatedTimings[c.id] = { startTime: '10:00 AM', endTime: '01:00 PM' };
              }
            });
          }
          return {
            ...s,
            subjects,
            timings: updatedTimings,
          };
        });

        return {
          ...r,
          slots: nextSlots,
          subjects: nextSlots[0]?.subjects,
          timings: nextSlots[0]?.timings,
        };
      }),
    }));
    setHasUnsavedChanges(true);
  };

  const handleSlotTimingChange = (
    rowId: string,
    slotId: string,
    classId: string,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    if (timetable.isLocked) return;
    setTimetable((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        const currentSlots = r.slots && r.slots.length > 0
          ? r.slots
          : [{ id: slotId, course: r.course, subjects: r.subjects || [], timings: r.timings || {} }];
        const nextSlots = currentSlots.map((s) => {
          if (s.id !== slotId) return s;
          const currentClassTiming = s.timings?.[classId] || { startTime: '-', endTime: '-' };
          let newTiming = {
            ...currentClassTiming,
            [field]: value,
          };

          if (value === '-' || value === '—') {
            newTiming = { startTime: '-', endTime: '-' };
          } else {
            if (field === 'startTime' && (newTiming.endTime === '-' || newTiming.endTime === '—' || !newTiming.endTime)) {
              newTiming.endTime = '01:00 PM';
            } else if (field === 'endTime' && (newTiming.startTime === '-' || newTiming.startTime === '—' || !newTiming.startTime)) {
              newTiming.startTime = '10:00 AM';
            }
          }

          return {
            ...s,
            timings: {
              ...s.timings,
              [classId]: newTiming,
            },
          };
        });

        return {
          ...r,
          slots: nextSlots,
          timings: nextSlots[0]?.timings,
        };
      }),
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddCustomCourse = (course: string) => {
    const trimmed = course.trim();
    if (!trimmed) return;
    setCustomCourses((prev) => {
      if (prev.includes(trimmed) || DEFAULT_COURSE_OPTIONS.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  };

  // Add custom subject callback
  const handleAddCustomSubject = (subj: string) => {
    if (!customSubjects.includes(subj)) {
      setCustomSubjects((prev) => [...prev, subj]);
    }
  };

  // Computed metrics for Total Sessions and Total Subjects across all slots
  const totalSlotsCount = useMemo(() => {
    return (timetable.rows || []).reduce((acc, r) => {
      const slots = r.slots && r.slots.length > 0 ? r.slots : [{ subjects: r.subjects }];
      return acc + slots.length;
    }, 0);
  }, [timetable.rows]);

  const totalSessions = useMemo(() => {
    return (timetable.rows || []).reduce((acc, r) => {
      const slots = r.slots && r.slots.length > 0 ? r.slots : [{ subjects: r.subjects }];
      const active = slots.filter((s) => s.subjects && s.subjects.length > 0);
      return acc + active.length;
    }, 0);
  }, [timetable.rows]);

  const allExamSubjects = useMemo(() => {
    const list: string[] = [];
    (timetable.rows || []).forEach((r) => {
      const slots = r.slots && r.slots.length > 0 ? r.slots : [{ subjects: r.subjects || [] }];
      slots.forEach((s) => {
        if (Array.isArray(s.subjects)) list.push(...s.subjects);
      });
    });
    return list;
  }, [timetable.rows]);

  const totalSubjects = allExamSubjects.length;

  const uniqueSubjectsCount = useMemo(() => {
    return new Set(allExamSubjects).size;
  }, [allExamSubjects]);

  const sessionProgressPct = useMemo(() => {
    if (totalSlotsCount === 0) return 0;
    return Math.min(100, Math.round((totalSessions / totalSlotsCount) * 100));
  }, [totalSessions, totalSlotsCount]);

  // Save Timetable
  const handleSave = () => {
    setIsSaving(true);
    try {
      saveTimetable(timetable, userId);
      setSavedTimetables(getSavedTimetables(userId));
      setHasUnsavedChanges(false);
      toast({
        title: "Timetable Saved",
        description: `Saved "${timetable.examinationName || 'Timetable'}" successfully.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: err.message || "Failed to save timetable.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Lock and Unlock Timetable
  const handleLockConfirm = () => {
    const updated = toggleLockTimetable(timetable.id, true, userId);
    if (updated) {
      setTimetable(updated);
      setSavedTimetables(getSavedTimetables(userId));
      setHasUnsavedChanges(false);
      toast({
        title: "Timetable Locked",
        description: "This timetable is now protected from accidental editing.",
      });
    }
    setIsLockConfirmOpen(false);
  };

  const handleUnlockConfirm = () => {
    const updated = toggleLockTimetable(timetable.id, false, userId);
    if (updated) {
      setTimetable(updated);
      setSavedTimetables(getSavedTimetables(userId));
      toast({
        title: "Timetable Unlocked",
        description: "Editing has been re-enabled for this timetable.",
      });
    }
    setIsUnlockConfirmOpen(false);
  };

  // Open saved timetable
  const handleOpenSavedTimetable = (saved: ExaminationTimetable) => {
    setTimetable(saved);
    setHasUnsavedChanges(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
      title: "Timetable Loaded",
      description: `Loaded "${saved.examinationName}".`,
    });
  };

  // Start fresh timetable
  const handleNewTimetable = () => {
    const fresh = createNewTimetable(defaultInstitutionName);
    setTimetable(fresh);
    setHasUnsavedChanges(false);
    toast({
      title: "New Timetable",
      description: "Started a fresh examination timetable.",
    });
  };

  // Delete saved timetable
  const handleDeleteSavedTimetable = (id: string) => {
    deleteTimetable(id, userId);
    const updatedList = getSavedTimetables(userId);
    setSavedTimetables(updatedList);
    if (timetable.id === id) {
      if (updatedList.length > 0) {
        setTimetable(updatedList[0]);
      } else {
        setTimetable(createNewTimetable(defaultInstitutionName));
      }
    }
    toast({
      title: "Timetable Deleted",
      description: "The saved timetable has been removed.",
    });
  };

  // Direct PDF Download
  const handleDownloadPdf = async () => {
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    try {
      await generateExaminationTimetablePdf({
        timetable,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "PDF Generated",
        description: "Official examination timetable downloaded successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: err.message || "Failed to generate timetable PDF.",
      });
    }
  };

  // Publish configured examination timetable to Student Portal
  const handlePublishToStudentPortal = async (ttToPublish?: ExaminationTimetable) => {
    const target = ttToPublish || timetable;
    if (!target.examinationName || target.examinationName.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "Examination Title Required",
        description: "Please enter a Name of Examination before publishing to the Student Portal.",
      });
      return;
    }
    if (!target.rows || target.rows.length === 0) {
      toast({
        variant: "destructive",
        title: "Examination Rows Required",
        description: "Please configure at least one examination schedule row before publishing.",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const institutionCode = profile?.institution_code || '';
      const instId = userId || profile?.id || '';

      const result = await publishTimetableToStudentPortal(
        target,
        instId,
        institutionCode
      );

      if (result.success && result.updatedTimetable) {
        setTimetable(result.updatedTimetable);
        setSavedTimetables(getSavedTimetables(userId));
        setHasUnsavedChanges(false);
        toast({
          title: "Published on Student Portal",
          description: `"${target.examinationName}" is now live and accessible to students.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Publish Failed",
          description: result.error || "Failed to publish examination timetable.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Publish Failed",
        description: err?.message || "Failed to publish examination timetable.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const isCurrentActive = Boolean(
    timetable.isActive || (activeTimetableId && timetable.id === activeTimetableId)
  );
  const currentEffectiveStatus: ExaminationStatus = getTimetableEffectiveStatus(
    timetable,
    activeTimetableId
  );

  const handleRequestActivate = (targetTt: ExaminationTimetable) => {
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    setConfirmModal({
      open: true,
      type: 'activate',
      target: targetTt,
    });
  };

  const handleRequestDeactivate = (targetTt: ExaminationTimetable) => {
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    setConfirmModal({
      open: true,
      type: 'deactivate',
      target: targetTt,
    });
  };

  const handleConfirmAction = async () => {
    const { type, target } = confirmModal;
    if (!target) return;
    setConfirmModal({ open: false, type: 'activate', target: null });

    if (type === 'activate') {
      const res = await activateTimetable(target.id, userId, userId, profile?.institution_code);
      if (res.success && res.activeTimetable) {
        setActiveTimetableId(res.activeTimetable.id);
        const refreshedList = getSavedTimetables(userId);
        setSavedTimetables(refreshedList);
        if (timetable.id === target.id) {
          setTimetable(res.activeTimetable);
        }
        setHasUnsavedChanges(false);
        toast({
          title: "Examination Activated",
          description: `"${res.activeTimetable.examinationName}" is now active and operational across all modules and portals.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Activation Failed",
          description: res.error || "Could not activate examination timetable.",
        });
      }
    } else {
      const res = await deactivateTimetable(target.id, userId, userId);
      if (res.success && res.deactivatedTimetable) {
        setActiveTimetableId(null);
        const refreshedList = getSavedTimetables(userId);
        setSavedTimetables(refreshedList);
        if (timetable.id === target.id) {
          setTimetable(res.deactivatedTimetable);
        }
        setHasUnsavedChanges(false);
        toast({
          title: "Examination Deactivated",
          description: `"${res.deactivatedTimetable.examinationName}" has been deactivated across all modules and portals. Existing allocations and duties remain safely preserved.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Deactivation Failed",
          description: res.error || "Could not deactivate examination timetable.",
        });
      }
    }
  };

  const handleToggleArchive = (id: string, currentStatus: ExaminationStatus) => {
    const nextStatus: ExaminationStatus = currentStatus === 'Archived' ? 'Draft' : 'Archived';
    const updated = setTimetableStatus(id, nextStatus, userId);
    if (updated) {
      setSavedTimetables(getSavedTimetables(userId));
      if (timetable.id === id) setTimetable(updated);
      toast({
        title: nextStatus === 'Archived' ? "Timetable Archived" : "Timetable Restored",
        description: nextStatus === 'Archived'
          ? "This timetable has been archived."
          : "Timetable has been restored to Draft.",
      });
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-[#1E2A5E] rounded-xl shadow-xs">
              <CalendarClock className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                Examination Timetable
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Configure examination sessions, paper schedules, and manage publishing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lock Notice Banner if locked */}
      {timetable.isLocked && (
        <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Timetable is Locked:</strong> Normal editing is disabled to protect against accidental modifications. You can preview and download the PDF.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsUnlockConfirmOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-7 px-3 shrink-0"
          >
            <Unlock className="w-3 h-3 mr-1" />
            Unlock to Edit
          </Button>
        </div>
      )}

      {/* 1. Examination Details Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-headline font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            1. Examination Details
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Institution Name */}
          <div className="space-y-1.5">
            <Label htmlFor="institution-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Name of Institution
            </Label>
            <Input
              id="institution-name"
              placeholder="e.g. GOVERNMENT PU COLLEGE, BENGALURU"
              value={timetable.institutionName}
              onChange={(e) => handleInstitutionChange(e.target.value)}
              disabled={timetable.isLocked}
              className="text-xs font-semibold uppercase bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          {/* Examination Name */}
          <div className="space-y-1.5">
            <Label htmlFor="exam-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Name of Examination
            </Label>
            <Input
              id="exam-name"
              placeholder="e.g. First PUC Midterm Examination – September 2026"
              value={timetable.examinationName}
              onChange={(e) => handleExamNameChange(e.target.value)}
              disabled={timetable.isLocked}
              className="text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          {/* Permanent Title Display */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Title
            </Label>
            <div className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between text-xs font-black tracking-widest text-[#1E2A5E] dark:text-indigo-400">
              <span>TIMETABLE</span>
              <Badge variant="outline" className="text-[10px] text-slate-500 dark:text-slate-400 font-normal border-slate-300 dark:border-slate-700">
                Permanent Title
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Timetable Creation Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-headline font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              2. Timetable Schedule ({totalSessions} Scheduled Sessions across {timetable.rows.length} Dates)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAddDateRow}
              disabled={timetable.isLocked}
              className="bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3.5 gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Examination Date
            </Button>
          </div>
        </div>

        {/* Dynamic Timetable Grid */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead>
              {/* Row 0: Basic Columns + Classes with "+" button */}
              <tr className="bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th rowSpan={2} className="py-2.5 px-3 text-center w-12 border-r border-slate-200 dark:border-slate-800">
                  Sl. No.
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center w-36 border-r border-slate-200 dark:border-slate-800">
                  Date (DD.MM.YYYY)
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center w-28 border-r border-slate-200 dark:border-slate-800">
                  Day
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center w-36 border-r border-slate-200 dark:border-slate-800">
                  Class
                </th>

                {/* Class Columns */}
                {timetable.classes.map((c, cIdx) => (
                  <th
                    key={c.id}
                    colSpan={2}
                    className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <Input
                        value={c.name}
                        onChange={(e) => handleUpdateClassName(c.id, e.target.value)}
                        disabled={timetable.isLocked}
                        className="h-6 text-xs text-center font-bold font-headline bg-transparent border-none p-0 focus-visible:ring-1 focus-visible:ring-indigo-400 dark:text-indigo-200 w-24"
                      />
                      {timetable.classes.length > 1 && !timetable.isLocked && (
                        <button
                          type="button"
                          onClick={() => handleRemoveClass(c.id)}
                          title={`Remove ${c.name}`}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}

                {/* "+" Button Column to Add More Classes */}
                {!timetable.isLocked && (
                  <th rowSpan={2} className="py-2 px-2 text-center w-12 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    <button
                      type="button"
                      onClick={handleAddClass}
                      title="Add another class column (e.g. Class 2, Class 3)"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:scale-105 transition-all font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                )}

                <th rowSpan={2} className="py-2.5 px-3 min-w-[200px] border-r border-slate-200 dark:border-slate-800">
                  Subject(s)
                </th>

                <th rowSpan={2} className="py-2.5 px-2 text-center w-12">
                  Action
                </th>
              </tr>

              {/* Row 1: Start Time & End Time subheadings under each class */}
              <tr className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold text-[10px] uppercase border-b border-slate-200 dark:border-slate-800">
                {timetable.classes.map((c) => (
                  <React.Fragment key={`${c.id}-subheaders`}>
                    <th className="py-1.5 px-2 text-center w-28 border-r border-slate-200 dark:border-slate-800 font-bold text-indigo-900 dark:text-indigo-300">
                      Start Time
                    </th>
                    <th className="py-1.5 px-2 text-center w-28 border-r border-slate-200 dark:border-slate-800 font-bold text-indigo-900 dark:text-indigo-300">
                      End Time
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium text-slate-700 dark:text-slate-300">
              {timetable.rows.map((row, dateIdx) => {
                const slots = row.slots && row.slots.length > 0
                  ? row.slots
                  : [{ id: `slot-${row.id}-1`, course: row.course, subjects: row.subjects || [], timings: row.timings || {} }];
                const slotCount = slots.length;
                const isEvenDate = dateIdx % 2 === 0;

                return slots.map((slot, sIdx) => {
                  const isFirstSlot = sIdx === 0;
                  const isLastSlot = sIdx === slotCount - 1;

                  return (
                    <tr
                      key={`${row.id}-${slot.id || sIdx}`}
                      className={cn(
                        "transition-colors",
                        isEvenDate ? "bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/40" : "bg-[#f8faff] dark:bg-slate-800/25 hover:bg-indigo-50/30 dark:hover:bg-slate-800/50",
                        isLastSlot && dateIdx !== timetable.rows.length - 1 && "border-b-2 border-slate-300 dark:border-slate-700"
                      )}
                    >
                      {/* Sl. No. (spans all slots on this date) */}
                      {isFirstSlot && (
                        <td
                          rowSpan={slotCount}
                          className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px] border-r border-slate-200 dark:border-slate-800 align-middle bg-inherit"
                        >
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{dateIdx + 1}</div>
                          {slotCount > 1 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 mt-1 font-semibold">
                              {slotCount} slots
                            </Badge>
                          )}
                        </td>
                      )}

                      {/* Date Picker + Strict DD.MM.YYYY Display + "+ Add Row" Button (spans all slots on this date) */}
                      {isFirstSlot && (
                        <td
                          rowSpan={slotCount}
                          className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 align-middle bg-inherit"
                        >
                          <div className="space-y-1.5 max-w-[150px] mx-auto">
                            <Input
                              type="date"
                              value={row.date}
                              onChange={(e) => handleDateChange(row.id, e.target.value)}
                              disabled={timetable.isLocked}
                              className="h-8 text-xs font-semibold bg-white dark:bg-slate-800/50 dark:border-slate-700 dark:text-white"
                            />
                            <div className="text-[10px] text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/50 rounded px-1.5 py-0.5 border border-indigo-100 dark:border-indigo-900/60">
                              {row.displayDate || formatDateToDDMMYYYY(row.date) || '—'}
                            </div>
                            {!timetable.isLocked && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddSlotToDate(row.id)}
                                className="w-full text-[10px] h-6 px-1.5 font-bold text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100/90 dark:hover:bg-indigo-900/80 gap-1 mt-1 shadow-2xs cursor-pointer"
                                title={`Add another examination schedule under ${row.displayDate || row.date}`}
                              >
                                <Plus className="w-3 h-3" />
                                Add Row
                              </Button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Day (spans all slots on this date) */}
                      {isFirstSlot && (
                        <td
                          rowSpan={slotCount}
                          className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-800 align-middle bg-inherit"
                        >
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md inline-block">
                            {row.day || '—'}
                          </span>
                        </td>
                      )}

                      {/* Course Selector (Dropdown + Custom Type with Add Option) */}
                      <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800">
                        <CourseSelectorPopover
                          value={slot.course || ''}
                          onChange={(val) => handleSlotCourseChange(row.id, slot.id, val)}
                          disabled={timetable.isLocked}
                          availableCourses={allAvailableCourses}
                          onAddCustomCourse={handleAddCustomCourse}
                        />
                      </td>

                      {/* Class Timings (Start Time & End Time) */}
                      {timetable.classes.map((c) => {
                        const timing = slot.timings?.[c.id] || { startTime: '-', endTime: '-' };
                        const currentStart = timing.startTime || '-';
                        const currentEnd = timing.endTime || '-';
                        const isValid = isEndTimeValid(currentStart, currentEnd);

                        return (
                          <React.Fragment key={`${row.id}-${slot.id}-${c.id}`}>
                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                              <TimePickerInput
                                value={currentStart}
                                onChange={(val) => handleSlotTimingChange(row.id, slot.id, c.id, 'startTime', val)}
                                placeholder="10:00 AM"
                                disabled={timetable.isLocked}
                              />
                            </td>
                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                              <TimePickerInput
                                value={currentEnd}
                                onChange={(val) => handleSlotTimingChange(row.id, slot.id, c.id, 'endTime', val)}
                                placeholder="01:00 PM"
                                isInvalid={!isValid}
                                errorMessage="Must be later than Start Time"
                                disabled={timetable.isLocked}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Blank cell to balance "+" header */}
                      {!timetable.isLocked && <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800"></td>}

                      {/* Subject Multi-Select Popover */}
                      <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800">
                        <SubjectSelectorPopover
                          selectedSubjects={slot.subjects || []}
                          onChange={(subjects) => handleSlotSubjectsChange(row.id, slot.id, subjects)}
                          disabled={timetable.isLocked}
                          allAvailableSubjects={allAvailableSubjects}
                          onAddCustomSubject={handleAddCustomSubject}
                        />
                      </td>

                      {/* Delete Row / Slot Action */}
                      <td className="py-2 px-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(row.id, slot.id)}
                          disabled={timetable.isLocked || (timetable.rows.length <= 1 && slotCount <= 1)}
                          title={slotCount > 1 ? "Delete this examination schedule" : "Delete examination date"}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom table controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Click <strong>&ldquo;+ Add Row&rdquo;</strong> inside any date to schedule multiple exams on that date without repeating the date and day.</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddDateRow}
            disabled={timetable.isLocked}
            className="text-xs h-8 px-3.5 gap-1.5 text-[#1E2A5E] font-bold border-indigo-200 hover:bg-indigo-50 shadow-2xs self-end sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Examination Date
          </Button>
        </div>

        {/* Action Bar (Directly beneath Add Examination Date) */}
        <div className="pt-4 border-t border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center gap-3">
          {/* 1. Preview Timetable */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="text-xs h-9 px-4 gap-2 font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-900 dark:hover:text-white rounded-xl shadow-2xs cursor-pointer transition-all"
          >
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Preview Timetable
          </Button>

          {/* 2. Lock Timetable */}
          {timetable.isLocked ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUnlockConfirmOpen(true)}
              className="text-xs h-9 px-4 gap-1.5 font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl shadow-2xs transition-all"
            >
              <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Unlock Timetable
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLockConfirmOpen(true)}
              className="text-xs h-9 px-4 gap-1.5 font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-2xs transition-all"
            >
              <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Lock Timetable
            </Button>
          )}

          {/* 3. Download PDF */}
          <Button
            type="button"
            onClick={handleDownloadPdf}
            className="bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>

          {/* 4. Publish/Update on Student Portal */}
          <Button
            type="button"
            onClick={() => handlePublishToStudentPortal()}
            disabled={isPublishing}
            className={cn(
              "text-xs h-9 px-4 gap-2 font-bold rounded-xl shadow-xs transition-all cursor-pointer",
              timetable.isPublished
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : timetable.isPublished ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            <span>{timetable.isPublished ? "Update on Student Portal" : "Publish on Student Portal"}</span>
          </Button>

          {/* 5. Save Timetable */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || timetable.isLocked}
            className="bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 gap-2 rounded-xl shadow-xs hover:shadow cursor-pointer transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {hasUnsavedChanges && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse mr-0.5" />
            )}
            {isSaving ? "Saving..." : "Save Timetable"}
          </Button>
        </div>
      </div>

      {/* Metrics Summary Cards (Total Sessions & Total Subjects) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Total Sessions Card */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/40 dark:from-indigo-950/40 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-3 shadow-sm min-w-[210px] flex-1 sm:flex-initial">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Sessions
                  </div>
                  <div className="text-xl font-black font-mono text-indigo-950 dark:text-white leading-tight">
                    {totalSessions}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full shrink-0">
                {totalSessions === totalSlotsCount
                  ? "100% Scheduled"
                  : `${sessionProgressPct}% Complete`}
              </span>
            </div>
            {/* Progress Bar & Details */}
            <div className="mt-2.5">
              <div className="h-1.5 w-full bg-indigo-100/80 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${sessionProgressPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                <span>{totalSessions} of {totalSlotsCount} schedule slots assigned</span>
                <span>{timetable.rows.length} {timetable.rows.length === 1 ? 'Date' : 'Dates'}</span>
              </div>
            </div>
          </div>

          {/* Total Subjects Card */}
          <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-xl p-3 shadow-sm min-w-[210px] flex-1 sm:flex-initial">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Subjects
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-950 dark:text-white leading-tight">
                    {totalSubjects}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full shrink-0">
                {uniqueSubjectsCount} Unique
              </span>
            </div>
            {/* Progress / Subject Details */}
            <div className="mt-2.5">
              <div className="h-1.5 w-full bg-emerald-100/80 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalSubjects > 0 ? Math.min(100, Math.max(15, (uniqueSubjectsCount / Math.max(1, totalSubjects)) * 100)) : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                <span>{totalSubjects} papers mapped</span>
                <span>{uniqueSubjectsCount} distinct</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Saved Timetables Section */}
      <div className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <SavedTimetablesList
          timetables={savedTimetables}
          activeTimetableId={activeTimetableId}
          onOpenTimetable={handleOpenSavedTimetable}
          onPreviewTimetable={(tt) => {
            setTimetable(tt);
            setIsPreviewOpen(true);
          }}
          onPublishTimetable={handlePublishToStudentPortal}
          onActivateTimetable={handleRequestActivate}
          onDeactivateTimetable={handleRequestDeactivate}
          onToggleArchive={handleToggleArchive}
          onToggleLock={(id, lock) => {
            const updated = toggleLockTimetable(id, lock, userId);
            if (updated) {
              setSavedTimetables(getSavedTimetables(userId));
              if (timetable.id === id) setTimetable(updated);
              toast({
                title: lock ? "Timetable Finalised & Locked" : "Timetable Unlocked",
                description: lock
                  ? "Timetable is finalised and protected from accidental modifications."
                  : "Editing has been re-enabled.",
              });
            }
          }}
          onDeleteTimetable={handleDeleteSavedTimetable}
          signatory={signatory}
        />
      </div>

      {/* Activation / Deactivation Confirmation Alert Dialog (Requirement 6) */}
      <AlertDialog
        open={confirmModal.open}
        onOpenChange={(open) => !open && setConfirmModal((prev) => ({ ...prev, open: false }))}
      >
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {confirmModal.type === 'activate' ? (
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <PlayCircle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <PauseCircle className="w-5 h-5" />
                </div>
              )}
              <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {confirmModal.type === 'activate'
                  ? 'Activate Examination?'
                  : 'Deactivate Examination?'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 pt-1 text-left">
              {confirmModal.type === 'activate' ? (
                <>
                  <p>
                    Are you sure you want to activate{' '}
                    <strong className="text-slate-900 dark:text-white">&ldquo;{confirmModal.target?.examinationName || 'this timetable'}&rdquo;</strong>?
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Activating this timetable makes its examination sessions operational across:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 pl-1 font-semibold text-[11px]">
                    <li><strong>Seating Allocation:</strong> Active sessions available for scheduling</li>
                    <li><strong>Student Attendance:</strong> Hall attendance live tracking enabled</li>
                    <li><strong>Student Portal:</strong> Official timetable visible to students</li>
                    <li><strong>Invigilator Portal:</strong> Daily hall duties operational</li>
                  </ul>
                  {activeTimetableId && activeTimetableId !== confirmModal.target?.id && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-xs mt-2 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> The currently active examination will be automatically deactivated. Only one examination timetable can be active at a time.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p>
                    Are you sure you want to deactivate{' '}
                    <strong className="text-slate-900 dark:text-white">&ldquo;{confirmModal.target?.examinationName || 'this timetable'}&rdquo;</strong>?
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    This will disable this examination across Seating Allocation, Student Attendance, Student Portal, and Invigilator Portal.
                  </p>
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-900 dark:text-emerald-200 text-xs mt-2 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Data Safety Guarantee:</strong> Deactivating will <strong>not</strong> delete existing seating allocations, attendance records, or invigilator duties. All past records remain safely preserved.
                    </span>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-3">
            <AlertDialogCancel className="text-xs h-9 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={cn(
                "text-xs h-9 font-bold text-white shadow-xs cursor-pointer",
                confirmModal.type === 'activate'
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {confirmModal.type === 'activate' ? 'Activate Examination' : 'Deactivate Examination'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Confirmation Alert Dialog */}
      <AlertDialog open={isLockConfirmOpen} onOpenChange={setIsLockConfirmOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <Lock className="w-5 h-5" />
              <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Lock Examination Timetable?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Locking this timetable will protect it from accidental changes. You can still preview and download official PDFs. To make future changes, you will simply need to click <strong>Unlock</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLockConfirm}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-4"
            >
              Confirm & Lock Timetable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock Confirmation Alert Dialog */}
      <AlertDialog open={isUnlockConfirmOpen} onOpenChange={setIsUnlockConfirmOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
              <Unlock className="w-5 h-5" />
              <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Unlock Examination Timetable?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Unlocking will re-enable editing for examination details, dates, subjects, classes, and timings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlockConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4"
            >
              Unlock Timetable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <TimetablePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        timetable={timetable}
        signatory={signatory}
        onPublish={() => handlePublishToStudentPortal()}
        isPublishing={isPublishing}
      />

      <ApprovalRestrictionDialog
        open={isRestrictionDialogOpen}
        onOpenChange={setIsRestrictionDialogOpen}
        featureName="Official Examination Timetable PDF"
      />
    </div>
  );
}
