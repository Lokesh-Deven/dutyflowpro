"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useStudentPortal } from '@/lib/student-portal-context';
import {
  getStudentResults,
} from '@/lib/student-marks-service';
import {
  ExamResultRecord,
} from '@/lib/student-marks-types';
import { VisualStudentScorecard } from './visual-student-scorecard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  Search,
  Calendar,
  Lock,
  Sparkles,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarRange,
  Trophy,
  AlertCircle,
  RefreshCw,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Quick demo test profiles for instant one-click preview
const DEMO_STUDENT_PILLS = [
  { name: 'Aarav Patel', reg: '24PU0101', dob: '2008-05-14', stream: '1PUC • PCMB' },
  { name: 'Ananya Sharma', reg: '24PU0102', dob: '2008-09-22', stream: '1PUC • PCMB' },
  { name: 'Deepak Kumar', reg: '24PU0201', dob: '2008-03-18', stream: '1PUC • CEBA' },
  { name: 'Bhavya Rao', reg: '24PU0103', dob: '2008-01-30', stream: '1PUC • PCMC' },
  { name: 'Divya Reddy', reg: '24PU0202', dob: '2008-07-25', stream: '1PUC • CEBA' },
];

export function StudentResultsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { session, isAuthenticated, logout } = useStudentPortal();

  // Search input states
  const [registerNumber, setRegisterNumber] = useState('');
  const [dob, setDob] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [loadedStudentResults, setLoadedStudentResults] = useState<{
    studentName: string;
    registerNumber: string;
    className: string;
    stream: string;
    combination: string;
    dob?: string;
    records: ExamResultRecord[];
  } | null>(null);

  // Auto-detect if student is already authenticated in student portal or if query param exists
  useEffect(() => {
    const qReg = searchParams.get('reg');
    const qDob = searchParams.get('dob');

    if (qReg) {
      setRegisterNumber(qReg);
      if (qDob) setDob(qDob);
      executeSearch(qReg, qDob || undefined);
    } else if (isAuthenticated && session?.registerNumber) {
      setRegisterNumber(session.registerNumber);
      executeSearch(session.registerNumber);
    }
  }, [searchParams, isAuthenticated, session]);

  const executeSearch = async (reg: string, dateOfBirth?: string) => {
    const cleanReg = reg.trim();
    if (!cleanReg) {
      setErrorMessage('Please enter your Register Number.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const res = await getStudentResults(cleanReg, dateOfBirth);
      if (res && res.records.length > 0) {
        setLoadedStudentResults(res);
        toast({
          title: `Results Found for ${res.studentName}`,
          description: `Loaded scorecard across ${res.records.length} examination(s).`,
        });
      } else {
        setLoadedStudentResults(null);
        setErrorMessage(
          'No published examination results found matching the entered Register Number and Date of Birth.'
        );
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setErrorMessage(err?.message || 'An error occurred while retrieving results.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(registerNumber, dob);
  };

  const handleQuickDemoClick = (pill: typeof DEMO_STUDENT_PILLS[0]) => {
    setRegisterNumber(pill.reg);
    setDob(pill.dob);
    executeSearch(pill.reg, pill.dob);
  };

  const handleBackToSearch = () => {
    setLoadedStudentResults(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex flex-col justify-between">
      {/* 1. Portal Navigation Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo & Portal Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 transition-colors">
                <Image
                  src="/Dutyflow Logo.png"
                  alt="DutyFlow Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-headline font-black text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                Duty<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
              </span>
            </Link>

            <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">|</span>

            <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Student Results Portal</span>
            </span>
          </div>

          {/* Navigation Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200/80 dark:border-slate-700 text-xs font-bold">
              <Link
                href="/student/my-examination"
                className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden xs:inline">My Slip</span>
              </Link>

              <Link
                href="/student/examination-timetable"
                className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
              >
                <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                <span>Timetable</span>
              </Link>

              <Link
                href="/student/examination-calendar"
                className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
              >
                <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden xs:inline">Calendar</span>
              </Link>

              {/* Active Results Tab */}
              <div className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white shadow-xs flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>Results</span>
              </div>
            </div>

            {/* If logged in, show logout */}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="h-8 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 gap-1 hidden md:flex"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!loadedStudentResults ? (
          /* Search Form Card */
          <div className="max-w-xl mx-auto my-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-2xs">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Official Digital Examination Scorecards</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-headline">
                View Your Examination Results
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Enter your Register Number and Date of Birth to access your verified scorecards, subject analytics, and performance insights.
              </p>
            </div>

            {/* Search Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md shadow-indigo-950/5 space-y-5">
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Register Number / Roll Number <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      value={registerNumber}
                      onChange={(e) => setRegisterNumber(e.target.value)}
                      placeholder="e.g. 24PU0101"
                      className="pl-10 h-11 text-sm font-mono font-bold bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Date of Birth (DOB)
                    </Label>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">YYYY-MM-DD</span>
                  </div>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="e.g. 2008-05-14"
                      className="pl-10 h-11 text-sm font-mono bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSearching}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm gap-2 rounded-xl shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Retrieving Results...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Search Examination Results</span>
                    </>
                  )}
                </Button>
              </form>

              {/* Quick Demo Pre-filled Chips for Reviewer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick Demo Student Profiles (Click to test):
                </span>
                <div className="flex flex-wrap gap-2">
                  {DEMO_STUDENT_PILLS.map((pill) => (
                    <button
                      key={pill.reg}
                      type="button"
                      onClick={() => handleQuickDemoClick(pill)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700 transition-colors text-slate-700 dark:text-slate-300 text-left cursor-pointer"
                    >
                      <div className="font-bold">{pill.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {pill.reg} • {pill.stream}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Render Active Visual Student Scorecard */
          <VisualStudentScorecard
            records={loadedStudentResults.records}
            classAverage={83.5}
            showBackToSearch={true}
            onBackToSearch={handleBackToSearch}
          />
        )}
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        &copy; {new Date().getFullYear()} DutyFlow Examination & Results System. All rights reserved.
      </footer>
    </div>
  );
}
