"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAuth } from '@/lib/auth-context';
import { StudentSubject, StudentRecord } from '@/lib/student-seating-types';
import { STANDARD_STUDENT_SUBJECTS, STANDARD_SUBJECT_CODES } from '@/lib/student-seating-service';
import { getClassBadgeStyle } from '@/lib/student-seating-colors';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentDataPage() {
  const {
    subjects,
    addSubject,
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
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjExpected, setNewSubjExpected] = useState<string>('');

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
      description: `Added ${newSubjName.trim()} to subjects list.`,
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
    // If unique ID deduplication isn't feasible or records lacked IDs,
    // use the total student count from the mandatory English subject list as the baseline reference,
    // since every student is enrolled in English once.
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
                  Student Data
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Upload student rosters subject-wise with automated Excel validation.
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
                setNewSubjCode('');
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
              Total Unique Students
            </div>
            <div className="font-headline font-black text-2xl text-indigo-700 dark:text-indigo-400 mt-0.5">
              {totalUniqueStudents.toLocaleString()}
            </div>
            {totalEnrollments > 0 && totalEnrollments !== totalUniqueStudents && (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                {totalEnrollments.toLocaleString()} total subject enrollments
              </div>
            )}
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Subject Cards Grid or Clean Empty Space */}
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
              Your student workspace is clear and ready. Click <strong>Add Subject</strong> to configure examination subjects and upload student rosters fresh.
            </p>
          </div>
          <Button
            onClick={() => {
              setIsDropdownOpen(false);
              setNewSubjName('');
              setNewSubjCode('');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subjects.map((subj) => {
            const students = getSubjectStudents(subj.id);
            const hasUploaded = students.length > 0;

            return (
              <div
                key={subj.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-headline font-bold text-base text-slate-900 dark:text-white leading-tight">
                        {subj.name}
                      </h3>
                      {subj.code ? (
                        <div className="mt-1 flex items-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-tight shadow-2xs",
                              getClassBadgeStyle(subj.code).badgeClass
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                getClassBadgeStyle(subj.code).dotColor
                              )}
                            />
                            <span>Class: {subj.code}</span>
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        hasUploaded
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px]"
                      }
                    >
                      {hasUploaded ? "Uploaded" : "No Data"}
                    </Badge>
                  </div>

                  {/* Counter Metric */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                        Student Count
                      </div>
                      <div className="font-headline font-black text-xl text-slate-800 dark:text-white">
                        {students.length}{" "}
                        <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                          {subj.expectedStudents > 0 ? `/ ${subj.expectedStudents} Exp.` : 'Students'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingSubject(subj)}
                      disabled={!hasUploaded}
                      className="h-8 text-xs font-semibold px-2.5 gap-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setUploadSubject(subj)}
                      className="h-8 text-xs font-bold px-3 gap-1 bg-[#1E2A5E] hover:bg-[#151D42] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {hasUploaded ? "Re-upload" : "Upload"}
                    </Button>
                  </div>

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
                <Label htmlFor="subj-code" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Class
                </Label>
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
