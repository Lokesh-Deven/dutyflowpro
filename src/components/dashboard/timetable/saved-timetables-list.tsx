"use client";

import React, { useState } from 'react';
import { ExaminationTimetable, ExaminationStatus } from '@/lib/examination-timetable-types';
import { SignatoryInfo } from '@/lib/types';
import { computeDateRange, getTimetableEffectiveStatus } from '@/lib/examination-timetable-service';
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
  Globe,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

interface SavedTimetablesListProps {
  timetables: ExaminationTimetable[];
  activeTimetableId: string | null;
  onOpenTimetable: (timetable: ExaminationTimetable) => void;
  onPreviewTimetable: (timetable: ExaminationTimetable) => void;
  onToggleLock: (id: string, lock: boolean) => void;
  onDeleteTimetable: (id: string) => void;
  onPublishTimetable?: (timetable: ExaminationTimetable) => void;
  onActivateTimetable?: (timetable: ExaminationTimetable) => void;
  onDeactivateTimetable?: (timetable: ExaminationTimetable) => void;
  onToggleArchive?: (id: string, currentStatus: ExaminationStatus) => void;
  signatory?: SignatoryInfo;
}

export function SavedTimetablesList({
  timetables,
  activeTimetableId,
  onOpenTimetable,
  onPreviewTimetable,
  onToggleLock,
  onDeleteTimetable,
  onPublishTimetable,
  onActivateTimetable,
  onDeactivateTimetable,
  onToggleArchive,
  signatory,
}: SavedTimetablesListProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  if (!timetables || timetables.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div className="font-headline font-bold text-sm text-slate-700 dark:text-slate-200">
          No Saved Timetables Yet
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
          Create examination schedules above and click &ldquo;Save Timetable&rdquo; to store, manage, and lock them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-headline font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Saved Timetables ({timetables.length})
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {timetables.map((item) => {
          const isCurrentlyActive = Boolean(item.isActive || (activeTimetableId && item.id === activeTimetableId));
          const effectiveStatus = getTimetableEffectiveStatus(item, activeTimetableId);
          const dateRange = computeDateRange(item.rows || []);
          const totalRows = item.rows?.length || 0;
          const classesCount = item.classes?.length || 1;

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border p-4.5 space-y-3.5 transition-all flex flex-col justify-between ${
                isCurrentlyActive
                  ? 'border-emerald-500 dark:border-emerald-500/80 shadow-md ring-2 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h4 className="font-headline font-bold text-xs text-slate-900 dark:text-white truncate" title={item.examinationName}>
                      {item.examinationName || 'Untitled Examination'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={item.institutionName}>
                      {item.institutionName || 'Default Institution'}
                    </p>
                  </div>

                  {/* Status Badges: Draft, Finalised, Active, Archived */}
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {effectiveStatus === 'Active' ? (
                      <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] px-2 py-0.5 font-bold gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </Badge>
                    ) : effectiveStatus === 'Finalised' ? (
                      <Badge className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] px-2 py-0.5 font-bold gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        Finalised
                      </Badge>
                    ) : effectiveStatus === 'Archived' ? (
                      <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 text-[10px] px-2 py-0.5 font-semibold gap-1">
                        <Archive className="w-3 h-3 text-zinc-500" />
                        Archived
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] px-2 py-0.5 font-medium gap-1">
                        <Sparkles className="w-3 h-3 text-slate-400" />
                        Draft
                      </Badge>
                    )}

                    {item.isPublished && (
                      <Badge className="bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800 text-[10px] px-1.5 py-0.5 font-bold gap-1" title="Published to Student Portal">
                        <Globe className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                        Portal
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold truncate">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{dateRange}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span><strong>{totalRows}</strong> Exam Dates</span>
                    <span>&bull;</span>
                    <span><strong>{classesCount}</strong> {classesCount === 1 ? 'Class' : 'Classes'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Area */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {/* Primary Activation / Deactivation Button: Never display both simultaneously */}
                <div className="w-full">
                  {isCurrentlyActive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onDeactivateTimetable?.(item)}
                      className="w-full h-8 text-xs font-bold text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 hover:text-amber-900 dark:hover:text-amber-200 gap-1.5 rounded-lg shadow-2xs cursor-pointer transition-all"
                      title="Deactivate this examination across all modules"
                    >
                      <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Deactivate Examination</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onActivateTimetable?.(item)}
                      className="w-full h-8 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 gap-1.5 rounded-lg shadow-2xs cursor-pointer transition-all"
                      title="Activate this examination across Seating Allocation, Attendance, and Portals"
                    >
                      <PlayCircle className="w-4 h-4 text-emerald-100" />
                      <span>Activate Examination</span>
                    </Button>
                  )}
                </div>

                {/* Secondary Utility Controls */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenTimetable(item)}
                      className="h-7 text-xs px-2.5 font-bold text-[#1E2A5E] dark:text-indigo-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      title="Open in editor"
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPreviewTimetable(item)}
                      className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white"
                      title="Preview Timetable"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateExaminationTimetablePdf({ timetable: item, signatory })}
                      className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    {onPublishTimetable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onPublishTimetable(item)}
                        className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white"
                        title={item.isPublished ? "Update on Student Portal" : "Publish on Student Portal"}
                      >
                        <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    {onToggleArchive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToggleArchive(item.id, effectiveStatus)}
                        className="h-7 w-7 p-0 text-slate-400 dark:text-slate-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={effectiveStatus === 'Archived' ? "Unarchive Timetable" : "Archive Timetable"}
                      >
                        {effectiveStatus === 'Archived' ? (
                          <ArchiveRestore className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggleLock(item.id, !item.isLocked)}
                      className={`h-7 w-7 p-0 ${
                        item.isLocked
                          ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'text-slate-400 dark:text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={item.isLocked ? "Unlock Timetable (re-enable editing)" : "Finalise & Lock Timetable"}
                    >
                      {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTargetId(item.id)}
                      className="h-7 w-7 p-0 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete Timetable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Delete Saved Timetable?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this timetable? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">Cancel</AlertDialogCancel>
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
