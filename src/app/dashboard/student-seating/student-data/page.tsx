"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAuth } from '@/lib/auth-context';
import { StudentSubject, StudentRecord } from '@/lib/student-seating-types';
import { STANDARD_STUDENT_SUBJECTS, STANDARD_SUBJECT_CODES } from '@/lib/student-seating-service';
import { getClassBadgeStyle } from '@/lib/student-seating-colors';
import { resolveSubjectClass } from '@/lib/student-seating-utils';
import { StudentUploadDialog } from '@/components/dashboard/student-seating/student-upload-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen,
  Users,
  Upload,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
  Check,
  GraduationCap,
  ExternalLink,
  Layers,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassGroupConfig {
  className: string;
  cardBg: string;             // Light pastel background across card surface
  cardBorder: string;         // Subtle matching border
  cardAccent: string;         // Top accent bar color
  badgeClass: string;         // Distinct class badge style on card
  badgeDot: string;           // Indicator dot on badge
  bannerBg: string;           // Banner surface gradient
  bannerBorder: string;       // Banner outline border
  bannerText: string;         // Banner heading text
  bannerPill: string;         // Banner stat pills
  bannerIconColor: string;    // Banner icon tint
  metricBg: string;           // Inner metric box
  metricText: string;         // Metric value text
}

function getClassGroupTheme(rawClass: string): ClassGroupConfig {
  const norm = rawClass.trim().toUpperCase().replace(/\s+/g, '');

  if (norm.includes('1PUC') || norm === '1' || norm.includes('IPUC') || norm.includes('CLASS11') || norm.includes('11TH')) {
    return {
      className: '1 PUC',
      cardBg: 'bg-[#F0F7FF] dark:bg-[#0c1a2e]',
      cardBorder: 'border-[#BAE6FD] dark:border-[#1e3a5f]',
      cardAccent: 'bg-sky-500',
      badgeClass: 'bg-sky-100 dark:bg-sky-900/70 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700 font-extrabold',
      badgeDot: 'bg-sky-500',
      bannerBg: 'bg-gradient-to-r from-sky-50 via-blue-50/70 to-indigo-50/40 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-950/20',
      bannerBorder: 'border-sky-200/90 dark:border-sky-800/60',
      bannerText: 'text-sky-950 dark:text-sky-100',
      bannerPill: 'bg-white/80 dark:bg-sky-900/50 text-sky-850 dark:text-sky-200 border-sky-200/90 dark:border-sky-700',
      bannerIconColor: 'text-sky-600 dark:text-sky-400',
      metricBg: 'bg-white/80 dark:bg-slate-900/70 border-sky-200/70 dark:border-sky-800/40',
      metricText: 'text-sky-950 dark:text-sky-200',
    };
  }

  if (norm.includes('2PUC') || norm === '2' || norm.includes('IIPUC') || norm.includes('CLASS12') || norm.includes('12TH')) {
    return {
      className: '2 PUC',
      cardBg: 'bg-[#F0FDF4] dark:bg-[#0b2419]',
      cardBorder: 'border-[#A7F3D0] dark:border-[#134e38]',
      cardAccent: 'bg-emerald-500',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-extrabold',
      badgeDot: 'bg-emerald-500',
      bannerBg: 'bg-gradient-to-r from-emerald-50 via-teal-50/70 to-green-50/40 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-green-950/20',
      bannerBorder: 'border-emerald-200/90 dark:border-emerald-800/60',
      bannerText: 'text-emerald-950 dark:text-emerald-100',
      bannerPill: 'bg-white/80 dark:bg-emerald-900/50 text-emerald-850 dark:text-emerald-200 border-emerald-200/90 dark:border-emerald-700',
      bannerIconColor: 'text-emerald-600 dark:text-emerald-400',
      metricBg: 'bg-white/80 dark:bg-slate-900/70 border-emerald-200/70 dark:border-emerald-800/40',
      metricText: 'text-emerald-950 dark:text-emerald-200',
    };
  }

  if (norm.includes('1&2') || norm.includes('BOTH') || norm.includes('3PUC') || norm.includes('DEGREE')) {
    return {
      className: rawClass || 'Other Class',
      cardBg: 'bg-[#FAF5FF] dark:bg-[#1b1130]',
      cardBorder: 'border-[#DDD6FE] dark:border-[#4c2882]',
      cardAccent: 'bg-purple-500',
      badgeClass: 'bg-purple-100 dark:bg-purple-900/70 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-extrabold',
      badgeDot: 'bg-purple-500',
      bannerBg: 'bg-gradient-to-r from-purple-50 via-violet-50/70 to-fuchsia-50/40 dark:from-purple-950/40 dark:via-violet-950/30 dark:to-fuchsia-950/20',
      bannerBorder: 'border-purple-200/90 dark:border-purple-800/60',
      bannerText: 'text-purple-950 dark:text-purple-100',
      bannerPill: 'bg-white/80 dark:bg-purple-900/50 text-purple-850 dark:text-purple-200 border-purple-200/90 dark:border-purple-700',
      bannerIconColor: 'text-purple-600 dark:text-purple-400',
      metricBg: 'bg-white/80 dark:bg-slate-900/70 border-purple-200/70 dark:border-purple-800/40',
      metricText: 'text-purple-950 dark:text-purple-200',
    };
  }

  return {
    className: rawClass || 'General / Unassigned',
    cardBg: 'bg-[#F8FAFC] dark:bg-[#0f172a]',
    cardBorder: 'border-[#E2E8F0] dark:border-[#334155]',
    cardAccent: 'bg-slate-400',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 font-extrabold',
    badgeDot: 'bg-slate-400',
    bannerBg: 'bg-gradient-to-r from-slate-50 via-gray-50/70 to-slate-100/40 dark:from-slate-900/40 dark:via-gray-900/30 dark:to-slate-950/20',
    bannerBorder: 'border-slate-200/90 dark:border-slate-800/60',
    bannerText: 'text-slate-900 dark:text-slate-100',
    bannerPill: 'bg-white/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
    bannerIconColor: 'text-slate-600 dark:text-slate-400',
    metricBg: 'bg-white/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700',
    metricText: 'text-slate-900 dark:text-slate-100',
  };
}



