"use client";

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAllotment } from '@/lib/allotment-context';
import { useToast } from '@/hooks/use-toast';
import { RoomMasterDialog } from '@/components/dashboard/room-allocations/room-master-dialog';
import { SessionRoomSelector } from '@/components/dashboard/room-allocations/session-room-selector';
import { RoomAllocationView } from '@/components/dashboard/room-allocations/room-allocation-view';
import { MasterAllocationsDialog } from '@/components/dashboard/room-allocations/master-allocations-dialog';
import {
  generateRoomAllocationPdf,
  generateRelieverDutySlipsPdf,
  generateMasterRoomAllocationsPdf,
} from '@/lib/room-pdf-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DoorOpen,
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Lock,
  Unlock,
  ChevronRight,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { formatAppDate } from '@/lib/date-utils';
import { Examination } from '@/lib/types';

export default function RoomAllocationsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const {
    activeAllotment,
    savedAllotments,
    setActiveAllotment,
    updateSavedAllotment,
    masterRooms,
    signatory,
    pdfPaletteId,
    clearAllSessionAllocations,
  } = useAllotment();

  const [isMasterRoomsOpen, setIsMasterRoomsOpen] = useState(false);
  const [isMasterAllocationsOpen, setIsMasterAllocationsOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const allocationSectionRef = useRef<HTMLDivElement>(null);

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Institution Name';

  // Check if all sessions with allocations are currently locked
  const isAllLocked = useMemo(() => {
    if (!activeAllotment?.examinations?.length) return false;
    const allocs = activeAllotment.roomAllocations || {};
    const allocatedSessions = activeAllotment.examinations.filter(
      (e) => allocs[e.id]?.status === 'Generated' || allocs[e.id]?.status === 'Locked'
    );
    return (
      allocatedSessions.length > 0 &&
      allocatedSessions.every((e) => allocs[e.id]?.status === 'Locked')
    );
  }, [activeAllotment]);

  // Sorted examinations from active Master Allotment
  const sortedExaminations = useMemo(() => {
    if (!activeAllotment?.examinations) return [];
    return [...activeAllotment.examinations].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [activeAllotment?.examinations]);

  // Selected examination
  const activeExam = useMemo(() => {
    if (!sortedExaminations.length) return null;
    if (selectedExamId) {
      const found = sortedExaminations.find(e => e.id === selectedExamId);
      if (found) return found;
    }
    return sortedExaminations[0];
  }, [sortedExaminations, selectedExamId]);

  const handleGenerateRoomAllocationPdf = async () => {
    if (!activeExam || !activeAllotment) return;
    const alloc = activeAllotment.roomAllocations?.[activeExam.id];
    if (!alloc || alloc.status === 'Pending') {
      toast({
        variant: "destructive",
        title: "Allocation Pending",
        description: "Please generate room allocation before downloading PDF.",
      });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateRoomAllocationPdf({
        examination: activeExam,
        allocation: alloc,
        institutionName,
        examName: activeExam.examName || activeAllotment.name || 'Examination',
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "PDF Downloaded",
        description: "Examination Duty Room Allocation PDF generated successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to generate Room Allocation PDF.",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleGenerateRelieverSlipsPdf = async () => {
    if (!activeExam || !activeAllotment) return;
    const alloc = activeAllotment.roomAllocations?.[activeExam.id];
    if (!alloc || alloc.status === 'Pending') {
      toast({
        variant: "destructive",
        title: "Allocation Pending",
        description: "Please generate room allocation before downloading Reliever duty slips.",
      });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateRelieverDutySlipsPdf({
        examination: activeExam,
        allocation: alloc,
        institutionName,
        examName: activeExam.examName || activeAllotment.name || 'Examination',
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "PDF Downloaded",
        description: "Reliever's Duty Slips PDF (2 slips per page) generated successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to generate Reliever Duty Slips PDF.",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadMasterRoomAllocationsPdf = async () => {
    if (!activeAllotment || !sortedExaminations.length) {
      toast({
        variant: "destructive",
        title: "No Allotment Selected",
        description: "Please select a Master Allotment first.",
      });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateMasterRoomAllocationsPdf({
        examinations: sortedExaminations,
        allotment: activeAllotment,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "Master PDF Downloaded",
        description: `Successfully downloaded master room allocations for ${sortedExaminations.length} session(s).`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to generate Master Room Allocations PDF.",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleToggleLockAll = () => {
    if (!activeAllotment) return;
    const currentAllocations = activeAllotment.roomAllocations || {};
    const updatedAllocations = { ...currentAllocations };

    const targetStatus = isAllLocked ? 'Generated' : 'Locked';
    let count = 0;

    activeAllotment.examinations.forEach((exam) => {
      const existing = updatedAllocations[exam.id];
      if (existing) {
        updatedAllocations[exam.id] = {
          ...existing,
          status: targetStatus,
          lockedAt: targetStatus === 'Locked' ? new Date().toISOString() : undefined,
        };
        count++;
      }
    });

    if (count === 0) {
      toast({
        variant: "destructive",
        title: "No Allocations to Lock",
        description: "Please generate room allocations for at least one examination session first.",
      });
      return;
    }

    updateSavedAllotment(activeAllotment.id, {
      roomAllocations: updatedAllocations,
    });

    toast({
      title: targetStatus === 'Locked' ? "All Allocations Locked" : "All Allocations Unlocked",
      description: `${targetStatus === 'Locked' ? 'Locked' : 'Unlocked'} room allocations across ${count} session(s).`,
    });
  };

  const hasAnyRoomAllocations = useMemo(() => {
    if (!activeAllotment?.roomAllocations) return false;
    const allocs = activeAllotment.roomAllocations;
    return Object.values(allocs).some(
      (a) =>
        (a?.selectedRooms && a.selectedRooms.length > 0) ||
        (a?.invigilatorDuties && a.invigilatorDuties.length > 0) ||
        a?.status === 'Generated' ||
        a?.status === 'Locked'
    );
  }, [activeAllotment?.roomAllocations]);

  const handleClearAllAllocations = () => {
    if (!activeAllotment) return;
    clearAllSessionAllocations(activeAllotment.id);
    setIsClearAllConfirmOpen(false);
    toast({
      title: "All Room Allocations Cleared",
      description: `All room selections and duty allocations have been reset for "${activeAllotment.name}". You can start fresh.`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                Room Allocations
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsMasterRoomsOpen(true)}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-2 shadow-xs"
          >
            <DoorOpen className="w-4 h-4" />
            Master Rooms ({masterRooms.length})
          </Button>
        </div>
      </div>

      {/* Dependency Check: If no active allotment is loaded */}
      {!activeAllotment || sortedExaminations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl mx-auto text-center space-y-4 shadow-xs">
          <div className="h-14 w-14 bg-indigo-50 text-[#1E2A5E] rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-headline text-xl font-bold text-slate-800">
              No Active Master Allotment Loaded
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Room Allocations operates on examination dates, subjects, timings, and staff requirements from your Master Allotment.
            </p>
          </div>

          {/* Quick Picker for Saved Allotments */}
          {savedAllotments.length > 0 ? (
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Select a Saved Allotment to Begin
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedAllotments.map((sa) => (
                  <div
                    key={sa.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all text-left"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">{sa.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {sa.examinations?.length || 0} Sessions &bull; {sa.invigilators?.length || 0} Staff
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveAllotment(sa);
                        if (sa.examinations?.[0]) {
                          setSelectedExamId(sa.examinations[0].id);
                        }
                      }}
                      className="h-7 text-xs bg-[#1E2A5E] hover:bg-[#151D42] text-white px-3 font-semibold"
                    >
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-3">
              <Link href="/dashboard/examinations">
                <Button className="bg-[#1E2A5E] hover:bg-[#151D42] text-white text-xs font-bold px-5 h-9 gap-1.5">
                  Generate Master Allotment
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* Main Active Allotment Workspace */
        <div className="space-y-5">
          {/* Active Master Allotment Selector Sub-bar & Global Actions */}
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xs">
            {/* 1. Select Master Allotment Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <label htmlFor="master-allotment-select" className="font-bold text-xs text-[#1E2A5E] shrink-0">
                Select Master Allotment:
              </label>
              <Select
                value={activeAllotment?.id || ""}
                onValueChange={(allotmentId) => {
                  const found = savedAllotments.find((a) => a.id === allotmentId);
                  if (found) {
                    setActiveAllotment(found);
                    if (found.examinations?.[0]) {
                      setSelectedExamId(found.examinations[0].id);
                    }
                  }
                }}
              >
                <SelectTrigger
                  id="master-allotment-select"
                  className="h-9 text-xs font-semibold w-full sm:w-[280px] bg-white border-indigo-200 text-slate-800 shadow-2xs"
                >
                  <SelectValue placeholder="Select Master Allotment" />
                </SelectTrigger>
                <SelectContent>
                  {savedAllotments.map((sa) => (
                    <SelectItem key={sa.id} value={sa.id} className="text-xs">
                      <span className="font-semibold">{sa.name}</span>
                      <span className="text-slate-400 text-[10px] ml-1.5">
                        ({sa.examinations?.length || 0} Sessions)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge
                variant="outline"
                className="bg-white text-[10px] text-indigo-700 border-indigo-200 font-semibold shrink-0 py-0.5 px-2"
              >
                {sortedExaminations.length} Sessions
              </Badge>
            </div>

            {/* 2. Global Actions: View Master, Lock All */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsMasterAllocationsOpen(true)}
                className="h-8 text-xs font-bold px-3 gap-1.5 bg-white text-[#1E2A5E] border-indigo-200 hover:bg-indigo-50 shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                View Master Room Allocations
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleToggleLockAll}
                className={`h-8 text-xs font-bold px-3 gap-1.5 shadow-2xs ${
                  isAllLocked
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-[#1E2A5E] hover:bg-[#151D42] text-white"
                }`}
              >
                {isAllLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    Unlock All Allocations
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Lock All Allocations
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsClearAllConfirmOpen(true)}
                disabled={!hasAnyRoomAllocations}
                className="h-8 text-xs font-bold px-3 gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All Allocations
              </Button>
            </div>
          </div>

          {/* Session Cards (Horizontal Calendar / List) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Examination Dates & Sessions ({sortedExaminations.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Click any session to view or configure room allocations
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sortedExaminations.map((exam) => {
                const isSelected = activeExam?.id === exam.id;
                const allocation = activeAllotment.roomAllocations?.[exam.id];
                const selectedCount = allocation?.selectedRooms?.length || 0;
                const requiredInvigilators = exam.rooms || 0;
                const isLocked = allocation?.status === 'Locked';
                const isAllocated = allocation?.status === 'Generated' || isLocked;

                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => setSelectedExamId(exam.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-white border-[#1E2A5E] ring-2 ring-[#1E2A5E]/20 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                    }`}
                  >
                    {/* Top status indicator bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        isLocked
                          ? 'bg-amber-500'
                          : isAllocated
                          ? 'bg-emerald-500'
                          : selectedCount === requiredInvigilators && selectedCount > 0
                          ? 'bg-blue-500'
                          : 'bg-slate-200'
                      }`}
                    />

                    <div className="flex items-start justify-between gap-2 pt-1">
                      <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatAppDate(exam.date)}
                      </span>

                      {isLocked ? (
                        <Badge className="h-4 text-[9px] bg-amber-500 text-white font-bold px-1.5 gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </Badge>
                      ) : isAllocated ? (
                        <Badge className="h-4 text-[9px] bg-emerald-600 text-white font-bold px-1.5">
                          Allocated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-4 text-[9px] text-slate-500 px-1.5">
                          {selectedCount}/{requiredInvigilators} Rooms
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 font-headline font-bold text-sm text-slate-800 truncate">
                      {exam.subject}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {exam.startTime} – {exam.endTime}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-600">
                      <span>Invig: <strong className="text-slate-900">{exam.rooms}</strong></span>
                      <span>Relievers: <strong className="text-slate-900">{exam.relievers}</strong></span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Session Detail, Room Selector, and Allocation Tables */}
          {activeExam && (
            <div className="space-y-6 pt-2">
              <SessionRoomSelector
                examination={activeExam}
                onOpenMasterRooms={() => setIsMasterRoomsOpen(true)}
                onProceedToAllocation={() => {
                  allocationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />

              <div ref={allocationSectionRef}>
                <RoomAllocationView
                  examination={activeExam}
                  onGenerateRoomAllocationPdf={handleGenerateRoomAllocationPdf}
                  onGenerateRelieverSlipsPdf={handleGenerateRelieverSlipsPdf}
                  isGeneratingPdf={isGeneratingPdf}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Master Rooms Modal */}
      <RoomMasterDialog
        open={isMasterRoomsOpen}
        onOpenChange={setIsMasterRoomsOpen}
      />

      {/* Master Allocations Overview Modal */}
      {activeAllotment && (
        <MasterAllocationsDialog
          open={isMasterAllocationsOpen}
          onOpenChange={setIsMasterAllocationsOpen}
          allotment={activeAllotment}
          onDownloadPdf={handleDownloadMasterRoomAllocationsPdf}
          isDownloadingPdf={isGeneratingPdf}
        />
      )}

      {/* Confirmation Dialog for Clear All Allocations */}
      <AlertDialog open={isClearAllConfirmOpen} onOpenChange={setIsClearAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Clear All Room Allocations?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed space-y-2">
              <span>
                This will reset all selected rooms and invigilator/reliever duties across all {sortedExaminations.length} session(s) in &ldquo;{activeAllotment?.name}&rdquo;.
              </span>
              <span className="block text-rose-600 font-semibold pt-1">
                Your master rooms, examinations, and invigilator pool will remain completely safe. You can restart the whole allocation process fresh.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs font-semibold h-8">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllAllocations}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-8"
            >
              Clear All Allocations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
