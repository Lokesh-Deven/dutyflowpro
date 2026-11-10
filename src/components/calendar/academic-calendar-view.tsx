"use client";

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExaminationScheduleItem } from '@/lib/examination-calendar-types';
import { cn } from '@/lib/utils';

interface AcademicCalendarViewProps {
  schedules: ExaminationScheduleItem[];
  readOnly?: boolean;
  onSlotClick?: (slot: ExaminationScheduleItem) => void;
  className?: string;
  showDraftsNotice?: boolean;
  focusDate?: Date | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AcademicCalendarView({
  schedules,
  readOnly = false,
  onSlotClick,
  className,
  showDraftsNotice = false,
  focusDate,
}: AcademicCalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState<Date>(() => focusDate || new Date());
  const [selectedExamDetails, setSelectedExamDetails] = useState<ExaminationScheduleItem | null>(null);

  // Sync with focusDate when updated from parent
  React.useEffect(() => {
    if (focusDate) {
      setCurrentDate(focusDate);
    }
  }, [focusDate]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleYearChange = (yearDelta: number) => {
    setCurrentDate(new Date(currentYear + yearDelta, currentMonth, 1));
  };

  // Only consider published examinations on the calendar view
  // (Tentative published in Blue, Final published in Green)
  const activePublishedSchedules = useMemo(() => {
    return schedules.filter(
      (s) =>
        s.start_date &&
        s.end_date &&
        (s.publication_status === 'tentative_published' || s.publication_status === 'final_published')
    );
  }, [schedules]);

  // Calendar matrix computation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const startDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Format date helper: YYYY-MM-DD
  const formatYMD = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Check which exams fall on a specific date string (YYYY-MM-DD)
  const getExamsForDay = (dayString: string) => {
    return activePublishedSchedules.filter((exam) => {
      const s = (exam.start_date || '').trim();
      const e = (exam.end_date || '').trim();
      if (!s || !e) return false;
      return dayString >= s && dayString <= e;
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 1. Header Toolbar: Month / Year Navigation & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xs">
        {/* Month & Year Title with Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="font-headline font-black text-sm sm:text-base text-slate-900 dark:text-white px-2.5 min-w-[140px] text-center select-none">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 text-xs font-semibold px-2.5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100"
          >
            Today
          </Button>

          {/* Quick Year Steppers */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => handleYearChange(-1)}
              className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {currentYear - 1}
            </button>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{currentYear}</span>
            <span>/</span>
            <button
              type="button"
              onClick={() => handleYearChange(1)}
              className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {currentYear + 1}
            </button>
          </div>
        </div>

        {/* Color Legend (Blue: Tentative, Green: Final) */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-2.5 py-1 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs" />
            <span className="font-bold text-blue-900 dark:text-blue-300 text-[11px]">
              Blue: Tentative Dates
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-xs" />
            <span className="font-bold text-emerald-900 dark:text-emerald-300 text-[11px]">
              Green: Confirmed Dates
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Calendar Grid Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2.5">
            {WEEK_DAYS.map((day, idx) => (
              <div key={day} className={cn(idx === 0 && "text-rose-500")}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            {/* Blank padding cells before day 1 */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div
                key={`empty-start-${i}`}
                className="min-h-[85px] sm:min-h-[105px] bg-slate-50/40 dark:bg-slate-950/20 p-1.5 opacity-40"
              />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = formatYMD(currentYear, currentMonth, dayNum);
              const dayExams = getExamsForDay(dateStr);

              const isToday =
                today.getFullYear() === currentYear &&
                today.getMonth() === currentMonth &&
                today.getDate() === dayNum;

              const isSunday = (startDayOfWeek + i) % 7 === 0;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={cn(
                    "min-h-[96px] sm:min-h-[118px] p-1.5 sm:p-2 transition-colors relative flex flex-col group",
                    isToday ? "bg-indigo-50/30 dark:bg-indigo-950/20" : "bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                    isSunday && "bg-slate-50/20"
                  )}
                >
                  {/* Date Number Badge */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full",
                        isToday
                          ? "bg-indigo-600 text-white font-bold shadow-xs"
                          : isSunday
                          ? "text-rose-500 font-bold"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {dayNum}
                    </span>

                    {dayExams.length > 0 && (
                      <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        {dayExams.length} {dayExams.length === 1 ? 'Exam' : 'Exams'}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Examination Pills: Displays all examinations taking place on this date */}
                  <div className="space-y-1 flex-1 flex flex-col justify-start">
                    {dayExams.map((exam) => {
                      const isFinal = exam.publication_status === 'final_published';
                      const isTentative = exam.publication_status === 'tentative_published';

                      const isStart = exam.start_date === dateStr;
                      const isEnd = exam.end_date === dateStr;

                      return (
                        <button
                          key={`slot-${exam.slot_number}-${dateStr}`}
                          type="button"
                          onClick={() => {
                            setSelectedExamDetails(exam);
                            if (onSlotClick) onSlotClick(exam);
                          }}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold tracking-tight transition-all shadow-xs cursor-pointer select-none flex items-center justify-between gap-1 leading-snug shrink-0",
                            isFinal
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10 ring-1 ring-emerald-500/20"
                              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/10 ring-1 ring-blue-500/20"
                          )}
                          title={`${exam.exam_name} (${isFinal ? 'Confirmed' : 'Tentative'}) - ${exam.start_date} to ${exam.end_date}`}
                        >
                          <span className="truncate block font-semibold">{exam.exam_name}</span>
                          {(isStart || isEnd) && (
                            <span className="text-[7.5px] uppercase tracking-wider opacity-85 shrink-0 font-mono px-1 py-0.2 rounded bg-black/20">
                              {isStart && isEnd ? '1D' : isStart ? 'Start' : 'End'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Trailing blank cells to complete grid */}
            {Array.from({
              length: (7 - ((startDayOfWeek + daysInMonth) % 7)) % 7,
            }).map((_, i) => (
              <div
                key={`empty-end-${i}`}
                className="min-h-[85px] sm:min-h-[105px] bg-slate-50/40 dark:bg-slate-950/20 p-1.5 opacity-40"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Examination Details Dialog (When an event pill is clicked) */}
      <Dialog
        open={!!selectedExamDetails}
        onOpenChange={(open) => !open && setSelectedExamDetails(null)}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Slot #{selectedExamDetails?.slot_number}
              </span>
              {selectedExamDetails?.publication_status === 'final_published' ? (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Confirmed Dates Published
                </Badge>
              ) : (
                <Badge className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5">
                  <Clock className="w-3 h-3 mr-1" />
                  Tentative Dates Published
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl font-headline font-black text-slate-900 dark:text-white">
              {selectedExamDetails?.exam_name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Official institutional examination calendar entry
            </DialogDescription>
          </DialogHeader>

          {selectedExamDetails && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Start Date
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedExamDetails.start_date || 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    End Date
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedExamDetails.end_date || 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Marks
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedExamDetails.total_marks || '100'} Marks
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Schedule Status
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5 capitalize">
                    {selectedExamDetails.publication_status === 'final_published' ? 'Officially Confirmed' : 'Provisional (Tentative)'}
                  </p>
                </div>
              </div>

              {/* Historical tentative dates preservation badge (if replaced with final) */}
              {selectedExamDetails.tentative_start_date &&
                selectedExamDetails.publication_status === 'final_published' && (
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 p-3 rounded-xl text-xs text-blue-900 dark:text-blue-300">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Preserved Historical Tentative Dates:
                    </p>
                    <p className="text-[11px] mt-1 pl-5 text-blue-700 dark:text-blue-400 font-mono">
                      {selectedExamDetails.tentative_start_date} to {selectedExamDetails.tentative_end_date}
                    </p>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

