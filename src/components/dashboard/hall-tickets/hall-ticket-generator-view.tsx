"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { StudentMasterProfile } from '@/lib/student-master-types';
import { getStudentMasterProfiles } from '@/lib/student-master-service';
import {
  ExaminationTimetable,
} from '@/lib/examination-timetable-types';
import {
  getSavedTimetables,
  getActiveTimetable,
} from '@/lib/examination-timetable-service';
import {
  getStudentTimetableSchedule,
  downloadHallTicketsPdf,
} from '@/lib/hall-ticket-pdf-service';
import { getInvigilatorInitial, cn } from '@/lib/utils';
import { getClassBadgeStyle } from '@/lib/student-seating-colors';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Ticket,
  Search,
  Download,
  Eye,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Users,
  Filter,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  CalendarCheck,
} from 'lucide-react';
import Link from 'next/link';

interface HallTicketGeneratorViewProps {
  selectedStudentFromDirectory?: StudentMasterProfile | null;
  onClearSelectedStudent?: () => void;
  onSwitchToDirectory?: () => void;
}

export function HallTicketGeneratorView({
  selectedStudentFromDirectory,
  onClearSelectedStudent,
  onSwitchToDirectory,
}: HallTicketGeneratorViewProps) {
  const { toast } = useToast();
  const { signatory, pdfPaletteId } = useAllotment();
  const { user, profile } = useAuth();

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile' ? profile.institution_name : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Institution of Education';

  // Data state
  const [students, setStudents] = useState<StudentMasterProfile[]>([]);
  const [timetables, setTimetables] = useState<ExaminationTimetable[]>([]);
  const [activeTimetable, setActiveTimetable] = useState<ExaminationTimetable | null>(null);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('ACTIVE');
  const [customExamName, setCustomExamName] = useState<string>('');

  // Filters & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterStream, setFilterStream] = useState<string>('ALL');
  const [filterCombination, setFilterCombination] = useState<string>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Preview & Batch Download State
  const [previewStudent, setPreviewStudent] = useState<StudentMasterProfile | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const loadedStudents = await getStudentMasterProfiles();
    setStudents(loadedStudents);

    const savedSummaries = getSavedTimetables();
    setTimetables(savedSummaries);

    const active = getActiveTimetable();
    setActiveTimetable(active);

    if (active) {
      setSelectedTimetableId('ACTIVE');
      setCustomExamName(active.examinationName);
    } else if (savedSummaries.length > 0) {
      setSelectedTimetableId(savedSummaries[0].id);
      setCustomExamName(savedSummaries[0].examinationName);
    } else {
      setSelectedTimetableId('DEFAULT');
      setCustomExamName('Annual Examination 2025-26');
    }
  };

  // Sync when student passed from directory
  useEffect(() => {
    if (selectedStudentFromDirectory) {
      setSelectedStudentIds(new Set([selectedStudentFromDirectory.id]));
      setPreviewStudent(selectedStudentFromDirectory);
    }
  }, [selectedStudentFromDirectory]);

  // Resolve current chosen timetable object
  const currentTimetable: ExaminationTimetable | null = useMemo(() => {
    if (selectedTimetableId === 'ACTIVE') {
      return activeTimetable;
    }
    if (selectedTimetableId === 'DEFAULT') {
      return null;
    }
    const found = timetables.find((t) => t.id === selectedTimetableId);
    if (found) return found;

    // Load specific timetable from localStorage if not in state
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`dutyflow_examination_timetables_${selectedTimetableId}`);
        if (raw) return JSON.parse(raw) as ExaminationTimetable;
      } catch (err) {
        console.warn('Failed to load selected timetable', err);
      }
    }
    return activeTimetable;
  }, [selectedTimetableId, activeTimetable, timetables]);

  const examDisplayName = useMemo(() => {
    return customExamName.trim() || currentTimetable?.examinationName || 'ANNUAL EXAMINATION 2025-2026';
  }, [customExamName, currentTimetable]);

  // Unique filter values
  const availableClasses = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.className).filter(Boolean))).sort();
  }, [students]);

  const availableStreams = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.stream).filter(Boolean))).sort();
  }, [students]);

  const availableCombinations = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.combination).filter(Boolean))).sort();
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterClass !== 'ALL' && s.className !== filterClass) return false;
      if (filterStream !== 'ALL' && s.stream !== filterStream) return false;
      if (filterCombination !== 'ALL' && s.combination !== filterCombination) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesReg = s.registerNumber.toLowerCase().includes(q);
        const matchesSats = (s.satsNumber || '').toLowerCase().includes(q);
        const matchesFather = (s.fatherName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesReg && !matchesSats && !matchesFather) {
          return false;
        }
      }

      return true;
    });
  }, [students, filterClass, filterStream, filterCombination, searchQuery]);

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // PDF Generation for Single Student
  const handleDownloadSinglePdf = async (student: StudentMasterProfile) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(`Preparing Hall Ticket for ${student.name}...`);

      await downloadHallTicketsPdf({
        institutionName,
        examName: examDisplayName,
        students: [student],
        timetable: currentTimetable,
        signatory: signatory || undefined,
        paletteId: pdfPaletteId,
      });

      toast({
        title: 'Hall Ticket Downloaded',
        description: `Admit card generated for ${student.name} (${student.registerNumber}).`,
      });
    } catch (err: any) {
      console.error('Error generating Hall Ticket PDF:', err);
      toast({
        title: 'Generation Failed',
        description: err?.message || 'Could not generate hall ticket PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress('');
    }
  };

  // PDF Generation for Batch Selected Students
  const handleDownloadBatchPdf = async () => {
    const selectedList = students.filter((s) => selectedStudentIds.has(s.id));
    if (selectedList.length === 0) {
      toast({
        title: 'No Students Selected',
        description: 'Please select one or more students using the checkboxes to generate batch hall tickets.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(`Compiling Hall Tickets for ${selectedList.length} students...`);

      await downloadHallTicketsPdf({
        institutionName,
        examName: examDisplayName,
        students: selectedList,
        timetable: currentTimetable,
        signatory: signatory || undefined,
        paletteId: pdfPaletteId,
      });

      toast({
        title: 'Batch Hall Tickets Ready',
        description: `Successfully exported ${selectedList.length} Hall Tickets into a combined print-ready PDF document.`,
      });
    } catch (err: any) {
      console.error('Error generating batch Hall Tickets:', err);
      toast({
        title: 'Batch Export Failed',
        description: err?.message || 'Failed to export batch hall tickets.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Timetable Connection Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-indigo-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 text-indigo-100 backdrop-blur-md">
                <Ticket className="w-3.5 h-3.5 text-amber-300" />
                Live Timetable Integration
              </span>
              {currentTimetable?.isActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Timetable
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-headline">
              Generate Hall Tickets & Admit Cards
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Auto-map students with real-time examination timetable slots, preview authentic board-standard admit cards, and export single or multi-page batch PDFs with candidate photos and official institution signatories.
            </p>
          </div>

          {/* Quick Action Stats Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-center gap-5 shrink-0">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                Directory Strength
              </div>
              <div className="text-2xl font-black text-white">{students.length}</div>
              <div className="text-[11px] text-indigo-200">Registered Students</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                Selected for Print
              </div>
              <div className="text-2xl font-black text-amber-300">
                {selectedStudentIds.size}
              </div>
              <div className="text-[11px] text-indigo-200">Hall Tickets</div>
            </div>
          </div>
        </div>

        {/* Timetable Selector Bar inside Banner */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 flex flex-col gap-1">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              Source Examination Timetable:
            </Label>
            <Select
              value={selectedTimetableId}
              onValueChange={(val) => {
                setSelectedTimetableId(val);
                if (val === 'ACTIVE' && activeTimetable) {
                  setCustomExamName(activeTimetable.examinationName);
                } else {
                  const target = timetables.find((t) => t.id === val);
                  if (target) setCustomExamName(target.examinationName);
                }
              }}
            >
              <SelectTrigger className="h-9 bg-white/15 border-white/25 text-white font-semibold text-xs focus:ring-amber-300">
                <SelectValue placeholder="Choose Timetable" />
              </SelectTrigger>
              <SelectContent>
                {activeTimetable && (
                  <SelectItem value="ACTIVE" className="font-bold text-indigo-900">
                    Active Timetable: {activeTimetable.examinationName}
                  </SelectItem>
                )}
                {timetables
                  .filter((t) => !activeTimetable || t.id !== activeTimetable.id)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.examinationName}
                    </SelectItem>
                  ))}
                <SelectItem value="DEFAULT">Default Combination Schedule (Auto-Derive)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-5 flex flex-col gap-1">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              Examination Title on Hall Ticket:
            </Label>
            <Input
              value={customExamName}
              onChange={(e) => setCustomExamName(e.target.value)}
              placeholder="e.g. II PUC PREPARATORY EXAMINATION 2026"
              className="h-9 bg-white/15 border-white/25 text-white placeholder:text-indigo-200 text-xs font-semibold focus-visible:ring-amber-300"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
              className="w-full h-9 bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold text-xs"
            >
              <Link href="/dashboard/examination-timetable">
                Edit Timetable
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top Filter, Search & Bulk Operations Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name, register number, SATS ID, or father's name..."
              className="pl-9 h-10 text-xs font-semibold bg-slate-50/70 border-slate-200 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Buttons: Batch Download & Student Directory Switch */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              type="button"
              onClick={handleDownloadBatchPdf}
              disabled={selectedStudentIds.size === 0 || isDownloading}
              className={cn(
                "h-10 px-4 rounded-xl font-bold text-xs gap-2 transition-all shadow-md cursor-pointer",
                selectedStudentIds.size > 0
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-400/40"
                  : "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
              )}
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{downloadProgress || 'Exporting...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    Download Batch Hall Tickets ({selectedStudentIds.size})
                  </span>
                </>
              )}
            </Button>

            {onSwitchToDirectory && (
              <Button
                type="button"
                variant="outline"
                onClick={onSwitchToDirectory}
                className="h-10 px-3.5 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Manage Directory
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Filters:
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold text-[11px]">Class:</span>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="h-7 text-xs font-bold bg-slate-50 border-slate-200 rounded-lg px-2 min-w-[90px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                {availableClasses.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stream Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold text-[11px]">Stream:</span>
            <Select value={filterStream} onValueChange={setFilterStream}>
              <SelectTrigger className="h-7 text-xs font-bold bg-slate-50 border-slate-200 rounded-lg px-2 min-w-[100px]">
                <SelectValue placeholder="All Streams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Streams</SelectItem>
                {availableStreams.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Combination Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold text-[11px]">Combination:</span>
            <Select value={filterCombination} onValueChange={setFilterCombination}>
              <SelectTrigger className="h-7 text-xs font-bold bg-slate-50 border-slate-200 rounded-lg px-2 min-w-[110px]">
                <SelectValue placeholder="All Combinations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Combinations</SelectItem>
                {availableCombinations.map((cb) => (
                  <SelectItem key={cb} value={cb}>{cb}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button if any active */}
          {(filterClass !== 'ALL' || filterStream !== 'ALL' || filterCombination !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterClass('ALL');
                setFilterStream('ALL');
                setFilterCombination('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. Students Roster Table with Live Schedule Details */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {/* Table Subheader with Selection Status */}
        <div className="p-3.5 px-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={
                  filteredStudents.length > 0 &&
                  filteredStudents.every((s) => selectedStudentIds.has(s.id))
                }
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <span>
                Select All Filtered ({filteredStudents.length})
              </span>
            </label>

            {selectedStudentIds.size > 0 && (
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {selectedStudentIds.size} student{selectedStudentIds.size > 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          <div className="text-xs font-medium text-slate-500">
            Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of {students.length} students
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No Students Found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No students matched the active filters or search terms. Try clearing your filters or switch to the Student Master Directory to add profiles.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Register / Roll No</th>
                  <th className="py-3 px-3">Class & Combination</th>
                  <th className="py-3 px-3">Scheduled Papers</th>
                  <th className="py-3 px-3">Photo Status</th>
                  <th className="py-3 px-3 text-right">Hall Ticket Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const isChecked = selectedStudentIds.has(student.id);
                  const classBadge = getClassBadgeStyle(student.className);
                  const schedule = getStudentTimetableSchedule(student, currentTimetable);

                  return (
                    <tr
                      key={student.id}
                      className={cn(
                        "transition-colors hover:bg-indigo-50/30",
                        isChecked && "bg-indigo-50/50"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStudent(student.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Student Info with Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {getInvigilatorInitial(student.name)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Father: {student.fatherName || 'Not recorded'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Register Number & SATS */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <div>{student.registerNumber}</div>
                        {student.satsNumber && (
                          <div className="text-[10px] text-slate-400 font-sans font-normal">
                            SATS: {student.satsNumber}
                          </div>
                        )}
                      </td>

                      {/* Class, Stream, Combination */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", classBadge.badgeClass)}
                            style={{
                              backgroundColor: classBadge.bgHex,
                              borderColor: classBadge.borderHex,
                              color: classBadge.textHex,
                            }}
                          >
                            {student.className}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {student.combination}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {student.stream} Stream
                        </div>
                      </td>

                      {/* Scheduled Papers */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-slate-800 font-bold">
                          <CalendarCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{schedule.length} Papers</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={schedule.map((s) => s.subjectName).join(', ')}>
                          {schedule.map((s) => s.subjectName).slice(0, 3).join(', ')}
                          {schedule.length > 3 ? ` +${schedule.length - 3} more` : ''}
                        </div>
                      </td>

                      {/* Photo Status */}
                      <td className="py-3 px-3">
                        {student.photoUrl ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Photo Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Affix & Attest
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewStudent(student)}
                            className="h-8 px-2.5 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-bold gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDownloadSinglePdf(student)}
                            disabled={isDownloading}
                            className="h-8 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 shadow-xs cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Live Admit Card Preview Modal */}
      {previewStudent && (
        <Dialog open={!!previewStudent} onOpenChange={(open) => !open && setPreviewStudent(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-indigo-600" />
                    Official Hall Ticket / Admit Card Preview
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Rendered A4 Board Examination Admit Card preview for {previewStudent.name} ({previewStudent.registerNumber})
                  </DialogDescription>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleDownloadSinglePdf(previewStudent)}
                  disabled={isDownloading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </Button>
              </div>
            </DialogHeader>

            {/* Simulated Authentic A4 Hall Ticket Sheet */}
            <div className="mt-4 bg-white border-2 border-slate-800 rounded-xl p-6 sm:p-8 shadow-inner space-y-6 text-slate-900 font-sans">
              {/* Institutional Header */}
              <div className="text-center space-y-1 border-b-2 border-slate-800 pb-4">
                <div className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900">
                  {institutionName}
                </div>
                <div className="inline-block bg-slate-900 text-white px-4 py-0.5 rounded-full font-black text-xs uppercase tracking-widest">
                  HALL TICKET / ADMIT CARD
                </div>
                <div className="text-xs font-bold text-slate-700 uppercase pt-0.5">
                  {examDisplayName}
                </div>
              </div>

              {/* Student Biodata & Passport Photo Block */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch border border-slate-300 rounded-lg p-4 bg-slate-50/50">
                {/* 2-Column Info Grid */}
                <div className="md:col-span-9 grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Candidate Name</div>
                    <div className="font-black text-slate-900 text-sm">{previewStudent.name}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Register / Roll Number</div>
                    <div className="font-mono font-black text-indigo-700 text-base">{previewStudent.registerNumber}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Class & Stream</div>
                    <div className="font-bold text-slate-800">{previewStudent.className} • {previewStudent.stream}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Subject Combination</div>
                    <div className="font-bold text-slate-800">{previewStudent.combination}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">SATS / College Admission ID</div>
                    <div className="font-mono text-slate-700">{previewStudent.satsNumber || '—'}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Date of Birth & Gender</div>
                    <div className="font-semibold text-slate-800">
                      {previewStudent.dob || '—'} • {previewStudent.gender}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Father's / Parent's Name</div>
                    <div className="font-semibold text-slate-800">{previewStudent.fatherName || '—'}</div>
                  </div>
                </div>

                {/* Passport Photo Box */}
                <div className="md:col-span-3 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-2 bg-white min-h-[140px] text-center">
                  {previewStudent.photoUrl ? (
                    <img
                      src={previewStudent.photoUrl}
                      alt={previewStudent.name}
                      className="w-24 h-28 object-cover rounded shadow-xs"
                    />
                  ) : (
                    <div className="space-y-1">
                      <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xl mx-auto">
                        {getInvigilatorInitial(previewStudent.name)}
                      </div>
                      <div className="text-[9px] font-bold uppercase text-slate-400 leading-tight">
                        Affix Recent Passport Photo & Get Attested
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Examination Schedule Auto-Table */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Examination Time Table & Papers
                </div>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-2.5 w-10 text-center">Sl</th>
                        <th className="py-2 px-2.5">Date & Day</th>
                        <th className="py-2 px-2.5">Subject Code</th>
                        <th className="py-2 px-2.5">Subject Name</th>
                        <th className="py-2 px-2.5">Exam Session / Timing</th>
                        <th className="py-2 px-2.5 text-center">Candidate Sig.</th>
                        <th className="py-2 px-2.5 text-center">Invigilator Sig.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {getStudentTimetableSchedule(previewStudent, currentTimetable).map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 text-center font-bold text-slate-500">{i + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900">
                            {item.date} <span className="text-[10px] font-normal text-slate-500">({item.day})</span>
                          </td>
                          <td className="py-2 px-2.5 font-mono font-semibold text-slate-700">{item.subjectCode || '—'}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900">{item.subjectName}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-700">{item.timing}</td>
                          <td className="py-2 px-2.5 text-center text-slate-300">__________</td>
                          <td className="py-2 px-2.5 text-center text-slate-300">__________</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Important Instructions to Candidates */}
              <div className="border border-slate-200 bg-amber-50/40 rounded-lg p-3 space-y-1.5 text-[11px] text-slate-700">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Mandatory Instructions to the Candidate:
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-[10px] text-slate-600">
                  <li>Candidates must bring this Hall Ticket and College ID Card to every examination session.</li>
                  <li>Candidates should occupy their allotted seats at least 15 minutes prior to the commencement of the exam.</li>
                  <li>No candidate will be allowed into the examination hall 30 minutes after the scheduled start time.</li>
                  <li>Electronic gadgets including mobile phones, smartwatches, and programmable calculators are strictly prohibited.</li>
                  <li>Candidates must enter their Register Number and Answer Booklet Serial Number correctly on the attendance sheet.</li>
                </ol>
              </div>

              {/* Signature Footer */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-1">
                  <div className="border-t border-slate-400 w-3/4 mx-auto" />
                  <div className="font-bold text-slate-800">Candidate's Signature</div>
                </div>

                <div className="space-y-1">
                  <div className="border-t border-slate-400 w-3/4 mx-auto" />
                  <div className="font-bold text-slate-800">Controller of Examinations</div>
                </div>

                <div className="space-y-1">
                  <div className="border-t border-slate-400 w-3/4 mx-auto" />
                  <div className="font-bold text-slate-800">
                    {signatory?.designation || 'Principal / Head of Institution'}
                  </div>
                  {signatory?.name && (
                    <div className="text-[10px] text-slate-500 font-medium">{signatory.name}</div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewStudent(null)}
                className="text-xs font-bold"
              >
                Close Preview
              </Button>
              <Button
                type="button"
                onClick={() => handleDownloadSinglePdf(previewStudent)}
                disabled={isDownloading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download This Hall Ticket (PDF)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
