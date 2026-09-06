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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarClock, CheckCheck, Calendar, BookOpen, Sparkles, Check } from 'lucide-react';
import { cn, formatWorkingDaysSummary, isDateInWorkingDays, getMatchingExamIdsForWorkingDays } from '@/lib/utils';

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
    [...examinations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [examinations]
  );

  useEffect(() => {
    if (invigilator) {
      setIsAllDays(invigilator.isAvailableAllDays);
      setSelectedExamIds(invigilator.availableExamIds || []);
    } else {
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

    if (isAllDays) {
      setIsAllDays(false);
    }

    if (isCurrentlySelected) {
      setSelectedExamIds(prev => prev.filter(id => id !== examId));
    } else {
      setSelectedExamIds(prev => [...prev, examId]);
    }
  };

  const handleApplyWorkingDays = () => {
    if (!invigilator.workingDays || invigilator.workingDays.length === 0) return;
    const result = getMatchingExamIdsForWorkingDays(examinations, invigilator.workingDays);
    setIsAllDays(result.isAvailableAllDays);
    setSelectedExamIds(result.availableExamIds);
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
  };

  const hasConfiguredWorkingDays = invigilator.workingDays && invigilator.workingDays.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden border-border">
        {/* Top Accent Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />

        <div className="p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Duty Availability: {invigilator.name}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Designation: <span className="font-medium text-foreground">{invigilator.designation}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Directory Working Days Banner (if configured) */}
          {hasConfiguredWorkingDays && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-[#6342e8] dark:text-purple-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">Directory Working Days: </span>
                  <span className="font-semibold text-[#6342e8] dark:text-purple-300">
                    {formatWorkingDaysSummary(invigilator.workingDays)}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyWorkingDays}
                className="h-7 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border-purple-200 text-[#6342e8] hover:bg-purple-100/60 shadow-2xs gap-1 shrink-0"
              >
                <Sparkles className="h-3 w-3 text-[#f59e0b]" />
                <span>Apply</span>
              </Button>
            </div>
          )}

          {/* All Days Option Card */}
          <div
            onClick={() => handleAllDaysToggle(!isAllDays)}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer",
              isAllDays
                ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs"
                : "bg-muted/30 border-border/70 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center space-x-3">
              <Checkbox
                id="all-days"
                checked={isAllDays}
                onCheckedChange={(checked) => handleAllDaysToggle(Boolean(checked))}
                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <div>
                <Label htmlFor="all-days" className="font-semibold text-sm cursor-pointer">
                  Available for All Examination Days
                </Label>
                <p className="text-xs text-muted-foreground">Full availability without date constraints.</p>
              </div>
            </div>
            {isAllDays && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                Active
              </span>
            )}
          </div>

          {/* Specific Days Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-0.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Or Select Specific Dates ({sortedExams.length} Available)
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs text-[#4F46E5] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2"
                >
                  Select All
                </Button>
                <span className="text-muted-foreground/40 text-xs">•</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                >
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="h-64 pr-3 border border-border/70 rounded-xl bg-muted/20 p-2">
              <div className="space-y-1.5">
                {sortedExams.map(exam => {
                  const isSelected = selectedExamIds.includes(exam.id);
                  const isWorkDay = !hasConfiguredWorkingDays || isDateInWorkingDays(exam.date, invigilator.workingDays);

                  return (
                    <div
                      key={exam.id}
                      onClick={() => handleExamIdToggle(exam.id)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border text-sm transition-colors cursor-pointer",
                        isSelected && !isAllDays
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-[#4F46E5]/40 text-foreground font-medium shadow-2xs"
                          : "bg-background border-border/60 hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={exam.id}
                          checked={isAllDays || isSelected}
                          onCheckedChange={() => handleExamIdToggle(exam.id)}
                          className="data-[state=checked]:bg-[#4F46E5] data-[state=checked]:border-[#4F46E5]"
                        />
                        <div>
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                            <Calendar className="h-3 w-3 text-[#4F46E5]" />
                            <span>{format(new Date(exam.date), "dd/MM/yyyy")}</span>
                            <span className="text-muted-foreground font-normal">({format(new Date(exam.date), "EEEE")})</span>
                            {hasConfiguredWorkingDays && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0 font-medium",
                                  isWorkDay
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                                )}
                              >
                                {isWorkDay ? "Working Day" : "Off Day"}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <BookOpen className="h-3 w-3 text-[#0891B2]" />
                            <span>{exam.subject}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                        {exam.rooms + exam.relievers} duties
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/10 border-t border-border/60 justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-lg">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold rounded-lg shadow-sm"
          >
            Save Availability
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

