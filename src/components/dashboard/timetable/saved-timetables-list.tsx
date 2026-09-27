"use client";

import React, { useState } from 'react';
import { ExaminationTimetable } from '@/lib/examination-timetable-types';
import { SignatoryInfo } from '@/lib/types';
import { computeDateRange } from '@/lib/examination-timetable-service';
import { generateExaminationTimetablePdf } from '@/lib/examination-timetable-pdf';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CalendarClock,
  Eye,
  Download,
  FolderOpen,
  Lock,
  Unlock,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SavedTimetablesListProps {
  timetables: ExaminationTimetable[];
  activeTimetableId: string | null;
  onOpenTimetable: (timetable: ExaminationTimetable) => void;
  onPreviewTimetable: (timetable: ExaminationTimetable) => void;
  onToggleLock: (id: string, lock: boolean) => void;
  onDeleteTimetable: (id: string) => void;
  signatory?: SignatoryInfo;
}

export function SavedTimetablesList({
  timetables,
  activeTimetableId,
  onOpenTimetable,
  onPreviewTimetable,
  onToggleLock,
  onDeleteTimetable,
  signatory,
}: SavedTimetablesListProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  if (!timetables || timetables.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div className="font-headline font-bold text-sm text-slate-700">
          No Saved Timetables Yet
        </div>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Create examination schedules above and click &ldquo;Save Timetable&rdquo; to store, manage, and lock them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-headline font-bold text-sm text-slate-800 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-600" />
            Saved Timetables ({timetables.length})
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {timetables.map((item) => {
          const isActive = item.id === activeTimetableId;
          const dateRange = computeDateRange(item.rows || []);
          const totalRows = item.rows?.length || 0;
          const classesCount = item.classes?.length || 1;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4.5 space-y-3 transition-all flex flex-col justify-between ${
                isActive
                  ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                  : 'border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="font-headline font-bold text-xs text-slate-900 line-clamp-1" title={item.examinationName}>
                      {item.examinationName || 'Untitled Examination'}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate" title={item.institutionName}>
                      {item.institutionName || 'Default Institution'}
                    </p>
                  </div>

                  {item.isLocked ? (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0.5 font-bold gap-1 shrink-0">
                      <Lock className="w-3 h-3" />
                      Locked
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0.5 font-bold gap-1 shrink-0">
                      <Sparkles className="w-3 h-3" />
                      Draft
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{dateRange}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-[10px] pt-1 border-t border-slate-200/60">
                    <span><strong>{totalRows}</strong> Exam Dates</span>
                    <span>&bull;</span>
                    <span><strong>{classesCount}</strong> {classesCount === 1 ? 'Class' : 'Classes'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenTimetable(item)}
                    className="h-7 text-xs px-2.5 font-bold text-[#1E2A5E] border-slate-200 hover:bg-slate-50"
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPreviewTimetable(item)}
                    className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600"
                    title="Preview Timetable"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => generateExaminationTimetablePdf({ timetable: item, signatory })}
                    className="h-7 w-7 p-0 text-slate-600 hover:text-emerald-600"
                    title="Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleLock(item.id, !item.isLocked)}
                    className={`h-7 w-7 p-0 ${
                      item.isLocked
                        ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                    }`}
                    title={item.isLocked ? "Unlock Timetable" : "Lock Timetable"}
                  >
                    {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTargetId(item.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Delete Timetable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-white border border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Delete Saved Timetable?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete this timetable? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTargetId) {
                  onDeleteTimetable(deleteTargetId);
                  setDeleteTargetId(null);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
