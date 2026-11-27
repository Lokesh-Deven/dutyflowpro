"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import {
  SeatingPattern,
  PositionSlot,
  SeatingMasterRoom,
  SeatingAllocationRecord,
  RoomSeatingPlan,
  MultiSubjectRow,
  MultiSubjectConfig,
  ThreeColumnPatternConfig,
  MiddleBenchSeatingPattern,
} from '@/lib/student-seating-types';
import {
  runDeterministicSeatingAllocation,
  getRoomEffectiveCapacity,
  completeAllocationTo100Percent,
} from '@/lib/student-seating-engine';
import {
  generateRoomSeatingPlanPdf,
  generateStudentSeatingIndexPdf,
} from '@/lib/student-seating-pdf-service';
import {
  syncUserWorkspaceToDatabase,
  fetchUserWorkspaceFromDatabase,
  isUUID,
} from '@/lib/storage-service';
import { RoomSeatingDiagram } from '@/components/dashboard/student-seating/room-seating-diagram';
import { getSubjectColor, getClassBadgeStyle } from '@/lib/student-seating-colors';
import { resolveSubjectClass, isSubjectMatchingExamSlot } from '@/lib/student-seating-utils';
import { cn } from '@/lib/utils';
import { ExaminationTimetable, TimetableRow } from '@/lib/examination-timetable-types';
import { ApprovalRestrictionDialog } from '@/components/dashboard/approval-restriction-dialog';
import { getSavedTimetables, fetchTimetablesFromCloud, sortTimetableRows } from '@/lib/examination-timetable-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutGrid,
  Calendar,
  Clock,
  BookOpen,
  DoorOpen,
  Sparkles,
  CheckCircle2,
  FileText,
  Download,
  Eye,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Check,
  Printer,
  ListOrdered,
  Plus,
  Save,
  ArrowDown,
  Info,
  Columns3,
  Globe,
} from 'lucide-react';

