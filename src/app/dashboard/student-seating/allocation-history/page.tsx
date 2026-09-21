"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { SeatingAllocationRecord } from '@/lib/student-seating-types';
import { generateRoomSeatingPlanPdf, generateStudentSeatingIndexPdf } from '@/lib/student-seating-pdf-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  History,
  Eye,
  Download,
  Copy,
  Trash2,
  Calendar,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function AllocationHistoryPage() {
  const {
    allocations,
    deleteAllocation,
    duplicateAllocation,
    setActiveAllocation,
  } = useStudentSeating();

  const { signatory, pdfPaletteId } = useAllotment();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [allocationToDelete, setAllocationToDelete] = useState<SeatingAllocationRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Institution Name';

  const handleView = (alloc: SeatingAllocationRecord) => {
    setActiveAllocation(alloc);
    router.push('/dashboard/student-seating/seating-allocation');
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
                Allocation History
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Review, duplicate, view, and re-export past student seating allocations.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setActiveAllocation(null);
            router.push('/dashboard/student-seating/seating-allocation');
          }}
          className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
        >
          + Create New Allocation
        </Button>
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-headline font-bold text-sm text-slate-800">
            Saved Allocations ({allocations.length})
          </div>
          <span className="text-xs text-slate-400">
            Historical records are preserved with room and seat tracing.
          </span>
        </div>

        {allocations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No Seating Allocations Yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven&apos;t generated any student seating allocations. Use the Seating Allocation wizard to create your first plan.
            </p>
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/student-seating/seating-allocation')}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs"
            >
              Go to Seating Allocation
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Examination</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Subjects</th>
                  <th className="py-3 px-3 text-center">Students</th>
                  <th className="py-3 px-3 text-center">Rooms</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Created On</th>
                  <th className="py-3 px-4 text-center w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {allocations.map((alloc) => {
                  const subjectNames = alloc.subjectStats.map((s) => s.subjectName).join(', ');
                  const dateFormatted = alloc.examination.date || '—';

                  return (
                    <tr key={alloc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-headline font-black text-xs text-slate-900">
                          {alloc.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Pattern: {alloc.pattern.replace('_', ' ')}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <div className="font-semibold">{dateFormatted}</div>
                        <div className="text-[10px] text-slate-400">
                          {alloc.examination.startTime} – {alloc.examination.endTime}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="truncate max-w-[140px] block font-semibold text-slate-700" title={subjectNames}>
                          {subjectNames}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-headline font-black text-xs text-indigo-700">
                        {alloc.summary.allocatedStudents}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {alloc.roomIds.length}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            alloc.status === 'Finalized'
                              ? "bg-purple-50 text-purple-700 border-purple-200 text-[10px]"
                              : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                          }
                        >
                          {alloc.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 text-center text-slate-400 text-[11px]">
                        {new Date(alloc.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(alloc)}
                            className="h-7 text-[11px] font-bold px-2 gap-1 text-[#1E2A5E]"
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
    </div>
  );
}
