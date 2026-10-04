"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStudentPortal } from '@/lib/student-portal-context';
import { StudentExaminationDetail } from '@/lib/student-portal-types';
import { getInvigilatorInitial } from '@/lib/utils';
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
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Armchair,
  BookOpen,
  LogOut,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Building2,
  ChevronRight,
  Printer,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function MyExaminationView() {
  const router = useRouter();
  const { toast } = useToast();
  const { session, examinations, isLoading, logout, changePin, refreshExaminations } =
    useStudentPortal();

  // Change PIN modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Active selected exam tab (defaults to first/primary exam)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Pull active exam (either selected or top upcoming)
  const activeExam: StudentExaminationDetail | undefined =
    examinations.find((e) => e.id === selectedExamId) || examinations[0];

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged Out',
      description: 'You have been safely signed out from Student Access.',
    });
    router.push('/student/login');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!currentPin.trim()) {
      setPinError('Please enter your current PIN.');
      return;
    }
    if (newPin.trim().length < 4) {
      setPinError('New PIN must be at least 4 digits/characters long.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and Confirm PIN do not match.');
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await changePin(currentPin, newPin);
      if (res.success) {
        toast({
          title: 'PIN Updated Successfully',
          description: 'Your new secret PIN has been saved. Please use it for next login.',
        });
        setIsPinModalOpen(false);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinError(res.error || 'Failed to update PIN. Please verify your current PIN.');
      }
    } finally {
      setIsChangingPin(false);
    }
  };

  const handlePrintSlip = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading && !session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Examination Details...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">Session Required</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Please log in with your Register Number to view your examination information.
          </p>
        </div>
        <Button
          onClick={() => router.push('/student/login')}
          className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 rounded-xl"
        >
          Go to Student Login
        </Button>
      </div>
    );
  }

  const studentInitial = getInvigilatorInitial(session.studentName);

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-5 print:p-0 print:m-0 print:max-w-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR: Institution & Portal Navigation */}
      {/* ========================================================================= */}
      <header className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
            <Image
              src="/Dutyflow Logo.png"
              alt="DutyFlow Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-headline font-black text-sm sm:text-base tracking-tight text-slate-900">
                Duty<span className="text-indigo-600">Flow</span>
              </span>
              <Badge
                variant="outline"
                className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold py-0 h-4"
              >
                Student
              </Badge>
              {session.institutionCode && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-[#6342e8] border-purple-200 font-mono text-[10px] font-bold py-0 h-4"
                >
                  Code: {session.institutionCode}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
              {session.institutionName || 'Examination Center'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshExaminations}
            title="Refresh examination schedule"
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrintSlip}
            className="h-8 text-xs font-semibold px-2.5 gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-100 rounded-lg hidden sm:inline-flex"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Slip</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsPinModalOpen(true)}
            title="Change PIN"
            className="h-8 text-xs font-semibold px-2 gap-1 text-slate-600 hover:text-slate-900 rounded-lg hidden sm:inline-flex"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            className="h-8 text-xs font-bold px-2.5 gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Log Out</span>
          </Button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. STUDENT IDENTITY CARD */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            {/* Monogram Avatar adhering strictly to Invigilator/Avatar Monogram Rule */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#1E2A5E] to-[#2D3E82] text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-950/15 border-2 border-white">
              <span className="font-headline font-black text-2xl sm:text-3xl leading-none select-none">
                {studentInitial}
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {session.studentName}
                </h1>
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-[10px] px-2 py-0 h-4">
                  Verified Candidate
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium flex-wrap pt-0.5">
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                  Reg No: {session.registerNumber}
                </span>
                {session.section && (
                  <span className="text-slate-500">
                    Section: <strong className="text-slate-800">{session.section}</strong>
                  </span>
                )}
                {session.courseStream && (
                  <span className="text-slate-500">
                    Course: <strong className="text-slate-800">{session.courseStream}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="sm:hidden text-xs font-semibold text-slate-600 hover:text-indigo-700 inline-flex items-center gap-1 py-1"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Change PIN</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EXAMINATION MULTI-PAPER SELECTOR (If student has multiple exams) */}
      {/* ========================================================================= */}
      {examinations.length > 1 && (
        <section className="space-y-1.5 print:hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Your Scheduled Examinations ({examinations.length})</span>
            <span className="text-[10px] font-medium text-indigo-600">Tap to view seat details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {examinations.map((exam) => {
              const isSelected = activeExam?.id === exam.id;
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedExamId(exam.id)}
                  className={`text-left p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="space-y-0.5 truncate">
                    <div className="font-bold text-slate-900 truncate">
                      {exam.subjectName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span>{exam.formattedDate || 'Date TBA'}</span>
                      {exam.timeSlot && <span>&bull; {exam.timeSlot}</span>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-indigo-700 block">
                      Room {exam.roomNo}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      {exam.benchNumber}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. HERO SECTION: "MY EXAMINATION" DETAILS (MOBILE OPTIMIZED 4 BIG CARDS) */}
      {/* ========================================================================= */}
      {activeExam ? (
        <section className="space-y-3">
          {/* Section Title with Status */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="font-headline text-lg sm:text-xl font-black text-slate-900">
                My Examination
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {activeExam.examName || 'Examination Schedule'}
              </p>
            </div>

            <Badge
              variant="outline"
              className={
                activeExam.status === 'Confirmed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold py-1 px-3 gap-1 shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 text-xs font-bold py-1 px-3 gap-1'
              }
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activeExam.status === 'Confirmed' ? 'Seating Confirmed' : 'Seating In Progress'}</span>
            </Badge>
          </div>

          {/* 4 GRAND MOBILE INFORMATION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* 1. SUBJECT CARD */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  Subject
                </span>
                <div className="p-2 bg-slate-50 text-indigo-700 rounded-xl border border-slate-100">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="font-headline font-black text-2xl sm:text-3xl text-slate-900 leading-tight">
                  {activeExam.subjectName}
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {activeExam.courseStream || 'Standard Curriculum'}{' '}
                  {activeExam.subjectCode ? `(${activeExam.subjectCode})` : ''}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                Section: <strong className="text-slate-700">{activeExam.section || session.section || 'A'}</strong>
              </div>
            </div>

            {/* 2. DATE & TIME CARD */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  Date & Time
                </span>
                <div className="p-2 bg-slate-50 text-amber-600 rounded-xl border border-slate-100">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-headline font-black text-xl sm:text-2xl text-slate-900 leading-tight">
                  {activeExam.formattedDate}
                </div>
                {activeExam.dayOfWeek && (
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                    {activeExam.dayOfWeek}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 pt-1">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{activeExam.timeSlot}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                Please report 15 minutes before the session starts
              </div>
            </div>

            {/* 3. EXAMINATION ROOM CARD */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  Examination Room
                </span>
                <div className="p-2 bg-slate-50 text-rose-600 rounded-xl border border-slate-100">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="font-headline font-black text-3xl sm:text-4xl text-slate-900 leading-tight">
                  {activeExam.roomNo}
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Hall / Classroom No. {activeExam.roomNo}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>Check room notice board at entrance</span>
                <span className="font-bold text-indigo-700 text-xs">Hall {activeExam.roomNo}</span>
              </div>
            </div>

            {/* 4. SEATING / BENCH CARD */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  Seating / Bench
                </span>
                <div className="p-2 bg-slate-50 text-emerald-600 rounded-xl border border-slate-100">
                  <Armchair className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline font-black text-3xl sm:text-4xl text-slate-900">
                    {activeExam.benchNumber}
                  </span>
                  {activeExam.position && activeExam.position !== 'Unassigned' && (
                    <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 font-bold text-xs px-2.5 py-0.5">
                      {activeExam.position} Position
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-slate-500 font-semibold mt-1">
                  {activeExam.rowLabel ? `${activeExam.rowLabel} &bull; ` : ''}
                  {activeExam.benchSide ? `${activeExam.benchSide} Side Column` : 'Allocated Bench'}
                </div>
              </div>

              {/* Visual Seat Indicator (Left - Center - Right) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-around gap-1 text-center">
                  <div
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      activeExam.position === 'Left'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    Left
                  </div>
                  <div
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      activeExam.position === 'Center'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    Center
                  </div>
                  <div
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      activeExam.position === 'Right'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    Right
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-slate-900">
              No Examination Scheduled Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Your room and seating allotment will appear automatically once finalized by the examination center.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshExaminations}
            className="text-xs h-8 font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Again
          </Button>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. IMPORTANT EXAM INSTRUCTIONS FOR CANDIDATES */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-slate-900 font-headline font-bold text-sm">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Candidate Examination Guidelines</span>
        </div>

        <ul className="text-xs text-slate-600 space-y-1.5 font-medium pl-6 list-disc">
          <li>
            Carry your official <strong>College ID Card</strong> and <strong>Hall Ticket</strong> to the examination hall.
          </li>
          <li>
            Locate your allotted room and bench (<strong>{activeExam?.roomNo || 'Notice'} / {activeExam?.benchNumber || 'Bench'}</strong>) at least 15 minutes before exam commencement.
          </li>
          <li>
            Electronic devices, including smartwatches, mobile phones, and programmable calculators, are strictly prohibited.
          </li>
          <li>
            Occupying an unauthorized bench or seat will be considered a breach of exam regulations.
          </li>
        </ul>
      </section>

      {/* ========================================================================= */}
      {/* 6. CHANGE PIN MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <KeyRound className="w-5 h-5" />
              </div>
              <DialogTitle className="font-headline text-lg font-bold text-slate-900">
                Change Secret PIN
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500">
              Update your personal PIN for Register Number <strong className="text-slate-800">{session.registerNumber}</strong>.
            </p>
          </DialogHeader>

          {pinError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {pinError}
            </div>
          )}

          <form onSubmit={handlePinSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="curr-pin" className="text-xs font-bold text-slate-700">
                Current PIN / Password
              </Label>
              <Input
                id="curr-pin"
                type="password"
                placeholder="Enter current PIN"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                className="text-xs font-semibold h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-pin" className="text-xs font-bold text-slate-700">
                New PIN (minimum 4 digits)
              </Label>
              <Input
                id="new-pin"
                type="password"
                placeholder="e.g. 5678"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="text-xs font-semibold h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-pin" className="text-xs font-bold text-slate-700">
                Confirm New PIN
              </Label>
              <Input
                id="confirm-pin"
                type="password"
                placeholder="Re-enter new PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="text-xs font-semibold h-9"
                required
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPinModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isChangingPin}
                className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5"
              >
                {isChangingPin ? 'Updating...' : 'Update PIN'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
