"use client";

import React, { useState, useMemo } from 'react';
import { useStudentSeating } from '@/lib/student-seating-context';
import { SeatingMasterRoom } from '@/lib/student-seating-types';
import { AddRoomDialog } from '@/components/dashboard/student-seating/add-room-dialog';
import { Button } from '@/components/ui/button';
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
import { DoorOpen, Plus, Pencil, Trash2, ShieldAlert, CheckCircle2, Save, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MasterRoomsPage() {
  const { rooms, addRoom, updateRoom, deleteRoom, isRoomInUse, saveRoomsToStorage, isRoomsCloudSynced } = useStudentSeating();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<SeatingMasterRoom | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<SeatingMasterRoom | null>(null);

  // Persistence and dirty state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Compute aggregate totals across all configured rooms
  const totals = useMemo(() => {
    return rooms.reduce(
      (acc, r) => ({
        leftBenches: acc.leftBenches + (Number(r.leftBenches) || 0),
        rightBenches: acc.rightBenches + (Number(r.rightBenches) || 0),
        totalBenches: acc.totalBenches + (Number(r.totalBenches) || 0),
        capacityOne: acc.capacityOne + (Number(r.capacityOne) || 0),
        capacityTwo: acc.capacityTwo + (Number(r.capacityTwo) || 0),
        capacityThree: acc.capacityThree + (Number(r.capacityThree) || 0),
      }),
      {
        leftBenches: 0,
        rightBenches: 0,
        totalBenches: 0,
        capacityOne: 0,
        capacityTwo: 0,
        capacityThree: 0,
      }
    );
  }, [rooms]);

  const handleSaveAllRooms = async () => {
    setIsSaving(true);
    try {
      const ok = await saveRoomsToStorage();
      if (ok) {
        setHasUnsavedChanges(false);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedAt(timeStr);
        toast({
          title: "Added Rooms Saved Successfully",
          description: `All ${rooms.length} master rooms have been saved.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Could not save master rooms. Please try again.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "An unexpected error occurred while saving master rooms.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRoom = (roomNo: string, leftBenches: number, rightBenches: number) => {
    if (editingRoom) {
      updateRoom(editingRoom.id, roomNo, leftBenches, rightBenches);
      setHasUnsavedChanges(true);
      toast({
        title: "Room Updated",
        description: `Room ${roomNo} has been updated.`,
      });
      setEditingRoom(null);
    } else {
      // Check duplicate room number
      const exists = rooms.some((r) => r.roomNo.toLowerCase() === roomNo.toLowerCase());
      if (exists) {
        toast({
          variant: "destructive",
          title: "Duplicate Room",
          description: `Room ${roomNo} already exists in Master Rooms.`,
        });
        return;
      }

      addRoom(roomNo, leftBenches, rightBenches);
      setHasUnsavedChanges(true);
      toast({
        title: "Room Added",
        description: `Room ${roomNo} with ${leftBenches + rightBenches} benches added.`,
      });
    }
  };

  const confirmDelete = () => {
    if (!roomToDelete) return;
    deleteRoom(roomToDelete.id);
    setHasUnsavedChanges(true);
    toast({
      title: "Room Deleted",
      description: `Room ${roomToDelete.roomNo} has been deleted.`,
    });
    setRoomToDelete(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                  Master Rooms
                </h1>
                {hasUnsavedChanges ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40 text-[10px] px-2 py-0.5 font-semibold rounded-full animate-pulse">
                    Unsaved Room Additions
                  </Badge>
                ) : lastSavedAt ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 text-[10px] px-2 py-0.5 font-semibold rounded-full hidden sm:inline-flex">
                    <CheckCheck className="w-3 h-3 mr-1 text-emerald-600" /> Saved at {lastSavedAt}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Create and manage examination rooms.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Button
            onClick={() => {
              setEditingRoom(null);
              setIsAddOpen(true);
            }}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </Button>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-headline font-bold text-sm text-slate-800">
            All Configured Rooms ({rooms.length})
          </div>
          <span className="text-xs text-slate-400">
            Capacities calculated as: 1&times; (Total), 2&times; (Total&times;2), 3&times; (Total&times;3)
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <DoorOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No Examination Rooms Configured</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &ldquo;+ Add Room&rdquo; to add your examination halls and specify left and right benches.
            </p>
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs"
            >
              + Add First Room
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 text-center w-12">Sl No</th>
                  <th className="py-3 px-4">Room No.</th>
                  <th className="py-3 px-3 text-center">Left Benches</th>
                  <th className="py-3 px-3 text-center">Right Benches</th>
                  <th className="py-3 px-3 text-center font-black text-slate-800">Total Benches</th>
                  <th className="py-3 px-3 text-center text-indigo-700 bg-indigo-50/50">Capacity — 1/Bench</th>
                  <th className="py-3 px-3 text-center text-purple-700 bg-purple-50/50">Capacity — 2/Bench</th>
                  <th className="py-3 px-3 text-center text-blue-700 bg-blue-50/50">Capacity — 3/Bench</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rooms.map((room, idx) => {
                  const inUse = isRoomInUse(room.id);
                  return (
                    <tr key={room.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-headline font-black text-xs text-slate-900">
                        {room.roomNo}
                      </td>
                      <td className="py-3 px-3 text-center">{room.leftBenches}</td>
                      <td className="py-3 px-3 text-center">{room.rightBenches}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 bg-slate-50/30">
                        {room.totalBenches}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-700 bg-indigo-50/30">
                        {room.capacityOne}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-purple-700 bg-purple-50/30">
                        {room.capacityTwo}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/30">
                        {room.capacityThree}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={inUse ? "bg-purple-50 text-purple-700 border-purple-200 text-[10px]" : "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"}
                        >
                          {inUse ? "In Allocation" : "Available"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingRoom(room);
                              setIsAddOpen(true);
                            }}
                            className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Edit Room"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setRoomToDelete(room)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {rooms.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-800">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 font-headline font-black text-xs text-slate-900 tracking-wide uppercase">
                      Total ({rooms.length} Rooms)
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {totals.leftBenches}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {totals.rightBenches}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-950 bg-slate-200/70 text-xs">
                      {totals.totalBenches}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-indigo-900 bg-indigo-100/70 text-xs">
                      {totals.capacityOne}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-purple-900 bg-purple-100/70 text-xs">
                      {totals.capacityTwo}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-blue-900 bg-blue-100/70 text-xs">
                      {totals.capacityThree}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-normal">—</td>
                    <td className="py-3 px-4 text-center text-slate-400 font-normal">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Table Footer Bar & Totals Summary */}
        {rooms.length > 0 ? (
          <div className="border-t border-slate-200 bg-slate-50/70 p-4">
            {/* Total Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3.5">
              {/* Total Benches Card */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Benches
                </div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {totals.totalBenches}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {totals.leftBenches} Left + {totals.rightBenches} Right
                </div>
              </div>

              {/* 1/Bench Capacity Card */}
              <div className="bg-white border border-indigo-200 rounded-lg p-3 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full pointer-events-none -mr-2 -mt-2" />
                <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Capacity (1/Bench)</span>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] px-1 py-0 h-4">
                    1&times;
                  </Badge>
                </div>
                <div className="text-2xl font-black text-indigo-900 mt-0.5">
                  {totals.capacityOne}
                </div>
                <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
                  Max students at 1 per bench
                </div>
              </div>

              {/* 2/Bench Capacity Card */}
              <div className="bg-white border border-purple-200 rounded-lg p-3 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-50 rounded-bl-full pointer-events-none -mr-2 -mt-2" />
                <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Capacity (2/Bench)</span>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] px-1 py-0 h-4">
                    2&times;
                  </Badge>
                </div>
                <div className="text-2xl font-black text-purple-900 mt-0.5">
                  {totals.capacityTwo}
                </div>
                <div className="text-[11px] text-purple-600 font-medium mt-0.5">
                  Max students at 2 per bench
                </div>
              </div>

              {/* 3/Bench Capacity Card */}
              <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50 rounded-bl-full pointer-events-none -mr-2 -mt-2" />
                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Capacity (3/Bench)</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] px-1 py-0 h-4">
                    3&times;
                  </Badge>
                </div>
                <div className="text-2xl font-black text-blue-900 mt-0.5">
                  {totals.capacityThree}
                </div>
                <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                  Max students at 3 per bench
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500 font-medium flex items-center gap-1.5">
                <span>Total Configured Rooms: <strong className="text-slate-800">{rooms.length}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveAllRooms}
                  disabled={isSaving}
                  className={cn(
                    "h-8 px-4 text-xs font-bold rounded-lg transition-all gap-1.5 shadow-xs",
                    hasUnsavedChanges
                      ? "bg-[#6342e8] hover:bg-[#5232d6] text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{hasUnsavedChanges ? "Save Added Rooms" : "Rooms Saved"}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>No rooms configured yet.</span>
          </div>
        )}
      </div>

      {/* Add / Edit Room Modal */}
      <AddRoomDialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditingRoom(null);
        }}
        roomToEdit={editingRoom}
        onSave={handleSaveRoom}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(roomToDelete)}
        onOpenChange={(open) => {
          if (!open) setRoomToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-white border border-slate-200">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <AlertDialogTitle className="font-headline text-lg font-bold text-slate-900">
                Delete Room {roomToDelete?.roomNo}?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              {roomToDelete && isRoomInUse(roomToDelete.id) ? (
                <span className="text-rose-600 font-semibold block">
                  &bull; Warning: This room is currently assigned in one or more saved seating allocations. Deleting it may impact existing records.
                </span>
              ) : (
                "Are you sure you want to delete this room from the Master Rooms list? This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
