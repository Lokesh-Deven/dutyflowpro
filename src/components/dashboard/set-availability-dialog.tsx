
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Invigilator, Examination } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';

type SetAvailabilityDialogProps = {
  invigilator: Invigilator | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (invigilatorId: string, availability: { isAvailableAllDays: boolean, availableExamIds: string[] }) => void;
  examinations: Examination[];
};

export function SetAvailabilityDialog({ invigilator, isOpen, onClose, onSave, examinations }: SetAvailabilityDialogProps) {
  const [isAllDays, setIsAllDays] = useState(true);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  
  const sortedExams = useMemo(() => 
    [...examinations].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), 
    [examinations]
  );

  useEffect(() => {
    if (invigilator) {
      setIsAllDays(invigilator.isAvailableAllDays);
      setSelectedExamIds(invigilator.availableExamIds || []);
    } else {
        // Reset state when dialog is closed or invigilator is null
        setIsAllDays(true);
        setSelectedExamIds([]);
    }
  }, [invigilator, isOpen]);

  if (!invigilator) return null;

  const handleAllDaysToggle = (checked: boolean) => {
    setIsAllDays(checked);
    if (checked) {
      setSelectedExamIds([]);
    }
  };

  const handleExamIdToggle = (examId: string) => {
    const isCurrentlySelected = selectedExamIds.includes(examId);

    // If "All Days" is checked, any interaction with specific dates unchecks it.
    if (isAllDays) {
      setIsAllDays(false);
    }
    
    if (isCurrentlySelected) {
      setSelectedExamIds(prev => prev.filter(id => id !== examId));
    } else {
      setSelectedExamIds(prev => [...prev, examId]);
    }
  };

  const handleSave = () => {
    onSave(invigilator.id, { 
      isAvailableAllDays: isAllDays,
      availableExamIds: isAllDays ? [] : selectedExamIds 
    });
    onClose();
  };

  const handleClearAll = () => {
    setSelectedExamIds([]);
    setIsAllDays(false);
  };
  
  const handleSelectAll = () => {
    setSelectedExamIds(examinations.map(e => e.id));
    setIsAllDays(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Availability for {invigilator.name}</DialogTitle>
          <DialogDescription>
            Select "All Days" or choose specific exam dates the invigilator is available for duty.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="all-days"
                    checked={isAllDays}
                    onCheckedChange={(checked) => handleAllDaysToggle(Boolean(checked))}
                />
                <Label htmlFor="all-days" className="text-base font-medium leading-none">
                    All Days
                </Label>
            </div>
            <Separator />
            <div className='flex justify-between items-center'>
                 <h4 className="font-medium">Specific Days</h4>
                 <div>
                    <Button variant="link" size="sm" onClick={handleSelectAll} disabled={isAllDays}>Select All</Button>
                    <Button variant="link" size="sm" onClick={handleClearAll} disabled={isAllDays}>Clear All</Button>
                 </div>
            </div>
            <ScrollArea className="h-64 pr-4">
                <div className="space-y-3">
                {sortedExams.map(exam => (
                    <div key={exam.id} className="flex items-center space-x-3">
                    <Checkbox
                        id={exam.id}
                        checked={selectedExamIds.includes(exam.id)}
                        onCheckedChange={() => handleExamIdToggle(exam.id)}
                        disabled={isAllDays}
                    />
                    <Label htmlFor={exam.id} className="text-sm font-normal leading-none w-full cursor-pointer">
                        <div className='flex justify-between'>
                            <span>{format(exam.date, "PPP")} ({format(exam.date, "EEE")})</span>
                            <span className="text-muted-foreground">{exam.subject}</span>
                        </div>
                    </Label>
                    </div>
                ))}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter className="justify-end">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleSave}>Save Availability</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
