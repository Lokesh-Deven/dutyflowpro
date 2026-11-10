"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  CalendarRange,
  Clock,
  CheckCircle2,
  AlertTriangle,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import {
  ExaminationScheduleItem,
  ExaminationDateType,
  ExaminationConflict,
} from '@/lib/examination-calendar-types';
import {
  getDefaultSlots,
  getLocalExaminationCalendar,
  saveLocalExaminationCalendar,
  detectExaminationConflicts,
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
    getDefaultSlots(institutionId, institutionCode)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Publishing confirmation dialog state
  const [pendingPublishSlot, setPendingPublishSlot] = useState<{
    slot: ExaminationScheduleItem;
    targetDateType: ExaminationDateType;
  } | null>(null);

  // Conflict warning dialog state
  const [detectedConflicts, setDetectedConflicts] = useState<{
    slot: ExaminationScheduleItem;
    targetDateType: ExaminationDateType;
    conflicts: ExaminationConflict[];
  } | null>(null);

  // Load schedules on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const data = await fetchExaminationCalendarApi(institutionId, institutionCode, 'admin');
      if (isMounted) {
        setSchedules(data);
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [institutionId, institutionCode]);

  // Handle cell text / date changes
  const handleFieldChange = (
    slotNumber: number,
    field: keyof ExaminationScheduleItem,
    value: any
  ) => {
    setSchedules((prev) =>
      prev.map((item) => {
        if (item.slot_number === slotNumber) {
          return {
            ...item,
            [field]: value,
          };
        }
        return item;
      })
    );
  };

  // Trigger publish workflow
  const handleInitiatePublish = (slot: ExaminationScheduleItem, dateType: ExaminationDateType) => {
    // 1. Validation: Must have Exam Name, Start Date, and End Date
    if (!slot.exam_name?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Examination Name Required',
        description: `Please enter an examination name for Slot #${slot.slot_number}.`,
      });
      return;
    }

    if (!slot.start_date || !slot.end_date) {
      toast({
        variant: 'destructive',
        title: 'Dates Required',
        description: `Please select both Start Date and End Date for ${slot.exam_name}.`,
      });
      return;
    }

    if (new Date(slot.start_date).getTime() > new Date(slot.end_date).getTime()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Date Range',
        description: 'End Date cannot be earlier than Start Date.',
      });
      return;
    }

    // 2. Conflict Detection
    const conflicts = detectExaminationConflicts(slot, schedules);
    if (conflicts.length > 0) {
      setDetectedConflicts({
        slot,
        targetDateType: dateType,
        conflicts,
      });
      return;
    }

    // 3. Normal confirmation dialog
    setPendingPublishSlot({
      slot,
      targetDateType: dateType,
    });
  };

  // Perform the actual publishing
  const executePublish = async (
    targetSlot: ExaminationScheduleItem,
    dateType: ExaminationDateType
  ) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const updatedSchedules = schedules.map((item) => {
        if (item.slot_number === targetSlot.slot_number) {
          const isFinal = dateType === 'final';

          // Preserve historical tentative dates if publishing final dates
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

      toast({
        title: dateType === 'final' ? 'Confirmed Dates Published' : 'Tentative Dates Published',
        description: `${targetSlot.exam_name} is now published to the Student Portal as ${
          dateType === 'final' ? 'Confirmed Dates' : 'Provisional Tentative Dates'
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
      setPendingPublishSlot(null);
      setDetectedConflicts(null);
    }
  };

  // Reset to draft
  const handleUnpublish = async (slotNumber: number) => {
    const target = schedules.find((s) => s.slot_number === slotNumber);
    if (!target) return;

    if (!confirm(`Revert ${target.exam_name} to Draft status? It will no longer be visible on the Student Portal.`)) {
      return;
    }

    const updated = schedules.map((item) => {
      if (item.slot_number === slotNumber) {
        return {
          ...item,
          publication_status: 'draft' as const,
          updated_at: new Date().toISOString(),
        };
      }
      return item;
    });

    setSchedules(updated);
    await saveExaminationCalendarApi(institutionId, institutionCode, updated);

    toast({
      title: 'Schedule Reverted to Draft',
      description: `${target.exam_name} has been unpublished from student view.`,
    });
  };

  // Save all drafts button
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveExaminationCalendarApi(institutionId, institutionCode, schedules);
      toast({
        title: 'Examination Schedule Saved',
        description: 'All 10 examination slots and updates have been saved.',
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

        <AcademicCalendarView schedules={schedules} readOnly={false} />
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
              Configure 10 examination slots for your academic calendar. Select date type to publish tentative or final schedules.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Total Slots:</span>
            <Badge variant="outline" className="font-mono text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              10 Slots
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
                    <th className="py-3 px-4 text-center min-w-[200px]">Status / Action</th>
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
                            placeholder="e.g. First Test"
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
                            value={slot.total_marks || ''}
                            onChange={(e) =>
                              handleFieldChange(slot.slot_number, 'total_marks', e.target.value)
                            }
                            className="h-8 text-xs font-mono text-center w-20 mx-auto bg-transparent border-slate-200 dark:border-slate-700"
                            placeholder="100"
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
                                onClick={() => handleInitiatePublish(slot, 'tentative')}
                                disabled={isSaving}
                                className={cn(
                                  "h-8 px-3 text-xs font-bold rounded-lg transition-all shadow-xs gap-1.5",
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
                                onClick={() => handleInitiatePublish(slot, 'final')}
                                disabled={isSaving}
                                className={cn(
                                  "h-8 px-3 text-xs font-bold rounded-lg transition-all shadow-xs gap-1.5",
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

                            {/* Revert to Draft action if currently published */}
                            {!isDraft && (
                              <button
                                type="button"
                                onClick={() => handleUnpublish(slot.slot_number)}
                                title="Revert to Draft"
                                className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors p-1"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ========================================================================= */}
      {/* 4. Publishing Confirmation Dialog */}
      {/* ========================================================================= */}
      <Dialog
        open={!!pendingPublishSlot}
        onOpenChange={(open) => !open && setPendingPublishSlot(null)}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-headline font-bold text-slate-900 dark:text-white">
                  Confirm Schedule Publication
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Publish to Student Portal and institutional calendar
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {pendingPublishSlot && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Examination Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {pendingPublishSlot.slot.exam_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Scheduled Dates:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {pendingPublishSlot.slot.start_date} to {pendingPublishSlot.slot.end_date}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Date Classification:</span>
                  <Badge
                    className={
                      pendingPublishSlot.targetDateType === 'final'
                        ? 'bg-emerald-600 text-white text-[10px]'
                        : 'bg-blue-600 text-white text-[10px]'
                    }
                  >
                    {pendingPublishSlot.targetDateType === 'final'
                      ? 'Officially Confirmed Dates'
                      : 'Provisional (Tentative Dates)'}
                  </Badge>
                </div>
              </div>

              {pendingPublishSlot.targetDateType === 'final' &&
                pendingPublishSlot.slot.publication_status === 'tentative_published' && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 rounded-xl text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Notice on Confirmed Date Replacement:
                    </p>
                    These officially confirmed dates will replace the previous tentative schedule on the active calendar. The original tentative dates will be preserved in history.
                  </div>
                )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPendingPublishSlot(null)}
              className="text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (pendingPublishSlot) {
                  executePublish(pendingPublishSlot.slot, pendingPublishSlot.targetDateType);
                }
              }}
              className={cn(
                "text-xs font-bold text-white",
                pendingPublishSlot?.targetDateType === 'final'
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              Confirm &amp; Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 5. Conflict Detection Warning Dialog */}
      {/* ========================================================================= */}
      <Dialog
        open={!!detectedConflicts}
        onOpenChange={(open) => !open && setDetectedConflicts(null)}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-red-200 dark:border-red-900 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </span>
              <div>
                <DialogTitle className="text-base font-headline font-bold text-red-600 dark:text-red-400">
                  Examination Date Conflict Detected
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  The scheduled date range overlaps with another scheduled examination
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detectedConflicts && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                You are scheduling <strong>{detectedConflicts.slot.exam_name}</strong> from{' '}
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {detectedConflicts.slot.start_date}
                </span>{' '}
                to{' '}
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {detectedConflicts.slot.end_date}
                </span>
                . It overlaps with:
              </p>

              <div className="space-y-2">
                {detectedConflicts.conflicts.map((conf, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl"
                  >
                    <div className="flex items-center justify-between font-bold text-red-950 dark:text-red-200">
                      <span>Slot #{conf.conflictingSlot}: {conf.conflictingExamName}</span>
                    </div>
                    <p className="text-[11px] font-mono text-red-700 dark:text-red-400 mt-0.5">
                      Date Range: {conf.conflictingStartDate} to {conf.conflictingEndDate}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Please resolve the overlapping dates or confirm if your institution permits simultaneous concurrent tests.
              </p>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetectedConflicts(null)}
              className="text-xs border-slate-200"
            >
              Cancel &amp; Edit Dates
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (detectedConflicts) {
                  executePublish(detectedConflicts.slot, detectedConflicts.targetDateType);
                }
              }}
              className="text-xs font-bold"
            >
              Proceed &amp; Publish Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
