"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  InvigilatorDuty,
  StudentAttendanceRecord,
  AttendanceStatus,
  RoomAttendanceSubmission,
} from '@/lib/invigilator-portal-types';
import { useInvigilatorPortal } from '@/lib/invigilator-portal-context';
import {
  getRoomStudentsForDuty,
  saveAttendanceDraft,
  getAttendanceDraft,
  submitRoomAttendance,
  getAttendanceSubmission,
  requestAttendanceCorrection,
} from '@/lib/invigilator-portal-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Clock,
  ArrowLeft,
  Users,
  DoorOpen,
  Calendar,
  Save,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  HelpCircle,
  MessageSquare,
  FileCheck2,
} from 'lucide-react';

interface RoomAttendanceSheetProps {
  duty: InvigilatorDuty;
  onBack?: () => void;
  isViewOnly?: boolean;
}

export function RoomAttendanceSheet({
  duty,
  onBack,
  isViewOnly = false,
}: RoomAttendanceSheetProps) {
  const { session, refreshDuties } = useInvigilatorPortal();
  const { toast } = useToast();

  const [students, setStudents] = useState<StudentAttendanceRecord[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [submission, setSubmission] = useState<RoomAttendanceSubmission | null>(null);

  // Modal states
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [hasDraftSaved, setHasDraftSaved] = useState(false);

  // Initialize room roster & saved submissions
  useEffect(() => {
    // 1. Check if already submitted
    const existingSub = getAttendanceSubmission(duty.dutyId);
    if (existingSub) {
      setSubmission(existingSub);
      setStudents(existingSub.records);
      const map: Record<string, AttendanceStatus> = {};
      existingSub.records.forEach((r: StudentAttendanceRecord) => {
        map[r.registerNumber] = r.status;
      });
      setAttendanceMap(map);
      return;
    }

    // 2. Load fresh students for this duty
    const rawStudents = getRoomStudentsForDuty(duty);
    setStudents(rawStudents);

    // 3. Load in-progress draft if available
    const draft = getAttendanceDraft(duty.dutyId);
    if (draft) {
      setAttendanceMap(draft);
      setHasDraftSaved(true);
    } else {
      // Default: Not Marked for all
      const initialMap: Record<string, AttendanceStatus> = {};
      rawStudents.forEach((s) => {
        initialMap[s.registerNumber] = 'Not Marked';
      });
      setAttendanceMap(initialMap);
    }
  }, [duty]);

  // Handle Mark Attendance
  const handleMarkStatus = useCallback(
    (registerNumber: string, status: AttendanceStatus) => {
      if (submission?.isLocked || isViewOnly) return;

      setAttendanceMap((prev) => {
        const next = { ...prev, [registerNumber]: status };
        saveAttendanceDraft(duty.dutyId, next);
        setHasDraftSaved(true);
        return next;
      });
    },
    [duty.dutyId, submission?.isLocked, isViewOnly]
  );

  // Fast Bulk mark (e.g. mark all un-marked as present)
  const handleQuickMarkAllRemainingPresent = () => {
    if (submission?.isLocked || isViewOnly) return;
    setAttendanceMap((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        if (!next[s.registerNumber] || next[s.registerNumber] === 'Not Marked') {
          next[s.registerNumber] = 'Present';
        }
      });
      saveAttendanceDraft(duty.dutyId, next);
      setHasDraftSaved(true);
      return next;
    });
    toast({
      title: 'Batch Action Applied',
      description: 'All unmarked candidates set to Present. You can still adjust individual students.',
    });
  };

  // Live Summary calculation
  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let notMarked = 0;

    students.forEach((s) => {
      const st = attendanceMap[s.registerNumber] || 'Not Marked';
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else notMarked++;
    });

    return {
      total: students.length,
      present,
      absent,
      notMarked,
      isComplete: notMarked === 0 && students.length > 0,
    };
  }, [students, attendanceMap]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.registerNumber.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q) ||
        (s.benchNumber && s.benchNumber.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Handle Submit Attendance
  const handleConfirmSubmit = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      const res = await submitRoomAttendance(duty, session, attendanceMap, students);
      if (res.success && res.submission) {
        setSubmission(res.submission);
        setIsConfirmSubmitOpen(false);
        refreshDuties();
        toast({
          title: 'Attendance Submitted Successfully!',
          description: `Room ${duty.roomNo} attendance has been locked and permanently recorded.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Submission Blocked',
          description: res.error || 'Please ensure all students are marked before submitting.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Submitting Attendance',
        description: err.message || 'Could not record attendance.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Request Correction
  const handleRequestCorrection = () => {
    if (!correctionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason Required',
        description: 'Please explain what needs correction for audit records.',
      });
      return;
    }
    const res = requestAttendanceCorrection(duty.dutyId, correctionReason.trim());
    if (res.success) {
      setIsCorrectionModalOpen(false);
      refreshDuties();
      toast({
        title: 'Correction Request Dispatched',
        description: 'The college examination cell administrator has been notified.',
      });
      if (submission) {
        setSubmission({
          ...submission,
          correctionRequested: true,
          correctionReason: correctionReason.trim(),
        });
      }
    }
  };

  const isLocked = Boolean(submission?.isLocked || isViewOnly);

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Navigation & Header */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Today&apos;s Duties
        </button>
      )}

      {/* Main Room Card */}
      <div className="bg-gradient-to-r from-[#151241] via-[#1E2A5E] to-[#1E3A8A] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {duty.sessionPeriod} Session
              </span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold px-2.5 py-0.5 rounded-full">
                {duty.formattedDate}
              </span>
            </div>
            <h1 className="font-headline font-black text-2xl sm:text-3xl text-white tracking-tight flex items-center gap-2">
              <DoorOpen className="w-7 h-7 text-indigo-300 shrink-0" />
              Room {duty.roomNo}
            </h1>
            <p className="text-sm font-semibold text-indigo-200 mt-1">
              {duty.subjectName} {duty.subjectCode ? `(${duty.subjectCode})` : ''} • {duty.examName}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                Exam Timing
              </div>
              <div className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-300" />
                {duty.sessionTime}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                Room Strength
              </div>
              <div className="font-bold text-emerald-300 text-sm sm:text-base">
                {summary.total} Candidates
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Status Lock Banner (Requirement 11) */}
      {isLocked && submission && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="font-headline font-black text-emerald-950 text-base flex items-center gap-2">
                  Attendance Submitted ✓
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-400 font-bold text-[10px]">
                    Locked
                  </Badge>
                </div>
                <div className="text-xs text-emerald-800 mt-0.5 font-medium">
                  Submitted by: <strong>{submission.invigilatorName}</strong> • Submitted at: <strong>{submission.submittedAt}</strong>
                </div>
              </div>
            </div>

            <div>
              {submission.correctionRequested ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs px-3 py-1 font-bold">
                  Correction Requested
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCorrectionModalOpen(true)}
                  className="border-emerald-300 text-emerald-900 hover:bg-emerald-100 text-xs font-bold h-8"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                  Request Correction
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky / Top Live Attendance Summary Bar (Requirement 9) */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-md transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span className="font-headline font-black text-sm text-slate-800">
              Attendance Summary:
            </span>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-100 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total
              </div>
              <div className="text-base sm:text-lg font-black text-slate-800">
                {summary.total}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Present
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-700">
                {summary.present}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
              <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                Absent
              </div>
              <div className="text-base sm:text-lg font-black text-rose-700">
                {summary.absent}
              </div>
            </div>
            <div
              className={`p-2 rounded-xl border ${
                summary.notMarked > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider">
                Unmarked
              </div>
              <div className="text-base sm:text-lg font-black">
                {summary.notMarked}
              </div>
            </div>
          </div>
        </div>

        {/* Unmarked Warning Alert (Requirement 9) */}
        {!isLocked && summary.notMarked > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                ⚠️ {summary.notMarked} student{summary.notMarked > 1 ? 's have' : ' has'} not been marked.
              </span>
            </div>
            <button
              type="button"
              onClick={handleQuickMarkAllRemainingPresent}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline whitespace-nowrap"
            >
              Mark Rest Present
            </button>
          </div>
        )}

        {/* Offline Local Draft Confirmation Note */}
        {!isLocked && hasDraftSaved && (
          <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <Save className="w-3 h-3 text-emerald-600" />
            <span>Selections auto-saved locally on device (offline safe).</span>
          </div>
        )}
      </div>

      {/* Search Input Box (Requirement 7) */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search Register Number or Student Name (e.g. 123456 or Rahul)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-white border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-600 shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Student Attendance List Cards (Requirement 6, 8, 19) */}
      <div className="space-y-2.5">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No candidates match your search.</p>
            <p className="text-xs text-slate-400 mt-1">Try another register number or student name.</p>
          </div>
        ) : (
          filteredStudents.map((student, idx) => {
            const currentStatus = attendanceMap[student.registerNumber] || 'Not Marked';
            const isPresent = currentStatus === 'Present';
            const isAbsent = currentStatus === 'Absent';

            return (
              <div
                key={student.registerNumber}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isPresent
                    ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                    : isAbsent
                    ? 'bg-rose-50/60 border-rose-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Student Details (Requirement 8) */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm sm:text-base text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {student.registerNumber}
                      </span>
                      <span className="font-headline font-bold text-slate-800 text-sm sm:text-base">
                        {student.studentName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-indigo-700">Section {student.section}</span>
                      <span>•</span>
                      <span>Room {duty.roomNo}</span>
                      {student.benchNumber && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-slate-800">Bench {student.benchNumber}</span>
                        </>
                      )}
                      {student.position && student.position !== 'Unassigned' && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500 font-medium">Position: {student.position}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Present / Absent Buttons (Large Mobile-Friendly Tappable Buttons) */}
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleMarkStatus(student.registerNumber, 'Present')}
                      className={`flex-1 sm:flex-none min-w-[90px] h-11 sm:h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        isPresent
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30'
                          : 'bg-white border border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50'
                      } ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                    >
                      <Check className={`w-4 h-4 ${isPresent ? 'text-white' : 'text-emerald-600'}`} />
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleMarkStatus(student.registerNumber, 'Absent')}
                      className={`flex-1 sm:flex-none min-w-[90px] h-11 sm:h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        isAbsent
                          ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-600/30'
                          : 'bg-white border border-slate-300 text-slate-700 hover:border-rose-400 hover:bg-rose-50/50'
                      } ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                    >
                      <XCircle className={`w-4 h-4 ${isAbsent ? 'text-white' : 'text-rose-600'}`} />
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submit Attendance Button Bar (Requirement 10) */}
      {!isLocked && (
        <div className="pt-4">
          <Button
            type="button"
            disabled={!summary.isComplete}
            onClick={() => setIsConfirmSubmitOpen(true)}
            className={`w-full h-12 text-sm font-bold tracking-wider rounded-xl shadow-md transition-all ${
              summary.isComplete
                ? 'bg-[#1E2A5E] hover:bg-[#151D42] text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileCheck2 className="w-5 h-5 mr-2" />
            {summary.isComplete
              ? `SUBMIT ATTENDANCE FOR ROOM ${duty.roomNo}`
              : `MARK ALL CANDIDATES TO SUBMIT (${summary.notMarked} REMAINING)`}
          </Button>
        </div>
      )}

      {/* Confirmation Modal (Requirement 10) */}
      <Dialog open={isConfirmSubmitOpen} onOpenChange={setIsConfirmSubmitOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center mx-auto mb-2">
              <DoorOpen className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-headline font-bold text-center text-slate-800">
              Submit Room Attendance?
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 text-xs">
              Are you sure you want to submit attendance for <strong>Room {duty.roomNo}</strong> ({duty.subjectName})?
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 my-2">
            <div className="text-center font-bold text-sm text-slate-800 mb-1">
              Final Attendance Count
            </div>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold">
              <span className="text-slate-600">{summary.total} Total</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">{summary.present} Present</span>
              <span>•</span>
              <span className="text-rose-700 font-bold">{summary.absent} Absent</span>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Once submitted, attendance is locked to maintain examination integrity.
            </p>
          </div>

          <DialogFooter className="flex sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmSubmitOpen(false)}
              className="flex-1 h-10 rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmSubmit}
              className="flex-1 h-10 rounded-xl bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs shadow-xs"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Correction Modal (Requirement 11) */}
      <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-headline font-bold text-slate-800">
              Request Attendance Correction
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide details on what needs modification for Room {duty.roomNo}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <textarea
              rows={4}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Student 103 arrived late and should be marked Present instead of Absent..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <DialogFooter className="flex sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="flex-1 font-bold text-xs h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRequestCorrection}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 rounded-xl"
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
