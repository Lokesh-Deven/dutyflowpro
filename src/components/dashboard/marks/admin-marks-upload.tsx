"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  ExamResultBatch,
  ExamResultRecord,
  MarksParsePreviewResult,
} from '@/lib/student-marks-types';
import {
  getExamResultBatches,
  saveExamResultBatch,
  deleteExamResultBatch,
  parseMarksExcel,
  downloadMarksExcelTemplate,
  exportExamResultsToExcel,
} from '@/lib/student-marks-service';
import { VisualStudentScorecard } from '@/components/student-portal/results/visual-student-scorecard';
import { getClassBadgeStyle } from '@/lib/student-seating-colors';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trophy,
  Users,
  Eye,
  Trash2,
  RefreshCw,
  Plus,
  ArrowRight,
  Layers,
  Calendar,
  BookOpen,
  Filter,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function AdminMarksUpload() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Pre-University College';

  // Upload Config State
  const [examTitle, setExamTitle] = useState('Mid-Term Examination 2025-26');
  const [examType, setExamType] = useState('Mid-Term');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [selectedClass, setSelectedClass] = useState('1PUC');

  // Batches & Preview State
  const [savedBatches, setSavedBatches] = useState<ExamResultBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Parsed Preview
  const [previewResult, setPreviewResult] = useState<MarksParsePreviewResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Modals
  const [previewStudentRecords, setPreviewStudentRecords] = useState<ExamResultRecord[] | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<ExamResultBatch | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const batches = await getExamResultBatches();
      setSavedBatches(batches);
    } catch (err) {
      console.error('Error loading result batches:', err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsParsing(true);

    try {
      const result = await parseMarksExcel(file, {
        defaultExamTitle: examTitle.trim() || 'Examination Marks',
        defaultExamType: examType,
        defaultAcademicYear: academicYear,
        defaultClass: selectedClass,
      });

      setPreviewResult(result);

      if (result.warnings.length > 0) {
        toast({
          title: 'Validation Notices Found',
          description: `Parsed ${result.records.length} students with ${result.warnings.length} warning(s). Review table below.`,
        });
      } else {
        toast({
          title: 'Excel Parsed Successfully',
          description: `Parsed ${result.records.length} students across ${result.batchSummary.detectedSubjects.length} detected subject columns.`,
        });
      }
    } catch (err: any) {
      console.error('Parsing error:', err);
      toast({
        title: 'Parsing Failed',
        description: err?.message || 'Could not parse the selected marks sheet.',
        variant: 'destructive',
      });
      setPreviewResult(null);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePublishResults = async () => {
    if (!previewResult || previewResult.records.length === 0) return;

    setIsPublishing(true);

    try {
      const records = previewResult.records;
      const total = records.length;
      const passed = records.filter((r) => r.status === 'Pass').length;
      const distinction = records.filter((r) => r.resultClassification === 'Distinction').length;
      const firstClass = records.filter((r) => r.resultClassification === 'First Class').length;
      const secondClass = records.filter((r) => r.resultClassification === 'Second Class').length;
      const passClass = records.filter((r) => r.resultClassification === 'Pass').length;
      const failed = total - passed;
      const avg = Number(
        (records.reduce((sum, r) => sum + r.percentage, 0) / (total || 1)).toFixed(1)
      );

      // Subject Averages
      const subAverages: Record<string, number> = {};
      previewResult.batchSummary.detectedSubjects.forEach((sub) => {
        let subSum = 0;
        let count = 0;
        records.forEach((r) => {
          const match = r.subjects.find((s) => s.subjectName === sub.name);
          if (match) {
            subSum += match.marksScored;
            count++;
          }
        });
        subAverages[sub.name] = count > 0 ? Number((subSum / count).toFixed(1)) : 0;
      });

      const newBatch: ExamResultBatch = {
        id: `batch-${Date.now()}`,
        examTitle: examTitle.trim() || 'Examination Results',
        examType,
        academicYear,
        className: selectedClass,
        totalStudents: total,
        passedCount: passed,
        distinctionCount: distinction,
        firstClassCount: firstClass,
        secondClassCount: secondClass,
        passClassCount: passClass,
        failCount: failed,
        classAverage: avg,
        subjectAverages: subAverages,
        uploadedAt: new Date().toISOString(),
        records,
      };

      await saveExamResultBatch(newBatch);

      toast({
        title: 'Results Published Successfully',
        description: `Published results for ${total} students in "${newBatch.examTitle}". Students can now view their visual scorecards.`,
      });

      setPreviewResult(null);
      setUploadedFileName('');
      await loadBatches();
    } catch (err: any) {
      console.error('Publish error:', err);
      toast({
        title: 'Publish Failed',
        description: err?.message || 'Failed to publish results.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!batchToDelete) return;
    try {
      await deleteExamResultBatch(batchToDelete.id);
      toast({
        title: 'Batch Deleted',
        description: `Removed "${batchToDelete.examTitle}" from published results.`,
      });
      setBatchToDelete(null);
      await loadBatches();
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err?.message || 'Could not delete batch.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-indigo-200 border border-white/10">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Examinations & Results Module
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="w-3 h-3" />
                Auto-Calculation Engine
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-headline">
              Admin Marks Upload & Results Publishing
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Upload class result sheets in Excel or CSV format. DutyFlow automatically detects dynamic subject columns, calculates grand totals and percentage divisions, validates marks thresholds, and publishes interactive scorecards to the Student Results Portal.
            </p>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={downloadMarksExcelTemplate}
              className="h-10 px-4 bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold gap-2 rounded-xl"
            >
              <Download className="w-4 h-4 text-amber-300" />
              Download Excel Template
            </Button>

            <Button
              type="button"
              asChild
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 rounded-xl shadow-md"
            >
              <Link href="/student/results">
                <Eye className="w-4 h-4" />
                Open Student Results Portal
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Ingestion Settings & File Dropzone Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            1. Configure Examination Session & Upload Results Sheet
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select or enter the examination details, then drag and drop the completed Excel sheet.
          </p>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Exam / Test Title</Label>
            <Input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="e.g. Mid-Term Examination 2025-26"
              className="h-9 text-xs font-semibold bg-slate-50/70"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Exam Type</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50/70">
                <SelectValue placeholder="Select Exam Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unit Test">Unit Test</SelectItem>
                <SelectItem value="Mid-Term">Mid-Term Examination</SelectItem>
                <SelectItem value="Preparatory">Preparatory Examination</SelectItem>
                <SelectItem value="Annual">Annual / Board Examination</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Class / Grade</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50/70">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1PUC">1 PUC (11th Standard)</SelectItem>
                <SelectItem value="2PUC">2 PUC (12th Standard)</SelectItem>
                <SelectItem value="Combined">1 & 2 PUC (All Classes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Academic Year</Label>
            <Input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025-26"
              className="h-9 text-xs font-semibold bg-slate-50/70"
            />
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer group",
            isParsing
              ? "border-indigo-400 bg-indigo-50/50"
              : previewResult
              ? "border-emerald-300 bg-emerald-50/30 hover:border-emerald-400"
              : "border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <div className="space-y-3 max-w-md mx-auto">
            {isParsing ? (
              <>
                <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                <div className="text-sm font-bold text-indigo-900">
                  Parsing dynamic subject columns & validating scores...
                </div>
              </>
            ) : previewResult ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm font-black text-slate-900">
                  File Loaded: {uploadedFileName}
                </div>
                <p className="text-xs text-slate-500">
                  {previewResult.records.length} students detected. Click again to replace with another file.
                </p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-10 h-10 text-indigo-600 mx-auto group-hover:scale-110 transition-transform" />
                <div className="text-sm font-black text-slate-800">
                  Click to Browse or Drag & Drop Results Excel Sheet
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Supports .xlsx, .xls, and .csv files. Handles 6+ dynamic subject columns, missing totals, and custom combinations.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-detects Max Marks & Passing Thresholds
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Data Preview & Validation Table (Shown upon successful parse) */}
      {previewResult && (
        <div className="bg-white border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-7 shadow-lg space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-600 text-white font-bold text-xs">
                  Validation Preview
                </Badge>
                <h3 className="text-lg font-black text-slate-900">
                  {previewResult.batchSummary.examTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Detected {previewResult.batchSummary.detectedSubjects.length} Subject Columns: {' '}
                <span className="font-semibold text-slate-700">
                  {previewResult.batchSummary.detectedSubjects.map((s) => s.name).join(', ')}
                </span>
              </p>
            </div>

            {/* Publish & Cancel Controls */}
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewResult(null)}
                className="text-xs font-bold text-slate-600"
              >
                Discard Preview
              </Button>

              <Button
                type="button"
                onClick={handlePublishResults}
                disabled={isPublishing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Publish Results ({previewResult.records.length} Students)</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Validation Warnings Box if any */}
          {previewResult.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>
                  Validation Notices ({previewResult.warnings.length} issues flagged):
                </span>
              </div>
              <ul className="text-xs text-amber-800 space-y-1 list-disc pl-5 max-h-36 overflow-y-auto">
                {previewResult.warnings.map((w, i) => (
                  <li key={i}>
                    <strong>Row {w.row}</strong> ({w.student}): {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Reg No</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Class & Comb</th>
                  {previewResult.batchSummary.detectedSubjects.map((sub) => (
                    <th key={sub.name} className="py-3 px-2.5 text-center">
                      <div>{sub.name}</div>
                      <div className="text-[9px] font-normal text-slate-400">
                        Max: {sub.maxMarks}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center">Grand Total</th>
                  <th className="py-3 px-3 text-center">% Age</th>
                  <th className="py-3 px-3 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {previewResult.records.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                      {rec.registerNumber}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {rec.studentName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {rec.className} • {rec.combination}
                    </td>
                    {rec.subjects.map((sub) => (
                      <td
                        key={sub.subjectName}
                        className={cn(
                          "py-2.5 px-2.5 text-center font-mono",
                          sub.status === 'Fail' ? "text-rose-600 font-bold bg-rose-50/60" : "text-slate-800"
                        )}
                      >
                        {sub.marksScored}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                      {rec.grandTotal}/{rec.maxGrandTotal}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">
                      {rec.percentage}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[10px] font-black",
                          rec.resultClassification === 'Distinction'
                            ? "bg-emerald-100 text-emerald-800"
                            : rec.resultClassification === 'First Class'
                            ? "bg-indigo-100 text-indigo-800"
                            : rec.status === 'Fail'
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-800"
                        )}
                      >
                        {rec.resultClassification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Published Result Batches History */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Published Result Batches ({savedBatches.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Past uploaded result sheets available for viewing, student scorecards, and export
            </p>
          </div>
        </div>

        {savedBatches.length === 0 ? (
          <div className="p-12 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No Result Batches Published Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload an Excel result sheet above to publish your first examination marks batch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedBatches.map((batch) => {
              const passPct = batch.totalStudents > 0
                ? Number(((batch.passedCount / batch.totalStudents) * 100).toFixed(1))
                : 100;

              return (
                <div
                  key={batch.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-all space-y-4 shadow-2xs hover:shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {batch.examType} • {batch.className}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(batch.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {batch.examTitle}
                    </h3>
                  </div>

                  {/* Batch KPIs */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Students</div>
                      <div className="text-base font-black text-slate-900">{batch.totalStudents}</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Pass Rate</div>
                      <div className="text-base font-black text-emerald-600">{passPct}%</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Class Avg</div>
                      <div className="text-base font-black text-indigo-600">{batch.classAverage}%</div>
                    </div>
                  </div>

                  {/* Classification Breakdown Bar */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500 font-semibold">
                      <span>Distinctions: <strong className="text-emerald-700">{batch.distinctionCount}</strong></span>
                      <span>First Class: <strong className="text-indigo-700">{batch.firstClassCount}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => exportExamResultsToExcel(batch)}
                      className="text-xs font-bold text-slate-600 hover:text-indigo-700 h-8 px-2 gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (batch.records && batch.records.length > 0) {
                            setPreviewStudentRecords(batch.records);
                          }
                        }}
                        className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-2.5 gap-1 shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview Cards
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setBatchToDelete(batch)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Scorecard Preview Modal */}
      {previewStudentRecords && previewStudentRecords.length > 0 && (
        <Dialog open={!!previewStudentRecords} onOpenChange={(open) => !open && setPreviewStudentRecords(null)}>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-indigo-600" />
                    Student Visual Scorecard & Analytics Preview
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4">
              <VisualStudentScorecard
                records={previewStudentRecords}
                classAverage={84.5}
              />
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewStudentRecords(null)}
                className="text-xs font-bold"
              >
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. Delete Confirmation Dialog */}
      {batchToDelete && (
        <AlertDialog open={!!batchToDelete} onOpenChange={(open) => !open && setBatchToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-slate-900">
                Delete Published Batch?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Are you sure you want to delete &quot;{batchToDelete.examTitle}&quot; ({batchToDelete.totalStudents} students)?
                Students will no longer be able to view scorecards for this exam.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs font-semibold">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBatch}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Batch
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
