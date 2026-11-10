'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useStudentPortal } from '@/lib/student-portal-context';
import {
  PublishedTimetableRecord,
  ExaminationTimetable,
} from '@/lib/examination-timetable-types';
import {
  fetchPublishedTimetables,
  computeDateRange,
  formatDateToDDMMYYYY,
} from '@/lib/examination-timetable-service';
import {
  generateExaminationTimetablePdf,
  generateExaminationTimetablePdfBlob,
} from '@/lib/examination-timetable-pdf';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarClock,
  CalendarRange,
  BookOpen,
  Download,
  Eye,
  LogOut,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export default function StudentExaminationTimetablePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { session, isAuthenticated, isLoading: authLoading, logout } = useStudentPortal();

  const [timetables, setTimetables] = useState<PublishedTimetableRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // PDF Viewer Dialog State
  const [selectedRecord, setSelectedRecord] = useState<PublishedTimetableRecord | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Authentication protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/student/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load published examination timetables for this student's institution
  const loadTimetables = useCallback(
    async (showToast = false) => {
      if (!session) return;
      setIsLoading(true);
      try {
        const data = await fetchPublishedTimetables(
          session.institutionId,
          session.institutionCode
        );
        setTimetables(data || []);

        if (showToast) {
          toast({
            title: 'Timetables Refreshed',
            description: `Loaded ${data.length} published examination timetable(s).`,
          });
        }
      } catch (err) {
        console.warn('Failed to load published timetables:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [session, toast]
  );

  useEffect(() => {
    if (!session) return;
    loadTimetables();

    const handleRefresh = () => loadTimetables();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadTimetables();
      }
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('online', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('online', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [session, loadTimetables]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadTimetables(true);
  };

  const handleLogout = () => {
    logout();
    router.replace('/student/login');
  };

  // Open PDF viewer for a selected timetable
  const handleOpenViewer = async (record: PublishedTimetableRecord) => {
    setSelectedRecord(record);
    setIsGeneratingPdf(true);

    try {
      const blob = await generateExaminationTimetablePdfBlob({
        timetable: record.timetable,
      });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err: any) {
      console.error('Error generating PDF blob for viewer:', err);
      toast({
        variant: 'destructive',
        title: 'Preview Generation Error',
        description: 'Failed to render PDF preview. You can still download the PDF directly.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Close PDF viewer and cleanup blob URL
  const handleCloseViewer = () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    setSelectedRecord(null);
  };

  // Download PDF
  const handleDownloadPdf = async (record?: PublishedTimetableRecord) => {
    const target = record || selectedRecord;
    if (!target) return;

    setIsDownloading(true);
    try {
      await generateExaminationTimetablePdf({
        timetable: target.timetable,
      });
      toast({
        title: 'PDF Downloaded',
        description: `Official timetable for "${target.examinationName}" downloaded successfully.`,
      });
    } catch (err: any) {
      console.error('Error downloading PDF:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: err?.message || 'Could not download examination timetable PDF.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (authLoading || (!session && isAuthenticated)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide">
          Loading Examination Timetables...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return null;
  }

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
            {/* 3 Navigation Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
              <Link
                href="/student/my-examination"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">My Slip</span>
              </Link>
              <div className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-700 shadow-xs flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Timetable</span>
              </div>
              <Link
                href="/student/examination-calendar"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Calendar</span>
              </Link>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Refresh published timetables"
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
        {/* 2. OFFICIAL TIMETABLE NOTICE BANNER */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50/70 to-indigo-50 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                Official Examination Timetable
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold py-0 h-4">
                  Verified Schedules
                </Badge>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                Click on any examination panel below to open the complete official timetable in the integrated PDF viewer, or download the high-resolution printable PDF directly.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. PUBLISHED EXAMINATION TIMETABLES LIST / PANELS */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-headline font-bold text-base text-slate-900">
                Published Timetables
              </h3>
              <Badge variant="outline" className="text-xs font-bold text-indigo-700 bg-indigo-50/60 border-indigo-200">
                {timetables.length} {timetables.length === 1 ? 'Exam' : 'Exams'}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="text-xs h-8 px-2.5 gap-1.5 font-semibold text-slate-600 hover:text-indigo-600"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600">
                Fetching published examination timetables...
              </p>
            </div>
          ) : timetables.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <CalendarClock className="w-6 h-6" />
              </div>
              <h4 className="font-headline font-bold text-base text-slate-800">
                No Examination Timetables Published Yet
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Your institution has not published any examination timetables yet. Once published by the examination authority, they will appear here with full view and download options.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="text-xs mt-2 font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Check for Updates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {timetables.map((record) => {
                const tt = record.timetable || ({} as ExaminationTimetable);
                const dateRange = computeDateRange(tt.rows || []);
                const sessionsCount = tt.rows?.length || 0;
                const classesCount = tt.classes?.length || 1;
                const formattedPublishedAt = record.publishedAt
                  ? new Date(record.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;

                return (
                  <Card
                    key={record.id}
                    className="bg-white border-2 border-slate-200/90 hover:border-indigo-500/80 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between overflow-hidden"
                    onClick={() => handleOpenViewer(record)}
                  >
                    <div className="p-5 space-y-3.5">
                      {/* Top Header inside Panel */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] px-2 py-0.5 gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Published
                        </Badge>
                      </div>

                      {/* Examination Title (Prompt requirement: display Examination Title) */}
                      <div className="space-y-1">
                        <h4
                          className="font-headline font-black text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug"
                          title={record.examinationName}
                        >
                          {record.examinationName || 'Official Examination Timetable'}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium truncate" title={record.institutionName}>
                          {record.institutionName || session.institutionName}
                        </p>
                      </div>

                      {/* Schedule Metadata */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{dateRange}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>
                            <strong>{sessionsCount}</strong> Exam {sessionsCount === 1 ? 'Date' : 'Dates'}
                          </span>
                          <span>&bull;</span>
                          <span>
                            <strong>{classesCount}</strong> {classesCount === 1 ? 'Class' : 'Classes'}
                          </span>
                        </div>
                      </div>

                      {formattedPublishedAt && (
                        <p className="text-[10px] text-slate-400 font-medium">
                          Published: {formattedPublishedAt}
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions inside Panel */}
                    <CardContent className="p-4 pt-0 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-3.5 gap-1.5 rounded-xl shadow-xs flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenViewer(record);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View PDF</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs h-8.5 px-3.5 gap-1.5 rounded-xl border-slate-300 shadow-2xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPdf(record);
                        }}
                        title="Download PDF directly"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Download</span>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 4. INTEGRATED PDF VIEWER DIALOG (Prompt Requirements #2 & #3) */}
        {/* ========================================================================= */}
        <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => !open && handleCloseViewer()}>
          <DialogContent className="max-w-5xl w-full sm:w-[94vw] h-[92vh] max-h-[92vh] bg-slate-900 p-0 border border-slate-700 overflow-hidden shadow-2xl flex flex-col rounded-2xl">
            {/* Viewer Top Header */}
            <DialogHeader className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl shrink-0 border border-indigo-500/30">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <DialogTitle className="font-headline text-sm sm:text-base font-bold text-white truncate">
                    {selectedRecord?.examinationName || 'Examination Timetable'}
                  </DialogTitle>
                  <p className="text-[11px] text-slate-400 truncate">
                    Official Timetable • A4 Landscape Printable Format
                  </p>
                </div>
              </div>

              {/* Prominent "Download PDF" button alongside the viewer header */}
              <div className="flex items-center gap-2 pr-6 sm:pr-8 shrink-0">
                <Button
                  onClick={() => handleDownloadPdf()}
                  disabled={isDownloading}
                  className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs sm:text-sm h-9 px-4 sm:px-5 gap-2 rounded-xl shadow-md border border-indigo-400/30 transition-all hover:scale-[1.02]"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download PDF</span>
                </Button>
              </div>
            </DialogHeader>

            {/* Viewer Center: Embedded PDF object / iframe */}
            <div className="flex-1 bg-slate-900/90 relative overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
              {isGeneratingPdf ? (
                <div className="flex flex-col items-center justify-center text-white space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-xs text-slate-400">Loading high-resolution timetable...</p>
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full rounded-xl bg-white border border-slate-700 shadow-xl"
                  title="Official Examination Timetable PDF Viewer"
                />
              ) : (
                <div className="text-center text-white p-6 space-y-3">
                  <p className="text-sm text-slate-300">
                    PDF preview could not be loaded in browser frame.
                  </p>
                  <Button
                    onClick={() => handleDownloadPdf()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-2 rounded-xl"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF File
                  </Button>
                </div>
              )}
            </div>

            {/* Viewer Bottom Footer Bar with prominent Download PDF button */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 px-4">
              <div className="text-[11px] text-slate-400 font-medium text-center sm:text-left">
                {selectedRecord?.institutionName || session.institutionName} • Official Digital Document
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownloadPdf()}
                  disabled={isDownloading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-4 gap-1.5 rounded-xl shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Timetable PDF</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

