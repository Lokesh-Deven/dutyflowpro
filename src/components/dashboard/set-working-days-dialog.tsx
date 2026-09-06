"use client";

import React, { useState, useEffect } from 'react';
import type { DirectoryInvigilator } from '@/lib/types';
import { ALL_WEEKDAYS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type SetWorkingDaysDialogProps = {
  invigilator: DirectoryInvigilator | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (invigilatorId: string, workingDays: string[]) => void;
};

// Default working days for full-time institution faculty (Monday to Saturday)
export const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SetWorkingDaysDialog({
  invigilator,
  isOpen,
  onClose,
  onSave,
}: SetWorkingDaysDialogProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>(DEFAULT_WORKING_DAYS);

  useEffect(() => {
    if (invigilator) {
      if (Array.isArray(invigilator.workingDays) && invigilator.workingDays.length > 0) {
        setSelectedDays(invigilator.workingDays);
      } else {
        // Default to standard Monday-Saturday
        setSelectedDays(DEFAULT_WORKING_DAYS);
      }
    }
  }, [invigilator, isOpen]);

  if (!invigilator) return null;

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const setMonSat = () => {
    setSelectedDays(DEFAULT_WORKING_DAYS);
  };

  const setMonFri = () => {
    setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  };

  const setAllSevenDays = () => {
    setSelectedDays([...ALL_WEEKDAYS]);
  };

  const handleClearAll = () => {
    setSelectedDays([]);
  };

  const handleSave = () => {
    onSave(invigilator.id, selectedDays);
    onClose();
  };

  const isFullTime = selectedDays.length >= 6;
  const isNone = selectedDays.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-border bg-card">
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#6342e8] via-[#0891B2] to-[#F59E0B]" />

        <div className="p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#6342e8] dark:text-purple-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-lg font-bold font-headline text-slate-900 dark:text-white">
                  Set Working Days
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Configure recurring weekly working days for this faculty member.
                </DialogDescription>
              </div>
            </div>

            {/* Invigilator Info Badge Card */}
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {invigilator.name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {invigilator.designation || 'Faculty'}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold px-2.5 py-0.5",
                  isFullTime
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : isNone
                    ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                    : "border-purple-300 bg-purple-50 text-[#6342e8] dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                )}
              >
                {isFullTime ? 'Full-Time (All Days)' : isNone ? 'Not Available' : `${selectedDays.length} Days / Week`}
              </Badge>
            </div>
          </DialogHeader>

          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Quick Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setMonSat}
                className="text-xs h-7 rounded-lg border-slate-200 dark:border-slate-800 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                Mon – Sat (6 Days)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setMonFri}
                className="text-xs h-7 rounded-lg border-slate-200 dark:border-slate-800 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                Mon – Fri (5 Days)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setAllSevenDays}
                className="text-xs h-7 rounded-lg border-slate-200 dark:border-slate-800 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                All 7 Days
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-7 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Weekdays Checkbox Grid */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Select Working Days
            </span>
            <div className="grid grid-cols-1 gap-2 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40">
              {ALL_WEEKDAYS.map(day => {
                const isSelected = selectedDays.includes(day);
                const isWeekend = day === 'Saturday' || day === 'Sunday';

                return (
                  <div
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all select-none",
                      isSelected
                        ? "bg-purple-50/90 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/80 shadow-2xs"
                        : "bg-white dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id={`day-${day}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleDay(day)}
                        onClick={e => e.stopPropagation()}
                        className="data-[state=checked]:bg-[#6342e8] data-[state=checked]:border-[#6342e8]"
                      />
                      <Label
                        htmlFor={`day-${day}`}
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      >
                        {day}
                      </Label>
                    </div>

                    <span className={cn(
                      "text-[11px] font-medium",
                      isSelected
                        ? "text-[#6342e8] dark:text-purple-300 font-bold"
                        : "text-slate-400 dark:text-slate-500"
                    )}>
                      {isSelected ? "Available" : "Off Duty"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs h-9 border-slate-200 dark:border-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-[#6342e8] hover:bg-[#5232d6] text-white rounded-xl text-xs h-9 px-4 font-semibold shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Save Working Days</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
