"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
  Building2,
  Calendar,
  Clock,
  DoorOpen,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  generateQuestionPaperDistribution,
  createSampleSeatingAllocation,
  exportQuestionPaperDistributionExcel,
  QuestionPaperDistributionResult,
} from '@/lib/question-paper-distribution-service';
import { generateQuestionPaperDistributionPdf } from '@/lib/question-paper-distribution-pdf';
import { formatAppDateWithDay, formatTimingRange12Hour } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface QuestionPaperDistributionViewProps {
  isDialog?: boolean;
  onClose?: () => void;
}

export function QuestionPaperDistributionView({
  isDialog = false,
  onClose,
}: QuestionPaperDistributionViewProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { signatory, pdfPaletteId } = useAllotment();
  const { allocations, activeAllocation, setActiveAllocation, saveAllocation } = useStudentSeating();

  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Institution Name';

  // Determine current active allocation to use
  const currentAllocation = useMemo(() => {
    if (selectedAllocationId) {
      const found = allocations.find((a) => a.id === selectedAllocationId);
      if (found) return found;
    }
    if (activeAllocation) return activeAllocation;
    if (allocations.length > 0) return allocations[0];
    return null;
  }, [allocations, activeAllocation, selectedAllocationId]);

  // Compute question paper distribution result
  const distributionResult: QuestionPaperDistributionResult | null = useMemo(() => {
    if (!currentAllocation) return null;
    return generateQuestionPaperDistribution(currentAllocation, institutionName);
  }, [currentAllocation, institutionName]);

  // Filtered rooms based on search and subject dropdown
  const filteredRooms = useMemo(() => {
    if (!distributionResult) return [];

    return distributionResult.rooms.filter((room) => {
      // Room search filter
      const matchesSearch =
        !searchQuery.trim() ||
        room.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.cleanRoomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.items.some((item) =>
          item.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.regNoFrom.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.regNoTo.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Subject filter
      const matchesSubject =
        selectedSubjectFilter === 'all' ||
        room.items.some(
          (item) => item.subjectName.toLowerCase() === selectedSubjectFilter.toLowerCase()
        );

      return matchesSearch && matchesSubject;
    });
  }, [distributionResult, searchQuery, selectedSubjectFilter]);

  // Handle loading sample distribution
  const handleLoadSample = () => {
    const sample = createSampleSeatingAllocation(institutionName, 'Midterm Examination 2026');
    saveAllocation(sample);
    setActiveAllocation(sample);
    setSelectedAllocationId(sample.id);
    toast({
      title: 'Sample Allocation Loaded',
      description: 'Loaded question paper distribution data for Rooms 101, 102, 105 (multi-subject), and 106.',
    });
  };

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    if (!distributionResult) return;
    try {
      setIsExportingPdf(true);
      await generateQuestionPaperDistributionPdf({
        data: distributionResult,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: 'PDF Exported Successfully',
        description: 'Question Paper Distribution list has been downloaded.',
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to generate PDF document. Please try again.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    if (!distributionResult) return;
    try {
      exportQuestionPaperDistributionExcel(distributionResult);
      toast({
        title: 'Excel Exported Successfully',
        description: 'Question Paper Distribution list downloaded as .xlsx spreadsheet.',
      });
    } catch (err) {
      console.error('Error exporting Excel:', err);
      toast({
        variant: 'destructive',
        title: 'Excel Export Failed',
        description: 'Failed to generate Excel file. Please try again.',
      });
    }
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("space-y-6", !isDialog && "pb-12")}>
      {/* Top Banner Card / Header Board */}
      <div className="rounded-2xl bg-[#151241] bg-gradient-to-r from-[#151241] via-[#1f195e] to-[#2e2478] text-white p-6 sm:p-7 shadow-xl border border-[#2b2272] relative overflow-hidden">
        {/* Subtle Decorative Glow Orbs */}
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white ring-1 ring-white/20 shrink-0 shadow-inner">
              <ClipboardCheck className="h-6 w-6 text-sky-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black font-headline tracking-tight text-white">
                  Question Paper Distribution
                </h1>
                <Badge className="bg-sky-400/20 text-sky-200 border-sky-400/30 font-semibold text-xs px-2.5 py-0.5">
                  1 Student = 1 Paper
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200/90 mt-1 max-w-2xl leading-relaxed">
                Room-wise question-paper requirements generated automatically from the latest seating allocation.
              </p>
            </div>
          </div>

          {/* Action Buttons (PDF, Excel, Print) */}
          {distributionResult && (
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs font-semibold rounded-xl h-9 px-3.5 shadow-sm transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 mr-1.5 text-sky-300" />
                <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs font-semibold rounded-xl h-9 px-3.5 shadow-sm transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-300" />
                <span>Excel</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs font-semibold rounded-xl h-9 px-3.5 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4 mr-1.5 text-indigo-300" />
                <span>Print</span>
              </Button>
            </div>
          )}
        </div>

        {/* Institutional Examination Notice Board */}
        {distributionResult && (
          <div className="relative z-10 mt-5 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/10 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm border border-white/15 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-black tracking-wide uppercase text-sm sm:text-base font-headline">
                <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{distributionResult.institutionName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-indigo-100">
                <span className="font-bold text-white/95 text-xs sm:text-sm">
                  {distributionResult.examinationName}
                </span>
                <span className="text-white/40">•</span>
                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {formatAppDateWithDay(distributionResult.date, distributionResult.date || 'No Date')}
                </span>
                {distributionResult.startTime && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      {formatTimingRange12Hour(distributionResult.startTime, distributionResult.endTime, '–')}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                Official Header Board
              </span>
            </div>
          </div>
        )}

        {/* Allocation Selector Bar */}
        <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-indigo-300 font-semibold shrink-0">Active Seating Allocation:</span>
            {allocations.length > 0 ? (
              <Select
                value={currentAllocation?.id || undefined}
                onValueChange={(val) => {
                  setSelectedAllocationId(val);
                  const found = allocations.find((a) => a.id === val);
                  if (found) {
                    setActiveAllocation(found);
                  }
                }}
              >
                <SelectTrigger className="h-9 w-[320px] max-w-full bg-white/15 hover:bg-white/25 border-white/30 text-white text-xs rounded-xl font-medium focus:ring-2 focus:ring-sky-400/50 cursor-pointer shadow-sm transition-all flex items-center justify-between">
                  <SelectValue placeholder="Select Seating Allocation" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={6}
                  className="bg-[#1b154b] text-white border-[#382d8c] shadow-2xl z-[100] max-h-80 w-[340px] max-w-[90vw] p-1.5 rounded-xl"
                >
                  {allocations.map((alloc) => {
                    const examTitle = alloc.examination?.examName || alloc.name || 'Seating Allocation';
                    const examDate = alloc.examination?.date || 'No Date';
                    return (
                      <SelectItem
                        key={alloc.id}
                        value={alloc.id}
                        className="text-xs text-white/90 hover:text-white focus:bg-[#6342e8] focus:text-white cursor-pointer py-2.5 px-3 my-0.5 rounded-lg transition-colors border-b border-white/5 last:border-b-0"
                      >
                        <div className="flex flex-col gap-0.5 text-left pr-2">
                          <span className="font-semibold text-white truncate max-w-[260px]">
                            {examTitle}
                          </span>
                          <span className="text-[11px] text-indigo-200">
                            Date: {examDate}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleLoadSample}
                  className="h-8 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 text-xs rounded-xl font-medium cursor-pointer shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                  Load Sample Allocation
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Live Synced from Room Allocation
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      {!distributionResult ? (
        /* Empty State: No Allocation Yet */
        <Card className="rounded-2xl border-dashed border-2 border-slate-300 dark:border-slate-800 p-8 sm:p-14 text-center max-w-xl mx-auto my-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-[#6342e8] flex items-center justify-center mx-auto shadow-xs">
            <ClipboardCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Seating Allocation Available Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Question paper distribution is calculated automatically once student roll numbers are allocated to physical rooms and benches.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              onClick={handleLoadSample}
              className="bg-[#6342e8] hover:bg-[#5232d6] text-white text-xs font-semibold rounded-xl h-10 px-5 shadow-xs flex items-center gap-2 w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Load Demonstration Distribution</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="text-xs font-semibold rounded-xl h-10 px-5 w-full sm:w-auto"
            >
              <Link href="/dashboard/student-seating/seating-allocation" className="flex items-center gap-2">
                <span>Go to Seating Allocation</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Top Distribution Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Total Examination Rooms */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <DoorOpen className="h-4 w-4 text-[#6342e8]" />
                <span>Total Examination Rooms</span>
              </div>
              <div className="mt-2 text-3xl font-black font-headline text-slate-900 dark:text-white">
                {distributionResult.totalRooms}
                <span className="text-xs font-normal text-slate-400 ml-2">Rooms</span>
              </div>
            </div>

            {/* 2. Total Students */}
            <div className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Users className="h-4 w-4 text-[#6342e8]" />
                <span>Total Students Allocated</span>
              </div>
              <div className="mt-2 text-3xl font-black font-headline text-slate-900 dark:text-white">
                {distributionResult.totalStudents}
                <span className="text-xs font-normal text-slate-400 ml-2">Candidates</span>
              </div>
            </div>

            {/* 3. Total Question Papers Required */}
            <div className="bg-white dark:bg-slate-850 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 shadow-sm bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/20">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  <span>Total Question Papers Required</span>
                </div>
                <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[10px] px-2 py-0.5 font-bold">
                  1:1 Ratio
                </Badge>
              </div>
              <div className="mt-2 text-3xl font-black font-headline text-emerald-600 dark:text-emerald-400">
                {distributionResult.totalQuestionPapers}
                <span className="text-xs font-normal text-slate-400 ml-2">Papers</span>
              </div>
            </div>
          </div>

          {/* Subject-Wise Question Paper Requirement Box */}
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs">
            <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#6342e8]" />
                  <span>Subject-Wise Question Paper Requirement</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {distributionResult.subjectRequirements.length} {distributionResult.subjectRequirements.length === 1 ? 'Subject' : 'Subjects'} Scheduled
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-5 sm:px-6 pb-5 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {distributionResult.subjectRequirements.map((sub) => (
                  <div
                    key={sub.subjectName}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between transition-all hover:border-[#6342e8]/40"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {sub.subjectName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {sub.roomCount} {sub.roomCount === 1 ? 'room' : 'rooms'} • {sub.totalStudents} students
                      </div>
                    </div>
                    <Badge className="bg-[#6342e8]/10 text-[#6342e8] dark:text-purple-300 border-[#6342e8]/20 font-black text-xs shrink-0 px-2.5 py-1">
                      {sub.totalQuestionPapers} Papers
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Search & Subject Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Room, Subject, Reg No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 shadow-sm font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-semibold shrink-0">Filter Subject:</span>
              <Select
                value={selectedSubjectFilter}
                onValueChange={(val) => setSelectedSubjectFilter(val)}
              >
                <SelectTrigger className="h-10 w-full sm:w-48 text-xs rounded-xl bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 font-medium shadow-sm">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {distributionResult.subjectRequirements.map((sub) => (
                    <SelectItem key={sub.subjectName} value={sub.subjectName}>
                      {sub.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Room-Wise Distribution Table */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f8f9fc] dark:bg-slate-800/60 hover:bg-[#f8f9fc] border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 w-32">
                    Room
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Subject(s)
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center w-24">
                    Section
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center w-40">
                    Register No. From
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center w-40">
                    Register No. To
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 text-center w-28">
                    Students
                  </TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 text-right w-48">
                    Question Papers Required
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-xs text-slate-500">
                      No matching rooms or subjects found for &quot;{searchQuery}&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRooms.map((room) => {
                    const isMultiSubject = room.items.length > 1;

                    return (
                      <React.Fragment key={room.roomNo}>
                        {room.items.map((item, itemIdx) => (
                          <TableRow
                            key={item.id}
                            className={cn(
                              "transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40",
                              itemIdx === 0 && isMultiSubject && "border-t border-slate-200/90 dark:border-slate-800"
                            )}
                          >
                            {/* Room column */}
                            <TableCell className="align-middle">
                              {itemIdx === 0 ? (
                                <div className="space-y-1">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                                    {room.roomNo}
                                  </span>
                                  {isMultiSubject && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5 bg-purple-50 text-[#6342e8] border-purple-200 block w-fit font-semibold">
                                      {room.items.length} Subjects
                                    </Badge>
                                  )}
                                </div>
                              ) : null}
                            </TableCell>

                            {/* Subject */}
                            <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#6342e8]" />
                                <span>{item.subjectName}</span>
                              </div>
                            </TableCell>

                            {/* Section */}
                            <TableCell className="text-center font-medium text-xs text-slate-600 dark:text-slate-300">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold">
                                {item.section}
                              </span>
                            </TableCell>

                            {/* Register No. From */}
                            <TableCell className="text-center font-mono font-semibold text-xs text-slate-700 dark:text-slate-300">
                              {item.regNoFrom}
                            </TableCell>

                            {/* Register No. To */}
                            <TableCell className="text-center font-mono font-semibold text-xs text-slate-700 dark:text-slate-300">
                              {item.regNoTo}
                            </TableCell>

                            {/* Students */}
                            <TableCell className="text-center font-bold text-xs text-slate-900 dark:text-white">
                              {item.studentCount}
                            </TableCell>

                            {/* Exact Question Papers Required */}
                            <TableCell className="text-right">
                              <span className="inline-flex items-center justify-center min-w-10 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {item.questionPapersRequired}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Subtotal Row for Rooms with Multiple Subjects (e.g. Room 105: English 18 + Economics 12 = Total 30) */}
                        {isMultiSubject && (
                          <TableRow className="bg-purple-50/40 dark:bg-purple-950/20 border-b-2 border-slate-200 dark:border-slate-800">
                            <TableCell colSpan={5} className="py-2.5 text-right font-bold text-xs text-[#6342e8] dark:text-purple-300 uppercase tracking-wide">
                              {room.roomNo} Total Requirements:
                            </TableCell>
                            <TableCell className="py-2.5 text-center font-bold text-xs text-[#6342e8] dark:text-purple-300">
                              {room.totalStudents}
                            </TableCell>
                            <TableCell className="py-2.5 text-right font-black text-xs text-emerald-700 dark:text-emerald-400">
                              <span className="px-2.5 py-1 rounded-md bg-emerald-100/70 dark:bg-emerald-950 border border-emerald-300/60 dark:border-emerald-800 shadow-sm">
                                {room.totalQuestionPapers} Papers Total
                              </span>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>

              {/* Grand Total Footer */}
              {filteredRooms.length > 0 && (
                <TableFooter className="bg-[#f8f9fc] dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                  <TableRow>
                    <TableCell colSpan={5} className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Grand Total ({filteredRooms.length} {filteredRooms.length === 1 ? 'Room' : 'Rooms'})
                    </TableCell>
                    <TableCell className="text-center font-extrabold text-sm text-[#6342e8] dark:text-purple-300">
                      {filteredRooms.reduce((sum, r) => sum + r.totalStudents, 0)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      {filteredRooms.reduce((sum, r) => sum + r.totalQuestionPapers, 0)} Papers Total
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