export default function StudentDataPage() {
  const {
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    clearAllSubjects,
    saveSubjectStudents,
    getSubjectStudents,
    clearSubjectStudents,
  } = useStudentSeating();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [uploadSubject, setUploadSubject] = useState<StudentSubject | null>(null);
  const [viewingSubject, setViewingSubject] = useState<StudentSubject | null>(null);
  const [editingSubject, setEditingSubject] = useState<StudentSubject | null>(null);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjExpected, setNewSubjExpected] = useState<string>('');

  const [editSubjName, setEditSubjName] = useState('');
  const [editSubjCode, setEditSubjCode] = useState('');
  const [editSubjExpected, setEditSubjExpected] = useState<string>('');

  // Combobox state for Subject Name
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter standard subjects matching user input
  const filteredSubjects = useMemo(() => {
    const query = newSubjName.trim().toLowerCase();
    if (!query) return STANDARD_STUDENT_SUBJECTS;
    return STANDARD_STUDENT_SUBJECTS.filter((s) => s.toLowerCase().includes(query));
  }, [newSubjName]);

  const handleSelectSubject = (subject: string) => {
    setNewSubjName(subject);
    setIsDropdownOpen(false);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;
    setIsDropdownOpen(false);

    const expectedCount = newSubjExpected.trim() ? parseInt(newSubjExpected.trim(), 10) : 0;
    addSubject(newSubjName.trim(), newSubjCode.trim() || undefined, expectedCount);
    toast({
      title: "Subject Added",
      description: `Added ${newSubjName.trim()} to ${newSubjCode.trim() || 'subjects'} list.`,
    });
    setNewSubjName('');
    setNewSubjCode('');
    setNewSubjExpected('');
    setIsAddSubjectOpen(false);
  };

  const handleSaveStudents = (subjectId: string, students: StudentRecord[]) => {
    saveSubjectStudents(subjectId, students);
    const subj = subjects.find((s) => s.id === subjectId);
    toast({
      title: "Students Saved",
      description: `Successfully stored ${students.length} student records for ${subj?.name || 'Subject'}.`,
    });
  };

  // Group subjects by class segment
  const groupedSubjects = useMemo(() => {
    const groups: Record<string, StudentSubject[]> = {};

    subjects.forEach((subj) => {
      const students = getSubjectStudents(subj.id);
      const cls = resolveSubjectClass(subj, students);
      if (!groups[cls]) {
        groups[cls] = [];
      }
      groups[cls].push(subj);
    });

    // Custom sort order: 1 PUC first, 2 PUC second, then others alphabetically, Unassigned last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const is1A = a.includes('1 PUC');
      const is1B = b.includes('1 PUC');
      if (is1A && !is1B) return -1;
      if (!is1A && is1B) return 1;

      const is2A = a.includes('2 PUC');
      const is2B = b.includes('2 PUC');
      if (is2A && !is2B) return -1;
      if (!is2A && is2B) return 1;

      const isUnA = a.toLowerCase().includes('unassigned') || a.toLowerCase().includes('general');
      const isUnB = b.toLowerCase().includes('unassigned') || b.toLowerCase().includes('general');
      if (isUnA && !isUnB) return 1;
      if (!isUnA && isUnB) return -1;

      return a.localeCompare(b);
    });

    return sortedKeys.map((cls) => ({
      className: cls,
      theme: getClassGroupTheme(cls),
      subjects: groups[cls],
    }));
  }, [subjects, getSubjectStudents]);

  // Calculate unique student count across all subjects (deduplicating by roll number / name / ID)
  const { totalUniqueStudents, totalEnrollments } = useMemo(() => {
    const uniqueKeys = new Set<string>();
    let enrollments = 0;

    for (const subj of subjects) {
      const list = getSubjectStudents(subj.id);
      enrollments += list.length;

      for (const student of list) {
        const roll = student.rollNo?.trim().toUpperCase();
        const name = student.name?.trim().toLowerCase();
        const section = student.section?.trim().toUpperCase();

        // Primary deduplication: normalized roll number (and section if applicable)
        let key = '';
        if (roll) {
          key = section ? `ROLL:${section}_${roll}` : `ROLL:${roll}`;
        } else if (name) {
          key = section ? `NAME:${section}_${name}` : `NAME:${name}`;
        } else if (student.id) {
          key = `ID:${student.id}`;
        }

        if (key) {
          uniqueKeys.add(key);
        }
      }
    }

    // Fallback Logic:
    let uniqueCount = uniqueKeys.size;
    const englishSubj = subjects.find((s) => {
      const lower = s.name.trim().toLowerCase();
      return lower === 'english' || lower.includes('english');
    });

    if (englishSubj) {
      const englishList = getSubjectStudents(englishSubj.id);
      if (uniqueCount === 0 || englishList.length > uniqueCount) {
        uniqueCount = englishList.length;
      }
    }

    return {
      totalUniqueStudents: uniqueCount,
      totalEnrollments: enrollments,
    };
  }, [subjects, getSubjectStudents]);

  const totalUploadedStudents = totalUniqueStudents;

  const uploadedSubjectsCount = useMemo(() => {
    return subjects.filter((subj) => getSubjectStudents(subj.id).length > 0).length;
  }, [subjects, getSubjectStudents]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner - Sticky Top Panel */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-[#f4f6fa]/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                  Subject Strength
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Manage student rosters and subject strength grouped by class segments.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const code = profile?.institution_code || '001';
                  const url = `${window.location.origin}/student/login?code=${encodeURIComponent(code)}`;
                  navigator.clipboard.writeText(url);
                  toast({
                    title: `Student Portal Link Copied! (Inst ${code})`,
                    description: "Share this URL with students: " + url,
                  });
                }
              }}
              className="border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold text-xs h-9 px-3 gap-1.5 shadow-2xs"
              title="Copy Student Login URL to share with students"
            >
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Student Portal</span> Link
            </Button>

            {subjects.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsClearConfirmOpen(true)}
                className="border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800 font-bold text-xs h-9 px-3 gap-1.5 shadow-2xs"
                title="Clear all subjects and student data"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Space</span>
              </Button>
            )}

            <Button
              onClick={() => {
                setIsDropdownOpen(false);
                setNewSubjName('');
                setNewSubjCode('1 PUC');
                setNewSubjExpected('');
                setIsAddSubjectOpen(true);
              }}
              className="bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Subject
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Class Segments
            </div>
            <div className="font-headline font-black text-2xl text-slate-800 dark:text-white mt-0.5">
              {groupedSubjects.length}
            </div>
          </div>
          <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Subjects
            </div>
            <div className="font-headline font-black text-2xl text-slate-800 dark:text-white mt-0.5">
              {subjects.length}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Rosters Uploaded
            </div>
            <div className="font-headline font-black text-2xl text-slate-800 dark:text-white mt-0.5">
              {uploadedSubjectsCount}{" "}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                / {subjects.length}
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Students
            </div>
            <div className="font-headline font-black text-2xl text-indigo-700 dark:text-indigo-400 mt-0.5">
              {totalUniqueStudents.toLocaleString()}
            </div>
            {totalEnrollments > 0 && totalEnrollments !== totalUniqueStudents && (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                {totalEnrollments.toLocaleString()} enrollments
              </div>
            )}
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Class Segments & Subject Cards Grid */}
      {subjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs border border-indigo-100 dark:border-indigo-900/40">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-headline font-bold text-base text-slate-800 dark:text-white">
              No Subjects Added Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your student workspace is clear and ready. Click <strong>Add Subject</strong> to configure examination subjects grouped by class (1 PUC, 2 PUC) and upload student rosters fresh.
            </p>
          </div>
          <Button
            onClick={() => {
              setIsDropdownOpen(false);
              setNewSubjName('');
              setNewSubjCode('1 PUC');
              setNewSubjExpected('');
              setIsAddSubjectOpen(true);
            }}
            className="bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add First Subject
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedSubjects.map((group) => {
            const classTotalEnrollments = group.subjects.reduce(
              (sum, s) => sum + getSubjectStudents(s.id).length,
              0
            );
            const classUploadedCount = group.subjects.filter(
              (s) => getSubjectStudents(s.id).length > 0
            ).length;

            return (
              <section key={group.className} className="space-y-4">
                {/* Class Banner */}
                <div
                  className={cn(
                    "rounded-xl p-4 sm:p-5 border shadow-2xs transition-all",
                    group.theme.bannerBg,
                    group.theme.bannerBorder
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/95 dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center justify-center shrink-0">
                        <GraduationCap className={cn("w-6 h-6", group.theme.bannerIconColor)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className={cn("font-headline text-xl sm:text-2xl font-black tracking-tight", group.theme.bannerText)}>
                            {group.className}
                          </h2>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs shadow-2xs",
                              group.theme.badgeClass
                            )}
                          >
                            <span className={cn("w-2 h-2 rounded-full shrink-0", group.theme.badgeDot)} />
                            <span>Class Segment</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                          Subject strength cards and student allocations for {group.className}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold shadow-2xs", group.theme.bannerPill)}>
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{group.subjects.length} Subjects</span>
                      </span>

                      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold shadow-2xs", group.theme.bannerPill)}>
                        <Users className="w-3.5 h-3.5" />
                        <span>{classTotalEnrollments.toLocaleString()} Students</span>
                      </span>

                      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold shadow-2xs", group.theme.bannerPill)}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{classUploadedCount} / {group.subjects.length} Uploaded</span>
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setNewSubjName('');
                          setNewSubjCode(group.className.includes('Unassigned') ? '' : group.className);
                          setNewSubjExpected('');
                          setIsAddSubjectOpen(true);
                        }}
                        className="h-8 text-xs font-bold px-3 gap-1 bg-white/95 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 border-slate-300/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to {group.className}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Subject Cards Grid with Uniform Light Pastel Background */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.subjects.map((subj) => {
                    const students = getSubjectStudents(subj.id);
                    const hasUploaded = students.length > 0;

                    return (
                      <div
                        key={subj.id}
                        className={cn(
                          "relative rounded-xl p-5 border shadow-2xs transition-all flex flex-col justify-between space-y-4 overflow-hidden hover:shadow-md",
                          group.theme.cardBg,
                          group.theme.cardBorder
                        )}
                      >
                        {/* Top Accent Bar */}
                        <div className={cn("absolute top-0 left-0 right-0 h-1", group.theme.cardAccent)} />

                        <div className="space-y-3 pt-0.5">
                          {/* Top Row: Class Badge & Upload Status Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs shadow-2xs",
                                group.theme.badgeClass
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", group.theme.badgeDot)} />
                              <span>{group.className}</span>
                            </span>

                            <Badge
                              variant="outline"
                              className={
                                hasUploaded
                                  ? "bg-emerald-100/95 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 text-[10px] font-bold shadow-2xs"
                                  : "bg-amber-100/95 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 text-[10px] font-bold shadow-2xs"
                              }
                            >
                              {hasUploaded ? "Uploaded" : "No Data"}
                            </Badge>
                          </div>

                          {/* Subject Title */}
                          <div>
                            <h3 className="font-headline font-black text-lg text-slate-900 dark:text-white leading-tight">
                              {subj.name}
                            </h3>
                            {subj.code && subj.code !== group.className ? (
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                                Class / Code: {subj.code}
                              </p>
                            ) : null}
                          </div>

                          {/* Student Strength Metric Box */}
                          <div className={cn("p-3 rounded-lg border flex items-center justify-between shadow-2xs", group.theme.metricBg)}>
                            <div>
                              <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-wider">
                                Student Strength
                              </div>
                              <div className={cn("font-headline font-black text-2xl mt-0.5", group.theme.metricText)}>
                                {students.length}{" "}
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  {subj.expectedStudents > 0 ? `/ ${subj.expectedStudents} Exp.` : 'Students'}
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs">
                              <BookOpen className="w-5 h-5" />
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingSubject(subj)}
                              disabled={!hasUploaded}
                              className="h-8 text-xs font-bold px-2.5 gap-1 bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => setUploadSubject(subj)}
                              className="h-8 text-xs font-bold px-3 gap-1 bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {hasUploaded ? "Re-upload" : "Upload"}
                            </Button>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingSubject(subj);
                                setEditSubjName(subj.name);
                                setEditSubjCode(subj.code || (group.className.includes('Unassigned') ? '' : group.className));
                                setEditSubjExpected(subj.expectedStudents > 0 ? String(subj.expectedStudents) : '');
                              }}
                              className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white/80 dark:hover:bg-slate-800/80"
                              title="Edit Subject or Change Class"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Delete subject ${subj.name} and all its uploaded students?`)) {
                                  deleteSubject(subj.id);
                                  toast({ title: "Subject Deleted", description: `Deleted ${subj.name}.` });
                                }
                              }}
                              className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Delete Subject"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Add Subject Modal */}
      <Dialog
        open={isAddSubjectOpen}
        onOpenChange={(open) => {
          setIsAddSubjectOpen(open);
          if (!open) setIsDropdownOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                <BookOpen className="w-5 h-5" />
              </div>
              <DialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
                Add New Subject
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create a subject card to upload student lists for examinations.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateSubject} className="space-y-4 py-2">
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <Label htmlFor="subj-name" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Subject Name <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Select or type
                </span>
              </div>

              <div className="relative">
                <Input
                  id="subj-name"
                  placeholder="Select from dropdown or type custom subject..."
                  value={newSubjName}
                  onChange={(e) => {
                    setNewSubjName(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onClick={() => setIsDropdownOpen(true)}
                  className="text-xs font-semibold pr-9 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 transition-colors"
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-sm"
                  title="Toggle standard subjects list"
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      isDropdownOpen && "rotate-180 text-indigo-600 dark:text-indigo-400"
                    )}
                  />
                </button>
              </div>

              {/* Enhanced Visual Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/95 dark:bg-slate-800/95 sticky top-0 flex items-center justify-between z-10 backdrop-blur-xs">
                    <span>Standard Subjects ({STANDARD_STUDENT_SUBJECTS.length})</span>
                    <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">A – Z</span>
                  </div>

                  <div className="py-0.5">
                    {filteredSubjects.length > 0 ? (
                      filteredSubjects.map((subj) => {
                        const isSelected = newSubjName.trim().toLowerCase() === subj.toLowerCase();
                        return (
                          <button
                            key={subj}
                            type="button"
                            onClick={() => handleSelectSubject(subj)}
                            className={cn(
                              "w-full text-left px-3 py-2 flex items-center justify-between transition-colors hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60 hover:text-indigo-900 dark:hover:text-indigo-200 group cursor-pointer",
                              isSelected ? "bg-indigo-50 dark:bg-indigo-950/80 font-bold text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-200 font-medium"
                            )}
                          >
                            <span>{subj}</span>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                {STANDARD_SUBJECT_CODES[subj] || ''}
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center space-y-1">
                        <p className="text-slate-600 dark:text-slate-300 font-semibold text-xs">Custom Subject</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Click &ldquo;Create Subject&rdquo; to use <span className="font-bold text-slate-800 dark:text-slate-200">&ldquo;{newSubjName}&rdquo;</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subj-code" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Class Segment
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewSubjCode('1 PUC')}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer",
                        newSubjCode.trim() === '1 PUC'
                          ? "bg-sky-600 text-white border-sky-700 shadow-2xs"
                          : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                      )}
                    >
                      1 PUC
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSubjCode('2 PUC')}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer",
                        newSubjCode.trim() === '2 PUC'
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      )}
                    >
                      2 PUC
                    </button>
                  </div>
                </div>
                <Input
                  id="subj-code"
                  placeholder="e.g. 1 PUC, 2 PUC"
                  value={newSubjCode}
                  onChange={(e) => setNewSubjCode(e.target.value)}
                  className="text-xs font-medium bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                {newSubjCode.trim() && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold shadow-2xs",
                        getClassBadgeStyle(newSubjCode).badgeClass
                      )}
                    >
                      <span
                        className={cn("w-1.5 h-1.5 rounded-full shrink-0", getClassBadgeStyle(newSubjCode).dotColor)}
                      />
                      <span>Class: {newSubjCode.trim()}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subj-expected" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Student Strength
                </Label>
                <Input
                  id="subj-expected"
                  type="text"
                  inputMode="numeric"
                  placeholder=""
                  value={newSubjExpected}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val)) {
                      setNewSubjExpected(val);
                    }
                  }}
                  className="text-xs font-bold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddSubjectOpen(false)}
                className="text-xs h-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 cursor-pointer"
              >
                Create Subject
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Subject & Class Dialog */}
      <Dialog
        open={Boolean(editingSubject)}
        onOpenChange={(open) => {
          if (!open) setEditingSubject(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                <Pencil className="w-5 h-5" />
              </div>
              <DialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
                Edit Subject &amp; Class
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update the subject name, assign to a class segment (1 PUC / 2 PUC), or change strength.
            </p>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingSubject || !editSubjName.trim()) return;
              const expectedCount = editSubjExpected.trim() ? parseInt(editSubjExpected.trim(), 10) : 0;
              updateSubject(editingSubject.id, {
                name: editSubjName.trim(),
                code: editSubjCode.trim() || undefined,
                expectedStudents: expectedCount,
              });
              toast({
                title: "Subject Updated",
                description: `Updated ${editSubjName.trim()} (Class: ${editSubjCode.trim() || 'General'}).`,
              });
              setEditingSubject(null);
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Subject Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={editSubjName}
                onChange={(e) => setEditSubjName(e.target.value)}
                className="text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Class Segment
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditSubjCode('1 PUC')}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer",
                        editSubjCode.trim() === '1 PUC'
                          ? "bg-sky-600 text-white border-sky-700 shadow-2xs"
                          : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                      )}
                    >
                      1 PUC
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSubjCode('2 PUC')}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer",
                        editSubjCode.trim() === '2 PUC'
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      )}
                    >
                      2 PUC
                    </button>
                  </div>
                </div>
                <Input
                  placeholder="e.g. 1 PUC, 2 PUC"
                  value={editSubjCode}
                  onChange={(e) => setEditSubjCode(e.target.value)}
                  className="text-xs font-medium bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Student Strength
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={editSubjExpected}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val)) {
                      setEditSubjExpected(val);
                    }
                  }}
                  className="text-xs font-bold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingSubject(null)}
                className="text-xs h-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 cursor-pointer"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <StudentUploadDialog
        open={Boolean(uploadSubject)}
        onOpenChange={(open) => {
          if (!open) setUploadSubject(null);
        }}
        subject={uploadSubject}
        onSave={handleSaveStudents}
      />

      {/* View Student List Dialog */}
      <Dialog
        open={Boolean(viewingSubject)}
        onOpenChange={(open) => {
          if (!open) setViewingSubject(null);
        }}
      >
        <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
                      {viewingSubject?.name} &bull; Students ({viewingSubject ? getSubjectStudents(viewingSubject.id).length : 0})
                    </DialogTitle>
                    {viewingSubject?.code && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-tight shadow-2xs",
                          getClassBadgeStyle(viewingSubject.code).badgeClass
                        )}
                      >
                        <span
                          className={cn("w-1.5 h-1.5 rounded-full shrink-0", getClassBadgeStyle(viewingSubject.code).dotColor)}
                        />
                        <span>Class: {viewingSubject.code}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Uploaded student roster for {viewingSubject?.name}
                  </p>
                </div>
              </div>

              {viewingSubject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Clear all uploaded student records for ${viewingSubject.name}?`)) {
                      clearSubjectStudents(viewingSubject.id);
                      setViewingSubject(null);
                      toast({ title: "List Cleared", description: "Cleared student list." });
                    }
                  }}
                  className="text-xs h-8 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60"
                >
                  Clear List
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl my-2">
            {viewingSubject && getSubjectStudents(viewingSubject.id).length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">Sl No</th>
                    <th className="py-2.5 px-3 font-bold">Roll No.</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-3 text-center">Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {getSubjectStudents(viewingSubject.id).map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">{std.rollNo}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{std.name}</td>
                      <td className="py-2.5 px-3 text-center">{std.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No student records uploaded yet.
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewingSubject(null)}
              className="text-xs h-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Subjects & Students Confirmation Dialog */}
      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md text-slate-900 dark:text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
              <Trash2 className="w-5 h-5" />
              <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Clear All Subjects & Student Data?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently delete all {subjects.length} subjects and any uploaded student rosters from your workspace, giving you a fresh, empty space to add new subjects. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAllSubjects();
                setIsClearConfirmOpen(false);
                toast({
                  title: "Student Space Cleared",
                  description: "All subjects and student records have been permanently cleared.",
                });
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-4"
            >
              Clear Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
