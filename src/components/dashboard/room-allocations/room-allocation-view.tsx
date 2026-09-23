"use client";

import React, { useState } from 'react';
import { Examination, SessionRoomAllocation } from '@/lib/types';
import { useAllotment } from '@/lib/allotment-context';
import { generateSessionRoomAllocation } from '@/lib/room-allocation-engine';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Users,
  DoorOpen,
  FileText,
  Printer,
  ShieldCheck,
  Building,
  HelpCircle,
} from 'lucide-react';
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

interface RoomAllocationViewProps {
  examination: Examination;
  onGenerateRoomAllocationPdf?: () => void;
  onGenerateRelieverSlipsPdf?: () => void;
  isGeneratingPdf?: boolean;
}

export function RoomAllocationView({
  examination,
  onGenerateRoomAllocationPdf,
  onGenerateRelieverSlipsPdf,
  isGeneratingPdf = false,
}: RoomAllocationViewProps) {
  const { activeAllotment, saveSessionAllocation, saveSessionRooms, masterRooms } = useAllotment();
  const { toast } = useToast();

  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!activeAllotment) return null;

  const allocation: SessionRoomAllocation | undefined = activeAllotment.roomAllocations?.[examination.id];
  const selectedRooms = allocation?.selectedRooms || [];
  const status = allocation?.status || 'Pending';
  const isLocked = status === 'Locked';
  const isGenerated = status === 'Generated' || isLocked;

  const requiredInvigilators = examination.rooms || 0;
  const requiredRelievers = examination.relievers || 0;
  const totalStaffRequired = requiredInvigilators + requiredRelievers;

  const handleGenerate = () => {
    let roomsToUse = selectedRooms;

    if (roomsToUse.length !== requiredInvigilators) {
      if (masterRooms.length >= requiredInvigilators) {
        roomsToUse = masterRooms.slice(0, requiredInvigilators).map((r) => r.name);
        saveSessionRooms(examination.id, roomsToUse);
        toast({
          title: "Auto-Selected Master Rooms",
          description: `Automatically selected ${roomsToUse.length} rooms from Master Rooms list.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Room Count Mismatch",
          description: `Please select exactly ${requiredInvigilators} rooms above before generating allocation.`,
        });
        return;
      }
    }

    setIsGenerating(true);
    try {
      const res = generateSessionRoomAllocation(examination, activeAllotment, roomsToUse);

      if (!res.success || !res.allocation) {
        toast({
          variant: "destructive",
          title: "Allocation Notice",
          description: res.errors?.[0] || "Could not generate room allocation.",
        });
        return;
      }

      saveSessionAllocation(examination.id, res.allocation);

      toast({
        title: "Allocation Generated Successfully",
        description: `Assigned ${res.allocation.invigilatorDuties.length} room(s) and ${res.allocation.relieverDuties.length} reliever(s).`,
      });

      if (res.warnings && res.warnings.length > 0) {
        toast({
          title: "Allocation Notice",
          description: res.warnings[0],
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleLock = () => {
    if (!allocation) return;
    const newStatus = isLocked ? 'Generated' : 'Locked';
    const updated: SessionRoomAllocation = {
      ...allocation,
      status: newStatus,
      lockedAt: newStatus === 'Locked' ? new Date().toISOString() : undefined,
    };
    saveSessionAllocation(examination.id, updated);
    toast({
      title: isLocked ? "Allocation Unlocked" : "Allocation Locked",
      description: isLocked
        ? "You can now edit or regenerate this session's room allocation."
        : "This allocation is now locked to prevent accidental modifications.",
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-6">
      {/* Top Header with Status and Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1E2A5E]/10 text-[#1E2A5E] rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-lg font-bold text-slate-800">
                Duty Role & Room Allocation
              </h3>
              {status === 'Locked' ? (
                <Badge className="bg-amber-500 text-white font-bold text-xs gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </Badge>
              ) : status === 'Generated' ? (
                <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Generated
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500 text-xs font-semibold">
                  Pending Allocation
                </Badge>
              )}
            </div>
            {isLocked ? (
              <p className="text-xs text-slate-500 mt-0.5">
                Confirmed and locked against accidental changes.
              </p>
            ) : !isGenerated ? (
              <p className="text-xs text-slate-500 mt-0.5">
                Select rooms above, then click 'Generate Allocation'.
              </p>
            ) : null}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isGenerated ? (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || (selectedRooms.length !== requiredInvigilators && masterRooms.length < requiredInvigilators)}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {selectedRooms.length === requiredInvigilators ? "Generate Allocation" : "Auto-Select & Generate"}
            </Button>
          ) : (
            <>
              {!isLocked && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRegenerateConfirmOpen(true)}
                  className="text-xs font-semibold h-9 px-3 gap-1 text-slate-700 hover:text-slate-900 border-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
              )}

              <Button
                type="button"
                variant={isLocked ? "outline" : "default"}
                size="sm"
                onClick={handleToggleLock}
                className={`text-xs font-bold h-9 px-3 gap-1.5 ${
                  isLocked
                    ? "border-amber-400 text-amber-800 hover:bg-amber-50"
                    : "bg-[#1E2A5E] hover:bg-[#151D42] text-white"
                }`}
              >
                {isLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    Unlock Allocation
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Lock Allocation
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Warnings if any */}
      {allocation?.warnings && allocation.warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-1">
          {allocation.warnings.map((w, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Allocated Tables Display */}
      {isGenerated && allocation ? (
        <div className="space-y-6">
          {/* Section 1: Invigilators' Duty Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Invigilators&apos; Duty ({allocation.invigilatorDuties.length} Rooms Assigned)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">1 Invigilator per Room</span>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">Sl No</th>
                    <th className="py-2.5 px-4 w-40">Room No.</th>
                    <th className="py-2.5 px-4">Invigilator Name</th>
                    <th className="py-2.5 px-4">Designation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocation.invigilatorDuties.map((duty, idx) => (
                    <tr key={duty.invigilatorId} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs">
                          {duty.room}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 text-sm">
                        {duty.invigilatorName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {duty.designation || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Relievers' Duty Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Relievers&apos; Duty ({allocation.relieverDuties.length} Relievers)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Fairly Distributed Across Schedule
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">Sl No</th>
                    <th className="py-2.5 px-4 w-48">Reliever Name</th>
                    <th className="py-2.5 px-4 w-44">Designation</th>
                    <th className="py-2.5 px-4">Assigned Room Nos.</th>
                    <th className="py-2.5 px-3 w-24 text-center">Room Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocation.relieverDuties.map((duty, idx) => (
                    <tr key={duty.relieverId} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 text-sm">
                        {duty.relieverName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {duty.designation || "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {duty.rooms.map((rm) => (
                            <span
                              key={rm}
                              className="text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded"
                            >
                              {rm}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {duty.rooms.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: PDF Generation Action Bar */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5 bg-slate-50/60 p-4 rounded-xl">
            <Button
              type="button"
              onClick={onGenerateRoomAllocationPdf}
              disabled={isGeneratingPdf}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              Room Allocation PDF
            </Button>

            <Button
              type="button"
              onClick={onGenerateRelieverSlipsPdf}
              disabled={isGeneratingPdf}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Reliever Duty Slips
            </Button>
          </div>
        </div>
      ) : (
        /* Empty / Pending State Guidance */
        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <DoorOpen className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <h4 className="font-bold text-slate-700 text-sm">Allocation Not Yet Generated</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            {selectedRooms.length === requiredInvigilators
              ? `You have selected ${selectedRooms.length} rooms. Click below to automatically assign invigilator rooms and distribute reliever duties.`
              : `Select ${requiredInvigilators} rooms above, or click below to auto-select from your Master Rooms list and generate duties.`}
          </p>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || (selectedRooms.length !== requiredInvigilators && masterRooms.length < requiredInvigilators)}
            className="mt-4 bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {selectedRooms.length === requiredInvigilators ? "Generate Allocation Now" : "Auto-Select & Generate Allocation"}
          </Button>
        </div>
      )}

      {/* Confirmation Dialog for Regenerate */}
      <AlertDialog open={isRegenerateConfirmOpen} onOpenChange={setIsRegenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-800">
              Regenerate Room Allocation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
              Regenerating will recalculate the Invigilator and Reliever roles and room assignments for this session. Existing assignments for this session will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs font-semibold h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsRegenerateConfirmOpen(false);
                handleGenerate();
              }}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white text-xs font-bold h-8"
            >
              Confirm & Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
