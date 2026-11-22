"use client";

import React, { useState, useEffect } from 'react';
import { Examination } from '@/lib/types';
import { useAllotment } from '@/lib/allotment-context';
import { generateSessionRoomAllocation } from '@/lib/room-allocation-engine';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DoorOpen,
  Calendar,
  Clock,
  BookOpen,
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Save,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { formatAppDate } from '@/lib/date-utils';

interface SessionRoomSelectorProps {
  examination: Examination;
  onOpenMasterRooms: () => void;
  onProceedToAllocation?: () => void;
}

export function SessionRoomSelector({
  examination,
  onOpenMasterRooms,
  onProceedToAllocation,
}: SessionRoomSelectorProps) {
  const { masterRooms, activeAllotment, saveSessionRooms, saveSessionAllocation, clearSessionAllocation } = useAllotment();
  const { toast } = useToast();

  const currentAllocation = activeAllotment?.roomAllocations?.[examination.id];
  const isLocked = currentAllocation?.status === 'Locked';

  // Selected room names for this session
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Sync with current allocation
  useEffect(() => {
    if (currentAllocation?.selectedRooms) {
      setSelectedRooms(currentAllocation.selectedRooms);
    } else {
      setSelectedRooms([]);
    }
    setIsDirty(false);
  }, [examination.id, currentAllocation?.selectedRooms]);

  const requiredInvigilators = examination.rooms || 0;
  const requiredRelievers = examination.relievers || 0;
  const totalStaffRequired = requiredInvigilators + requiredRelievers;
  const selectedCount = selectedRooms.length;

  const isExactMatch = selectedCount === requiredInvigilators && requiredInvigilators > 0;
  const isShortage = selectedCount < requiredInvigilators;
  const isExcess = selectedCount > requiredInvigilators;

  const handleToggleRoom = (roomName: string) => {
    if (isLocked) {
      toast({
        variant: "destructive",
        title: "Allocation Locked",
        description: "This session's room allocation is locked and cannot be modified.",
      });
      return;
    }

    setSelectedRooms(prev => {
      const next = prev.includes(roomName)
        ? prev.filter(r => r !== roomName)
        : [...prev, roomName];
      setIsDirty(true);
      return next;
    });
  };

  const handleSelectFirstN = () => {
    if (isLocked) return;
    const targetRooms = masterRooms.slice(0, requiredInvigilators).map(r => r.name);
    setSelectedRooms(targetRooms);
    setIsDirty(true);
  };

  const handleClear = () => {
    if (isLocked) return;
    setSelectedRooms([]);
    setIsDirty(false);
    clearSessionAllocation(examination.id);
    toast({
      title: "Room Selection Cleared",
      description: `Cleared rooms and duty allocations for ${examination.subject}.`,
    });
  };

  const handleAllocateDuties = () => {
    if (isLocked || !activeAllotment) return;
    if (selectedRooms.length !== requiredInvigilators) {
      toast({
        variant: "destructive",
        title: "Room Count Mismatch",
        description: `Please select exactly ${requiredInvigilators} rooms before allocating duty roles.`,
      });
      return;
    }

    saveSessionRooms(examination.id, selectedRooms);
    setIsDirty(false);

    const res = generateSessionRoomAllocation(examination, activeAllotment, selectedRooms);
    if (res.success && res.allocation) {
      saveSessionAllocation(examination.id, res.allocation);
      toast({
        title: "Room & Duty Allocation Generated",
        description: `Successfully allocated ${res.allocation.invigilatorDuties.length} room(s) and ${res.allocation.relieverDuties.length} reliever(s).`,
      });
      if (res.warnings && res.warnings.length > 0) {
        toast({
          title: "Allocation Notice",
          description: res.warnings[0],
        });
      }
      onProceedToAllocation?.();
    } else {
      toast({
        variant: "destructive",
        title: "Allocation Notice",
        description: res.errors?.[0] || "Could not generate allocation.",
      });
    }
  };

  const handleSave = () => {
    saveSessionRooms(examination.id, selectedRooms);
    setIsDirty(false);

    // If room count matches requirement, automatically allocate so Duty Role & Room Allocation is not empty
    if (isExactMatch && activeAllotment) {
      const res = generateSessionRoomAllocation(examination, activeAllotment, selectedRooms);
      if (res.success && res.allocation) {
        saveSessionAllocation(examination.id, res.allocation);
        toast({
          title: "Rooms Saved & Duties Allocated",
          description: `Saved ${selectedRooms.length} room(s) and generated duty role assignments.`,
        });
        if (res.warnings && res.warnings.length > 0) {
          toast({
            title: "Allocation Notice",
            description: res.warnings[0],
          });
        }
        return;
      }
    }

    toast({
      title: "Room Selection Saved",
      description: `Saved ${selectedRooms.length} rooms for ${examination.subject}.`,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-5">
      {/* Session Metadata Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-headline text-lg font-bold text-slate-800 dark:text-white">
              {examination.subject}
            </h3>
            <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              {examination.college || "Examination"}
            </Badge>
            {isLocked && (
              <Badge className="bg-amber-500 text-white font-semibold text-[11px]">
                Locked
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              {formatAppDate(examination.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {examination.startTime} – {examination.endTime}
            </span>
          </div>
        </div>

        {/* Requirements Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Required Invigilators</div>
            <div className="text-lg font-black text-[#1E2A5E] dark:text-white">{requiredInvigilators}</div>
          </div>
          <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">Required Relievers</div>
            <div className="text-lg font-black text-purple-900 dark:text-purple-300">{requiredRelievers}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Required</div>
            <div className="text-lg font-black text-slate-700 dark:text-slate-200">{totalStaffRequired}</div>
          </div>
        </div>
      </div>

      {/* Real-time Room Count Validation Banner */}
      <div>
        {isExactMatch ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">✓ {selectedCount} rooms selected for {requiredInvigilators} invigilators.</span>
                <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">
                  Room count matches requirement. Click &ldquo;Allocate Roles &amp; Rooms&rdquo; below to assign duties.
                </p>
              </div>
            </div>
            {!isLocked && (
              <Button
                type="button"
                size="sm"
                onClick={handleAllocateDuties}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-8 px-3.5 shrink-0 gap-1.5 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Allocate Duties Now
              </Button>
            )}
          </div>
        ) : isShortage ? (
          <div className="flex items-center gap-3 p-3.5 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800 text-red-800 dark:text-rose-200 rounded-lg text-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">
                ⚠ {requiredInvigilators} invigilators are required, but only {selectedCount} room{selectedCount === 1 ? '' : 's'} {selectedCount === 1 ? 'has' : 'have'} been selected.
              </span>
              <p className="text-red-700 dark:text-rose-300 text-[11px] mt-0.5">
                Please select {requiredInvigilators - selectedCount} more room{requiredInvigilators - selectedCount === 1 ? '' : 's'} to continue with allocation.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">
                ⚠ {selectedCount} rooms have been selected, but only {requiredInvigilators} invigilators are required.
              </span>
              <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                Please deselect {selectedCount - requiredInvigilators} excess room{selectedCount - requiredInvigilators === 1 ? '' : 's'} before allocation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Master Rooms Selection Area */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-[#1E2A5E] dark:text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Examination Rooms for this Session
            </h4>
            <span className="text-xs text-slate-400 font-medium">
              ({selectedCount} of {masterRooms.length} selected)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {masterRooms.length >= requiredInvigilators && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectFirstN}
                disabled={isLocked}
                className="h-7 text-[11px] px-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700"
              >
                Auto-Select {requiredInvigilators}
              </Button>
            )}
            {selectedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isLocked}
                className="h-7 text-[11px] px-2 text-slate-500 dark:text-slate-400 hover:text-red-600"
              >
                Clear
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenMasterRooms}
              className="h-7 text-[11px] px-2.5 gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-800"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Manage Master Rooms
            </Button>
          </div>
        </div>

        {masterRooms.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/40">
            <DoorOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No rooms in Master Room List</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Please configure your examination rooms first so they can be chosen for this session.
            </p>
            <Button
              onClick={onOpenMasterRooms}
              className="mt-3 bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs h-8 px-3"
            >
              Configure Master Rooms
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[300px] overflow-y-auto p-1">
            {masterRooms.map((room) => {
              const isChecked = selectedRooms.includes(room.name);
              return (
                <label
                  key={room.id}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-[#1E2A5E] dark:text-indigo-200 shadow-xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  } ${isLocked ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleToggleRoom(room.name)}
                    disabled={isLocked}
                    className="data-[state=checked]:bg-[#1E2A5E] dark:data-[state=checked]:bg-indigo-600 data-[state=checked]:border-[#1E2A5E]"
                  />
                  <span className="truncate">{room.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {isDirty ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Unsaved room selection changes</span>
          ) : (
            <span>Saved for this examination session</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isExactMatch && !isLocked && (
            <Button
              type="button"
              onClick={handleAllocateDuties}
              className="bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {currentAllocation?.status === 'Generated' ? 'Re-allocate Roles & Rooms' : 'Allocate Roles & Rooms'}
            </Button>
          )}

          <Button
            type="button"
            variant={isExactMatch ? "outline" : "default"}
            onClick={handleSave}
            disabled={isLocked || (!isDirty && selectedRooms.length === 0)}
            className={`text-xs font-bold h-9 px-4 gap-1.5 shadow-xs ${
              isExactMatch
                ? "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                : "bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            Save Room Selection
          </Button>

          {onProceedToAllocation && (
            <Button
              type="button"
              onClick={onProceedToAllocation}
              disabled={!isExactMatch}
              variant="outline"
              className="text-xs font-bold h-9 px-4 border-[#1E2A5E] dark:border-indigo-500 text-[#1E2A5E] dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Continue to Allocation &rarr;
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
