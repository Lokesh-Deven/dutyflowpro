"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExaminationTimetable } from '@/lib/examination-timetable-types';
import { SignatoryInfo } from '@/lib/types';
import { generateExaminationTimetablePdf } from '@/lib/examination-timetable-pdf';
import { Download, FileText, CheckCircle2, Lock, Globe, Loader2 } from 'lucide-react';
import { formatDateToDDMMYYYY, normalizeTimetableRows } from '@/lib/examination-timetable-service';
import { useAuth } from '@/lib/auth-context';
import { ApprovalRestrictionDialog } from '@/components/dashboard/approval-restriction-dialog';
import { cn } from '@/lib/utils';

interface TimetablePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetable: ExaminationTimetable | null;
  signatory?: SignatoryInfo;
  onPublish?: () => void;
  isPublishing?: boolean;
}

export function TimetablePreviewDialog({
  open,
  onOpenChange,
  timetable,
  signatory,
  onPublish,
  isPublishing,
}: TimetablePreviewDialogProps) {
  const { isApproved } = useAuth();
  const [isRestrictionDialogOpen, setIsRestrictionDialogOpen] = useState(false);

  if (!timetable) return null;

  const handleDownloadPdf = async () => {
    if (!isApproved) {
      setIsRestrictionDialogOpen(true);
      return;
    }
    await generateExaminationTimetablePdf({
      timetable,
      signatory,
    });
  };

  const classes = timetable.classes && timetable.classes.length > 0
    ? timetable.classes
    : [{ id: 'class-1', name: 'Class 1' }];

  const normalizedRows = normalizeTimetableRows(timetable.rows || []);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-slate-100 p-0 border border-slate-200 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 bg-white border-b border-slate-200 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-headline text-base font-bold text-slate-900">
                Official Examination Timetable Preview
              </DialogTitle>
              <p className="text-xs text-slate-500 font-medium">
                A4 Landscape Print Layout • One-page auto-scaled preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            {timetable.isPublished && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                Published
              </span>
            )}
            {timetable.isLocked && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                <Lock className="w-3.5 h-3.5" />
                Locked
              </span>
            )}
            {onPublish && (
              <Button
                onClick={onPublish}
                disabled={isPublishing}
                variant="outline"
                className="text-xs h-8 px-3.5 gap-1.5 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                {isPublishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{timetable.isPublished ? "Update on Student Portal" : "Publish on Student Portal"}</span>
              </Button>
            )}
            <Button
              onClick={handleDownloadPdf}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-8 px-4 gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Realistic A4 Landscape Sheet Preview */}
        <div className="p-6 overflow-x-auto max-h-[78vh]">
          <div className="bg-white mx-auto shadow-lg border border-slate-300 rounded-sm p-10 min-w-[840px] text-slate-800 flex flex-col justify-between" style={{ minHeight: '520px' }}>
            {/* Header Block */}
            <div className="text-center space-y-1.5 pb-4 border-b-2 border-slate-800">
              <h1 className="font-headline text-xl font-black uppercase tracking-wide text-[#1E2A5E]">
                {timetable.institutionName || 'NAME OF THE INSTITUTION'}
              </h1>
              <h2 className="font-bold text-sm text-slate-700">
                {timetable.examinationName || 'NAME OF THE EXAMINATION'}
              </h2>
              <div className="inline-block mt-1">
                <span className="bg-slate-100 text-[#1E2A5E] border border-slate-300 font-black text-xs px-3 py-1 rounded tracking-wider uppercase font-headline">
                  TIMETABLE
                </span>
              </div>
            </div>

            {/* Timetable Table */}
            <div className="my-5 overflow-hidden border border-slate-300 rounded-sm">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1E2A5E] text-white font-bold uppercase text-[11px]">
                    <th rowSpan={2} className="border border-slate-400/40 p-2 w-12">Sl. No.</th>
                    <th rowSpan={2} className="border border-slate-400/40 p-2 w-28">Date</th>
                    <th rowSpan={2} className="border border-slate-400/40 p-2 w-28">Day</th>
                    <th rowSpan={2} className="border border-slate-400/40 p-2 w-24 text-center">Course</th>
                    {classes.map((c) => (
                      <th key={c.id} colSpan={2} className="border border-slate-400/40 p-2 text-center bg-[#18234D]">
                        {c.name}
                      </th>
                    ))}
                    <th rowSpan={2} className="border border-slate-400/40 p-2 text-left px-3">Subject</th>
                  </tr>
                  <tr className="bg-[#243370] text-slate-200 font-semibold text-[10px]">
                    {classes.map((c) => (
                      <React.Fragment key={`${c.id}-sub`}>
                        <th className="border border-slate-400/30 p-1.5 w-24">Start Time</th>
                        <th className="border border-slate-400/30 p-1.5 w-24">End Time</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {normalizedRows.length > 0 ? (
                    normalizedRows.map((row, dateIdx) => {
                      const slots = row.slots && row.slots.length > 0
                        ? row.slots
                        : [{ id: `${row.id}-s1`, course: row.course, subjects: row.subjects || [], timings: row.timings || {} }];
                      const slotCount = slots.length;
                      const isEvenDate = dateIdx % 2 === 0;

                      return slots.map((slot, sIdx) => {
                        const isFirstSlot = sIdx === 0;
                        const isLastSlot = sIdx === slotCount - 1;
                        const hasSubjects = Boolean(slot.subjects && slot.subjects.length > 0);

                        return (
                          <tr
                            key={`${row.id}-${slot.id || sIdx}`}
                            className={cn(
                              isEvenDate ? "bg-white" : "bg-slate-50/70",
                              isLastSlot && dateIdx !== normalizedRows.length - 1 && "border-b-2 border-slate-300"
                            )}
                          >
                            {isFirstSlot && (
                              <>
                                <td
                                  rowSpan={slotCount}
                                  className="border border-slate-200 p-2 text-slate-500 font-mono text-[11px] align-middle text-center bg-inherit"
                                >
                                  {dateIdx + 1}
                                </td>
                                <td
                                  rowSpan={slotCount}
                                  className="border border-slate-200 p-2 font-bold text-slate-900 font-mono align-middle text-center bg-inherit"
                                >
                                  {row.displayDate || formatDateToDDMMYYYY(row.date) || '—'}
                                </td>
                                <td
                                  rowSpan={slotCount}
                                  className="border border-slate-200 p-2 text-slate-700 align-middle text-center bg-inherit"
                                >
                                  {row.day || '—'}
                                </td>
                              </>
                            )}
                            <td className="border border-slate-200 p-2 text-center font-bold text-slate-800">
                              {slot.course || '—'}
                            </td>
                            {classes.map((c) => {
                              const timing = slot.timings ? slot.timings[c.id] : undefined;
                              const startVal = (!hasSubjects || !timing?.startTime || timing.startTime === '-' || timing.startTime === '—') ? '-' : timing.startTime;
                              const endVal = (!hasSubjects || !timing?.endTime || timing.endTime === '-' || timing.endTime === '—') ? '-' : timing.endTime;
                              return (
                                <React.Fragment key={`${row.id}-${slot.id || sIdx}-${c.id}`}>
                                  <td className="border border-slate-200 p-2 font-mono text-slate-700">
                                    {startVal}
                                  </td>
                                  <td className="border border-slate-200 p-2 font-mono text-slate-700">
                                    {endVal}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            <td className="border border-slate-200 p-2 text-left font-bold text-slate-900 px-3">
                              {slot.subjects && slot.subjects.length > 0 ? slot.subjects.join(' / ') : '—'}
                            </td>
                          </tr>
                        );
                      });
                    })
                  ) : (
                    <tr>
                      <td colSpan={5 + classes.length * 2} className="p-6 text-center text-slate-400 italic">
                        No examination dates added yet. Click &ldquo;+ Add Examination&rdquo; to add rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signatory Footer Section (Reserved Bottom Area) */}
            <div className="pt-8 flex justify-between items-end">
              <div className="text-[10px] text-slate-400">
                DutyFlow Academic Timetable System
              </div>

              <div className="text-right space-y-1">
                <div className="font-headline font-bold text-xs text-slate-900">
                  {signatory?.name && signatory.name.trim().length > 0
                    ? signatory.name.trim()
                    : 'Authorised Signatory'}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  {signatory?.designation
                    ? `[${signatory.designation.trim()}]`
                    : '[Principal / Controller of Examinations]'}
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  Digitally Generated Document. Signature Not Required.
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ApprovalRestrictionDialog
      open={isRestrictionDialogOpen}
      onOpenChange={setIsRestrictionDialogOpen}
      featureName="Timetable PDF Preview Download"
    />
    </>
  );
}
