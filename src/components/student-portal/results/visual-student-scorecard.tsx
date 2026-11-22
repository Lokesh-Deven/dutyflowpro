"use client";

import React, { useState } from 'react';
import {
  ExamResultRecord,
  ExamResultSubject,
} from '@/lib/student-marks-types';
import { calculateStudentInsights } from '@/lib/student-marks-service';
import { downloadDigitalMarksCardPdf } from '@/lib/student-marks-pdf-service';
import { SubjectBarChart } from './subject-bar-chart';
import { StrengthsRadarChart } from './strengths-radar-chart';
import { ExamTrendChart } from './exam-trend-chart';
import { getClassBadgeStyle } from '@/lib/student-seating-colors';
import { getInvigilatorInitial, cn } from '@/lib/utils';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  Sparkles,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
  BarChart3,
  Radar,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Trophy,
  Target,
  GraduationCap,
} from 'lucide-react';

interface VisualStudentScorecardProps {
  records: ExamResultRecord[];
  classAverage?: number;
  onRefresh?: () => void;
  showBackToSearch?: boolean;
  onBackToSearch?: () => void;
}

export function VisualStudentScorecard({
  records,
  classAverage = 82.5,
  onRefresh,
  showBackToSearch = false,
  onBackToSearch,
}: VisualStudentScorecardProps) {
  const { toast } = useToast();
  const { signatory, pdfPaletteId } = useAllotment();
  const { user, profile } = useAuth();

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Pre-University College';

  // Active selected exam tab
  const [selectedExamId, setSelectedExamId] = useState<string>(
    records[records.length - 1]?.id || ''
  );
  const [activeChartTab, setActiveChartTab] = useState<'bar' | 'radar' | 'trend'>('bar');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Current active record
  const currentRecord = records.find((r) => r.id === selectedExamId) || records[records.length - 1];

  if (!currentRecord) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
        <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Result Record Available</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          We could not find examination records for this student.
        </p>
      </div>
    );
  }

  const classBadge = getClassBadgeStyle(currentRecord.className);
  const insights = calculateStudentInsights(currentRecord, classAverage, records);

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await downloadDigitalMarksCardPdf({
        record: currentRecord,
        institutionName,
        signatory: signatory || undefined,
        paletteId: pdfPaletteId,
        classAverage,
      });

      toast({
        title: 'Marks Card Downloaded',
        description: `Official digital marks card generated for ${currentRecord.studentName} (${currentRecord.registerNumber}).`,
      });
    } catch (err: any) {
      console.error('Failed to export marks card PDF:', err);
      toast({
        title: 'Export Failed',
        description: err?.message || 'Could not generate marks card PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Result Badge Color
  const getClassificationBadge = (cls: string) => {
    switch (cls) {
      case 'Distinction':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-emerald-500/10',
          dot: 'bg-emerald-500',
          icon: Sparkles,
        };
      case 'First Class':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-indigo-500/10',
          dot: 'bg-indigo-500',
          icon: Trophy,
        };
      case 'Second Class':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-amber-500/10',
          dot: 'bg-amber-500',
          icon: Target,
        };
      case 'Pass':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800',
          dot: 'bg-teal-500',
          icon: CheckCircle2,
        };
      default:
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
          dot: 'bg-rose-500',
          icon: AlertTriangle,
        };
    }
  };

  const classifStyle = getClassificationBadge(currentRecord.resultClassification);
  const ClassifIcon = classifStyle.icon;

  return (
    <div className="space-y-6">
      {/* 1. Exam Switcher Banner if multiple exams exist */}
      {records.length > 1 && (
        <div className="bg-slate-900 text-white rounded-2xl p-3 px-4 flex items-center justify-between flex-wrap gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Select Examination:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {records.map((r) => {
              const isSelected = r.id === currentRecord.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedExamId(r.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-102"
                      : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  )}
                >
                  <Calendar className="w-3 h-3 text-indigo-300" />
                  <span>{r.examTitle}</span>
                  <span className="text-[10px] opacity-80 font-mono">({r.percentage}%)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Top Header Summary Hero Card */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          {/* Student Biodata */}
          <div className="flex items-start sm:items-center gap-4">
            {currentRecord.photoUrl ? (
              <img
                src={currentRecord.photoUrl}
                alt={currentRecord.studentName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-800 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                {getInvigilatorInitial(currentRecord.studentName)}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-headline">
                  {currentRecord.studentName}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-xs",
                    classBadge.badgeClass
                  )}
                  style={{
                    backgroundColor: classBadge.bgHex,
                    borderColor: classBadge.borderHex,
                    color: classBadge.textHex,
                  }}
                >
                  {currentRecord.className}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {currentRecord.combination}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  Reg No: {currentRecord.registerNumber}
                </span>
                <span>•</span>
                <span>Stream: {currentRecord.stream}</span>
                {currentRecord.dob && (
                  <>
                    <span>•</span>
                    <span>DOB: {currentRecord.dob}</span>
                  </>
                )}
                {currentRecord.fatherName && (
                  <>
                    <span>•</span>
                    <span>Father: {currentRecord.fatherName}</span>
                  </>
                )}
              </div>

              <div className="text-xs text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-1 pt-0.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{currentRecord.examTitle}</span>
                <span className="text-slate-400 dark:text-slate-500 font-normal">({currentRecord.academicYear})</span>
              </div>
            </div>
          </div>

          {/* Quick PDF & Back Action */}
          <div className="flex items-center gap-2.5 self-start lg:self-center">
            {showBackToSearch && onBackToSearch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBackToSearch}
                className="h-10 text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Search Another Student
              </Button>
            )}

            <Button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 rounded-xl shadow-md shadow-indigo-600/25 cursor-pointer"
            >
              {isExportingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Marks Card (PDF)</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 4 Metric Summary Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Grand Total */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Grand Total Scored
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {currentRecord.grandTotal}
              <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1">
                / {currentRecord.maxGrandTotal}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="bg-indigo-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, currentRecord.percentage)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Percentage */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Aggregate Percentage
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {currentRecord.percentage}%
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {currentRecord.percentage >= classAverage ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{(currentRecord.percentage - classAverage).toFixed(1)}% vs class avg
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {(classAverage - currentRecord.percentage).toFixed(1)}% below class avg
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Result Classification */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Result Classification
            </span>
            <div className="pt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black border shadow-xs",
                  classifStyle.bg
                )}
              >
                <ClassifIcon className="w-4 h-4" />
                <span>{currentRecord.resultClassification}</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              {currentRecord.status === 'Pass' ? 'All Subjects Cleared' : 'Backlog subject detected'}
            </div>
          </div>

          {/* Card 4: Rank / Milestone */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Performance Rank
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>#{currentRecord.rank || 1}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
              {records.length > 1 ? `Tracked across ${records.length} exams` : 'Latest examination session'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Actionable Insights Callout Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strongest Subject */}
        {insights.strongestSubject && (
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Strongest Subject
              </span>
              <span className="text-[10px] font-bold bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                {insights.strongestSubject.grade} Grade
              </span>
            </div>
            <div className="text-base font-black text-emerald-950 dark:text-emerald-100">
              {insights.strongestSubject.name} ({insights.strongestSubject.marks}/{insights.strongestSubject.maxMarks})
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Highest scoring subject with {insights.strongestSubject.percentage}% mastery. Excellent theoretical and practical retention.
            </p>
          </div>
        )}

        {/* Growth Focus Subject */}
        {insights.needsFocusSubject && (
          <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Growth Opportunity
              </span>
              <span className="text-[10px] font-bold bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                {insights.needsFocusSubject.grade} Grade
              </span>
            </div>
            <div className="text-base font-black text-amber-950 dark:text-amber-100">
              {insights.needsFocusSubject.name} ({insights.needsFocusSubject.marks}/{insights.needsFocusSubject.maxMarks})
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {insights.needsFocusSubject.marksNeededToPass
                ? `Needs ${insights.needsFocusSubject.marksNeededToPass} marks to achieve pass benchmark. Priority revision recommended.`
                : 'Extra practice in key numericals/case studies will elevate this score to Distinction level.'}
            </p>
          </div>
        )}

        {/* Milestone Message */}
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Milestone Target
          </span>
          <div className="text-sm font-black text-indigo-950 dark:text-indigo-100">
            {currentRecord.resultClassification === 'Distinction'
              ? 'Distinction Achieved!'
              : 'Targeting Next Milestone'}
          </div>
          <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
            {insights.milestoneMessage}
          </p>
        </div>
      </div>

      {/* 4. Detailed Subject-Wise Marks Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Detailed Subject-Wise Performance Breakdown
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {currentRecord.subjects.length} Subjects Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Subject Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Max Marks</th>
                <th className="py-3 px-4 text-center">Pass Marks</th>
                <th className="py-3 px-4 text-center">Marks Scored</th>
                <th className="py-3 px-4 w-36">Mastery</th>
                <th className="py-3 px-4 text-center">Grade</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {currentRecord.subjects.map((sub, idx) => {
                const isFail = sub.status === 'Fail';

                return (
                  <tr
                    key={sub.subjectName}
                    className={cn(
                      "transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40",
                      sub.isTopScoring && "bg-amber-50/30 dark:bg-amber-950/20",
                      isFail && "bg-rose-50/40 dark:bg-rose-950/30"
                    )}
                  >
                    <td className="py-3 px-4 text-center font-bold text-slate-400 dark:text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {sub.subjectName}
                        </span>
                        {sub.isTopScoring && (
                          <span
                            title="Top Scoring Subject"
                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800"
                          >
                            <Trophy className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                            Top
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {sub.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-600 dark:text-slate-400">
                      {sub.maxMarks}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-600 dark:text-slate-400">
                      {sub.passMarks}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-black text-sm text-slate-900 dark:text-white">
                      {sub.marksScored}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{sub.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              isFail
                                ? "bg-rose-500"
                                : sub.isTopScoring
                                ? "bg-amber-500"
                                : sub.percentage >= 85
                                ? "bg-purple-600"
                                : "bg-indigo-600"
                            )}
                            style={{ width: `${Math.min(100, sub.percentage)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          "inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-md",
                          sub.grade === 'A+' || sub.grade === 'A'
                            ? "bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-black"
                            : isFail
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-black"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
                        )}
                      >
                        {sub.grade}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isFail ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          BACKLOG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          PASS
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Footer Row */}
            <tfoot>
              <tr className="bg-slate-100/90 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700 text-xs">
                <td colSpan={3} className="py-3 px-4 text-slate-900 dark:text-white font-black">
                  GRAND TOTAL & OVERALL RESULT
                </td>
                <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                  {currentRecord.maxGrandTotal}
                </td>
                <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                  {Math.round(currentRecord.maxGrandTotal * 0.35)}
                </td>
                <td className="py-3 px-4 text-center font-mono font-black text-base text-indigo-700 dark:text-indigo-400">
                  {currentRecord.grandTotal}
                </td>
                <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white">
                  {currentRecord.percentage}% Aggregate
                </td>
                <td className="py-3 px-4 text-center font-bold">
                  {currentRecord.status === 'Pass' ? 'PASS' : 'FAIL'}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black border",
                      classifStyle.bg
                    )}
                  >
                    {currentRecord.resultClassification.toUpperCase()}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Meaningful Visual Insights & Charts Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Visual Scorecard Analytics & Performance Insights
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
              Comparative analysis across subjects, language vs core stream balance, and multi-exam trajectory
            </p>
          </div>

          {/* Chart View Switcher */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200/80 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveChartTab('bar')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeChartTab === 'bar'
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Subject Performance</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('radar')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeChartTab === 'radar'
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Strengths Radar</span>
            </button>

            {records.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveChartTab('trend')}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  activeChartTab === 'trend'
                    ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Exam Trend Line</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Chart Render */}
        <div className="pt-2">
          {activeChartTab === 'bar' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-2">
                <span>Scores compared with Pass Threshold (35%) and Class Average benchmark</span>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  Class Mean: {classAverage}%
                </span>
              </div>
              <SubjectBarChart subjects={currentRecord.subjects} classAverage={classAverage} />
            </div>
          )}

          {activeChartTab === 'radar' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-2">
                <span>
                  Language Mastery ({insights.languageAvg}%) vs Core Stream Subjects ({insights.coreAvg}%)
                </span>
              </div>
              <StrengthsRadarChart subjects={currentRecord.subjects} />
            </div>
          )}

          {activeChartTab === 'trend' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-2">
                <span>Progression across Unit Test, Mid-Term, and Preparatory examinations</span>
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                  Trajectory: {(insights.trendTrajectory || 'FIRST-EXAM').toUpperCase()}
                </span>
              </div>
              <ExamTrendChart records={records} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
