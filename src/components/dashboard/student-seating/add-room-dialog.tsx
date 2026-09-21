"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SeatingMasterRoom } from '@/lib/student-seating-types';
import { DoorOpen, Calculator, CheckCircle } from 'lucide-react';

interface AddRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomToEdit?: SeatingMasterRoom | null;
  onSave: (roomNo: string, leftBenches: number, rightBenches: number) => void;
}

export function AddRoomDialog({
  open,
  onOpenChange,
  roomToEdit,
  onSave,
}: AddRoomDialogProps) {
  const [roomNo, setRoomNo] = useState('');
  const [leftBenches, setLeftBenches] = useState(10);
  const [rightBenches, setRightBenches] = useState(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roomToEdit) {
      setRoomNo(roomToEdit.roomNo);
      setLeftBenches(roomToEdit.leftBenches);
      setRightBenches(roomToEdit.rightBenches);
    } else {
      setRoomNo('');
      setLeftBenches(10);
      setRightBenches(10);
    }
    setError(null);
  }, [roomToEdit, open]);

  // Automated Live Calculations
  const totalBenches = Math.max(0, leftBenches) + Math.max(0, rightBenches);
  const capacityOne = totalBenches * 1;
  const capacityTwo = totalBenches * 2;
  const capacityThree = totalBenches * 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNo.trim()) {
      setError('Please enter a Room Number or Room Name.');
      return;
    }
    if (totalBenches <= 0) {
      setError('Total benches must be at least 1 bench.');
      return;
    }

    onSave(roomNo.trim(), Math.max(0, leftBenches), Math.max(0, rightBenches));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <DoorOpen className="w-5 h-5" />
            </div>
            <DialogTitle className="font-headline text-lg font-bold text-slate-900">
              {roomToEdit ? 'Edit Examination Room' : 'Add Examination Room'}
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-500">
            Configure room identifier and bench counts. Capacities are calculated automatically.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5 font-medium">
              {error}
            </div>
          )}

          {/* Room Number */}
          <div className="space-y-1.5">
            <Label htmlFor="room-no" className="text-xs font-bold text-slate-700">
              Room No. / Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="room-no"
              placeholder="e.g. 101, N102, Conference Room"
              value={roomNo}
              onChange={(e) => {
                setRoomNo(e.target.value);
                setError(null);
              }}
              className="text-xs font-semibold"
              autoFocus
            />
          </div>

          {/* Left and Right Benches */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="left-benches" className="text-xs font-bold text-slate-700">
                Left Side Benches
              </Label>
              <Input
                id="left-benches"
                type="number"
                min="0"
                max="100"
                value={leftBenches}
                onChange={(e) => setLeftBenches(parseInt(e.target.value) || 0)}
                className="text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="right-benches" className="text-xs font-bold text-slate-700">
                Right Side Benches
              </Label>
              <Input
                id="right-benches"
                type="number"
                min="0"
                max="100"
                value={rightBenches}
                onChange={(e) => setRightBenches(parseInt(e.target.value) || 0)}
                className="text-xs font-bold"
              />
            </div>
          </div>

          {/* Automated Calculations Card */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2A5E]">
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculated Room Capacity (Formula-Based)</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Benches</div>
                <div className="font-headline text-base font-black text-slate-800 mt-0.5">
                  {totalBenches}
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase">1 / Bench</div>
                <div className="font-headline text-base font-black text-indigo-600 mt-0.5">
                  {capacityOne}
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase">2 / Bench</div>
                <div className="font-headline text-base font-black text-purple-600 mt-0.5">
                  {capacityTwo}
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase">3 / Bench</div>
                <div className="font-headline text-base font-black text-blue-600 mt-0.5">
                  {capacityThree}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Capacity is strictly calculated: 1&times; ({capacityOne}), 2&times; ({capacityTwo}), 3&times; ({capacityThree}).
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {roomToEdit ? 'Save Changes' : 'Add Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
