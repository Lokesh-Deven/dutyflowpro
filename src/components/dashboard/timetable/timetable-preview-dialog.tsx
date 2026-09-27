"use client";

import React from 'react';
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
import { Download, FileText, CheckCircle2, Lock } from 'lucide-react';
import { formatDateToDDMMYYYY } from '@/lib/examination-timetable-service';

interface TimetablePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetable: ExaminationTimetable | null;
  signatory?: SignatoryInfo;
}

export function TimetablePreviewDialog({
  open,
  onOpenChange,
  timetable,
  signatory,
}: TimetablePreviewDialogProps) {
  if (!timetable) return null;

  const handleDownloadPdf = async () => {
    await generateExaminationTimetablePdf({
      timetable,
      signatory,
    });
  };

  const classes = timetable.classes && timetable.classes.length > 0
    ? timetable.classes
    : [{ id: 'class-1', name: 'Class 1' }];

  const sortedRows = [...timetable.rows].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return (
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
            {timetable.isLocked && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                <Lock className="w-3.5 h-3.5" />
                Locked
              </span>
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
                    <th rowSpan={2} className="border border-slate-400/40 p-2 text-left px-3">Subject</th>
                    {classes.map((c) => (
                      <th key={c.id} colSpan={2} className="border border-slate-400/40 p-2 text-center bg-[#18234D]">
                        {c.name}
                      </th>
                    ))}
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
                  {sortedRows.length > 0 ? (
                    sortedRows.map((row, idx) => (
                      <tr key={row.id} className={idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}>
                        <td className="border border-slate-200 p-2 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                        <td className="border border-slate-200 p-2 font-bold text-slate-900 font-mono">
                          {row.displayDate || formatDateToDDMMYYYY(row.date) || '—'}
                        </td>
                        <td className="border border-slate-200 p-2 text-slate-700">{row.day || '—'}</td>
                        <td className="border border-slate-200 p-2 text-left font-bold text-slate-900 px-3">
                          {row.subjects && row.subjects.length > 0 ? row.subjects.join(' / ') : '—'}
                        </td>
                        {classes.map((c) => {
                          const hasSubjects = Boolean(row.subjects && row.subjects.length > 0);
                          const timing = row.timings ? row.timings[c.id] : undefined;
                          const startVal = (!hasSubjects || !timing?.startTime || timing.startTime === '-' || timing.startTime === '—') ? '-' : timing.startTime;
                          const endVal = (!hasSubjects || !timing?.endTime || timing.endTime === '-' || timing.endTime === '—') ? '-' : timing.endTime;
                          return (
                            <React.Fragment key={`${row.id}-${c.id}`}>
                              <td className="border border-slate-200 p-2 font-mono text-slate-700">
                                {startVal}
                              </td>
                              <td className="border border-slate-200 p-2 font-mono text-slate-700">
                                {endVal}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4 + classes.length * 2} className="p-6 text-center text-slate-400 italic">
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
  );
}
