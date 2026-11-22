"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { SeatingAllocationRecord } from '@/lib/student-seating-types';
import { generateRoomSeatingPlanPdf, generateStudentSeatingIndexPdf } from '@/lib/student-seating-pdf-service';
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
} from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                Allocation Status
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Review, duplicate, view, and re-export past student seating allocations grouped by examination.
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Exam, Subject, or Class..."
              className="pl-9 h-9 text-xs bg-slate-50/70 border-slate-200 rounded-lg focus-visible:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 text-xs py-1 px-2.5 font-bold">
              {groupedAllocations.length} {groupedAllocations.length === 1 ? 'Exam' : 'Exams'} &bull; {allocations.length} {allocations.length === 1 ? 'Allocation' : 'Allocations'}
            </Badge>

            {groupedAllocations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllExams}
                className="h-9 text-xs font-bold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
                {areAllExpanded ? 'Collapse All' : 'Expand All'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allocations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
          <History className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">No Seating Allocations Yet</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2 shadow-xs">
          <Search className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">No Matching Allocations Found</div>
          <p className="text-xs text-slate-400">
            No allocations matched &ldquo;{searchQuery}&rdquo;. Try another search term.
          </p>
        </div>
      ) : (
        /* Grouped Exam Panels (Accordion / Panel View) */
        <div className="space-y-4">
          {groupedAllocations.map((group) => {
            const isOpen = isExamOpen(group.examTitle);

            // Compute summary metrics for this exam
            const totalExamStudents = group.allocations.reduce(
              (acc, a) => acc + (a.summary?.allocatedStudents || 0),
              0
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
                className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs transition-all"
              >
                {/* Collapsible Panel Card Header */}
                <div
                  onClick={() => toggleExam(group.examTitle)}
                  className="p-4 bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-200/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100/70 text-indigo-700 shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-headline font-bold text-sm text-slate-900 tracking-tight">
                          {group.examTitle}
                        </h2>
                        <Badge
                          variant="secondary"
                          className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-bold py-0.5 px-2"
                        >
                          {group.allocations.length}{' '}
                          {group.allocations.length === 1 ? 'Allocation' : 'Allocations'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400 inline" />
                        <span>
                          {uniqueDates.length > 0 ? uniqueDates.join(', ') : 'Date Not Specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="hidden md:flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-slate-600 font-semibold text-[11px]">
                        <Users className="w-3 h-3 text-indigo-600" />
                        {totalExamStudents} Students
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-slate-600 font-semibold text-[11px]">
                        <DoorOpen className="w-3 h-3 text-emerald-600" />
                        {allRoomIds.size} Rooms
                      </span>
                    </div>

                    <div
                      className={cn(
                        "p-1.5 rounded-md text-slate-500 hover:text-slate-900 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Expanded Panel Table */}
                {isOpen && (
                  <div className="overflow-x-auto animate-in fade-in-50 duration-150">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
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
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {group.allocations.map((alloc) => {
                          const subjectNames = alloc.subjectStats.map((s) => s.subjectName).join(', ');
                          const dateFormatted = alloc.examination?.date || '—';
                          const allocClass = getAllocationClass(alloc);

                          return (
                            <tr key={alloc.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* 1st Column: Subjects */}
                              <td className="py-3 px-4">
                                <div className="font-headline font-black text-xs text-slate-900">
                                  {subjectNames || 'General Subjects'}
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                  Pattern: {alloc.pattern ? alloc.pattern.replace(/_/g, ' ') : '3 PER BENCH'}
                                </div>
                              </td>

                              {/* 2nd Column: Date & Time */}
                              <td className="py-3 px-3 text-slate-600">
                                <div className="font-semibold text-slate-800">{dateFormatted}</div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {alloc.examination?.startTime || '09:00 AM'} –{' '}
                                  {alloc.examination?.endTime || '12:00 PM'}
                                </div>
                              </td>

                              {/* 3rd Column: Class */}
                              <td className="py-3 px-3">
                                <Badge
                                  variant="outline"
                                  className="bg-indigo-50/60 text-indigo-900 border-indigo-200/80 font-bold text-[11px] py-0.5 px-2 max-w-[160px] truncate"
                                  title={allocClass}
                                >
                                  {allocClass}
                                </Badge>
                              </td>

                              {/* 4th Column: Students */}
                              <td className="py-3 px-3 text-center font-headline font-black text-xs text-indigo-700">
                                {alloc.summary?.allocatedStudents ?? 0}
                              </td>

                              {/* 5th Column: Rooms */}
                              <td className="py-3 px-3 text-center font-bold text-slate-800">
                                {alloc.roomIds?.length ?? 0}
                              </td>

                              {/* 6th Column: Status */}
                              <td className="py-3 px-3 text-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    alloc.status === 'Finalized'
                                      ? "bg-purple-50 text-purple-700 border-purple-200 text-[10px]"
                                      : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                                  }
                                >
                                  {alloc.status || 'Draft'}
                                </Badge>
                              </td>

                              {/* 7th Column: Created On */}
                              <td className="py-3 px-3 text-center text-slate-400 text-[11px]">
                                {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : '—'}
                              </td>

                              {/* 8th Column: Actions */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleView(alloc)}
                                    className="h-7 text-[11px] font-bold px-2 gap-1 text-[#1E2A5E] hover:bg-indigo-50 border-slate-200"
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
                                    className="h-7 w-7 text-indigo-600 hover:bg-indigo-50"
                                    title="Download Room Seating Plan PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDownloadIndex(alloc)}
                                    disabled={isExporting}
                                    className="h-7 w-7 text-slate-600 hover:bg-slate-100"
                                    title="Download Student Seating Index PDF"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDuplicate(alloc.id)}
                                    className="h-7 w-7 text-slate-500 hover:bg-slate-100"
                                    title="Duplicate Allocation"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setAllocationToDelete(alloc)}
                                    className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
        <AlertDialogContent className="bg-white border border-slate-200">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <AlertDialogTitle className="font-headline text-lg font-bold text-slate-900">
                Delete Seating Allocation?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
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