function SeatingAllocationWizardContent() {
  const {
    rooms: masterRooms,
    subjects,
    studentsBySubject,
    saveAllocation,
    activeAllocation,
    setActiveAllocation,
    togglePublishAllocation,
  } = useStudentSeating();

  const { activeAllotment, signatory, pdfPaletteId } = useAllotment();
  const { profile, user, isApproved } = useAuth();
  const { toast } = useToast();
  const [isRestrictionDialogOpen, setIsRestrictionDialogOpen] = useState(false);

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Institution Name';

  // Navigation mode check: Only open step 6 if specifically requested to view history
  const searchParams = useSearchParams();
  const isViewHistory = searchParams?.get('view') === 'history';

  // Wizard Step State (1..6) - Defaults directly to 1 (New Allocation setup)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    return isViewHistory && activeAllocation ? 6 : 1;
  });

  // Keep view synchronized with query params & reset active allocation for fresh setup
  useEffect(() => {
    if (isViewHistory && activeAllocation) {
      setCurrentStep(6);
    } else if (!isViewHistory) {
      setActiveAllocation(null);
      setCurrentStep(1);
    }
  }, [isViewHistory]);

  // Listen to navigation reset event from sidebar or other buttons
  useEffect(() => {
    const handleReset = () => {
      setActiveAllocation(null);
      setCurrentStep(1);
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/dashboard/student-seating/seating-allocation');
      }
    };
    window.addEventListener('dutyflow:reset-seating-allocation', handleReset);
    return () => window.removeEventListener('dutyflow:reset-seating-allocation', handleReset);
  }, [setActiveAllocation]);

  // Step 1: Examination Details
  const [selectedDutyExamId, setSelectedDutyExamId] = useState<string>('');
  const [examName, setExamName] = useState<string>('Midterm Examination - 2026');
  const [examDate, setExamDate] = useState<string>('2026-09-25');
  const [startTime, setStartTime] = useState<string>('09:00 AM');
  const [endTime, setEndTime] = useState<string>('12:00 PM');

  // Step 1: Examination Timetable Auto-fill State
  const [savedTimetables, setSavedTimetables] = useState<ExaminationTimetable[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedTimetableRowId, setSelectedTimetableRowId] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    const loadTimetables = () => {
      const initial = getSavedTimetables(user?.id);
      setSavedTimetables(initial);
      if (initial.length > 0) {
        setSelectedTimetableId((prev) => (prev && initial.some((t) => t.id === prev) ? prev : initial[0].id));
      }

      if (user?.id) {
        fetchTimetablesFromCloud(user.id).then((cloudList) => {
          if (!isMounted) return;
          setSavedTimetables(cloudList);
          if (cloudList.length > 0) {
            setSelectedTimetableId((prev) => (prev && cloudList.some((t) => t.id === prev) ? prev : cloudList[0].id));
          }
        }).catch(() => { });
      }
    };

    loadTimetables();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadTimetables();
      }
    };

    window.addEventListener('focus', loadTimetables);
    window.addEventListener('dutyflow:timetable-deleted', loadTimetables);
    window.addEventListener('dutyflow:saved-timetables-changed', loadTimetables);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', loadTimetables);
      window.removeEventListener('dutyflow:timetable-deleted', loadTimetables);
      window.removeEventListener('dutyflow:saved-timetables-changed', loadTimetables);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id]);

  const currentSelectedTimetable = useMemo(() => {
    if (!savedTimetables || savedTimetables.length === 0) return null;
    return savedTimetables.find((t) => t.id === selectedTimetableId) || savedTimetables[0];
  }, [savedTimetables, selectedTimetableId]);

  const currentTimetableRows = useMemo(() => {
    if (!currentSelectedTimetable?.rows) return [];
    return sortTimetableRows([...currentSelectedTimetable.rows]);
  }, [currentSelectedTimetable]);

  // Step 2: Selected Subjects
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Step 3: Seating Pattern
  const [pattern, setPattern] = useState<SeatingPattern>('3_PER_BENCH');

  // Step 4: Position Mapping (Slot -> Subject ID)
  const [positionMapping, setPositionMapping] = useState<Record<PositionSlot, string>>({
    SIDE_A: '',
    CENTER: '',
    SIDE_B: '',
  });

  // Step 4: Mode ('standard' | 'multiSubject') - Retain ONLY TWO modes
  const [step4Mode, setStep4Mode] = useState<'standard' | 'multiSubject'>('standard');
  const isMultiSubjectMode = step4Mode === 'multiSubject';
  const setIsMultiSubjectMode = (val: boolean) => setStep4Mode(val ? 'multiSubject' : 'standard');

  const [threeColumnConfig, setThreeColumnConfig] = useState<ThreeColumnPatternConfig>({
    enabled: false,
    leftSubjectId: '',
    rightSubjectId: '',
    middlePattern: 'centerOnly',
    middleEnabledSeats: { sideA: false, center: true, sideB: false },
    middleSeats: { sideA: '', center: '', sideB: '' },
  });

  const createDefaultUnusedRows = useCallback((): MultiSubjectRow[] => [
    { rowNumber: 1, sideA: 'UNUSED', center: 'UNUSED', sideB: 'UNUSED', enabled: true },
    { rowNumber: 2, sideA: 'UNUSED', center: 'UNUSED', sideB: 'UNUSED', enabled: true },
    { rowNumber: 3, sideA: 'UNUSED', center: 'UNUSED', sideB: 'UNUSED', enabled: true },
    { rowNumber: 4, sideA: 'UNUSED', center: 'UNUSED', sideB: 'UNUSED', enabled: false },
  ], []);

  // Step 4: Multi-Subject 4-Row Sequential System (3 or 4 Subjects)
  const [multiSubjectRows, setMultiSubjectRows] = useState<MultiSubjectRow[]>([
    { rowNumber: 1, sideA: 'UNUSED', center: 'UNUSED', sideB: 'UNUSED', enabled: true },
    { rowNumber: 2, sideA: 'UNUSED', center: 'UNUSED', sideB: 'UNUSED', enabled: true },
    { rowNumber: 3, sideA: 'UNUSED', center: 'UNUSED', sideB: 'UNUSED', enabled: true },
    { rowNumber: 4, sideA: 'UNUSED', center: 'UNUSED', sideB: 'UNUSED', enabled: false },
  ]);
  const [isSavingPattern, setIsSavingPattern] = useState<boolean>(false);

  // Step 4: Selected subjects sorted strictly by student strength from highest to lowest
  const sortedSelectedSubjectIds = useMemo(() => {
    return [...selectedSubjectIds].sort((a, b) => {
      const countA = studentsBySubject[a]?.length || 0;
      const countB = studentsBySubject[b]?.length || 0;
      if (countB !== countA) {
        return countB - countA; // 1. Highest student strength first
      }
      // Secondary tie-breaker by subject name
      const nameA = subjects.find((s) => s.id === a)?.name || '';
      const nameB = subjects.find((s) => s.id === b)?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [selectedSubjectIds, studentsBySubject, subjects]);

  // Unique names of all subjects in this exam for consistent global color palette mapping
  const allExamSubjectNames = useMemo(() => {
    return sortedSelectedSubjectIds
      .map((id) => subjects.find((s) => s.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }, [sortedSelectedSubjectIds, subjects]);

  // Helper to generate safe pattern according to student strength (highest to lowest)
  const generateDefaultRows = useCallback((subIds: string[]): MultiSubjectRow[] => {
    // Ensure subjects are ordered strictly by student strength from highest to lowest
    const sorted = [...subIds].sort((a, b) => {
      const countA = studentsBySubject[a]?.length || 0;
      const countB = studentsBySubject[b]?.length || 0;
      if (countB !== countA) return countB - countA;
      const nameA = subjects.find((s) => s.id === a)?.name || '';
      const nameB = subjects.find((s) => s.id === b)?.name || '';
      return nameA.localeCompare(nameB);
    });

    const s1 = sorted[0] || '';
    const s2 = sorted[1] || '';
    const s3 = sorted[2] || '';
    const s4 = sorted[3] || '';
    const s5 = sorted[4] || '';

    if (sorted.length >= 5) {
      return [
        { rowNumber: 1, sideA: s1, center: s2, sideB: s1, enabled: true },
        { rowNumber: 2, sideA: s2, center: s3, sideB: s2, enabled: true },
        { rowNumber: 3, sideA: s3, center: s4, sideB: s3, enabled: true },
        { rowNumber: 4, sideA: s4, center: s5, sideB: s4, enabled: true },
      ];
    } else if (sorted.length === 4) {
      return [
        { rowNumber: 1, sideA: s1, center: s2, sideB: s1, enabled: true },
        { rowNumber: 2, sideA: s2, center: s3, sideB: s2, enabled: true },
        { rowNumber: 3, sideA: s3, center: s4, sideB: s3, enabled: true },
        { rowNumber: 4, sideA: s4, center: 'NIL', sideB: s4, enabled: false }, // Optional / unused
      ];
    } else if (sorted.length === 3) {
      return [
        { rowNumber: 1, sideA: s1, center: s2, sideB: s1, enabled: true },
        { rowNumber: 2, sideA: s2, center: s3, sideB: s2, enabled: true },
        { rowNumber: 3, sideA: s3, center: 'NIL', sideB: s3, enabled: true },
        { rowNumber: 4, sideA: '', center: 'NIL', sideB: '', enabled: false },
      ];
    } else if (sorted.length === 2) {
      return [
        { rowNumber: 1, sideA: s1, center: s2, sideB: s1, enabled: true },
        { rowNumber: 2, sideA: s2, center: 'NIL', sideB: s2, enabled: true },
        { rowNumber: 3, sideA: '', center: 'NIL', sideB: '', enabled: false },
        { rowNumber: 4, sideA: '', center: 'NIL', sideB: '', enabled: false },
      ];
    } else {
      return [
        { rowNumber: 1, sideA: s1, center: 'NIL', sideB: s1, enabled: true },
        { rowNumber: 2, sideA: '', center: 'NIL', sideB: '', enabled: false },
        { rowNumber: 3, sideA: '', center: 'NIL', sideB: '', enabled: false },
        { rowNumber: 4, sideA: '', center: 'NIL', sideB: '', enabled: false },
      ];
    }
  }, [studentsBySubject, subjects]);

  // Helper to generate safe pattern for 3-Column rooms according to student strength and active mode demonstration
  const generateDefault3ColumnConfig = useCallback(
    (
      subIds: string[],
      modeOverride?: 'standard' | 'multiSubject',
      rowsOverride?: MultiSubjectRow[]
    ): ThreeColumnPatternConfig => {
      const sorted = [...subIds].sort((a, b) => {
        const countA = studentsBySubject[a]?.length || 0;
        const countB = studentsBySubject[b]?.length || 0;
        if (countB !== countA) return countB - countA;
        const nameA = subjects.find((s) => s.id === a)?.name || '';
        const nameB = subjects.find((s) => s.id === b)?.name || '';
        return nameA.localeCompare(nameB);
      });

      const s1 = sorted[0] || '';
      const s2 = sorted[1] || sorted[0] || '';
      const s3 = sorted[2] || sorted[1] || sorted[0] || '';

      const has3ColRooms = masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0);
      const activeMode = modeOverride || (subIds.length > 2 ? 'multiSubject' : 'standard');
      const rows = rowsOverride || multiSubjectRows;

      let leftConfig = {
        sideA: s1,
        center: sorted.length >= 2 ? s2 : 'VACANT',
        sideB: s1,
      };
      let middleSeatsConfig = {
        sideA: s1,
        center: sorted.length >= 2 ? s2 : s1,
        sideB: s3,
      };
      let rightConfig = {
        sideA: sorted.length >= 2 ? s2 : s1,
        center: sorted.length >= 2 ? s1 : 'VACANT',
        sideB: sorted.length >= 2 ? s2 : s1,
      };

      if (activeMode === 'multiSubject' && rows && rows.length > 0) {
        const row1 = rows[0];
        const rA = row1?.sideA || s1;
        const rCenter =
          row1?.center && row1.center !== 'NIL' && row1.center !== 'VACANT'
            ? row1.center
            : sorted.length >= 2
              ? s2
              : 'VACANT';
        const rB = row1?.sideB || s1;

        leftConfig = {
          sideA: rA,
          center: rCenter,
          sideB: rB,
        };

        middleSeatsConfig = {
          sideA: rA,
          center:
            row1?.center && row1.center !== 'NIL' && row1.center !== 'VACANT'
              ? row1.center
              : sorted.length >= 2
                ? s2
                : s1,
          sideB: s3 || rB,
        };

        rightConfig = {
          sideA: sorted.length >= 2 ? s2 : s1,
          center: s1,
          sideB: sorted.length >= 2 ? s2 : s1,
        };
      }

      return {
        enabled: has3ColRooms,
        leftSubjectId: leftConfig.sideA,
        rightSubjectId: rightConfig.sideA,
        middlePattern: 'centerOnly',
        middleEnabledSeats: { sideA: false, center: true, sideB: false },
        middleSeats: middleSeatsConfig,
        left: leftConfig,
        middle: middleSeatsConfig,
        right: rightConfig,
      };
    },
    [studentsBySubject, subjects, masterRooms, multiSubjectRows]
  );

  // Handler for "Auto Arrange Safe Pattern" action
  const handleAutoArrangeSafePattern = useCallback(() => {
    if (sortedSelectedSubjectIds.length === 0) return;
    const s1 = sortedSelectedSubjectIds[0];
    const s2 = sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0];

    let currentRows = multiSubjectRows;
    if (step4Mode === 'multiSubject') {
      currentRows = generateDefaultRows(sortedSelectedSubjectIds);
      setMultiSubjectRows(currentRows);
    } else {
      setPositionMapping({
        SIDE_A: s1,
        CENTER: pattern === '3_PER_BENCH' ? s2 : s1,
        SIDE_B: pattern === '2_PER_BENCH' ? s2 : s1,
      });
    }

    setThreeColumnConfig((prev) => {
      const fresh = generateDefault3ColumnConfig(sortedSelectedSubjectIds, step4Mode, currentRows);
      return {
        ...fresh,
        enabled: prev.enabled !== undefined ? prev.enabled : masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0),
        middlePattern: 'centerOnly',
        middleEnabledSeats: { sideA: false, center: true, sideB: false },
      };
    });

    toast({
      title: "Auto Arrange Safe Pattern Applied",
      description: "Subjects arranged according to student strength from highest to lowest.",
    });
  }, [sortedSelectedSubjectIds, step4Mode, generateDefaultRows, generateDefault3ColumnConfig, pattern, masterRooms, toast, multiSubjectRows]);

  // Automatically apply safe pattern arrangement when sorted subjects change or Step 4 loads
  const prevSubjectsKeyRef = useRef<string>('');
  useEffect(() => {
    if (sortedSelectedSubjectIds.length > 0) {
      const currentKey = sortedSelectedSubjectIds.join(',');
      if (prevSubjectsKeyRef.current !== currentKey) {
        prevSubjectsKeyRef.current = currentKey;
        const s1 = sortedSelectedSubjectIds[0];
        const s2 = sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0];

        // Step 4 default mode: When more than 2 subjects are included in the allocation, automatically select Mode 2
        const isMulti = sortedSelectedSubjectIds.length > 2;
        if (!activeAllocation) {
          setStep4Mode(isMulti ? 'multiSubject' : 'standard');
        }

        setPositionMapping((prev) => {
          const hasValidA = prev.SIDE_A && sortedSelectedSubjectIds.includes(prev.SIDE_A);
          const hasValidCenter = prev.CENTER && sortedSelectedSubjectIds.includes(prev.CENTER);
          const hasValidB = prev.SIDE_B && sortedSelectedSubjectIds.includes(prev.SIDE_B);
          if (!hasValidA || !hasValidCenter || !hasValidB) {
            return {
              SIDE_A: s1,
              CENTER: pattern === '3_PER_BENCH' ? s2 : s1,
              SIDE_B: pattern === '2_PER_BENCH' ? s2 : s1,
            };
          }
          return prev;
        });

        let defaultRows = multiSubjectRows;
        setMultiSubjectRows((prevRows) => {
          const hasCustomized = prevRows.some(
            (r) => r.sideA && r.sideA !== 'UNUSED' && sortedSelectedSubjectIds.includes(r.sideA)
          );
          if (!hasCustomized) {
            const unusedRows = createDefaultUnusedRows();
            defaultRows = unusedRows;
            return unusedRows;
          }
          return prevRows;
        });

        const has3ColRooms = masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0);
        const default3Col = generateDefault3ColumnConfig(
          sortedSelectedSubjectIds,
          isMulti ? 'multiSubject' : 'standard',
          defaultRows
        );

        setThreeColumnConfig((prev) => {
          if (!activeAllocation) {
            return {
              ...default3Col,
              enabled: has3ColRooms,
            };
          }
          if (!prev.leftSubjectId && !prev.left?.sideA) {
            return default3Col;
          }
          return prev;
        });
      }
    }
  }, [sortedSelectedSubjectIds, pattern, generateDefaultRows, generateDefault3ColumnConfig, activeAllocation, masterRooms]);

  // Validation function for multi-subject configuration
  const getPatternValidationError = useCallback((): string | null => {
    if (selectedSubjectIds.length < 3) {
      return 'At least 3 examination subjects must be selected in Step 2 to use the Multi-Subject Allocation feature.';
    }
    const activeRows = multiSubjectRows.filter(
      (r) =>
        r.enabled !== false &&
        ((r.sideA && r.sideA !== 'UNUSED') || (r.sideB && r.sideB !== 'UNUSED'))
    );
    if (activeRows.length < 2) {
      return 'Please configure at least 2 active rows (e.g. Row 1 and Row 2) for multi-subject allocation.';
    }
    for (const r of activeRows) {
      if (!r.sideA || r.sideA === 'UNUSED') {
        return `Row ${r.rowNumber}: Side A must have a valid examination subject selected.`;
      }
      if (!r.sideB || r.sideB === 'UNUSED') {
        return `Row ${r.rowNumber}: Side B must have a valid examination subject selected.`;
      }
      if (!selectedSubjectIds.includes(r.sideA)) {
        return `Row ${r.rowNumber}: Side A subject is not part of this session's selected subjects.`;
      }
      if (
        r.center &&
        r.center !== 'NIL' &&
        r.center !== 'VACANT' &&
        r.center !== 'UNUSED' &&
        !selectedSubjectIds.includes(r.center)
      ) {
        return `Row ${r.rowNumber}: Centre subject is not part of this session's selected subjects.`;
      }
      if (!selectedSubjectIds.includes(r.sideB)) {
        return `Row ${r.rowNumber}: Side B subject is not part of this session's selected subjects.`;
      }
    }
    return null;
  }, [selectedSubjectIds, multiSubjectRows]);

  // Save Allocation Pattern Handler
  const handleSavePattern = () => {
    const valErr = getPatternValidationError();
    if (valErr) {
      toast({
        variant: "destructive",
        title: "Configuration Incomplete",
        description: valErr,
      });
      return;
    }

    setIsSavingPattern(true);
    try {
      const storageKey = selectedDutyExamId
        ? `dutyflow_pattern_exam_${selectedDutyExamId}`
        : `dutyflow_pattern_${selectedSubjectIds.slice().sort().join('_')}`;

      localStorage.setItem(storageKey, JSON.stringify(multiSubjectRows));
      localStorage.setItem('dutyflow_multi_subject_pattern_last', JSON.stringify(multiSubjectRows));

      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { multiSubjectPatterns: multiSubjectRows }).catch(() => { });
      }

      toast({
        title: "Allocation Pattern Saved",
        description: "Your 4-row multi-subject allocation pattern has been saved successfully.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: e.message || "Failed to save allocation pattern.",
      });
    } finally {
      setIsSavingPattern(false);
    }
  };

  // Restore saved pattern on mount or exam switch
  useEffect(() => {
    if (activeAllocation?.multiSubjectConfig?.enabled) {
      setStep4Mode('multiSubject');
      if (activeAllocation.multiSubjectConfig.rows?.length) {
        setMultiSubjectRows(activeAllocation.multiSubjectConfig.rows);
      }
    } else if (activeAllocation) {
      setStep4Mode('standard');
    } else if (selectedSubjectIds.length > 2) {
      setStep4Mode('multiSubject');
    } else {
      setStep4Mode('standard');
    }

    if (activeAllocation?.threeColumnConfig) {
      setThreeColumnConfig(activeAllocation.threeColumnConfig);
    } else {
      const has3ColRooms = masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0);
      if (has3ColRooms) {
        setThreeColumnConfig((prev) => ({
          ...prev,
          enabled: true,
          middlePattern: prev.middlePattern || 'centerOnly',
          middleEnabledSeats: prev.middleEnabledSeats || { sideA: false, center: true, sideB: false },
        }));
      }
    }

    if (!activeAllocation && selectedSubjectIds.length >= 3) {
      try {
        const storageKey = selectedDutyExamId
          ? `dutyflow_pattern_exam_${selectedDutyExamId}`
          : `dutyflow_pattern_${selectedSubjectIds.slice().sort().join('_')}`;
        const saved = localStorage.getItem(storageKey) || localStorage.getItem('dutyflow_multi_subject_pattern_last');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMultiSubjectRows(parsed);
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      if (user?.id && isUUID(user.id)) {
        fetchUserWorkspaceFromDatabase(user.id).then((ws) => {
          if (ws?.multiSubjectPatterns && Array.isArray(ws.multiSubjectPatterns) && ws.multiSubjectPatterns.length > 0) {
            setMultiSubjectRows(ws.multiSubjectPatterns);
          }
        }).catch(() => { });
      }
    }
  }, [activeAllocation, selectedDutyExamId, selectedSubjectIds, user?.id, masterRooms]);

  // Step 5: Selected Rooms
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // Step 6: Generated Plan & Active Modal
  const [viewingRoomPlan, setViewingRoomPlan] = useState<RoomSeatingPlan | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Step 2: Alphabetical presentation of all examination subjects
  const alphabeticalSubjects = useMemo(() => {
    return [...subjects].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [subjects]);

  // Calculate total students selected
  const totalStudentsSelected = useMemo(() => {
    return selectedSubjectIds.reduce((sum, sId) => {
      const list = studentsBySubject[sId] || [];
      return sum + list.length;
    }, 0);
  }, [selectedSubjectIds, studentsBySubject]);

  // Selected rooms capacity
  const selectedRoomsCapacity = useMemo(() => {
    const multiCfg = isMultiSubjectMode ? { enabled: true, rows: multiSubjectRows } : undefined;
    return selectedRoomIds.reduce((sum, rId) => {
      const r = masterRooms.find((rm) => rm.id === rId);
      if (!r) return sum;
      return sum + getRoomEffectiveCapacity(r, pattern, isMultiSubjectMode, threeColumnConfig, multiCfg);
    }, 0);
  }, [selectedRoomIds, masterRooms, pattern, isMultiSubjectMode, threeColumnConfig, multiSubjectRows]);

  const isCapacitySufficient = selectedRoomsCapacity >= totalStudentsSelected && totalStudentsSelected > 0;

  // Auto-select needed rooms helper
  const autoSelectNeededRooms = useCallback(
    (
      targetStudents: number = totalStudentsSelected,
      currentPattern: SeatingPattern = pattern,
      isMulti: boolean = isMultiSubjectMode,
      threeColCfg: ThreeColumnPatternConfig = threeColumnConfig,
      multiCfgRows: MultiSubjectRow[] = multiSubjectRows
    ): string[] => {
      if (masterRooms.length === 0 || targetStudents <= 0) return [];
      let needed = targetStudents;
      const picked: string[] = [];
      const multiCfg = isMulti ? { enabled: true, rows: multiCfgRows } : undefined;
      for (const r of masterRooms) {
        if (needed <= 0) break;
        const cap = getRoomEffectiveCapacity(r, currentPattern, isMulti, threeColCfg, multiCfg);
        picked.push(r.id);
        needed -= cap;
      }
      return picked;
    },
    [masterRooms, totalStudentsSelected, pattern, isMultiSubjectMode, threeColumnConfig, multiSubjectRows]
  );

  // Step 5: Enable auto-selection of required rooms so that the needed rooms are pre-selected by default
  useEffect(() => {
    if (currentStep === 5 && selectedRoomIds.length === 0 && masterRooms.length > 0 && totalStudentsSelected > 0) {
      const picked = autoSelectNeededRooms();
      if (picked.length > 0) {
        setSelectedRoomIds(picked);
      }
    }
  }, [currentStep, selectedRoomIds.length, masterRooms.length, totalStudentsSelected, autoSelectNeededRooms]);


  // Handle Examination session select from Examination Timetable
  const handleSelectTimetableRow = (rowId: string) => {
    setSelectedTimetableRowId(rowId);
    setSelectedDutyExamId(rowId);

    const targetTimetable = currentSelectedTimetable;
    if (!targetTimetable) return;

    const [actualRowId, slotId] = rowId.includes('__') ? rowId.split('__') : [rowId, ''];
    const row = targetTimetable.rows?.find((r) => r.id === actualRowId);
    if (!row) return;

    const slot = (row.slots && slotId)
      ? row.slots.find((s) => s.id === slotId)
      : (row.slots?.[0] || row);

    // 1. Examination Title from Timetable
    if (targetTimetable.examinationName) {
      setExamName(targetTimetable.examinationName);
    }

    // 2. Date from Row (YYYY-MM-DD)
    if (row.date) {
      setExamDate(row.date);
    }

    // 3. Timings from Slot or Row
    let rowStart = '';
    let rowEnd = '';
    const timingsObj = slot?.timings || row.timings;
    if (timingsObj) {
      for (const t of Object.values(timingsObj)) {
        if (t?.startTime && t.startTime !== '-' && !rowStart) {
          rowStart = t.startTime;
        }
        if (t?.endTime && t.endTime !== '-' && !rowEnd) {
          rowEnd = t.endTime;
        }
        if (rowStart && rowEnd) break;
      }
    }
    if (rowStart) setStartTime(rowStart);
    if (rowEnd) setEndTime(rowEnd);

    // 4. Auto-match and pre-select subjects in Step 2 using COMPOSITE KEY (Class + Subject Title)
    const activeSubjects = slot?.subjects || row.subjects || [];
    if (activeSubjects.length > 0) {
      let slotCourse = slot?.course || row.course || '';

      if (!slotCourse && targetTimetable.classes && slot?.timings) {
        const activeClassIds = Object.keys(slot.timings).filter((cId) => {
          const t = slot.timings[cId];
          return t?.startTime && t.startTime !== '-' && t?.endTime && t.endTime !== '-';
        });
        if (activeClassIds.length === 1) {
          const col = targetTimetable.classes.find((c) => c.id === activeClassIds[0]);
          if (col?.name) slotCourse = col.name;
        }
      }

      const matchedIds = subjects
        .filter((subj) => {
          const subjStudents = studentsBySubject[subj.id] || [];
          return activeSubjects.some((subName) =>
            isSubjectMatchingExamSlot(subj, subjStudents, subName, slotCourse)
          );
        })
        .map((subj) => subj.id);

      if (matchedIds.length > 0) {
        setSelectedSubjectIds(matchedIds);
      }
    }

    toast({
      title: 'Auto-filled from Examination Timetable',
      description: `Loaded session for ${row.displayDate || row.date} (${row.subjects?.length ? row.subjects.join(', ') : 'Exam Session'}).`,
    });
  };

  // Run Allocation
  const handleGenerateAllocation = () => {
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }

    if (!isCapacitySufficient) {
      toast({
        variant: "destructive",
        title: "Insufficient Capacity",
        description: `Selected rooms hold ${selectedRoomsCapacity} seats, but ${totalStudentsSelected} students are required.`,
      });
      return;
    }

    if (isMultiSubjectMode) {
      const valErr = getPatternValidationError();
      if (valErr) {
        toast({
          variant: "destructive",
          title: "Configuration Error",
          description: valErr,
        });
        return;
      }
    }

    const selectedRooms = masterRooms.filter((r) => selectedRoomIds.includes(r.id));
    const selectedSubjs = subjects.filter((s) => selectedSubjectIds.includes(s.id));

    const multiSubjectConfig: MultiSubjectConfig | undefined = isMultiSubjectMode
      ? {
        enabled: true,
        rows: multiSubjectRows,
      }
      : undefined;

    const result = runDeterministicSeatingAllocation({
      rooms: selectedRooms,
      allEligibleRooms: masterRooms,
      subjects: selectedSubjs,
      studentsBySubject,
      pattern: isMultiSubjectMode ? '3_PER_BENCH' : pattern,
      positionMapping,
      multiSubjectConfig,
      threeColumnConfig: threeColumnConfig?.enabled ? threeColumnConfig : undefined,
      allowAutoExpandRooms: true,
    });

    const finalRoomIds = result.roomPlans.map((rp) => rp.roomId);

    const newRecord: SeatingAllocationRecord = {
      id: activeAllocation ? activeAllocation.id : `alloc-${Date.now()}`,
      name: `${examName} - Seating Plan`,
      examination: {
        examId: selectedDutyExamId || undefined,
        examName,
        date: examDate,
        startTime,
        endTime,
      },
      subjectIds: selectedSubjectIds,
      pattern: isMultiSubjectMode ? '3_PER_BENCH' : pattern,
      positionMapping,
      multiSubjectConfig,
      threeColumnConfig: threeColumnConfig?.enabled ? threeColumnConfig : undefined,
      roomIds: finalRoomIds,
      roomPlans: result.roomPlans,
      subjectStats: result.subjectStats,
      summary: result.summary,
      status: 'Draft',
      createdAt: activeAllocation ? activeAllocation.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAllocation(newRecord);
    setActiveAllocation(newRecord);
    setCurrentStep(6);

    toast({
      title: "Allocation Generated",
      description: `Successfully allocated ${result.summary.allocatedStudents} students across ${result.summary.totalRooms} rooms${isMultiSubjectMode ? ` using sequential 4-row trigger system` : ''}.`,
    });
  };

  // PDF Export Handlers
  const handleDownloadAllRoomsPdf = async () => {
    if (!activeAllocation) return;
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    setIsDownloadingPdf(true);
    try {
      await generateRoomSeatingPlanPdf({
        allocation: activeAllocation,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "PDF Downloaded",
        description: "Room-wise seating plans downloaded successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "PDF Export Failed",
        description: err.message || "Failed to generate room seating PDF.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadSingleRoomPdf = async (plan: RoomSeatingPlan) => {
    if (!activeAllocation) return;
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    setIsDownloadingPdf(true);
    try {
      await generateRoomSeatingPlanPdf({
        allocation: activeAllocation,
        roomPlan: plan,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "Room PDF Downloaded",
        description: `Seating plan for Room ${plan.roomNo} downloaded.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "PDF Export Failed",
        description: err.message || "Failed to generate single room PDF.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadIndexPdf = async () => {
    if (!activeAllocation) return;
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    setIsDownloadingPdf(true);
    try {
      await generateStudentSeatingIndexPdf({
        allocation: activeAllocation,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "Student Index PDF Downloaded",
        description: "Roll-call student seating index generated successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to generate Student Index PDF.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCompleteAllocationTo100 = () => {
    if (!activeAllocation) return;
    try {
      const repaired = completeAllocationTo100Percent(
        activeAllocation,
        masterRooms,
        subjects,
        studentsBySubject
      );
      saveAllocation(repaired);
      setActiveAllocation(repaired);
      toast({
        title: "100% Student Allocation Completed!",
        description: `Successfully allocated all ${repaired.summary.allocatedStudents} students across ${repaired.summary.totalRooms} rooms with zero unallocated students.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Allocation Error",
        description: err.message || "Failed to auto-complete allocation.",
      });
    }
  };

  const [isPublishing, setIsPublishing] = useState(false);

  const handleTogglePublish = async () => {
    if (!activeAllocation) return;
    setIsPublishing(true);
    try {
      const willPublish = !activeAllocation.isPublished;
      const updated = await togglePublishAllocation(activeAllocation.id, willPublish);
      if (updated) {
        toast({
          title: willPublish ? "Published to Student Portal" : "Unpublished from Student Portal",
          description: willPublish
            ? `Seating details for "${activeAllocation.name}" are now live on the Student Portal.`
            : `Seating details for "${activeAllocation.name}" have been removed from the Student Portal.`,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err?.message || "Failed to update publication status.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // 3-Column Examination Room Configuration Segment
  const renderThreeColumnSegment = () => {
    const is3ColEnabled = Boolean(threeColumnConfig.enabled);
    const middlePattern = threeColumnConfig.middlePattern || 'centerOnly';
    const middleEnabled = threeColumnConfig.middleEnabledSeats || { sideA: false, center: true, sideB: false };
    const middleSeats = threeColumnConfig.middleSeats || {
      sideA: sortedSelectedSubjectIds[0] || '',
      center: sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0] || '',
      sideB: sortedSelectedSubjectIds[2] || sortedSelectedSubjectIds[0] || '',
    };

    return (
      <div className="mt-6 pt-5 border-t border-slate-200/80 space-y-4">
        {/* Header and Yes/No Question */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Columns3 className="w-4 h-4 text-indigo-600" />
                <span className="font-headline font-bold text-xs uppercase tracking-wider text-slate-800">
                  3-Column Examination Room Configuration
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Are there any 3-column examination rooms?
              </p>
            </div>

            <RadioGroup
              value={is3ColEnabled ? "yes" : "no"}
              onValueChange={(val) => {
                const isYes = val === "yes";
                setThreeColumnConfig((prev) => {
                  const fresh = generateDefault3ColumnConfig(sortedSelectedSubjectIds, step4Mode);
                  return {
                    ...fresh,
                    ...prev,
                    enabled: isYes,
                    leftSubjectId: prev.leftSubjectId || fresh.leftSubjectId,
                    rightSubjectId: prev.rightSubjectId || fresh.rightSubjectId,
                    middlePattern: prev.middlePattern || 'centerOnly',
                    middleEnabledSeats: prev.middleEnabledSeats || { sideA: false, center: true, sideB: false },
                    middleSeats: prev.middleSeats || fresh.middleSeats,
                    left: prev.left || fresh.left,
                    right: prev.right || fresh.right,
                    middle: prev.middle || fresh.middle,
                  };
                });
              }}
              className="flex items-center gap-4 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0"
            >
              <div className="flex items-center space-x-1.5 cursor-pointer">
                <RadioGroupItem value="no" id="3col-toggle-no" />
                <Label htmlFor="3col-toggle-no" className="text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200">
                  No
                </Label>
              </div>
              <div className="flex items-center space-x-1.5 cursor-pointer">
                <RadioGroupItem value="yes" id="3col-toggle-yes" />
                <Label htmlFor="3col-toggle-yes" className="text-xs font-semibold cursor-pointer text-indigo-700 dark:text-indigo-400">
                  Yes
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Configuration Interface when Yes is selected */}
        {is3ColEnabled && (
          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl space-y-5">
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Configure Left Side Benches, Middle Benches, and Right Side Benches independently for 3-column rooms.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* B. Left Side Benches */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] dark:text-indigo-300">
                    Left Side Benches
                  </span>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                    Column 1
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select subjects for Side A, Centre, and Side B:
                </p>

                <div className="space-y-2.5 pt-1">
                  {(['sideA', 'center', 'sideB'] as const).map((pos) => {
                    const posLabel = pos === 'sideA' ? 'Side A' : pos === 'center' ? 'Centre' : 'Side B';
                    const currentVal =
                      threeColumnConfig.left?.[pos] ||
                      (pos === 'center'
                        ? (sortedSelectedSubjectIds.length >= 2 ? sortedSelectedSubjectIds[1] : 'VACANT')
                        : threeColumnConfig.leftSubjectId || sortedSelectedSubjectIds[0] || '');

                    return (
                      <div key={pos} className="p-2 rounded-lg border bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{posLabel}</span>
                          {currentVal === 'VACANT' && (
                            <Badge variant="outline" className="text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                              Vacant
                            </Badge>
                          )}
                        </div>

                        <Select
                          value={currentVal}
                          onValueChange={(val) =>
                            setThreeColumnConfig((prev) => ({
                              ...prev,
                              left: {
                                sideA: prev.left?.sideA || prev.leftSubjectId || sortedSelectedSubjectIds[0] || '',
                                center: prev.left?.center || (sortedSelectedSubjectIds.length >= 2 ? sortedSelectedSubjectIds[1] : 'VACANT'),
                                sideB: prev.left?.sideB || prev.leftSubjectId || sortedSelectedSubjectIds[0] || '',
                                [pos]: val,
                              },
                              ...(pos === 'sideA' ? { leftSubjectId: val } : {}),
                            }))
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold h-8 border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder={`Select for ${posLabel}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedSelectedSubjectIds.map((id, index) => {
                              const s = subjects.find((sb) => sb.id === id);
                              const count = studentsBySubject[id]?.length || 0;
                              const col = getSubjectColor(s?.name, allExamSubjectNames);
                              return (
                                <SelectItem key={id} value={id} className="text-xs font-medium">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                                    style={{ backgroundColor: col.accentHex }}
                                  />
                                  <span className="font-semibold">{s?.name}</span> ({count} students) — #{index + 1}
                                </SelectItem>
                              );
                            })}
                            <SelectItem value="VACANT" className="text-xs font-bold text-amber-700 bg-amber-50">
                              ∅ Vacant / Nil
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* D. Middle Benches – Custom Seat Configuration */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] dark:text-indigo-300">
                    Middle Benches
                  </span>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                    Column 2
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Middle Bench Seating Pattern</Label>
                  <Select
                    value={middlePattern}
                    onValueChange={(val: MiddleBenchSeatingPattern) => {
                      setThreeColumnConfig((prev) => {
                        const newEnabled =
                          val === 'allThree'
                            ? { sideA: true, center: true, sideB: true }
                            : val === 'centerOnly'
                              ? { sideA: false, center: true, sideB: false }
                              : val === 'sideAAndSideB'
                                ? { sideA: true, center: false, sideB: true }
                                : prev.middleEnabledSeats || { sideA: true, center: true, sideB: true };
                        return {
                          ...prev,
                          middlePattern: val,
                          middleEnabledSeats: newEnabled,
                        };
                      });
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold h-9 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select Pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allThree" className="text-xs font-medium">
                        1. All Three Seats – Side A, Centre, Side B
                      </SelectItem>
                      <SelectItem value="centerOnly" className="text-xs font-medium">
                        2. Centre Seat Only
                      </SelectItem>
                      <SelectItem value="sideAAndSideB" className="text-xs font-medium">
                        3. Side A and Side B Only
                      </SelectItem>
                      <SelectItem value="custom" className="text-xs font-medium">
                        4. Custom Seat Selection
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* If Custom Seat Selection, allow independent checkbox enabling */}
                {middlePattern === 'custom' && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Enable / Disable Positions
                    </span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <Checkbox
                          checked={middleEnabled.sideA}
                          onCheckedChange={(checked) =>
                            setThreeColumnConfig((prev) => ({
                              ...prev,
                              middleEnabledSeats: {
                                ...(prev.middleEnabledSeats || { sideA: true, center: true, sideB: true }),
                                sideA: Boolean(checked),
                              },
                            }))
                          }
                        />
                        Side A
                      </label>

                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <Checkbox
                          checked={middleEnabled.center}
                          onCheckedChange={(checked) =>
                            setThreeColumnConfig((prev) => ({
                              ...prev,
                              middleEnabledSeats: {
                                ...(prev.middleEnabledSeats || { sideA: true, center: true, sideB: true }),
                                center: Boolean(checked),
                              },
                            }))
                          }
                        />
                        Centre
                      </label>

                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <Checkbox
                          checked={middleEnabled.sideB}
                          onCheckedChange={(checked) =>
                            setThreeColumnConfig((prev) => ({
                              ...prev,
                              middleEnabledSeats: {
                                ...(prev.middleEnabledSeats || { sideA: true, center: true, sideB: true }),
                                sideB: Boolean(checked),
                              },
                            }))
                          }
                        />
                        Side B
                      </label>
                    </div>
                  </div>
                )}

                {/* Per-Position Subject Dropdowns */}
                <div className="space-y-2.5 pt-1">
                  {(['sideA', 'center', 'sideB'] as const).map((pos) => {
                    const isEnabled =
                      middlePattern === 'allThree'
                        ? true
                        : middlePattern === 'centerOnly'
                          ? pos === 'center'
                          : middlePattern === 'sideAAndSideB'
                            ? pos === 'sideA' || pos === 'sideB'
                            : Boolean(middleEnabled[pos]);

                    const posLabel = pos === 'sideA' ? 'Side A' : pos === 'center' ? 'Centre' : 'Side B';
                    const currentVal = middleSeats[pos] || sortedSelectedSubjectIds[pos === 'sideA' ? 0 : pos === 'center' ? 1 : 2] || sortedSelectedSubjectIds[0] || '';

                    return (
                      <div key={pos} className={`p-2 rounded-lg border ${isEnabled ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700" : "bg-slate-100/60 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700 opacity-60"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{posLabel}</span>
                          {!isEnabled && (
                            <Badge variant="outline" className="text-[9px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600">
                              Disabled
                            </Badge>
                          )}
                        </div>

                        {isEnabled ? (
                          <Select
                            value={currentVal}
                            onValueChange={(val) =>
                              setThreeColumnConfig((prev) => ({
                                ...prev,
                                middleSeats: {
                                  ...(prev.middleSeats || {
                                    sideA: sortedSelectedSubjectIds[0] || '',
                                    center: sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0] || '',
                                    sideB: sortedSelectedSubjectIds[2] || sortedSelectedSubjectIds[0] || '',
                                  }),
                                  [pos]: val,
                                },
                                middle: {
                                  sideA: prev.middle?.sideA || prev.middleSeats?.sideA || '',
                                  center: prev.middle?.center || prev.middleSeats?.center || '',
                                  sideB: prev.middle?.sideB || prev.middleSeats?.sideB || '',
                                  [pos]: val,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold h-8 border-slate-200 dark:border-slate-700">
                              <SelectValue placeholder={`Select for ${posLabel}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedSelectedSubjectIds.map((id, index) => {
                                const s = subjects.find((sb) => sb.id === id);
                                const count = studentsBySubject[id]?.length || 0;
                                const col = getSubjectColor(s?.name, allExamSubjectNames);
                                return (
                                  <SelectItem key={id} value={id} className="text-xs font-medium">
                                    <span
                                      className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                                      style={{ backgroundColor: col.accentHex }}
                                    />
                                    <span className="font-semibold">{s?.name}</span> ({count} students) — #{index + 1}
                                  </SelectItem>
                                );
                              })}
                              <SelectItem value="VACANT" className="text-xs font-bold text-amber-700 bg-amber-50">
                                ∅ Vacant / Nil
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic py-1">
                            Position disabled. No students will be allocated.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* C. Right Side Benches */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] dark:text-indigo-300">
                    Right Side Benches
                  </span>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                    Column 3
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select subjects for Side A, Centre, and Side B:
                </p>

                <div className="space-y-2.5 pt-1">
                  {(['sideA', 'center', 'sideB'] as const).map((pos) => {
                    const posLabel = pos === 'sideA' ? 'Side A' : pos === 'center' ? 'Centre' : 'Side B';
                    const currentVal =
                      threeColumnConfig.right?.[pos] ||
                      (pos === 'center'
                        ? (sortedSelectedSubjectIds[0] || 'VACANT')
                        : threeColumnConfig.rightSubjectId || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0] || '');

                    return (
                      <div key={pos} className="p-2 rounded-lg border bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{posLabel}</span>
                          {currentVal === 'VACANT' && (
                            <Badge variant="outline" className="text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                              Vacant
                            </Badge>
                          )}
                        </div>

                        <Select
                          value={currentVal}
                          onValueChange={(val) =>
                            setThreeColumnConfig((prev) => ({
                              ...prev,
                              right: {
                                sideA: prev.right?.sideA || prev.rightSubjectId || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0] || '',
                                center: prev.right?.center || sortedSelectedSubjectIds[0] || 'VACANT',
                                sideB: prev.right?.sideB || prev.rightSubjectId || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0] || '',
                                [pos]: val,
                              },
                              ...(pos === 'sideA' ? { rightSubjectId: val } : {}),
                            }))
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold h-8 border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder={`Select for ${posLabel}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedSelectedSubjectIds.map((id, index) => {
                              const s = subjects.find((sb) => sb.id === id);
                              const count = studentsBySubject[id]?.length || 0;
                              const col = getSubjectColor(s?.name, allExamSubjectNames);
                              return (
                                <SelectItem key={id} value={id} className="text-xs font-medium">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                                    style={{ backgroundColor: col.accentHex }}
                                  />
                                  <span className="font-semibold">{s?.name}</span> ({count} students) — #{index + 1}
                                </SelectItem>
                              );
                            })}
                            <SelectItem value="VACANT" className="text-xs font-bold text-amber-700 bg-amber-50">
                              ∅ Vacant / Nil
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Wizard Step Items
  const steps = [
    { num: 1, title: 'Exam Details' },
    { num: 2, title: 'Subjects' },
    { num: 3, title: 'Pattern' },
    { num: 4, title: 'Positions' },
    { num: 5, title: 'Rooms' },
    { num: 6, title: 'Summary & PDF' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                Seating Allocation
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Deterministic, rule-based student seat assignment and room diagram generator.
              </p>
            </div>
          </div>
        </div>

        {currentStep === 6 && (
          <Button
            size="sm"
            onClick={() => {
              setActiveAllocation(null);
              setCurrentStep(1);
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', '/dashboard/student-seating/seating-allocation');
              }
            }}
            className="bg-[#6342e8] hover:bg-[#5130d8] text-white font-bold text-xs h-9 px-4 gap-2 shadow-md shadow-purple-900/20 ring-2 ring-purple-300/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Allocation
          </Button>
        )}
      </div>

      {/* Step Progress Indicator Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[620px] px-2">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => {
                    if (isCompleted || (activeAllocation && currentStep === 6)) {
                      if (s.num === 5 && selectedRoomIds.length === 0) {
                        const picked = autoSelectNeededRooms();
                        if (picked.length > 0) {
                          setSelectedRoomIds(picked);
                        }
                      }
                      setCurrentStep(s.num);
                    }
                  }}
                  className={`flex items-center gap-2 cursor-pointer transition-all ${isCurrent
                    ? "text-[#1E2A5E] dark:text-indigo-400 font-black"
                    : isCompleted
                      ? "text-emerald-700 dark:text-emerald-400 font-bold"
                      : "text-slate-400 dark:text-slate-500 font-medium"
                    }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${isCurrent
                      ? "bg-[#1E2A5E] text-white shadow-xs"
                      : isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                      }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="text-xs tracking-tight whitespace-nowrap">{s.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${isCompleted ? "bg-emerald-300 dark:bg-emerald-800" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1 — EXAMINATION DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="font-headline font-bold text-lg text-slate-800 dark:text-slate-100">
              Step 1: Examination Details
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Auto-fill from your Examination Timetable or enter examination details manually.
            </p>
          </div>

          {/* Auto-fill from Examination Timetable */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#1E2A5E] dark:text-indigo-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Auto-fill from Examination Timetable:
              </Label>
              <Link
                href="/dashboard/examination-timetable"
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                <span>Examination Timetable</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {savedTimetables.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 rounded-lg p-2.5">
                No examination timetables found. You can create one in{' '}
                <Link href="/dashboard/examination-timetable" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">
                  Examination Timetable
                </Link>{' '}
                or fill in the examination details manually below.
              </p>
            ) : savedTimetables.length === 1 ? (
              /* Single Timetable: direct session selector */
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 px-0.5">
                  <span className="font-semibold text-indigo-900 dark:text-indigo-300 truncate max-w-[320px]">
                    Timetable: {currentSelectedTimetable?.examinationName || 'Official Timetable'}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                    {currentTimetableRows.length} {currentTimetableRows.length === 1 ? 'Date' : 'Dates'}
                  </Badge>
                </div>
                <Select value={selectedTimetableRowId} onValueChange={handleSelectTimetableRow}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold h-9 border-indigo-200 dark:border-indigo-800 shadow-xs cursor-pointer">
                    <SelectValue placeholder="Select examination date / session to auto-fill" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {currentTimetableRows.flatMap((row) => {
                      const slots = row.slots && row.slots.length > 0
                        ? row.slots
                        : [{ id: `${row.id}-s1`, course: row.course, subjects: row.subjects || [], timings: row.timings || {} }];

                      return slots.map((slot, sIdx) => {
                        const sessionVal = slots.length > 1 ? `${row.id}__${slot.id || sIdx}` : row.id;
                        const dateLabel = row.displayDate || row.date;
                        const dayLabel = row.day ? `(${row.day})` : '';
                        const courseLabel = slot.course ? `[${slot.course}] ` : '';
                        const subjectsLabel = slot.subjects && slot.subjects.length > 0 ? slot.subjects.join(', ') : 'No exam scheduled';
                        let timingLabel = '';
                        if (slot.timings) {
                          for (const t of Object.values(slot.timings)) {
                            if (t?.startTime && t.startTime !== '-' && t?.endTime && t.endTime !== '-') {
                              timingLabel = `${t.startTime} – ${t.endTime}`;
                              break;
                            }
                          }
                        }
                        return (
                          <SelectItem key={sessionVal} value={sessionVal} className="text-xs py-2 cursor-pointer">
                            <div className="flex flex-col gap-0.5 text-left">
                              <div className="font-semibold text-slate-800">
                                {dateLabel} {dayLabel} • {courseLabel}{subjectsLabel}
                              </div>
                              {timingLabel && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  Timings: {timingLabel}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        );
                      });
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              /* More than one timetable: Timetable selector + Session selector */
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Select Timetable:
                    </Label>
                    <Select
                      value={selectedTimetableId}
                      onValueChange={(val) => {
                        setSelectedTimetableId(val);
                        setSelectedTimetableRowId('');
                      }}
                    >
                      <SelectTrigger className="bg-white text-xs font-semibold h-9 border-indigo-200 shadow-xs cursor-pointer">
                        <SelectValue placeholder="Choose Timetable" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {savedTimetables.map((tt) => (
                          <SelectItem key={tt.id} value={tt.id} className="text-xs py-2 cursor-pointer">
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-slate-800 truncate max-w-[240px]">
                                {tt.examinationName || 'Untitled Timetable'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {tt.rows?.length || 0} dates scheduled
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Select Examination Session / Date:
                    </Label>
                    <Select value={selectedTimetableRowId} onValueChange={handleSelectTimetableRow}>
                      <SelectTrigger className="bg-white text-xs font-semibold h-9 border-indigo-200 shadow-xs cursor-pointer">
                        <SelectValue placeholder="Choose Session / Date" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {currentTimetableRows.flatMap((row) => {
                          const slots = row.slots && row.slots.length > 0
                            ? row.slots
                            : [{ id: `${row.id}-s1`, course: row.course, subjects: row.subjects || [], timings: row.timings || {} }];

                          return slots.map((slot, sIdx) => {
                            const sessionVal = slots.length > 1 ? `${row.id}__${slot.id || sIdx}` : row.id;
                            const dateLabel = row.displayDate || row.date;
                            const dayLabel = row.day ? `(${row.day})` : '';
                            const courseLabel = slot.course ? `[${slot.course}] ` : '';
                            const subjectsLabel = slot.subjects && slot.subjects.length > 0 ? slot.subjects.join(', ') : 'No exam scheduled';
                            let timingLabel = '';
                            if (slot.timings) {
                              for (const t of Object.values(slot.timings)) {
                                if (t?.startTime && t.startTime !== '-' && t?.endTime && t.endTime !== '-') {
                                  timingLabel = `${t.startTime} – ${t.endTime}`;
                                  break;
                                }
                              }
                            }
                            return (
                              <SelectItem key={sessionVal} value={sessionVal} className="text-xs py-2 cursor-pointer">
                                <div className="flex flex-col gap-0.5 text-left">
                                  <div className="font-semibold text-slate-800">
                                    {dateLabel} {dayLabel} • {courseLabel}{subjectsLabel}
                                  </div>
                                  {timingLabel && (
                                    <div className="text-[10px] text-slate-500 font-medium">
                                      Timings: {timingLabel}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          });
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="exam-name" className="text-xs font-bold text-slate-700">
                Examination Title
              </Label>
              <Input
                id="exam-name"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. First Internal Assessment - September 2026"
                className="text-xs font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exam-date" className="text-xs font-bold text-slate-700">
                  Date
                </Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-start" className="text-xs font-bold text-slate-700">
                  Start Time
                </Label>
                <Input
                  id="exam-start"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="09:00 AM"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-end" className="text-xs font-bold text-slate-700">
                  End Time
                </Label>
                <Input
                  id="exam-end"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="12:00 PM"
                  className="text-xs"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!examName.trim() || !examDate}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              Continue to Select Subjects
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2 — SELECT SUBJECTS */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="font-headline font-bold text-lg text-slate-800 dark:text-slate-100">
              Step 2: Select Examination Subjects
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select one or multiple subjects scheduled for this examination session.
            </p>
          </div>

          <div className="space-y-2.5">
            {alphabeticalSubjects.map((subj) => {
              const students = studentsBySubject[subj.id] || [];
              const isChecked = selectedSubjectIds.includes(subj.id);
              const resolvedClass = resolveSubjectClass(subj, students);
              const classStyle = getClassBadgeStyle(resolvedClass);

              return (
                <div
                  key={subj.id}
                  onClick={() => {
                    if (isChecked) {
                      setSelectedSubjectIds((prev) => prev.filter((id) => id !== subj.id));
                    } else {
                      setSelectedSubjectIds((prev) => [...prev, subj.id]);
                    }
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${isChecked
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-2xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => { }}
                      className="data-[state=checked]:bg-[#1E2A5E]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline font-bold text-xs text-slate-900 dark:text-white">
                          {subj.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-bold px-2 py-0.5", classStyle.badgeClass)}
                        >
                          {resolvedClass}
                        </Badge>
                      </div>
                      {subj.code && subj.code !== resolvedClass && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Code: {subj.code}
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`font-semibold text-xs px-2.5 py-0.5 ${students.length > 0
                      ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                      }`}
                  >
                    {students.length} Students
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Dynamic Selection Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                Total Students Selected
              </div>
              <div className="font-headline font-black text-2xl text-slate-900 dark:text-white mt-0.5">
                {totalStudentsSelected}
              </div>
            </div>
            <Badge variant="outline" className="bg-white dark:bg-slate-800 text-xs font-semibold py-1 px-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
              {selectedSubjectIds.length} Subject(s) Chosen
            </Badge>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="text-xs h-9 gap-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <Button
              onClick={() => setCurrentStep(3)}
              disabled={selectedSubjectIds.length === 0 || totalStudentsSelected === 0}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              Continue to Seating Pattern
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — SELECT SEATING PATTERN */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="font-headline font-bold text-lg text-slate-800 dark:text-slate-100">
              Step 3: Select Seating Pattern
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose how many students sit on each examination bench.
            </p>
          </div>

          {/* 3 Selectable Visual Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Option 1: 1 / Bench */}
            <div
              onClick={() => setPattern('1_PER_BENCH')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${pattern === '1_PER_BENCH'
                ? "border-[#1E2A5E] dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                }`}
            >
              <div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 mb-2">
                  Option 1
                </Badge>
                <div className="font-headline font-black text-sm text-slate-900 dark:text-white">
                  1 Student / Bench
                </div>
                <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mt-1">
                  Position: CENTER
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block">Capacity</span>
                <span className="font-headline font-black text-base text-slate-800 dark:text-slate-100">
                  20 students
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block">for 20-bench room</span>
              </div>
            </div>

            {/* Option 2: 2 / Bench */}
            <div
              onClick={() => setPattern('2_PER_BENCH')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${pattern === '2_PER_BENCH'
                ? "border-[#1E2A5E] dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                }`}
            >
              <div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 mb-2">
                  Option 2
                </Badge>
                <div className="font-headline font-black text-sm text-slate-900 dark:text-white">
                  2 Students / Bench
                </div>
                <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 mt-1">
                  SIDE A + SIDE B
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block">Capacity</span>
                <span className="font-headline font-black text-base text-slate-800 dark:text-slate-100">
                  40 students
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block">for 20-bench room</span>
              </div>
            </div>

            {/* Option 3: 3 / Bench */}
            <div
              onClick={() => setPattern('3_PER_BENCH')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${pattern === '3_PER_BENCH'
                ? "border-[#1E2A5E] dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                }`}
            >
              <div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 mb-2">
                  Option 3
                </Badge>
                <div className="font-headline font-black text-sm text-slate-900 dark:text-white">
                  3 Students / Bench
                </div>
                <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 mt-1">
                  SIDE A + CENTER + SIDE B
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block">Capacity</span>
                <span className="font-headline font-black text-base text-slate-800 dark:text-slate-100">
                  60 students
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block">for 20-bench room</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(2)}
              className="text-xs h-9 gap-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <Button
              onClick={() => {
                const isMulti = selectedSubjectIds.length > 2;
                if (isMulti) {
                  setStep4Mode('multiSubject');
                  setMultiSubjectRows((prevRows) => {
                    const hasCustomized = prevRows.some(
                      (r) => r.sideA && r.sideA !== 'UNUSED' && sortedSelectedSubjectIds.includes(r.sideA)
                    );
                    if (!hasCustomized) {
                      return createDefaultUnusedRows();
                    }
                    return prevRows;
                  });
                } else {
                  setStep4Mode('standard');
                }

                const has3Col = masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0);
                setThreeColumnConfig((prev) => {
                  const fresh = generateDefault3ColumnConfig(sortedSelectedSubjectIds, isMulti ? 'multiSubject' : 'standard');
                  return {
                    ...fresh,
                    enabled: prev.enabled !== undefined ? prev.enabled : has3Col,
                    middlePattern: prev.middlePattern || 'centerOnly',
                    middleEnabledSeats: prev.middleEnabledSeats || { sideA: false, center: true, sideB: false },
                  };
                });

                setCurrentStep(4);
              }}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              Continue to Assign Positions
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4 — ASSIGN SUBJECTS TO POSITIONS */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs mx-auto space-y-6 transition-all max-w-4xl">
          {/* Header & Mode Switcher */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline font-bold text-lg text-slate-800 dark:text-slate-100">
                  Step 4: Assign Subjects to Bench Positions
                </h2>
                {isMultiSubjectMode && (
                  <Badge className="bg-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5">
                    Mode 2: Sequential 4-Row System
                  </Badge>
                )}
                {!isMultiSubjectMode && (
                  <Badge className="bg-[#1E2A5E] text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5">
                    Mode 1: Standard Allocation
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isMultiSubjectMode
                  ? "Configure 4 sequential rows for Side A, Centre, and Side B. The system advances immediately when either subject finishes."
                  : "Specify which subject occupies each physical seat slot on the bench with automatic subsequent transitions."}
              </p>
            </div>

            {/* Mode Switcher Buttons - Retaining ONLY TWO Modes */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={step4Mode === 'standard' ? "default" : "outline"}
                onClick={() => {
                  setStep4Mode('standard');
                  setThreeColumnConfig((prev) => {
                    const fresh = generateDefault3ColumnConfig(sortedSelectedSubjectIds, 'standard');
                    return {
                      ...fresh,
                      enabled: prev.enabled !== undefined ? prev.enabled : masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0),
                      middlePattern: prev.middlePattern || 'centerOnly',
                      middleEnabledSeats: prev.middleEnabledSeats || { sideA: false, center: true, sideB: false },
                    };
                  });
                }}
                className={`text-xs h-8 font-bold ${step4Mode === 'standard'
                    ? "bg-[#1E2A5E] text-white hover:bg-[#151D42]"
                    : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
              >
                Standard (1 or 2 Subjects)
              </Button>

              <Button
                type="button"
                size="sm"
                variant={step4Mode === 'multiSubject' ? "default" : "outline"}
                onClick={() => {
                  setStep4Mode('multiSubject');
                  setMultiSubjectRows((prevRows) => {
                    const hasCustomized = prevRows.some(
                      (r) => r.sideA && r.sideA !== 'UNUSED' && sortedSelectedSubjectIds.includes(r.sideA)
                    );
                    if (!hasCustomized) {
                      return createDefaultUnusedRows();
                    }
                    return prevRows;
                  });
                  setThreeColumnConfig((prev) => {
                    const fresh = generateDefault3ColumnConfig(sortedSelectedSubjectIds, 'multiSubject', multiSubjectRows);
                    return {
                      ...fresh,
                      enabled: prev.enabled !== undefined ? prev.enabled : masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0),
                      middlePattern: prev.middlePattern || 'centerOnly',
                      middleEnabledSeats: prev.middleEnabledSeats || { sideA: false, center: true, sideB: false },
                    };
                  });
                }}
                className={`text-xs h-8 font-bold gap-1.5 ${step4Mode === 'multiSubject'
                    ? "bg-[#1E2A5E] text-white hover:bg-[#151D42] shadow-xs"
                    : "text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/80"
                  }`}
              >
                <Plus className="w-3.5 h-3.5" />
                + More Than 2 Subjects
              </Button>
            </div>
          </div>

          {/* Section: Subjects Available for this Session (Always displayed in order of student strength) */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#1E2A5E] text-white rounded-md shadow-3xs">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    Subjects Available for this Session ({sortedSelectedSubjectIds.length})
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Ranked automatically from highest to lowest student strength for safe seating arrangement.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200 text-xs font-bold px-2.5 py-0.5">
                  Total: {totalStudentsSelected} Students
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {sortedSelectedSubjectIds.map((id, index) => {
                const s = subjects.find((sb) => sb.id === id);
                const count = studentsBySubject[id]?.length || 0;
                const rankLabel =
                  index === 0
                    ? "Highest Strength"
                    : index === 1
                      ? "2nd-Highest Strength"
                      : index === 2
                        ? "3rd-Highest Strength"
                        : `#${index + 1} Strength`;

                const rankBadgeClass =
                  index === 0
                    ? "bg-emerald-600 text-white font-bold"
                    : index === 1
                      ? "bg-indigo-600 text-white font-bold"
                      : index === 2
                        ? "bg-purple-600 text-white font-bold"
                        : "bg-slate-200 text-slate-700 font-semibold";

                const subColor = getSubjectColor(s?.name, allExamSubjectNames);

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 bg-white border p-2.5 rounded-lg shadow-3xs transition-all"
                    style={{ borderColor: subColor.borderCss }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-3xs text-white"
                        style={{ backgroundColor: subColor.accentHex }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-headline font-bold text-xs truncate flex items-center gap-1.5" title={s?.name}>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                            style={{ backgroundColor: subColor.bgCss, color: subColor.textCss, borderColor: subColor.borderCss }}
                          >
                            {s?.name || 'Subject'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {rankLabel} {s?.code ? `• ${s.code}` : ''}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[11px] font-bold py-0.5 px-2 shrink-0 border"
                      style={{ backgroundColor: subColor.bgCss, color: subColor.textCss, borderColor: subColor.borderCss }}
                    >
                      {count} {count === 1 ? 'student' : 'students'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MODE A: STANDARD ALLOCATION (1 OR 2 SUBJECTS) */}
          {step4Mode === 'standard' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                <div>
                  <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-slate-800">
                    {pattern === '1_PER_BENCH'
                      ? "1 Student per Bench (Center Position)"
                      : pattern === '2_PER_BENCH'
                        ? "2 Students per Bench (Side A & Side B)"
                        : "3 Students per Bench (Side A, Centre, Side B)"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {pattern === '3_PER_BENCH'
                      ? "Priority rule: Highest strength assigned to Side A and Side B, second-highest placed in Centre."
                      : "Assign subjects to physical bench positions according to student strength."}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoArrangeSafePattern}
                  className="text-[11px] font-bold h-8 gap-1.5 text-indigo-700 border-indigo-300 bg-indigo-50/70 hover:bg-indigo-100/80 shadow-3xs self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Auto Arrange Safe Pattern
                </Button>
              </div>

              {pattern === '1_PER_BENCH' && (
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    CENTER &rarr; Select Subject
                  </Label>
                  <Select
                    value={positionMapping.CENTER || sortedSelectedSubjectIds[0] || ""}
                    onValueChange={(val) =>
                      setPositionMapping((prev) => ({ ...prev, CENTER: val }))
                    }
                  >
                    <SelectTrigger className="bg-white text-xs font-semibold h-9">
                      <SelectValue placeholder="Select Subject for Center Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedSelectedSubjectIds.map((id, index) => {
                        const s = subjects.find((sb) => sb.id === id);
                        const count = studentsBySubject[id]?.length || 0;
                        return (
                          <SelectItem key={id} value={id} className="text-xs">
                            <span className="font-semibold">{s?.name}</span> ({count} students) — #{index + 1}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {pattern === '2_PER_BENCH' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                          2 Students per Bench Allocation Rule
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Side A and Side B must receive the same subject. Centre is kept vacant throughout. Complete all students of Subject 1 before beginning Subject 2.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border-indigo-200 self-start sm:self-auto">
                        Same Subject on Side A & B
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {/* Subject 1 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>Subject 1 (Highest Strength)</span>
                          <span className="text-[10px] text-slate-500 font-normal">Side A & Side B</span>
                        </Label>
                        <Select
                          value={positionMapping.SIDE_A || sortedSelectedSubjectIds[0] || ""}
                          onValueChange={(val) =>
                            setPositionMapping((prev) => ({ ...prev, SIDE_A: val }))
                          }
                        >
                          <SelectTrigger className="bg-white text-xs font-semibold h-9">
                            <SelectValue placeholder="Select Subject 1" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedSelectedSubjectIds.map((id, index) => {
                              const s = subjects.find((sb) => sb.id === id);
                              const count = studentsBySubject[id]?.length || 0;
                              const col = getSubjectColor(s?.name, allExamSubjectNames);
                              return (
                                <SelectItem key={id} value={id} className="text-xs">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                                    style={{ backgroundColor: col.accentHex }}
                                  />
                                  <span className="font-semibold">{s?.name}</span> ({count} students) — #{index + 1}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Subject 2 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>Subject 2 (Subsequent Allocation)</span>
                          <span className="text-[10px] text-slate-500 font-normal">Allocated to Side A & B when Subject 1 finishes</span>
                        </Label>
                        <Select
                          value={positionMapping.SIDE_B || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0] || ""}
                          onValueChange={(val) =>
                            setPositionMapping((prev) => ({ ...prev, SIDE_B: val }))
                          }
                        >
                          <SelectTrigger className="bg-white text-xs font-semibold h-9">
                            <SelectValue placeholder="Select Subject 2" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedSelectedSubjectIds.map((id, index) => {
                              const s = subjects.find((sb) => sb.id === id);
                              const count = studentsBySubject[id]?.length || 0;
                              const col = getSubjectColor(s?.name, allExamSubjectNames);
                              return (
                                <SelectItem key={id} value={id} className="text-xs">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                                    style={{ backgroundColor: col.accentHex }}
                                  />
                                  <span className="font-semibold">{s?.name}</span> ({count} students) — #{index + 1}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Layout Demonstration Visual */}
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Bench Layout Demonstration
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-indigo-700 block">
                            Subject 1:
                          </span>
                          <div className="flex items-center gap-1 font-mono font-bold text-center text-xs">
                            <span className="flex-1 py-1.5 px-1 bg-indigo-100 text-indigo-900 rounded border border-indigo-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.SIDE_A || sortedSelectedSubjectIds[0]))?.name || 'Subject 1'}
                            </span>
                            <span className="flex-1 py-1.5 px-1 bg-slate-200 text-slate-500 rounded text-[10px] border border-slate-300">
                              Vacant (Centre)
                            </span>
                            <span className="flex-1 py-1.5 px-1 bg-indigo-100 text-indigo-900 rounded border border-indigo-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.SIDE_A || sortedSelectedSubjectIds[0]))?.name || 'Subject 1'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-700 block">
                            After Subject 1 is completed:
                          </span>
                          <div className="flex items-center gap-1 font-mono font-bold text-center text-xs">
                            <span className="flex-1 py-1.5 px-1 bg-emerald-100 text-emerald-900 rounded border border-emerald-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.SIDE_B || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0]))?.name || 'Subject 2'}
                            </span>
                            <span className="flex-1 py-1.5 px-1 bg-slate-200 text-slate-500 rounded text-[10px] border border-slate-300">
                              Vacant (Centre)
                            </span>
                            <span className="flex-1 py-1.5 px-1 bg-emerald-100 text-emerald-900 rounded border border-emerald-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.SIDE_B || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0]))?.name || 'Subject 2'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pattern === '3_PER_BENCH' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                          3 Students per Bench (Sandwich Rule & Automatic Transition)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Initial allocation follows the Sandwich Rule [ Subject 1 | Subject 2 | Subject 1 ]. After all students of Subject 1 finish, Subject 2 transitions to Side A & Side B with Centre vacant.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold text-purple-700 bg-purple-50 border-purple-200 self-start sm:self-auto">
                        Sandwich Pattern
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {/* Subject 1 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>Subject 1 (Highest Strength)</span>
                          <span className="text-[10px] text-slate-500 font-normal">Side A & Side B</span>
                        </Label>
                        <Select
                          value={positionMapping.SIDE_A || sortedSelectedSubjectIds[0] || ""}
                          onValueChange={(val) =>
                            setPositionMapping((prev) => ({ ...prev, SIDE_A: val, SIDE_B: val }))
                          }
                        >
                          <SelectTrigger className="bg-white text-xs font-semibold h-9">
                            <SelectValue placeholder="Select Subject 1" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedSelectedSubjectIds.map((id, index) => {
                              const s = subjects.find((sb) => sb.id === id);
                              const count = studentsBySubject[id]?.length || 0;
                              const col = getSubjectColor(s?.name, allExamSubjectNames);
                              return (
                                <SelectItem key={id} value={id} className="text-xs">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                                    style={{ backgroundColor: col.accentHex }}
                                  />
                                  <span className="font-semibold">{s?.name}</span> ({count} students) — #{index + 1}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Subject 2 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>Subject 2 (Sandwich Position)</span>
                          <span className="text-[10px] text-slate-500 font-normal">Centre Seat</span>
                        </Label>
                        <Select
                          value={positionMapping.CENTER || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0] || ""}
                          onValueChange={(val) =>
                            setPositionMapping((prev) => ({ ...prev, CENTER: val }))
                          }
                        >
                          <SelectTrigger className="bg-white text-xs font-semibold h-9">
                            <SelectValue placeholder="Select Subject 2" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedSelectedSubjectIds.map((id, index) => {
                              const s = subjects.find((sb) => sb.id === id);
                              const count = studentsBySubject[id]?.length || 0;
                              const col = getSubjectColor(s?.name, allExamSubjectNames);
                              return (
                                <SelectItem key={id} value={id} className="text-xs">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                                    style={{ backgroundColor: col.accentHex }}
                                  />
                                  <span className="font-semibold">{s?.name}</span> ({count} students) — #{index + 1}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Layout Demonstration Visual */}
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Bench Layout Demonstration
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-purple-700 block">
                            Initial (Sandwich Rule):
                          </span>
                          <div className="flex items-center gap-1 font-mono font-bold text-center text-xs">
                            <span className="flex-1 py-1.5 px-1 bg-indigo-100 text-indigo-900 rounded border border-indigo-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.SIDE_A || sortedSelectedSubjectIds[0]))?.name || 'Subject 1'}
                            </span>
                            <span className="flex-1 py-1.5 px-1 bg-purple-100 text-purple-900 rounded border border-purple-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.CENTER || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0]))?.name || 'Subject 2'}
                            </span>
                            <span className="flex-1 py-1.5 px-1 bg-indigo-100 text-indigo-900 rounded border border-indigo-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.SIDE_A || sortedSelectedSubjectIds[0]))?.name || 'Subject 1'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-700 block">
                            After Subject 1 is completed:
                          </span>
                          <div className="flex items-center gap-1 font-mono font-bold text-center text-xs">
                            <span className="flex-1 py-1.5 px-1 bg-purple-100 text-purple-900 rounded border border-purple-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.CENTER || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0]))?.name || 'Subject 2'}
                            </span>
                            <span className="flex-1 py-1.5 px-1 bg-slate-200 text-slate-500 rounded text-[10px] border border-slate-300">
                              Vacant (Centre)
                            </span>
                            <span className="flex-1 py-1.5 px-1 bg-purple-100 text-purple-900 rounded border border-purple-200 truncate">
                              {subjects.find((s) => s.id === (positionMapping.CENTER || sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0]))?.name || 'Subject 2'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Integrated 3-Column Examination Room Configuration for Mode 1 */}
              {renderThreeColumnSegment()}

              {/* Callout to Multi-Subject System */}
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="space-y-0.5">
                  <div className="font-headline font-bold text-xs text-[#1E2A5E] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Allocating 3 or 4 subjects in this examination?
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Switch to the Sequential 4-Row System to distribute 3 or 4 subjects across Side A, Centre, and Side B with immediate auto-row switching.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setStep4Mode('multiSubject');
                    setMultiSubjectRows((prevRows) => {
                      const hasCustomized = prevRows.some(
                        (r) => r.sideA && r.sideA !== 'UNUSED' && sortedSelectedSubjectIds.includes(r.sideA)
                      );
                      if (!hasCustomized) {
                        return createDefaultUnusedRows();
                      }
                      return prevRows;
                    });
                    setThreeColumnConfig((prev) => {
                      const fresh = generateDefault3ColumnConfig(sortedSelectedSubjectIds, 'multiSubject', multiSubjectRows);
                      return {
                        ...fresh,
                        enabled: prev.enabled !== undefined ? prev.enabled : masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0),
                        middlePattern: prev.middlePattern || 'centerOnly',
                        middleEnabledSeats: prev.middleEnabledSeats || { sideA: false, center: true, sideB: false },
                      };
                    });
                  }}
                  className="bg-[#1E2A5E] hover:bg-[#151D42] text-white text-xs font-bold shrink-0 gap-1.5 h-8 px-3.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + More Than 2 Subjects
                </Button>
              </div>
            </div>
          )}

          {/* MODE 2: SEQUENTIAL 4-ROW ALLOCATION SYSTEM (3 OR 4 SUBJECTS) */}
          {step4Mode === 'multiSubject' && (
            <div className="space-y-6">
              {selectedSubjectIds.length < 3 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-amber-900">
                  <div className="flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Multi-Subject feature requires at least 3 subjects. Currently you have selected <strong>{selectedSubjectIds.length}</strong> subject(s).
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs h-7 font-bold text-amber-900 border-amber-300 bg-white hover:bg-amber-100 shrink-0"
                  >
                    ← Back to Step 2
                  </Button>
                </div>
              )}

              {/* Section 2: Quick Action Auto-Fill & Save Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div>
                  <h3 className="font-headline font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                    Sequential Allocation Rows (4 Rows)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Priority rule: Highest strength assigned to Side A and Side B, second-highest placed in Centre.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoArrangeSafePattern}
                    className="text-[11px] font-bold h-7 gap-1.5 text-indigo-700 border-indigo-300 bg-indigo-50/70 hover:bg-indigo-100/80 shadow-3xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Auto Arrange Safe Pattern
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSavePattern}
                    disabled={isSavingPattern || selectedSubjectIds.length < 3}
                    className="text-[11px] font-bold h-7 gap-1 text-[#1E2A5E] border-indigo-200 hover:bg-indigo-50"
                  >
                    <Save className="w-3.5 h-3.5 text-indigo-600" />
                    {isSavingPattern ? "Saving..." : "Save Pattern"}
                  </Button>
                </div>
              </div>

              {/* Section 3: The 4 Selectable Rows */}
              <div className="space-y-3.5">
                {multiSubjectRows.map((row, idx) => {
                  const sA = subjects.find((s) => s.id === row.sideA);
                  const isCenterNil = row.center === 'NIL' || row.center === 'VACANT';
                  const sC = isCenterNil ? null : subjects.find((s) => s.id === row.center);
                  const sB = subjects.find((s) => s.id === row.sideB);

                  const subtitle =
                    row.rowNumber === 1
                      ? 'Row 1 (Initial Row: Allocation begins here)'
                      : row.rowNumber === 2
                        ? 'Row 2 (Activates immediately when either subject in Row 1 finishes)'
                        : row.rowNumber === 3
                          ? 'Row 3 (Activates immediately when either subject in Row 2 finishes)'
                          : 'Row 4 (Optional / Unused: Activates if subjects in Row 3 finish)';

                  return (
                    <div
                      key={row.rowNumber}
                      className={`bg-white border-2 rounded-xl p-4 space-y-3 transition-colors ${row.enabled !== false
                          ? 'border-slate-200/90 hover:border-indigo-300 shadow-2xs'
                          : 'border-slate-200/60 bg-slate-50/40 opacity-70'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-[#1E2A5E] text-white flex items-center justify-center font-bold text-xs shadow-3xs">
                            {row.rowNumber}
                          </div>
                          <div>
                            <span className="font-headline font-black text-xs text-slate-800 tracking-tight mr-2">
                              Row {row.rowNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                              {subtitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {row.rowNumber === 4 && (
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer mr-2">
                              <Checkbox
                                checked={row.enabled !== false}
                                onCheckedChange={(chk) => {
                                  const next = [...multiSubjectRows];
                                  next[idx] = { ...next[idx], enabled: Boolean(chk) };
                                  setMultiSubjectRows(next);
                                }}
                                className="data-[state=checked]:bg-[#1E2A5E]"
                              />
                              <span>Enable Row 4</span>
                            </label>
                          )}

                          <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                            {(!row.sideA || row.sideA === 'UNUSED') ? 'Optional/Unused' : sA?.name || '—'} &bull;{' '}
                            <span className={isCenterNil ? 'text-amber-600 font-bold' : ''}>
                              {isCenterNil ? 'NIL' : (!row.center || row.center === 'UNUSED') ? 'Optional/Unused' : sC?.name || '—'}
                            </span>{' '}
                            &bull; {(!row.sideB || row.sideB === 'UNUSED') ? 'Optional/Unused' : sB?.name || '—'}
                          </div>
                        </div>
                      </div>

                      {/* 3 Positions Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Side A */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                            <span>Side A</span>
                            <span className="text-[10px] text-slate-400 font-normal">Subject</span>
                          </Label>
                          <Select
                            value={row.sideA || 'UNUSED'}
                            onValueChange={(val) => {
                              const next = [...multiSubjectRows];
                              next[idx] = { ...next[idx], sideA: val };
                              setMultiSubjectRows(next);
                            }}
                          >
                            <SelectTrigger className="bg-slate-50/60 text-xs font-semibold h-9 border-slate-200">
                              <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedSelectedSubjectIds.map((id, sIdx) => {
                                const s = subjects.find((sb) => sb.id === id);
                                const count = studentsBySubject[id]?.length || 0;
                                return (
                                  <SelectItem key={id} value={id} className="text-xs font-medium">
                                    <span className="font-semibold">{s?.name}</span> ({count} students) — #{sIdx + 1}
                                  </SelectItem>
                                );
                              })}
                              <SelectItem value="UNUSED" className="text-xs text-slate-400 italic">
                                -- Optional / Unused --
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Centre Position */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                            <span>Centre</span>
                            <span className="text-[10px] text-slate-400 font-normal">Subject / NIL</span>
                          </Label>
                          <Select
                            value={row.center || 'UNUSED'}
                            onValueChange={(val) => {
                              const next = [...multiSubjectRows];
                              next[idx] = { ...next[idx], center: val };
                              setMultiSubjectRows(next);
                            }}
                          >
                            <SelectTrigger className="bg-slate-50/60 text-xs font-semibold h-9 border-slate-200">
                              <SelectValue placeholder="Select Subject or NIL" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedSelectedSubjectIds.map((id, sIdx) => {
                                const s = subjects.find((sb) => sb.id === id);
                                const count = studentsBySubject[id]?.length || 0;
                                return (
                                  <SelectItem key={id} value={id} className="text-xs font-medium">
                                    <span className="font-semibold">{s?.name}</span> ({count} students) — #{sIdx + 1}
                                  </SelectItem>
                                );
                              })}
                              <SelectItem
                                value="NIL"
                                className="text-xs font-bold text-amber-700 bg-amber-50/80 border-t border-amber-100"
                              >
                                ∅ NIL / Vacant (Leave Empty)
                              </SelectItem>
                              <SelectItem value="UNUSED" className="text-xs text-slate-400 italic">
                                -- Optional / Unused --
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Side B */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                            <span>Side B</span>
                            <span className="text-[10px] text-slate-400 font-normal">Subject</span>
                          </Label>
                          <Select
                            value={row.sideB || 'UNUSED'}
                            onValueChange={(val) => {
                              const next = [...multiSubjectRows];
                              next[idx] = { ...next[idx], sideB: val };
                              setMultiSubjectRows(next);
                            }}
                          >
                            <SelectTrigger className="bg-slate-50/60 text-xs font-semibold h-9 border-slate-200">
                              <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedSelectedSubjectIds.map((id, sIdx) => {
                                const s = subjects.find((sb) => sb.id === id);
                                const count = studentsBySubject[id]?.length || 0;
                                return (
                                  <SelectItem key={id} value={id} className="text-xs font-medium">
                                    <span className="font-semibold">{s?.name}</span> ({count} students) — #{sIdx + 1}
                                  </SelectItem>
                                );
                              })}
                              <SelectItem value="UNUSED" className="text-xs text-slate-400 italic">
                                -- Optional / Unused --
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Integrated 3-Column Examination Room Configuration for Mode 2 */}
              {renderThreeColumnSegment()}
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(3)}
              className="text-xs h-9 gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <Button
              onClick={() => {
                if (isMultiSubjectMode) {
                  const valErr = getPatternValidationError();
                  if (valErr) {
                    toast({
                      variant: "destructive",
                      title: "Pattern Configuration Incomplete",
                      description: valErr,
                    });
                    return;
                  }
                }

                // Ensure default position fallback if untouched
                const updated = { ...positionMapping };
                const s1 = sortedSelectedSubjectIds[0] || selectedSubjectIds[0] || '';
                const s2 = sortedSelectedSubjectIds[1] || sortedSelectedSubjectIds[0] || selectedSubjectIds[0] || '';
                if (pattern === '1_PER_BENCH' && !updated.CENTER) {
                  updated.CENTER = s1;
                }
                if (pattern === '2_PER_BENCH') {
                  if (!updated.SIDE_A) updated.SIDE_A = s1;
                  if (!updated.SIDE_B) updated.SIDE_B = s2;
                }
                if (pattern === '3_PER_BENCH') {
                  if (!updated.SIDE_A) updated.SIDE_A = s1;
                  if (!updated.CENTER) updated.CENTER = s2;
                  if (!updated.SIDE_B) updated.SIDE_B = s1;
                }
                setPositionMapping(updated);

                // Ensure 3-column configuration has valid defaults
                const has3Col = masterRooms.some((r) => (Number(r.middleBenches) || 0) > 0);
                const fresh3Col = generateDefault3ColumnConfig(sortedSelectedSubjectIds, step4Mode);
                setThreeColumnConfig((prev) => ({
                  ...fresh3Col,
                  ...prev,
                  enabled: prev.enabled !== undefined ? prev.enabled : has3Col,
                  leftSubjectId: prev.leftSubjectId || fresh3Col.leftSubjectId,
                  rightSubjectId: prev.rightSubjectId || fresh3Col.rightSubjectId,
                  middlePattern: prev.middlePattern || 'centerOnly',
                  middleEnabledSeats: prev.middleEnabledSeats || { sideA: false, center: true, sideB: false },
                  left: prev.left || fresh3Col.left,
                  right: prev.right || fresh3Col.right,
                  middle: prev.middle || fresh3Col.middle,
                }));

                // Step 5: Enable auto-selection of required rooms so that the needed rooms are pre-selected by default
                if (selectedRoomIds.length === 0) {
                  const picked = autoSelectNeededRooms();
                  if (picked.length > 0) {
                    setSelectedRoomIds(picked);
                  }
                }

                setCurrentStep(5);
              }}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              Continue to Select Rooms
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5 — ROOM SELECTION */}
      {currentStep === 5 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs max-w-4xl mx-auto space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline font-bold text-lg text-slate-800 dark:text-slate-100">
                  Step 5: Select Examination Rooms
                </h2>
                <Badge className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold text-xs px-2.5 py-0.5">
                  {selectedRoomIds.length} of {masterRooms.length} Rooms Selected
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select Examination Rooms to accommodate {totalStudentsSelected} students ({pattern.replace('_', ' ')}).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (selectedRoomIds.length === masterRooms.length) {
                    setSelectedRoomIds([]);
                  } else {
                    setSelectedRoomIds(masterRooms.map((r) => r.id));
                  }
                }}
                className="text-xs h-8 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-semibold"
              >
                {selectedRoomIds.length === masterRooms.length ? "Deselect All" : "Select All Rooms"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Quick auto select enough rooms
                  let needed = totalStudentsSelected;
                  const picked: string[] = [];
                  const multiCfg = isMultiSubjectMode ? { enabled: true, rows: multiSubjectRows } : undefined;
                  for (const r of masterRooms) {
                    if (needed <= 0) break;
                    const cap = getRoomEffectiveCapacity(r, pattern, isMultiSubjectMode, threeColumnConfig, multiCfg);
                    picked.push(r.id);
                    needed -= cap;
                  }
                  setSelectedRoomIds(picked);
                }}
                className="text-xs h-8 text-[#1E2A5E] dark:text-indigo-400 border-slate-200 dark:border-slate-700 font-bold"
              >
                Auto-Select Needed Rooms
              </Button>
            </div>
          </div>

          {/* Rooms Table / Cards */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3 text-center w-12">Sl No.</th>
                  <th className="py-3 px-3 text-center w-12">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectedRoomIds.length === masterRooms.length && masterRooms.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoomIds(masterRooms.map((r) => r.id));
                          } else {
                            setSelectedRoomIds([]);
                          }
                        }}
                        className="data-[state=checked]:bg-[#1E2A5E]"
                        aria-label="Select all rooms"
                        title="Select all rooms"
                      />
                    </div>
                  </th>
                  <th className="py-3 px-4">Room No.</th>
                  <th className="py-3 px-3 text-center">Benches</th>
                  <th className="py-3 px-3 text-center font-bold text-[#1E2A5E] dark:text-indigo-300">
                    Current Capacity ({isMultiSubjectMode ? '3/Bench (Multi-Subject)' : pattern === '1_PER_BENCH' ? '1/Bench' : pattern === '2_PER_BENCH' ? '2/Bench' : '3/Bench'}{threeColumnConfig.enabled ? ' • 3-Col Configured' : ''})
                  </th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium text-slate-700 dark:text-slate-200">
                {masterRooms.map((room, index) => {
                  const isChecked = selectedRoomIds.includes(room.id);
                  const effectiveCap = getRoomEffectiveCapacity(
                    room,
                    pattern,
                    isMultiSubjectMode,
                    threeColumnConfig,
                    isMultiSubjectMode ? { enabled: true, rows: multiSubjectRows } : undefined
                  );

                  return (
                    <tr
                      key={room.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedRoomIds((prev) => prev.filter((id) => id !== room.id));
                        } else {
                          setSelectedRoomIds((prev) => [...prev, room.id]);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${isChecked ? "bg-indigo-50/50 dark:bg-indigo-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono font-semibold text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => { }}
                          className="data-[state=checked]:bg-[#1E2A5E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-headline font-black text-xs text-slate-900 dark:text-white">
                        {room.roomNo}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-medium">
                        {room.totalBenches} ({room.leftBenches}L + {room.rightBenches}R)
                      </td>
                      <td className="py-3 px-3 text-center font-headline font-black text-xs text-indigo-700 dark:text-indigo-400">
                        {effectiveCap} seats
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]">
                          Available
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Dynamic Real-Time Capacity Audit Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCapacitySufficient
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
              : "bg-rose-50/80 border-rose-200 text-rose-900"
              }`}
          >
            <div className="flex items-center gap-3">
              {isCapacitySufficient ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="font-headline font-bold text-xs uppercase tracking-wider">
                  {isCapacitySufficient
                    ? "Capacity Sufficient & Ready for Allocation"
                    : "Insufficient Capacity Selected"}
                </div>
                <div className="text-xs mt-0.5 font-medium opacity-90">
                  Rooms Selected: <strong>{selectedRoomIds.length} of {masterRooms.length}</strong> &bull; Required: <strong>{totalStudentsSelected}</strong> &bull; Selected Room Capacity:{" "}
                  <strong>{selectedRoomsCapacity}</strong> &bull; Vacant Buffer:{" "}
                  <strong>{Math.max(0, selectedRoomsCapacity - totalStudentsSelected)}</strong>
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-xs py-1 px-3 font-bold ${isCapacitySufficient
                ? "bg-white text-emerald-700 border-emerald-300"
                : "bg-white text-rose-700 border-rose-300"
                }`}
            >
              {isCapacitySufficient ? "✓ Ready" : "⚠ Shortage"}
            </Badge>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(4)}
              className="text-xs h-9 gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <Button
              onClick={handleGenerateAllocation}
              disabled={!isCapacitySufficient}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-6 gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              Generate Seating Allocation
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6 — ALLOCATION SUMMARY & VISUAL ROOM DIAGRAM */}
      {currentStep === 6 && activeAllocation && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Total Students
              </div>
              <div className="font-headline font-black text-2xl text-slate-900 dark:text-white mt-1">
                {activeAllocation.summary.totalStudents}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Selected Rooms
              </div>
              <div className="font-headline font-black text-2xl text-indigo-700 dark:text-indigo-400 mt-1">
                {activeAllocation.summary.totalRooms}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Total Capacity
              </div>
              <div className="font-headline font-black text-2xl text-purple-700 dark:text-purple-400 mt-1">
                {activeAllocation.summary.totalCapacity}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Allocated
              </div>
              <div className="font-headline font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-1">
                {activeAllocation.summary.allocatedStudents}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Vacant Seats
              </div>
              <div className="font-headline font-black text-2xl text-amber-600 dark:text-amber-400 mt-1">
                {activeAllocation.summary.vacantSeats}
              </div>
            </div>
          </div>

          {/* Multi-Subject Pattern Banner if applicable */}
          {activeAllocation.multiSubjectConfig?.enabled && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#1E2A5E] text-white rounded-md">
                    <ListOrdered className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-headline font-bold text-xs text-[#1E2A5E] uppercase tracking-wider">
                      Sequential Multi-Subject 4-Row System Applied
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Sequential row switching triggered immediately when either active subject reached full allocation.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200 text-[10px] font-bold self-start sm:self-auto">
                  {
                    activeAllocation.multiSubjectConfig.rows.filter(
                      (r) =>
                        r.enabled !== false &&
                        ((r.sideA && r.sideA !== 'UNUSED') || (r.sideB && r.sideB !== 'UNUSED'))
                    ).length
                  } Configured Rows
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {activeAllocation.multiSubjectConfig.rows
                  .filter(
                    (r) =>
                      r.enabled !== false &&
                      ((r.sideA && r.sideA !== 'UNUSED') || (r.sideB && r.sideB !== 'UNUSED'))
                  )
                  .map((row) => {
                    const sA = subjects.find((s) => s.id === row.sideA)?.name || '—';
                    const isNil = row.center === 'NIL' || row.center === 'VACANT' || !row.center;
                    const sC = isNil ? 'NIL' : subjects.find((s) => s.id === row.center)?.name || '—';
                    const sB = subjects.find((s) => s.id === row.sideB)?.name || '—';

                    return (
                      <div key={row.rowNumber} className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-3xs text-xs">
                        <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Row {row.rowNumber}</span>
                          <span className="font-mono text-[9px] text-slate-400">Position Pattern</span>
                        </div>
                        <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const cA = getSubjectColor(sA);
                            const cC = getSubjectColor(sC);
                            const cB = getSubjectColor(sB);
                            return (
                              <>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold border truncate max-w-[80px]"
                                  style={{ backgroundColor: cA.bgCss, color: cA.textCss, borderColor: cA.borderCss }}
                                  title={sA}
                                >
                                  {sA}
                                </span>
                                <span className="text-slate-400">&bull;</span>
                                <span
                                  className={isNil ? 'text-amber-700 italic font-bold text-[10px] px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200' : 'px-1.5 py-0.5 rounded text-[10px] font-bold border truncate max-w-[80px]'}
                                  style={!isNil ? { backgroundColor: cC.bgCss, color: cC.textCss, borderColor: cC.borderCss } : undefined}
                                  title={sC}
                                >
                                  {sC}
                                </span>
                                <span className="text-slate-400">&bull;</span>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold border truncate max-w-[80px]"
                                  style={{ backgroundColor: cB.bgCss, color: cB.textCss, borderColor: cB.borderCss }}
                                  title={sB}
                                >
                                  {sB}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Side A &bull; Centre &bull; Side B
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 3-Column Pattern Banner if applicable */}
          {activeAllocation.threeColumnConfig?.enabled && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#1E2A5E] text-white rounded-md">
                    <Columns3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-headline font-bold text-xs text-[#1E2A5E] uppercase tracking-wider">
                      3-Column Room Configuration Applied
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Covers Left Side Benches, Middle Benches ({activeAllocation.threeColumnConfig.middlePattern || 'All Three Seats'}), and Right Side Benches for 3-column rooms.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white text-purple-700 border-purple-200 text-[10px] font-bold self-start sm:self-auto">
                  3 Column Layout Active
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Left */}
                {(() => {
                  const threeCol = activeAllocation.threeColumnConfig;
                  const getSeatBadge = (sId?: string) => {
                    if (!sId || sId === 'VACANT' || sId === 'NIL' || sId === 'EMPTY') {
                      return <span className="text-amber-600 font-semibold italic text-[10px]">Vacant</span>;
                    }
                    const sName = subjects.find((s) => s.id === sId)?.name || '—';
                    const col = getSubjectColor(sName, activeAllocation.subjectStats.map((s) => s.subjectName));
                    return (
                      <span
                        className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border"
                        style={{ backgroundColor: col.bgCss, color: col.textCss, borderColor: col.borderCss }}
                      >
                        {sName}
                      </span>
                    );
                  };

                  const leftA = threeCol?.left?.sideA || threeCol?.leftSubjectId;
                  const leftC = threeCol?.left?.center || 'VACANT';
                  const leftB = threeCol?.left?.sideB || threeCol?.leftSubjectId;

                  return (
                    <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-3xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1E2A5E] text-xs">Left Side Benches (Col 1)</span>
                        <Badge variant="outline" className="text-[9px] text-purple-700 border-purple-200">
                          3 Positions
                        </Badge>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap">
                        {getSeatBadge(leftA)} &bull; {getSeatBadge(leftC)} &bull; {getSeatBadge(leftB)}
                      </div>
                      <div className="text-[9px] text-slate-400">Side A &bull; Centre &bull; Side B</div>
                    </div>
                  );
                })()}

                {/* Middle */}
                {(() => {
                  const threeCol = activeAllocation.threeColumnConfig;
                  if (!threeCol) return null;
                  const patternLabel =
                    threeCol.middlePattern === 'centerOnly'
                      ? 'Centre Seat Only'
                      : threeCol.middlePattern === 'sideAAndSideB'
                        ? 'Side A & Side B Only'
                        : threeCol.middlePattern === 'custom'
                          ? 'Custom Seat Selection'
                          : 'All Three Seats';

                  const getSeatLabel = (pos: 'sideA' | 'center' | 'sideB') => {
                    const isSeatEnabled =
                      threeCol.middlePattern === 'allThree'
                        ? true
                        : threeCol.middlePattern === 'centerOnly'
                          ? pos === 'center'
                          : threeCol.middlePattern === 'sideAAndSideB'
                            ? pos === 'sideA' || pos === 'sideB'
                            : Boolean(threeCol.middleEnabledSeats?.[pos]);

                    if (!isSeatEnabled) return <span className="text-slate-400 italic text-[10px]">Disabled</span>;

                    const sId = threeCol.middleSeats?.[pos] || threeCol.middle?.[pos];
                    if (!sId || sId === 'VACANT' || sId === 'NIL' || sId === 'EMPTY') {
                      return <span className="text-amber-600 font-semibold italic text-[10px]">Vacant</span>;
                    }
                    const sName = subjects.find((s) => s.id === sId)?.name || '—';
                    const col = getSubjectColor(sName, activeAllocation.subjectStats.map((s) => s.subjectName));
                    return (
                      <span
                        className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border"
                        style={{ backgroundColor: col.bgCss, color: col.textCss, borderColor: col.borderCss }}
                      >
                        {sName}
                      </span>
                    );
                  };

                  return (
                    <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-3xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1E2A5E] text-xs">Middle Benches (Col 2)</span>
                        <Badge variant="outline" className="text-[9px] text-purple-700 border-purple-200">
                          {patternLabel}
                        </Badge>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap">
                        {getSeatLabel('sideA')} &bull; {getSeatLabel('center')} &bull; {getSeatLabel('sideB')}
                      </div>
                      <div className="text-[9px] text-slate-400">Side A &bull; Centre &bull; Side B</div>
                    </div>
                  );
                })()}

                {/* Right */}
                {(() => {
                  const threeCol = activeAllocation.threeColumnConfig;
                  const getSeatBadge = (sId?: string) => {
                    if (!sId || sId === 'VACANT' || sId === 'NIL' || sId === 'EMPTY') {
                      return <span className="text-amber-600 font-semibold italic text-[10px]">Vacant</span>;
                    }
                    const sName = subjects.find((s) => s.id === sId)?.name || '—';
                    const col = getSubjectColor(sName, activeAllocation.subjectStats.map((s) => s.subjectName));
                    return (
                      <span
                        className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border"
                        style={{ backgroundColor: col.bgCss, color: col.textCss, borderColor: col.borderCss }}
                      >
                        {sName}
                      </span>
                    );
                  };

                  const rightA = threeCol?.right?.sideA || threeCol?.rightSubjectId;
                  const rightC = threeCol?.right?.center || 'VACANT';
                  const rightB = threeCol?.right?.sideB || threeCol?.rightSubjectId;

                  return (
                    <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-3xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1E2A5E] text-xs">Right Side Benches (Col 3)</span>
                        <Badge variant="outline" className="text-[9px] text-purple-700 border-purple-200">
                          3 Positions
                        </Badge>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap">
                        {getSeatBadge(rightA)} &bull; {getSeatBadge(rightC)} &bull; {getSeatBadge(rightB)}
                      </div>
                      <div className="text-[9px] text-slate-400">Side A &bull; Centre &bull; Side B</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Global Action Bar with Student Portal Publishing */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-headline font-bold text-sm text-slate-900 dark:text-white">
                  {activeAllocation.name}
                </h3>
                {activeAllocation.isPublished ? (
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] font-bold gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Published to Student Portal
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] font-medium gap-1">
                    Not Published
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Date: {activeAllocation.examination.date} &bull; Time: {activeAllocation.examination.startTime} – {activeAllocation.examination.endTime}
                {activeAllocation.isPublished && activeAllocation.publishedAt && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-2">
                    &bull; Published {new Date(activeAllocation.publishedAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleTogglePublish}
                disabled={isPublishing}
                className={cn(
                  "h-9 text-xs font-bold px-4 gap-1.5 transition-all shadow-xs cursor-pointer",
                  activeAllocation.isPublished
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10"
                )}
                title={activeAllocation.isPublished ? "Unpublish from Student Portal" : "Publish to Student Portal"}
              >
                <Globe className="w-3.5 h-3.5" />
                {isPublishing
                  ? "Updating..."
                  : activeAllocation.isPublished
                  ? "Unpublish from Portal"
                  : "Publish to Student Portal"}
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setActiveAllocation(null);
                  setCurrentStep(1);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/dashboard/student-seating/seating-allocation');
                  }
                }}
                className="h-9 text-xs font-bold px-4 gap-2 bg-[#6342e8] hover:bg-[#5130d8] text-white shadow-md shadow-purple-900/20 ring-2 ring-purple-300/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Allocation
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadIndexPdf}
                disabled={isDownloadingPdf}
                className="h-9 text-xs font-bold px-3 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Student Index PDF
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadAllRoomsPdf}
                disabled={isDownloadingPdf}
                className="h-9 text-xs font-bold px-4 gap-1.5 bg-[#1E2A5E] hover:bg-[#151D42] text-white shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download All Room PDFs
              </Button>
            </div>
          </div>

          {/* Student Portal Publication Feedback Banner */}
          {activeAllocation.isPublished ? (
            <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-lg shrink-0 shadow-xs">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-headline font-bold text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                    <span>Live on Student Portal</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Finalized seating data for this exam is published. Students can view their Subject, Exam Date & Timing, Room Number, and Bench / Seat Position under &ldquo;My Examination&rdquo;.
                    {activeAllocation.publishedAt && (
                      <span className="font-semibold block sm:inline sm:ml-1">
                        &bull; Published on {new Date(activeAllocation.publishedAt).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleTogglePublish}
                disabled={isPublishing}
                className="text-xs font-bold h-8 px-3 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shrink-0"
              >
                Unpublish from Portal
              </Button>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-headline font-bold text-xs text-slate-800 dark:text-slate-200">
                    Seating Data Finalized &bull; Ready to Publish
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click &ldquo;Publish to Student Portal&rdquo; to sync this exam&apos;s seating details so students can check their room and bench / seat positions before the exam.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleTogglePublish}
                disabled={isPublishing}
                className="text-xs font-bold h-8 px-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                Publish to Student Portal
              </Button>
            </div>
          )}

          {/* Incomplete Allocation Alert & One-Click 100% Completion Action */}
          {activeAllocation.summary.unallocatedStudents > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-lg mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-sm text-amber-950 dark:text-amber-200">
                    Incomplete Seating Allocation ({activeAllocation.summary.unallocatedStudents} Student{activeAllocation.summary.unallocatedStudents > 1 ? 's' : ''} Unallocated)
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Some students were not seated in this plan. Click below to automatically complete 100% allocation across all eligible examination rooms.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleCompleteAllocationTo100}
                className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-2 shrink-0 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Complete 100% Allocation Now
              </Button>
            </div>
          )}

          {/* Subject-Wise Allocation Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-headline font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Subject-Wise Allocation
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-3 text-center">Total Students</th>
                  <th className="py-2.5 px-3 text-center">Allocated</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium text-slate-700 dark:text-slate-200">
                {activeAllocation.subjectStats.map((stat) => (
                  <tr key={stat.subjectId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {(() => {
                        const allSubjNames = activeAllocation.subjectStats.map((s) => s.subjectName);
                        const sc = getSubjectColor(stat.subjectName, allSubjNames);
                        return (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-3xs"
                            style={{ backgroundColor: sc.bgCss, color: sc.textCss, borderColor: sc.borderCss }}
                          >
                            {stat.subjectName}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-center">{stat.totalStudents}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-indigo-700 dark:text-indigo-400">{stat.allocatedCount}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          stat.status === 'Complete'
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px]"
                        }
                      >
                        {stat.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Room-Wise Allocation Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-headline font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Room-Wise Allocation ({activeAllocation.roomPlans.length} Rooms)
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Room No.</th>
                  <th className="py-2.5 px-3 text-center">Capacity</th>
                  <th className="py-2.5 px-3 text-center">Allocated</th>
                  <th className="py-2.5 px-3 text-center">Vacant</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium text-slate-700 dark:text-slate-200">
                {activeAllocation.roomPlans.map((plan) => (
                  <tr key={plan.roomId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-headline font-black text-xs text-slate-900 dark:text-white">
                      Room {plan.roomNo}
                    </td>
                    <td className="py-2.5 px-3 text-center">{plan.capacity}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400">{plan.allocatedCount}</td>
                    <td className="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500">{plan.vacantCount}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          plan.status === 'Full'
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px]"
                            : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px]"
                        }
                      >
                        {plan.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingRoomPlan(plan)}
                          className="h-7 text-[11px] font-bold px-2.5 gap-1 text-[#1E2A5E] dark:text-indigo-300 border-slate-200 dark:border-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          View Seating Plan
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadSingleRoomPdf(plan)}
                          disabled={isDownloadingPdf}
                          className="h-7 text-[11px] font-semibold px-2 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual Seating Plan Modal */}
          <Dialog
            open={Boolean(viewingRoomPlan)}
            onOpenChange={(open) => {
              if (!open) setViewingRoomPlan(null);
            }}
          >
            <DialogContent className="max-w-5xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-[92vh] overflow-y-auto p-6">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
                    Room No. {viewingRoomPlan?.roomNo} &bull; Visual Seating Plan
                  </DialogTitle>
                </div>
              </DialogHeader>

              {viewingRoomPlan && (
                <RoomSeatingDiagram
                  plan={viewingRoomPlan}
                  examName={activeAllocation.examination.examName}
                  examDate={activeAllocation.examination.date}
                  examTime={`${activeAllocation.examination.startTime} – ${activeAllocation.examination.endTime}`}
                  allSubjectNames={activeAllocation.subjectStats.map((s) => s.subjectName)}
                />
              )}

              <DialogFooter className="pt-2">
                {viewingRoomPlan && (
                  <Button
                    type="button"
                    onClick={() => handleDownloadSingleRoomPdf(viewingRoomPlan)}
                    disabled={isDownloadingPdf}
                    className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 mr-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download This Room PDF
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingRoomPlan(null)}
                  className="text-xs h-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <ApprovalRestrictionDialog
        open={isRestrictionDialogOpen}
        onOpenChange={setIsRestrictionDialogOpen}
        featureName="Student Seating Allocation & Diagrams"
      />
    </div>
  );
}

export default function SeatingAllocationWizardPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading seating allocation...</div>}>
      <SeatingAllocationWizardContent />
    </React.Suspense>
  );
}
