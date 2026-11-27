"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { SeatingAllocationRecord } from '@/lib/student-seating-types';
import { generateRoomSeatingPlanPdf, generateStudentSeatingIndexPdf } from '@/lib/student-seating-pdf-service';
import { completeAllocationTo100Percent } from '@/lib/student-seating-engine';
import { ApprovalRestrictionDialog } from '@/components/dashboard/approval-restriction-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  History,
  Eye,
  Download,
  Copy,
  Trash2,
  Calendar,
  FileText,
  AlertCircle,
  Plus,
  ChevronDown,
  Search,
  BookOpen,
  DoorOpen,
  Users,
  GraduationCap,
  Layers,
  CheckCircle2,
  ChevronsUpDown,
  Sparkles,
} from 'lucide-react';

interface ExamColorTheme {
  id: string;
  name: string;
  panelBorder: string;
  headerBg: string;
  accentBar: string;
  badgeClass: string;
  badgeDot: string;
  titleClass: string;
  roomSectionBg: string;
  roomSectionBorder: string;
  roomSectionTitle: string;
  roomPillClass: string;
  roomCapacityText: string;
  statPillClass: string;
  iconBg: string;
  iconColor: string;
}

const EXAM_COLOR_THEMES: ExamColorTheme[] = [
  // 1. Royal Indigo
  {
    id: 'indigo',
    name: 'Royal Indigo',
    panelBorder: 'border-indigo-200/90 dark:border-indigo-800/80',
    headerBg: 'bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-white/70 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-slate-900',
    accentBar: 'bg-indigo-600 dark:bg-indigo-500',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-900/70 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 font-extrabold',
    badgeDot: 'bg-indigo-600',
    titleClass: 'text-indigo-950 dark:text-indigo-100',
    roomSectionBg: 'bg-indigo-50/40 dark:bg-indigo-950/20',
    roomSectionBorder: 'border-indigo-100 dark:border-indigo-900/40',
    roomSectionTitle: 'text-indigo-950 dark:text-indigo-200',
    roomPillClass: 'bg-white dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-200 border-indigo-200/90 dark:border-indigo-800 shadow-2xs hover:border-indigo-400',
    roomCapacityText: 'text-indigo-700 dark:text-indigo-300',
    statPillClass: 'bg-white/90 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
    iconBg: 'bg-indigo-100/90 dark:bg-indigo-900/60',
    iconColor: 'text-indigo-700 dark:text-indigo-300',
  },
  // 2. Mint Emerald
  {
    id: 'emerald',
    name: 'Mint Emerald',
    panelBorder: 'border-emerald-200/90 dark:border-emerald-800/80',
    headerBg: 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white/70 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900',
    accentBar: 'bg-emerald-600 dark:bg-emerald-500',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-extrabold',
    badgeDot: 'bg-emerald-600',
    titleClass: 'text-emerald-950 dark:text-emerald-100',
    roomSectionBg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    roomSectionBorder: 'border-emerald-100 dark:border-emerald-900/40',
    roomSectionTitle: 'text-emerald-950 dark:text-emerald-200',
    roomPillClass: 'bg-white dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-emerald-200/90 dark:border-emerald-800 shadow-2xs hover:border-emerald-400',
    roomCapacityText: 'text-emerald-700 dark:text-emerald-300',
    statPillClass: 'bg-white/90 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100/90 dark:bg-emerald-900/60',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
  },
  // 3. Warm Amber
  {
    id: 'amber',
    name: 'Warm Amber',
    panelBorder: 'border-amber-200/90 dark:border-amber-800/80',
    headerBg: 'bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white/70 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900',
    accentBar: 'bg-amber-600 dark:bg-amber-500',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/70 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-extrabold',
    badgeDot: 'bg-amber-600',
    titleClass: 'text-amber-950 dark:text-amber-100',
    roomSectionBg: 'bg-amber-50/40 dark:bg-amber-950/20',
    roomSectionBorder: 'border-amber-100 dark:border-amber-900/40',
    roomSectionTitle: 'text-amber-950 dark:text-amber-200',
    roomPillClass: 'bg-white dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-amber-200/90 dark:border-amber-800 shadow-2xs hover:border-amber-400',
    roomCapacityText: 'text-amber-700 dark:text-amber-300',
    statPillClass: 'bg-white/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100/90 dark:bg-amber-900/60',
    iconColor: 'text-amber-700 dark:text-amber-300',
  },
  // 4. Regal Purple
  {
    id: 'purple',
    name: 'Regal Purple',
    panelBorder: 'border-purple-200/90 dark:border-purple-800/80',
    headerBg: 'bg-gradient-to-r from-purple-50/90 via-violet-50/50 to-white/70 dark:from-purple-950/40 dark:via-violet-950/30 dark:to-slate-900',
    accentBar: 'bg-purple-600 dark:bg-purple-500',
    badgeClass: 'bg-purple-100 dark:bg-purple-900/70 text-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-extrabold',
    badgeDot: 'bg-purple-600',
    titleClass: 'text-purple-950 dark:text-purple-100',
    roomSectionBg: 'bg-purple-50/40 dark:bg-purple-950/20',
    roomSectionBorder: 'border-purple-100 dark:border-purple-900/40',
    roomSectionTitle: 'text-purple-950 dark:text-purple-200',
    roomPillClass: 'bg-white dark:bg-purple-950/80 text-purple-950 dark:text-purple-200 border-purple-200/90 dark:border-purple-800 shadow-2xs hover:border-purple-400',
    roomCapacityText: 'text-purple-700 dark:text-purple-300',
    statPillClass: 'bg-white/90 dark:bg-purple-950/70 text-purple-950 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100/90 dark:bg-purple-900/60',
    iconColor: 'text-purple-700 dark:text-purple-300',
  },
  // 5. Ruby Rose
  {
    id: 'rose',
    name: 'Ruby Rose',
    panelBorder: 'border-rose-200/90 dark:border-rose-800/80',
    headerBg: 'bg-gradient-to-r from-rose-50/90 via-pink-50/50 to-white/70 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-slate-900',
    accentBar: 'bg-rose-600 dark:bg-rose-500',
    badgeClass: 'bg-rose-100 dark:bg-rose-900/70 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-700 font-extrabold',
    badgeDot: 'bg-rose-600',
    titleClass: 'text-rose-950 dark:text-rose-100',
    roomSectionBg: 'bg-rose-50/40 dark:bg-rose-950/20',
    roomSectionBorder: 'border-rose-100 dark:border-rose-900/40',
    roomSectionTitle: 'text-rose-950 dark:text-rose-200',
    roomPillClass: 'bg-white dark:bg-rose-950/80 text-rose-950 dark:text-rose-200 border-rose-200/90 dark:border-rose-800 shadow-2xs hover:border-rose-400',
    roomCapacityText: 'text-rose-700 dark:text-rose-300',
    statPillClass: 'bg-white/90 dark:bg-rose-950/70 text-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-800',
    iconBg: 'bg-rose-100/90 dark:bg-rose-900/60',
    iconColor: 'text-rose-700 dark:text-rose-300',
  },
  // 6. Deep Teal
  {
    id: 'teal',
    name: 'Deep Teal',
    panelBorder: 'border-teal-200/90 dark:border-teal-800/80',
    headerBg: 'bg-gradient-to-r from-teal-50/90 via-cyan-50/50 to-white/70 dark:from-teal-950/40 dark:via-cyan-950/30 dark:to-slate-900',
    accentBar: 'bg-teal-600 dark:bg-teal-500',
    badgeClass: 'bg-teal-100 dark:bg-teal-900/70 text-teal-950 dark:text-teal-200 border-teal-300 dark:border-teal-700 font-extrabold',
    badgeDot: 'bg-teal-600',
    titleClass: 'text-teal-950 dark:text-teal-100',
    roomSectionBg: 'bg-teal-50/40 dark:bg-teal-950/20',
    roomSectionBorder: 'border-teal-100 dark:border-teal-900/40',
    roomSectionTitle: 'text-teal-950 dark:text-teal-200',
    roomPillClass: 'bg-white dark:bg-teal-950/80 text-teal-950 dark:text-teal-200 border-teal-200/90 dark:border-teal-800 shadow-2xs hover:border-teal-400',
    roomCapacityText: 'text-teal-700 dark:text-teal-300',
    statPillClass: 'bg-white/90 dark:bg-teal-950/70 text-teal-950 dark:text-teal-200 border-teal-200 dark:border-teal-800',
    iconBg: 'bg-teal-100/90 dark:bg-teal-900/60',
    iconColor: 'text-teal-700 dark:text-teal-300',
  },
];

