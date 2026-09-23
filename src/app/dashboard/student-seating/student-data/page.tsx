"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStudentSeating } from '@/lib/student-seating-context';
import { StudentSubject, StudentRecord } from '@/lib/student-seating-types';
import { STANDARD_STUDENT_SUBJECTS, STANDARD_SUBJECT_CODES } from '@/lib/student-seating-service';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentDataPage() {
  const {
    subjects,
    addSubject,
    deleteSubject,
    saveSubjectStudents,
    getSubjectStudents,
    clearSubjectStudents,
  } = useStudentSeating();
  const { toast } = useToast();

  const [uploadSubject, setUploadSubject] = useState<StudentSubject | null>(null);
  const [viewingSubject, setViewingSubject] = useState<StudentSubject | null>(null);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjExpected, setNewSubjExpected] = useState<number>(100);

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
    if (!newSubjCode.trim() && STANDARD_SUBJECT_CODES[subject]) {
      setNewSubjCode(STANDARD_SUBJECT_CODES[subject]);
    }
    setIsDropdownOpen(false);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;
    setIsDropdownOpen(false);

    addSubject(newSubjName.trim(), newSubjCode.trim() || undefined, newSubjExpected || 0);
    toast({
      title: "Subject Added",
      description: `Added ${newSubjName.trim()} to subjects list.`,
    });
    setNewSubjName('');
    setNewSubjCode('');
    setNewSubjExpected(100);
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                Student Data
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Upload student rosters subject-wise with automated Excel validation.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Button
            onClick={() => {
              setIsDropdownOpen(false);
              setIsAddSubjectOpen(true);
            }}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </Button>
        </div>
      </div>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {subjects.map((subj) => {
          const students = getSubjectStudents(subj.id);
          const hasUploaded = students.length > 0;

          return (
            <div
              key={subj.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-headline font-bold text-base text-slate-900 leading-tight">
                      {subj.name}
                    </h3>
                    {subj.code && (
                      <span className="text-[11px] text-slate-400 font-mono font-medium">
                        Code: {subj.code}
                      </span>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      hasUploaded
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                        : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                    }
                  >
                    {hasUploaded ? "Uploaded" : "No Data"}
                  </Badge>
                </div>

                {/* Counter Metric */}
                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Student Count
                    </div>
                    <div className="font-headline font-black text-xl text-slate-800">
                      {students.length}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        {subj.expectedStudents > 0 ? `/ ${subj.expectedStudents} Exp.` : 'Students'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-indigo-600 shadow-2xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingSubject(subj)}
                    disabled={!hasUploaded}
                    className="h-8 text-xs font-semibold px-2.5 gap-1 text-slate-700 hover:bg-slate-100"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setUploadSubject(subj)}
                    className="h-8 text-xs font-bold px-3 gap-1 bg-[#1E2A5E] hover:bg-[#151D42] text-white"
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
                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Delete Subject"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Subject Modal */}
      <Dialog
        open={isAddSubjectOpen}
        onOpenChange={(open) => {
          setIsAddSubjectOpen(open);
          if (!open) setIsDropdownOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <BookOpen className="w-5 h-5" />
              </div>
              <DialogTitle className="font-headline text-lg font-bold text-slate-900">
                Add New Subject
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500">
              Create a subject card to upload student lists for examinations.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateSubject} className="space-y-4 py-2">
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <Label htmlFor="subj-name" className="text-xs font-bold text-slate-700">
                  Subject Name <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[10px] text-slate-400 font-medium">
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
                  className="text-xs font-semibold pr-9 bg-slate-50/50 focus:bg-white transition-colors"
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded-sm"
                  title="Toggle standard subjects list"
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      isDropdownOpen && "rotate-180 text-indigo-600"
                    )}
                  />
                </button>
              </div>

              {/* Enhanced Visual Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl py-1 text-xs divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/95 sticky top-0 flex items-center justify-between z-10 backdrop-blur-xs">
                    <span>Standard Subjects ({STANDARD_STUDENT_SUBJECTS.length})</span>
                    <span className="text-[9px] font-semibold text-indigo-600">A – Z</span>
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
                              "w-full text-left px-3 py-2 flex items-center justify-between transition-colors hover:bg-indigo-50/80 hover:text-indigo-900 group",
                              isSelected ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-700 font-medium"
                            )}
                          >
                            <span>{subj}</span>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {STANDARD_SUBJECT_CODES[subj] || ''}
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center space-y-1">
                        <p className="text-slate-600 font-semibold text-xs">Custom Subject</p>
                        <p className="text-[11px] text-slate-500">
                          Click &ldquo;Create Subject&rdquo; to use <span className="font-bold text-slate-800">&ldquo;{newSubjName}&rdquo;</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="subj-code" className="text-xs font-bold text-slate-700">
                  Subject Code (Optional)
                </Label>
                <Input
                  id="subj-code"
                  placeholder="e.g. PHY201"
                  value={newSubjCode}
                  onChange={(e) => setNewSubjCode(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subj-expected" className="text-xs font-bold text-slate-700">
                  Student Strength
                </Label>
                <Input
                  id="subj-expected"
                  type="number"
                  min="0"
                  value={newSubjExpected}
                  onChange={(e) => setNewSubjExpected(parseInt(e.target.value) || 0)}
                  className="text-xs font-bold"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddSubjectOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5"
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
        <DialogContent className="sm:max-w-xl bg-white border border-slate-200 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="font-headline text-lg font-bold text-slate-900">
                    {viewingSubject?.name} &bull; Students ({viewingSubject ? getSubjectStudents(viewingSubject.id).length : 0})
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
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
                  className="text-xs h-8 text-rose-600 hover:bg-rose-50 border-rose-200"
                >
                  Clear List
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl my-2">
            {viewingSubject && getSubjectStudents(viewingSubject.id).length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">Sl No</th>
                    <th className="py-2.5 px-3 font-bold">Roll No.</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-3 text-center">Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {getSubjectStudents(viewingSubject.id).map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{std.rollNo}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{std.name}</td>
                      <td className="py-2.5 px-3 text-center">{std.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
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
              className="text-xs h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
