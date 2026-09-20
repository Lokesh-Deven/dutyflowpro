"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAllotment } from '@/lib/allotment-context';
import { useToast } from '@/hooks/use-toast';
import { DoorOpen, Plus, Pencil, Trash2, Check, X, Building2 } from 'lucide-react';
import { MasterRoom } from '@/lib/types';

interface RoomMasterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomMasterDialog({ open, onOpenChange }: RoomMasterDialogProps) {
  const { masterRooms, addMasterRoom, updateMasterRoom, deleteMasterRoom } = useAllotment();
  const { toast } = useToast();

  const [newRoomName, setNewRoomName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newRoomName.trim();
    if (!trimmed) return;

    // Check for duplicate room name (case-insensitive)
    const exists = masterRooms.some(r => r.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast({
        variant: "destructive",
        title: "Room Already Exists",
        description: `Room "${trimmed}" is already in the Master Room list.`,
      });
      return;
    }

    addMasterRoom(trimmed);
    setNewRoomName('');
    toast({
      title: "Room Added",
      description: `Room "${trimmed}" has been added to Master Rooms.`,
    });
  };

  const handleStartEdit = (room: MasterRoom) => {
    setEditingId(room.id);
    setEditingName(room.name);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    const exists = masterRooms.some(r => r.id !== id && r.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast({
        variant: "destructive",
        title: "Room Already Exists",
        description: `Another room is already named "${trimmed}".`,
      });
      return;
    }

    updateMasterRoom(id, trimmed);
    setEditingId(null);
    setEditingName('');
    toast({
      title: "Room Updated",
      description: `Room updated to "${trimmed}".`,
    });
  };

  const handleDelete = (id: string, name: string) => {
    deleteMasterRoom(id);
    toast({
      title: "Room Removed",
      description: `Room "${name}" removed from Master Rooms.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 text-[#1E2A5E]">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <DoorOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-headline text-slate-800">
                Examination Rooms (Master List)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Configure all possible examination rooms. Names accept numbers, letters, and text (e.g., 101, N102, Seminar Hall).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Add Room Input Form */}
        <form onSubmit={handleAddRoom} className="flex gap-2 pt-3 pb-4 border-b border-slate-200">
          <div className="flex-1">
            <Label htmlFor="room-name" className="sr-only">Room No. / Name</Label>
            <Input
              id="room-name"
              placeholder="Enter Room No. or Name (e.g. 101, N102, Conference Room)"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="h-10 text-sm focus-visible:ring-[#1E2A5E]"
            />
          </div>
          <Button
            type="submit"
            disabled={!newRoomName.trim()}
            className="h-10 px-4 bg-[#1E2A5E] hover:bg-[#151D42] text-white font-semibold text-xs gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </Button>
        </form>

        {/* Saved Rooms Table */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[380px] rounded-lg border border-slate-200 mt-2">
          {masterRooms.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No rooms configured yet.</p>
              <p className="text-xs text-slate-400 mt-1">Add your examination rooms above to begin.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center">Sl No</th>
                  <th className="py-2.5 px-4">Room No. / Name</th>
                  <th className="py-2.5 px-4 w-32 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterRooms.map((room, idx) => {
                  const isEditing = editingId === room.id;
                  return (
                    <tr key={room.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 font-semibold text-sm">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 text-xs py-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(room.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveEdit(room.id)}
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span>{room.name}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {!isEditing && (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEdit(room)}
                              className="h-7 px-2 text-slate-500 hover:text-[#1E2A5E] hover:bg-slate-100 text-xs"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(room.id, room.name)}
                              className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Total Saved Rooms: <span className="font-bold text-slate-800">{masterRooms.length}</span>
          </div>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-semibold text-xs px-5 h-9"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
