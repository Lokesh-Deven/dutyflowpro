"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAllotment } from '@/lib/allotment-context';
import { useToast } from '@/hooks/use-toast';
import { RoomMasterDialog } from '@/components/dashboard/room-allocations/room-master-dialog';
import { SessionRoomSelector } from '@/components/dashboard/room-allocations/session-room-selector';
import { RoomAllocationView } from '@/components/dashboard/room-allocations/room-allocation-view';
import { generateRoomAllocationPdf, generateRelieverDutySlipsPdf } from '@/lib/room-pdf-service';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ChevronRight
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
    masterRooms,
    signatory,
    pdfPaletteId,
  } = useAllotment();

  const [isMasterRoomsOpen, setIsMasterRoomsOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Institution Name';

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
              <p className="text-xs text-slate-500 font-medium">
                Stage 1 &bull; Room configuration, session selection, role division & duty slip exports
              </p>
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
          {/* Active Allotment Sub-bar */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#1E2A5E]">Active Master Allotment:</span>
              <span className="font-semibold text-slate-800">{activeAllotment.name}</span>
              <Badge variant="outline" className="bg-white text-[10px] text-slate-600 border-indigo-200">
                {sortedExaminations.length} Sessions
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/allotment"
                className="text-xs text-[#1E2A5E] hover:underline font-semibold flex items-center gap-1"
              >
                View Master Allotment Sheet &rarr;
              </Link>
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
              />

              <RoomAllocationView
                examination={activeExam}
                onGenerateRoomAllocationPdf={handleGenerateRoomAllocationPdf}
                onGenerateRelieverSlipsPdf={handleGenerateRelieverSlipsPdf}
                isGeneratingPdf={isGeneratingPdf}
              />
            </div>
          )}
        </div>
      )}

      {/* Master Rooms Modal */}
      <RoomMasterDialog
        open={isMasterRoomsOpen}
        onOpenChange={setIsMasterRoomsOpen}
      />
    </div>
  );
}
