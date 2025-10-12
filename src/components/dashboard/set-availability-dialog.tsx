"use client";

import { useState, useEffect } from 'react';
import type { Invigilator } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type SetAvailabilityDialogProps = {
  invigilator: Invigilator | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (invigilatorId: string, availableDays: string[]) => void;
};

export function SetAvailabilityDialog({ invigilator, isOpen, onClose, onSave }: SetAvailabilityDialogProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    if (invigilator?.availableDays) {
      setSelectedDays(invigilator.availableDays);
    } else {
      setSelectedDays([]);
    }
  }, [invigilator]);

  if (!invigilator) return null;

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    onSave(invigilator.id, selectedDays);
    onClose();
  };

  const handleClearAll = () => {
    setSelectedDays([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Availability for {invigilator.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          {daysOfWeek.map(day => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={day}
                checked={selectedDays.includes(day)}
                onCheckedChange={() => handleDayToggle(day)}
              />
              <Label htmlFor={day} className="text-sm font-medium leading-none">
                {day}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter className="justify-between">
            <div>
                 <Button type="button" variant="ghost" onClick={handleClearAll}>Clear All</Button>
            </div>
            <div className='flex gap-2'>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleSave}>Save Availability</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
