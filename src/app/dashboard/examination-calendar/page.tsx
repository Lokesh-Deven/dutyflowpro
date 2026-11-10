"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  CalendarRange,
  Clock,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  Building2,
  Hash,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Eraser,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import {
  ExaminationScheduleItem,
  ExaminationDateType,
} from '@/lib/examination-calendar-types';
import {
  DEFAULT_EXAMINATION_NAMES,
  getDefaultSlots,
  getLocalExaminationCalendar,
  saveLocalExaminationCalendar,
  fetchExaminationCalendarApi,
  saveExaminationCalendarApi,
} from '@/lib/examination-calendar-service';
import { AcademicCalendarView } from '@/components/calendar/academic-calendar-view';

export default function ExaminationCalendarAdminPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const institutionId = user?.id || profile?.id || 'guest-session';
  const institutionCode = profile?.institution_code || '';
  const institutionName = profile?.institution_name || 'Institution';

  const [schedules, setSchedules] = useState<ExaminationScheduleItem[]>(() =>
    getDefaultSlots(institutionId, institutionCode, 1)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Calendar focus date to automatically jump to the month of the published exam
  const [calendarFocusDate, setCalendarFocusDate] = useState<Date | null>(null);

  // Load schedules on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);

      // 1. Immediately display local cached items to prevent flicker or wiping
      const localCached = getLocalExaminationCalendar(institutionId, institutionCode);
      if (isMounted && localCached.length > 0) {
        setSchedules(localCached);
      }

      // 2. Fetch from cloud
      const cloudData = await fetchExaminationCalendarApi(institutionId, institutionCode, 'admin');
      if (isMounted) {
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
          setSchedules(cloudData);
          saveLocalExaminationCalendar(institutionId, cloudData);
        } else if (localCached && localCached.length > 0) {
          setSchedules(localCached);
        } else {
          const defaultOne = getDefaultSlots(institutionId, institutionCode, 1);
          setSchedules(defaultOne);
          saveLocalExaminationCalendar(institutionId, defaultOne);
        }
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [institutionId, institutionCode]);

  // Handle cell text / date changes - persist immediately to local storage so user inputs are never lost
  const handleFieldChange = (
    slotNumber: number,
    field: keyof ExaminationScheduleItem,
    value: any
  ) => {
    setSchedules((prev) => {
      const updated = prev.map((item) => {
        if (item.slot_number === slotNumber) {
          return {
            ...item,
            [field]: value,
          };
        }
        return item;
      });
      saveLocalExaminationCalendar(institutionId, updated);
      return updated;
    });
  };

  // Direct publishing workflow - completely allows overlapping/repeated dates across any slot
  const handlePublishSlot = async (
    slotNumber: number,
    dateType: ExaminationDateType
  ) => {
    const targetSlot = schedules.find((s) => s.slot_number === slotNumber);
    if (!targetSlot) return;

    // 1. Validation: Must have Exam Name, Start Date, and End Date
    if (!targetSlot.exam_name?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Examination Name Required',
        description: `Please enter an examination name for Slot #${slotNumber}.`,
      });
      return;
    }

    if (!targetSlot.start_date || !targetSlot.end_date) {
      toast({
        variant: 'destructive',
        title: 'Dates Required',
        description: `Please select both Start Date and End Date for ${targetSlot.exam_name}.`,
      });
      return;
    }

    if (targetSlot.start_date > targetSlot.end_date) {
      toast({
        variant: 'destructive',
        title: 'Invalid Date Range',
        description: 'End Date cannot be earlier than Start Date.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const isFinal = dateType === 'final';

      const updatedSchedules = schedules.map((item) => {
        if (item.slot_number === slotNumber) {
          const preservedTentativeStart = isFinal
            ? item.tentative_start_date || item.start_date
            : item.start_date;

          const preservedTentativeEnd = isFinal
            ? item.tentative_end_date || item.end_date
            : item.end_date;

          return {
            ...item,
            date_type: dateType,
            publication_status: isFinal ? ('final_published' as const) : ('tentative_published' as const),
            tentative_start_date: preservedTentativeStart,
            tentative_end_date: preservedTentativeEnd,
            published_at: now,
            institution_id: institutionId,
            institution_code: institutionCode,
            updated_at: now,
          };
        }
        return item;
      });

      setSchedules(updatedSchedules);

      // Save to API and localStorage
      await saveExaminationCalendarApi(institutionId, institutionCode, updatedSchedules);

      // Automatically focus calendar on the published examination's month so it is immediately visible
      if (targetSlot.start_date) {
        setCalendarFocusDate(new Date(targetSlot.start_date + 'T00:00:00'));
      }

      toast({
        title: isFinal ? 'Confirmed Dates Published' : 'Tentative Dates Published',
        description: `${targetSlot.exam_name} is now published on the calendar as ${
          isFinal ? 'Confirmed Dates' : 'Provisional Tentative Dates'
        }.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Publish Failed',
        description: err?.message || 'Could not publish schedule.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Clear a row's inputs completely
  const handleClearRow = async (slotNumber: number) => {
    const updated = schedules.map((item) => {
      if (item.slot_number === slotNumber) {
        return {
          ...item,
          exam_name: '',
          start_date: '',
          end_date: '',
          total_marks: '',
          date_type: 'tentative' as ExaminationDateType,
          publication_status: 'draft' as const,
          tentative_start_date: null,
          tentative_end_date: null,
          published_at: null,
          updated_at: new Date().toISOString(),
        };
      }
      return item;
    });

    setSchedules(updated);
    await saveExaminationCalendarApi(institutionId, institutionCode, updated);

    toast({
      title: `Row #${slotNumber} Cleared`,
      description: 'Examination details have been reset and left empty.',
    });
  };

  // Add a new row below the existing rows
  const handleAddRow = () => {
    setSchedules((prev) => {
      const nextSlotNumber = prev.length > 0 ? Math.max(...prev.map((s) => s.slot_number)) + 1 : 1;
      const newSlot: ExaminationScheduleItem = {
        slot_number: nextSlotNumber,
        exam_name: '',
        start_date: '',
        end_date: '',
        total_marks: '',
        date_type: 'tentative',
        publication_status: 'draft',
        tentative_start_date: null,
        tentative_end_date: null,
        published_at: null,
        institution_id: institutionId,
        institution_code: institutionCode,
      };
      const updated = [...prev, newSlot];
      saveLocalExaminationCalendar(institutionId, updated);
      saveExaminationCalendarApi(institutionId, institutionCode, updated).catch(() => {});
      return updated;
    });

    toast({
      title: 'Row Added',
      description: `New examination slot #${schedules.length + 1} has been created.`,
    });
  };

  // Delete a row (applicable when more than 1 row exists)
  const handleDeleteRow = async (slotNumber: number) => {
    if (schedules.length <= 1) return;
    const filtered = schedules.filter((s) => s.slot_number !== slotNumber);
    // Re-index remaining rows so numbering stays clean and sequential
    const reindexed = filtered.map((item, idx) => ({
      ...item,
      slot_number: idx + 1,
    }));

    setSchedules(reindexed);
    saveLocalExaminationCalendar(institutionId, reindexed);
    await saveExaminationCalendarApi(institutionId, institutionCode, reindexed, slotNumber);

    toast({
      title: 'Row Removed',
      description: `Examination slot #${slotNumber} has been removed. Total rows: ${reindexed.length}.`,
    });
  };

  // Save all drafts button
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveExaminationCalendarApi(institutionId, institutionCode, schedules);
      toast({
        title: 'Examination Schedule Saved',
        description: `All ${schedules.length} examination slots and updates have been saved.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err?.message || 'Could not save schedule.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* 1. Page Header & Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-headline font-black tracking-tight text-slate-900 dark:text-white">
              Examination Calendar
            </h1>
            <Badge className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs font-bold">
              Academic Year Planner
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Schedule institutional tests and examinations, publish provisional tentative dates in blue, and announce confirmed dates in green.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-500" />}
            <span>Save All Drafts</span>
          </Button>

          <Link href="/student/examination-calendar" target="_blank">
            <Button
              variant="default"
              size="sm"
              className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-[#1E2A5E] hover:bg-[#151D42] text-white shadow-xs"
            >
              <span>Student Portal View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Visual Academic Calendar Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-headline font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Academic Year Calendar View</span>
          </h2>
          <span className="text-xs text-slate-500">
            Synchronized with Student Portal
          </span>
        </div>

        <AcademicCalendarView
          schedules={schedules}
          readOnly={false}
          focusDate={calendarFocusDate}
        />
      </section>

      {/* 3. Examination Schedule Table Section */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-headline font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Examination Schedule Table</span>
            </h2>
            <p className="text-xs text-slate-500">
              Configure examination slots for your academic calendar. Select date type to publish tentative or confirmed schedules.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Total Slots:</span>
            <Badge variant="outline" className="font-mono text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {schedules.length} Slots
            </Badge>
          </div>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5 text-center w-12">Sl. No.</th>
                    <th className="py-3 px-4 min-w-[200px]">Examination Name</th>
                    <th className="py-3 px-3.5 min-w-[140px]">Start Date</th>
                    <th className="py-3 px-3.5 min-w-[140px]">End Date</th>
                    <th className="py-3 px-3 text-center min-w-[90px]">Total Marks</th>
                    <th className="py-3 px-3.5 min-w-[150px]">Date Type</th>
                    <th className="py-3 px-4 text-center min-w-[240px]">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {schedules.map((slot) => {
                    const isTentativeSelected = slot.date_type === 'tentative';
                    const isFinalSelected = slot.date_type === 'final';

                    const isTentativePublished = slot.publication_status === 'tentative_published';
                    const isFinalPublished = slot.publication_status === 'final_published';
                    const isDraft = slot.publication_status === 'draft';

                    return (
                      <tr
                        key={slot.slot_number}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* 1. Sl. No. */}
                        <td className="py-3.5 px-3.5 text-center font-bold font-mono text-slate-500">
                          {slot.slot_number}
                        </td>

                        {/* 2. Examination Name */}
                        <td className="py-3.5 px-4">
                          <Input
                            value={slot.exam_name}
                            onChange={(e) =>
                              handleFieldChange(slot.slot_number, 'exam_name', e.target.value)
                            }
                            placeholder="Enter examination name"
                            className="h-8 text-xs font-semibold bg-transparent border-slate-200 dark:border-slate-700 focus-visible:bg-white dark:focus-visible:bg-slate-800"
                          />
                        </td>

                        {/* 3. Start Date */}
                        <td className="py-3.5 px-3.5">
                          <Input
                            type="date"
                            value={slot.start_date || ''}
                            onChange={(e) =>
                              handleFieldChange(slot.slot_number, 'start_date', e.target.value)
                            }
                            className="h-8 text-xs font-mono bg-transparent border-slate-200 dark:border-slate-700"
                          />
                        </td>

                        {/* 4. End Date */}
                        <td className="py-3.5 px-3.5">
                          <Input
                            type="date"
                            value={slot.end_date || ''}
                            onChange={(e) =>
                              handleFieldChange(slot.slot_number, 'end_date', e.target.value)
                            }
                            className="h-8 text-xs font-mono bg-transparent border-slate-200 dark:border-slate-700"
                          />
                        </td>

                        {/* 5. Total Marks */}
                        <td className="py-3.5 px-3 text-center">
                          <Input
                            type="number"
                            min={1}
                            max={500}
                            value={slot.total_marks ?? ''}
                            onChange={(e) =>
                              handleFieldChange(slot.slot_number, 'total_marks', e.target.value)
                            }
                            className="h-8 text-xs font-mono text-center w-20 mx-auto bg-transparent border-slate-200 dark:border-slate-700"
                            placeholder="Marks"
                          />
                        </td>

                        {/* 6. Date Type Dropdown */}
                        <td className="py-3.5 px-3.5">
                          <Select
                            value={slot.date_type}
                            onValueChange={(val: ExaminationDateType) =>
                              handleFieldChange(slot.slot_number, 'date_type', val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-transparent">
                              <SelectValue placeholder="Select Date Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                              <SelectItem value="tentative" className="text-blue-600 font-semibold cursor-pointer">
                                Tentative Dates
                              </SelectItem>
                              <SelectItem value="final" className="text-emerald-600 font-semibold cursor-pointer">
                                Confirmed Dates
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* 7. Status / Action Button */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            {/* Publishing Action Button */}
                            {isTentativeSelected ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handlePublishSlot(slot.slot_number, 'tentative')}
                                disabled={isSaving}
                                className={cn(
                                  "h-8 px-3 text-xs font-bold rounded-lg transition-all shadow-xs gap-1.5 cursor-pointer",
                                  "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                                )}
                              >
                                <Send className="w-3 h-3" />
                                <span>Publish Tentative Dates</span>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handlePublishSlot(slot.slot_number, 'final')}
                                disabled={isSaving}
                                className={cn(
                                  "h-8 px-3 text-xs font-bold rounded-lg transition-all shadow-xs gap-1.5 cursor-pointer",
                                  "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                                )}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Publish Confirmed Dates</span>
                              </Button>
                            )}

                            {/* Current Status Badge */}
                            {isTentativePublished ? (
                              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                                Tentative Published
                              </Badge>
                            ) : isFinalPublished ? (
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                Confirmed Published
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] font-medium">
                                Draft
                              </Badge>
                            )}

                            {/* Clear Button: present on each row by default whether info is filled or not */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleClearRow(slot.slot_number)}
                              title={`Clear Row #${slot.slot_number}`}
                              className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200 dark:border-slate-700 rounded-lg gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eraser className="w-3.5 h-3.5" />
                              <span>Clear</span>
                            </Button>

                            {/* Row deletion button when more than 1 row exists */}
                            {schedules.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRow(slot.slot_number)}
                                title={`Delete Row #${slot.slot_number}`}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add Row Button Row below the 10th row */}
                  <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                    <td colSpan={7} className="py-3.5 px-4 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddRow}
                        className="h-9 px-5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border-dashed border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-400 rounded-xl gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Row</span>
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