function getExamColorTheme(index: number, title?: string): ExamColorTheme {
  if (typeof index === 'number' && index >= 0) {
    return EXAM_COLOR_THEMES[index % EXAM_COLOR_THEMES.length];
  }
  let hash = 0;
  for (let i = 0; i < (title || '').length; i++) {
    hash = (hash << 5) - hash + (title || '').charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % EXAM_COLOR_THEMES.length;
  return EXAM_COLOR_THEMES[idx];
}

/**
 * Extracts class/grade info from allocation metadata or allocated student records
 */
function getAllocationClass(alloc: SeatingAllocationRecord): string {
  // 1. Direct examination course/class if present
  const directClass =
    (alloc as any).className ||
    (alloc.examination as any)?.className ||
    (alloc.examination as any)?.course;
  if (directClass && typeof directClass === 'string' && directClass.trim()) {
    return directClass.trim();
  }

  // 2. Extract unique sections from room plans
  const sections = new Set<string>();
  if (alloc.roomPlans && Array.isArray(alloc.roomPlans)) {
    for (const plan of alloc.roomPlans) {
      for (const bench of plan.benches || []) {
        for (const seat of bench.seats || []) {
          const s = seat.student?.section?.trim();
          if (s) {
            sections.add(s);
          }
        }
      }
    }
  }

  if (sections.size > 0) {
    return Array.from(sections).sort().join(', ');
  }

  return 'All Classes';
}

export default function AllocationHistoryPage() {
  const {
    allocations,
    deleteAllocation,
    duplicateAllocation,
    setActiveAllocation,
    rooms: masterRooms,
    subjects,
    studentsBySubject,
    saveAllocation,
  } = useStudentSeating();

  const { signatory, pdfPaletteId } = useAllotment();
  const { profile, user, isApproved } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [allocationToDelete, setAllocationToDelete] = useState<SeatingAllocationRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestrictionDialogOpen, setIsRestrictionDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({});

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Institution Name';

  // Group allocations strictly by Examination Title
  const groupedAllocations = useMemo(() => {
    const groupsMap: Record<
      string,
      {
        examTitle: string;
        examId?: string;
        allocations: SeatingAllocationRecord[];
      }
    > = {};

    for (const alloc of allocations) {
      const title =
        alloc.examination?.examName?.trim() ||
        alloc.name?.replace(/\s*-\s*Seating Plan$/i, '').trim() ||
        'General Examination';

      if (!groupsMap[title]) {
        groupsMap[title] = {
          examTitle: title,
          examId: alloc.examination?.examId,
          allocations: [],
        };
      }
      groupsMap[title].allocations.push(alloc);
    }

    // Sort allocations within each exam by date / createdAt descending
    const groups = Object.values(groupsMap);
    groups.forEach((g) => {
      g.allocations.sort((a, b) => {
        const timeA = new Date(a.examination?.date || a.createdAt).getTime();
        const timeB = new Date(b.examination?.date || b.createdAt).getTime();
        return timeB - timeA;
      });
    });

    // Optional filter by search query (matching Exam Title, Subjects, or Class)
    if (!searchQuery.trim()) {
      return groups;
    }

    const q = searchQuery.toLowerCase().trim();
    return groups
      .map((g) => {
        const titleMatch = g.examTitle.toLowerCase().includes(q);
        if (titleMatch) return g;

        const filteredAllocs = g.allocations.filter((alloc) => {
          const subjectsStr = alloc.subjectStats.map((s) => s.subjectName).join(' ').toLowerCase();
          const classStr = getAllocationClass(alloc).toLowerCase();
          const dateStr = (alloc.examination?.date || '').toLowerCase();
          return subjectsStr.includes(q) || classStr.includes(q) || dateStr.includes(q);
        });

        return {
          ...g,
          allocations: filteredAllocs,
        };
      })
      .filter((g) => g.allocations.length > 0);
  }, [allocations, searchQuery]);

  const toggleExam = (examTitle: string) => {
    setExpandedExams((prev) => ({
      ...prev,
      [examTitle]: prev[examTitle] === false ? true : false,
    }));
  };

  const isExamOpen = (examTitle: string) => {
    return expandedExams[examTitle] !== false; // defaults to expanded
  };

  const areAllExpanded = useMemo(() => {
    if (groupedAllocations.length === 0) return true;
    return groupedAllocations.every((g) => isExamOpen(g.examTitle));
  }, [groupedAllocations, expandedExams]);

  const toggleAllExams = () => {
    if (areAllExpanded) {
      const next: Record<string, boolean> = {};
      groupedAllocations.forEach((g) => {
        next[g.examTitle] = false;
      });
      setExpandedExams(next);
    } else {
      setExpandedExams({});
    }
  };

  const handleView = (alloc: SeatingAllocationRecord) => {
    setActiveAllocation(alloc);
    router.push('/dashboard/student-seating/seating-allocation?view=history');
  };

  const handleDuplicate = (id: string) => {
    const duplicated = duplicateAllocation(id);
    if (duplicated) {
      toast({
        title: "Allocation Duplicated",
        description: `Created copy: "${duplicated.name}".`,
      });
    }
  };

  const confirmDelete = () => {
    if (!allocationToDelete) return;
    deleteAllocation(allocationToDelete.id);
    toast({
      title: "Allocation Deleted",
      description: `Seating allocation "${allocationToDelete.name}" has been deleted.`,
    });
    setAllocationToDelete(null);
  };

  const handleAutoRepair = (alloc: SeatingAllocationRecord) => {
    try {
      const repaired = completeAllocationTo100Percent(
        alloc,
        masterRooms,
        subjects,
        studentsBySubject
      );
      saveAllocation(repaired);
      toast({
        title: "100% Allocation Guaranteed",
        description: `Successfully allocated all ${repaired.summary.allocatedStudents} students across ${repaired.summary.totalRooms} rooms.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Re-allocation Error",
        description: err.message || "Failed to auto-complete allocation.",
      });
    }
  };

  const handleDownloadPdf = async (alloc: SeatingAllocationRecord) => {
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    setIsExporting(true);
    try {
      await generateRoomSeatingPlanPdf({
        allocation: alloc,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "PDF Downloaded",
        description: "Room seating plans downloaded successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to download PDF.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadIndex = async (alloc: SeatingAllocationRecord) => {
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    setIsExporting(true);
    try {
      await generateStudentSeatingIndexPdf({
        allocation: alloc,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "Index Downloaded",
        description: "Student Seating Index PDF downloaded successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to download student index.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-lg">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                Allocation Summary
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Review allocated rooms, student strengths, and export seating allocations grouped by examination.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setActiveAllocation(null);
            router.push('/dashboard/student-seating/seating-allocation');
          }}
          className="bg-[#6342e8] hover:bg-[#5130d8] text-white font-bold text-xs h-9 px-4 gap-2 shadow-md shadow-purple-900/20 ring-2 ring-purple-300/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Allocation
        </Button>
      </div>

      {/* Global Toolbar: Search & Expand/Collapse Toggle */}
      {allocations.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Exam, Subject, or Class..."
              className="pl-9 h-9 text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus-visible:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <Badge variant="outline" className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs py-1 px-2.5 font-bold">
              {groupedAllocations.length} {groupedAllocations.length === 1 ? 'Exam' : 'Exams'} &bull; {allocations.length} {allocations.length === 1 ? 'Allocation' : 'Allocations'}
            </Badge>

            {groupedAllocations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllExams}
                className="h-9 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                {areAllExpanded ? 'Collapse All' : 'Expand All'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allocations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-12 text-center space-y-3 shadow-xs">
          <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">No Seating Allocations Yet</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You haven&apos;t generated any student seating allocations. Use the Seating Allocation wizard to create your first plan.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setActiveAllocation(null);
              router.push('/dashboard/student-seating/seating-allocation');
            }}
            className="mt-2 bg-[#6342e8] hover:bg-[#5130d8] text-white font-bold text-xs h-9 px-4 gap-2 shadow-md shadow-purple-900/20 ring-2 ring-purple-300/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Go to Seating Allocation
          </Button>
        </div>
      ) : groupedAllocations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-8 text-center space-y-2 shadow-xs">
          <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">No Matching Allocations Found</div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No allocations matched &ldquo;{searchQuery}&rdquo;. Try another search term.
          </p>
        </div>
      ) : (
        /* Grouped Exam Panels (Accordion / Panel View) */
        <div className="space-y-4">
          {groupedAllocations.map((group, examIndex) => {
            const isOpen = isExamOpen(group.examTitle);
            const theme = getExamColorTheme(examIndex, group.examTitle);

            // Compute summary metrics for this exam
            const totalExamStudents = group.allocations.reduce(
              (acc, a) => acc + (a.summary?.allocatedStudents || 0),
              0
            );

            // Aggregate unique examination rooms for this exam
            const examRoomsMap = new Map<string, { roomNo: string; capacity: number; totalAllocated: number }>();
            group.allocations.forEach((a) => {
              (a.roomPlans || []).forEach((rp) => {
                const key = String(rp.roomNo || rp.roomId).trim();
                const existing = examRoomsMap.get(key);
                if (!existing) {
                  examRoomsMap.set(key, {
                    roomNo: String(rp.roomNo || key),
                    capacity: rp.capacity || 0,
                    totalAllocated: rp.allocatedCount || 0,
                  });
                } else {
                  existing.totalAllocated = Math.max(existing.totalAllocated, rp.allocatedCount || 0);
                  existing.capacity = Math.max(existing.capacity, rp.capacity || 0);
                }
              });
            });
            const sortedExamRooms = Array.from(examRoomsMap.values()).sort((a, b) =>
              a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true, sensitivity: 'base' })
            );

            const allRoomIds = new Set<string>();
            group.allocations.forEach((a) => {
              (a.roomIds || []).forEach((r) => allRoomIds.add(r));
            });

            const uniqueDates = Array.from(
              new Set(group.allocations.map((a) => a.examination?.date).filter(Boolean))
            ) as string[];

            return (
              <div
                key={group.examTitle}
                className={cn("bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-xs transition-all relative", theme.panelBorder)}
              >
                {/* Accent Color Indicator Bar on Top */}
                <div className={cn("h-1.5 w-full", theme.accentBar)} />

                {/* Collapsible Panel Card Header */}
                <div
                  onClick={() => toggleExam(group.examTitle)}
                  className={cn("p-4 border-b cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none transition-colors", theme.headerBg, theme.roomSectionBorder)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0", theme.iconBg, theme.iconColor)}>
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shadow-3xs", theme.badgeClass)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", theme.badgeDot)} />
                          Exam {examIndex + 1}
                        </span>
                        <h2 className={cn("font-headline font-bold text-sm tracking-tight", theme.titleClass)}>
                          {group.examTitle}
                        </h2>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] font-bold py-0.5 px-2 border", theme.statPillClass)}
                        >
                          {group.allocations.length}{' '}
                          {group.allocations.length === 1 ? 'Allocation' : 'Allocations'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500 inline" />
                        <span>
                          {uniqueDates.length > 0 ? uniqueDates.join(', ') : 'Date Not Specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="hidden md:flex items-center gap-2 text-xs">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold text-[11px]", theme.statPillClass)}>
                        <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        {totalExamStudents} Students
                      </span>
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold text-[11px]", theme.statPillClass)}>
                        <DoorOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {sortedExamRooms.length > 0 ? sortedExamRooms.length : allRoomIds.size} Rooms
                      </span>
                    </div>

                    <div
                      className={cn(
                        "p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Allocated Rooms Showcase Bar */}
                {sortedExamRooms.length > 0 && (
                  <div className={cn("px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2", theme.roomSectionBg, theme.roomSectionBorder)}>
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1 rounded-md", theme.iconBg, theme.iconColor)}>
                        <DoorOpen className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn("text-xs font-bold uppercase tracking-wider", theme.roomSectionTitle)}>
                        Allocated Rooms ({sortedExamRooms.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sortedExamRooms.map((rm) => (
                        <span
                          key={rm.roomNo}
                          className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition-colors", theme.roomPillClass)}
                        >
                          <span className="font-headline font-black">Room {rm.roomNo}</span>
                          <span className={cn("text-[11px] font-semibold", theme.roomCapacityText)}>({rm.capacity} Seats)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded Panel Table */}
                {isOpen && (
                  <div className="overflow-x-auto animate-in fade-in-50 duration-150">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                          {/* Column 1: Subjects (Replaced Examination) */}
                          <th className="py-3 px-4 min-w-[200px]">Subjects</th>
                          {/* Column 2: Date & Time */}
                          <th className="py-3 px-3 min-w-[130px]">Date & Time</th>
                          {/* Column 3: Class (Replaced Subjects) */}
                          <th className="py-3 px-3 min-w-[110px]">Class</th>
                          {/* Column 4: Students */}
                          <th className="py-3 px-3 text-center">Students</th>
                          {/* Column 5: Rooms */}
                          <th className="py-3 px-3 text-center">Rooms</th>
                          {/* Column 6: Status */}
                          <th className="py-3 px-3 text-center">Status</th>
                          {/* Column 7: Created On */}
                          <th className="py-3 px-3 text-center">Created On</th>
                          {/* Column 8: Actions */}
                          <th className="py-3 px-4 text-center w-44">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium text-slate-700 dark:text-slate-200">
                        {group.allocations.map((alloc) => {
                          const subjectNames = alloc.subjectStats.map((s) => s.subjectName).join(', ');
                          const dateFormatted = alloc.examination?.date || '—';
                          const allocClass = getAllocationClass(alloc);

                          return (
                            <tr key={alloc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              {/* 1st Column: Subjects */}
                              <td className="py-3 px-4">
                                <div className="font-headline font-black text-xs text-slate-900 dark:text-white">
                                  {subjectNames || 'General Subjects'}
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                  Pattern: {alloc.pattern ? alloc.pattern.replace(/_/g, ' ') : '3 PER BENCH'}
                                </div>
                              </td>

                              {/* 2nd Column: Date & Time */}
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{dateFormatted}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                  {alloc.examination?.startTime || '09:00 AM'} –{' '}
                                  {alloc.examination?.endTime || '12:00 PM'}
                                </div>
                              </td>

                              {/* 3rd Column: Class */}
                              <td className="py-3 px-3">
                                <Badge
                                  variant="outline"
                                  className="bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border-indigo-200/80 dark:border-indigo-800/80 font-bold text-[11px] py-0.5 px-2 max-w-[160px] truncate"
                                  title={allocClass}
                                >
                                  {allocClass}
                                </Badge>
                              </td>

                              {/* 4th Column: Students */}
                              <td className="py-3 px-3 text-center font-headline font-black text-xs text-indigo-700 dark:text-indigo-400">
                                {alloc.summary?.allocatedStudents ?? 0}
                              </td>

                              {/* 5th Column: Rooms */}
                              <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                                {alloc.roomIds?.length ?? 0}
                              </td>

                              {/* 6th Column: Status */}
                              <td className="py-3 px-3 text-center">
                                {alloc.summary?.unallocatedStudents > 0 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px] font-bold"
                                    >
                                      Partial ({alloc.summary.unallocatedStudents} unallocated)
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAutoRepair(alloc)}
                                      className="h-5 text-[10px] font-bold px-1.5 bg-amber-500 hover:bg-amber-600 text-white border-none gap-1 shadow-3xs cursor-pointer"
                                      title="Auto-complete 100% allocation across all eligible rooms"
                                    >
                                      <Sparkles className="w-2.5 h-2.5" />
                                      Fix (100%)
                                    </Button>
                                  </div>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className={
                                      alloc.status === 'Finalized'
                                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px]"
                                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]"
                                    }
                                  >
                                    {alloc.status === 'Draft' ? 'Complete (Draft)' : (alloc.status || 'Complete')}
                                  </Badge>
                                )}
                              </td>

                              {/* 7th Column: Created On */}
                              <td className="py-3 px-3 text-center text-slate-400 dark:text-slate-500 text-[11px]">
                                {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : '—'}
                              </td>

                              {/* 8th Column: Actions */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleView(alloc)}
                                    className="h-7 text-[11px] font-bold px-2 gap-1 text-[#1E2A5E] dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border-slate-200 dark:border-slate-700"
                                    title="View Seating Allocation"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDownloadPdf(alloc)}
                                    disabled={isExporting}
                                    className="h-7 w-7 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                    title="Download Room Seating Plan PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDownloadIndex(alloc)}
                                    disabled={isExporting}
                                    className="h-7 w-7 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    title="Download Student Seating Index PDF"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDuplicate(alloc.id)}
                                    className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    title="Duplicate Allocation"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setAllocationToDelete(alloc)}
                                    className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    title="Delete Allocation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={Boolean(allocationToDelete)}
        onOpenChange={(open) => {
          if (!open) setAllocationToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <AlertDialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
                Delete Seating Allocation?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete &ldquo;{allocationToDelete?.name}&rdquo;? This will remove all generated room diagrams and seating index records for this allocation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApprovalRestrictionDialog
        open={isRestrictionDialogOpen}
        onOpenChange={setIsRestrictionDialogOpen}
        featureName="Saved Student Seating Allocation PDF"
      />
    </div>
  );
}
