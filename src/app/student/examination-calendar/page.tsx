'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useStudentPortal } from '@/lib/student-portal-context';
import { ExaminationScheduleItem } from '@/lib/examination-calendar-types';
import { fetchExaminationCalendarApi, getLocalExaminationCalendar } from '@/lib/examination-calendar-service';
import { AcademicCalendarView } from '@/components/calendar/academic-calendar-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarRange,
  GraduationCap,
  Calendar,
  Clock,
  LogOut,
  RefreshCw,
  Info,
  CheckCircle2,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function StudentExaminationCalendarPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { session, isAuthenticated, isLoading: authLoading, logout } = useStudentPortal();

  const [schedules, setSchedules] = useState<ExaminationScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Authentication protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/student/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load published examination calendar schedules
  const loadCalendarData = useCallback(async (showToast = false) => {
    if (!session) return;
    setIsLoading(true);
    try {
      // Fetch only published exams for student's institution
      const data = await fetchExaminationCalendarApi(
        session.institutionId,
        session.institutionCode,
        'student'
      );

      // Only display published items (tentative_published or final_published)
      const publishedOnly = (data || []).filter(
        (s) => s.publication_status === 'tentative_published' || s.publication_status === 'final_published'
      );

      setSchedules(publishedOnly);

      if (showToast) {
        toast({
          title: 'Calendar Refreshed',
          description: `Loaded ${publishedOnly.length} published examination schedule(s).`,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch student examination calendar:', err);
      // Fallback to local cache
      const cached = getLocalExaminationCalendar(session.institutionId, session.institutionCode);
      const publishedOnly = (cached || []).filter(
        (s) => s.publication_status === 'tentative_published' || s.publication_status === 'final_published'
      );
      setSchedules(publishedOnly);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session, toast]);

  useEffect(() => {
    if (session) {
      loadCalendarData();
    }
  }, [session, loadCalendarData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadCalendarData(true);
  };

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged Out',
      description: 'You have been safely signed out from Student Access.',
    });
    router.push('/student/login');
  };

  // Format date helper
  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return 'Schedule TBA';
    try {
      const s = new Date(start + 'T00:00:00');
      const startFmt = s.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!end || start === end) return startFmt;
      const e = new Date(end + 'T00:00:00');
      const endFmt = e.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${startFmt} — ${endFmt}`;
    } catch (_) {
      return `${start} — ${end || ''}`;
    }
  };

  // Compute duration in days
  const getDaysCount = (start?: string, end?: string) => {
    if (!start || !end) return null;
    try {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      if (isNaN(s) || isNaN(e) || e < s) return null;
      const days = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    } catch (_) {
      return null;
    }
  };

  if (authLoading || (!session && isAuthenticated)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide">
          Loading Examination Calendar...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return null; // Will redirect via useEffect
  }

  // Filter schedules that have actual dates configured
  const upcomingExaminations = schedules.filter(
    (item) => !!item.start_date && (item.publication_status === 'tentative_published' || item.publication_status === 'final_published')
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6">
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BAR: Institution & Portal Navigation */}
        {/* ========================================================================= */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-xs">
              <Image
                src="/Dutyflow Logo.png"
                alt="DutyFlow Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline font-black text-base sm:text-lg tracking-tight text-slate-900">
                  Duty<span className="text-indigo-600">Flow</span>
                </span>
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold py-0 h-4.5"
                >
                  Student Portal
                </Badge>
                {session.institutionCode && (
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-[#6342e8] border-purple-200 font-mono text-[10px] font-bold py-0 h-4.5"
                  >
                    Code: {session.institutionCode}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                {session.institutionName || 'Examination Center'}
              </p>
            </div>
          </div>

          {/* Action Controls & Navigation Switcher */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Navigation Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
              <Link
                href="/student/my-examination"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">My Slip</span>
              </Link>
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-700 shadow-xs flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
                <span>Exam Calendar</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Refresh calendar schedules"
              className="h-8.5 w-8.5 p-0 text-slate-600 border-slate-200 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="h-8.5 text-xs font-bold px-3 gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Log Out</span>
            </Button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. PROMINENT STUDENT CALENDAR NOTICE (Prompt Requirement #5) */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border-2 border-blue-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                Official Examination Schedule Notice
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold py-0 h-4">
                  Institutional Calendar
                </Badge>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                Please note that the examination dates displayed in <strong className="text-blue-700 font-black">BLUE</strong> are provisional (tentative). Final examination dates will be announced separately and updated in this calendar.
              </p>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 pt-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-xs" />
                  <strong>Blue:</strong> Tentative Dates
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-xs" />
                  <strong>Green:</strong> Confirmed Dates
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. MAIN CONTENT: Visual Academic Calendar View */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Academic Year Examination Calendar
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                View scheduled dates, tests, mid-term, and preparatory exam slots published by the administration.
              </p>
            </div>
          </div>

          {/* Academic Calendar Grid */}
          <AcademicCalendarView
            schedules={schedules}
            readOnly={true}
          />
        </section>

        {/* ========================================================================= */}
        {/* 4. UPCOMING EXAMINATIONS SECTION (Prompt Requirement #5) */}
        {/* ========================================================================= */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Upcoming Published Examinations
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Detailed timeline and total marks breakdown for each announced examination.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-xs font-bold text-slate-700 bg-white">
              {upcomingExaminations.length} Active {upcomingExaminations.length === 1 ? 'Exam' : 'Exams'}
            </Badge>
          </div>

          {upcomingExaminations.length === 0 ? (
            <Card className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CalendarRange className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Examinations Published Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Your institution has not published any tentative or final examination schedules yet. Please check back later or refresh.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingExaminations.map((exam) => {
                const isFinal = exam.publication_status === 'final_published';
                const dateRangeText = formatDateRange(exam.start_date, exam.end_date);
                const duration = getDaysCount(exam.start_date, exam.end_date);

                return (
                  <Card
                    key={`upcoming-${exam.slot_number}`}
                    className={`border rounded-2xl shadow-xs transition-all duration-200 overflow-hidden relative ${
                      isFinal
                        ? 'bg-gradient-to-br from-emerald-50/50 via-white to-white border-emerald-200/90 hover:border-emerald-300'
                        : 'bg-gradient-to-br from-blue-50/50 via-white to-white border-blue-200/90 hover:border-blue-300'
                    }`}
                  >
                    <div
                      className={`h-1.5 w-full ${isFinal ? 'bg-emerald-600' : 'bg-blue-600'}`}
                    />
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-slate-400">
                              Slot #{exam.slot_number}
                            </span>
                            {isFinal ? (
                              <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                Confirmed Dates
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 flex items-center gap-1 shadow-xs">
                                <Clock className="w-3 h-3" />
                                Provisional (Tentative)
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-headline text-base sm:text-lg font-black text-slate-900 pt-0.5">
                            {exam.exam_name}
                          </h3>
                        </div>

                        {/* Total Marks badge */}
                        <div className="text-right shrink-0 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Total Marks
                          </span>
                          <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                            {exam.total_marks}
                          </span>
                        </div>
                      </div>

                      {/* Dates and Duration */}
                      <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Date Period:
                          </span>
                          <span className="font-bold text-slate-900 text-right">
                            {dateRangeText}
                          </span>
                        </div>

                        {duration && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span>Duration:</span>
                            <span className="font-semibold text-slate-700">{duration}</span>
                          </div>
                        )}

                        {/* History note if final dates replaced tentative dates */}
                        {isFinal && exam.tentative_start_date && (
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-emerald-800 bg-emerald-50/60 rounded-lg p-2 font-medium">
                            <span className="font-bold">Historical Note:</span> Previously scheduled as tentative from {formatDateRange(exam.tentative_start_date, exam.tentative_end_date || undefined)}. Now confirmed dates.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

