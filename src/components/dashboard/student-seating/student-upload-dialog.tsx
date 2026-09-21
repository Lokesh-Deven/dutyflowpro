"use client";

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentSubject, StudentDataValidationResult, StudentRecord } from '@/lib/student-seating-types';
import { validateAndParseStudentExcel } from '@/lib/student-seating-service';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface StudentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: StudentSubject | null;
  onSave: (subjectId: string, students: StudentRecord[]) => void;
}

export function StudentUploadDialog({
  open,
  onOpenChange,
  subject,
  onSave,
}: StudentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<StudentDataValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setResult(null);
    setParseError(null);
    setIsValidating(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !subject) return;

    setFile(selected);
    setParseError(null);
    setIsValidating(true);

    try {
      const res = await validateAndParseStudentExcel(selected, subject.id, subject.expectedStudents);
      setResult(res);
    } catch (err: any) {
      setParseError(err.message || 'Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.');
      setResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmSave = () => {
    if (!result || !subject || result.validRecords.length === 0) return;
    onSave(subject.id, result.validRecords);
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg bg-white border border-slate-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-headline text-lg font-bold text-slate-900">
                Upload Student List &bull; {subject?.name || 'Subject'}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Expected Format: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-semibold text-slate-700">Sl No | Name | Section | Roll No</code>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 transition-all rounded-xl p-6 text-center cursor-pointer space-y-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                {file ? file.name : "Click to browse or drop student Excel file"}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supported formats: .xlsx, .xls, .csv
              </p>
            </div>
          </div>

          {isValidating && (
            <div className="text-center py-3 space-y-1">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Validating student rows and roll numbers...</p>
            </div>
          )}

          {parseError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>{parseError}</div>
            </div>
          )}

          {/* Validation Report */}
          {result && (
            <div className="space-y-3 bg-slate-50/80 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="font-headline font-bold text-xs uppercase tracking-wider text-slate-700">
                  Validation Results
                </span>
                <Badge
                  variant="outline"
                  className={result.isValid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}
                >
                  {result.isValid ? "Valid List" : "Issues Found"}
                </Badge>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[9px] text-slate-400 font-bold uppercase">Expected</div>
                  <div className="font-headline text-sm font-black text-slate-800 mt-0.5">
                    {result.expectedCount || '—'}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[9px] text-slate-400 font-bold uppercase">Uploaded</div>
                  <div className="font-headline text-sm font-black text-slate-800 mt-0.5">
                    {result.totalRows}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[9px] text-slate-400 font-bold uppercase">Valid</div>
                  <div className="font-headline text-sm font-black text-emerald-600 mt-0.5">
                    {result.validRecords.length}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[9px] text-slate-400 font-bold uppercase">Duplicates</div>
                  <div className={`font-headline text-sm font-black mt-0.5 ${result.duplicates.length > 0 ? "text-rose-600" : "text-slate-400"}`}>
                    {result.duplicates.length}
                  </div>
                </div>
              </div>

              {/* Mismatch Warning */}
              {result.warning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div className="font-medium">{result.warning}</div>
                </div>
              )}

              {/* Error messages if any */}
              {result.errors.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  <div className="text-[11px] font-bold text-rose-700">Errors ({result.errors.length}):</div>
                  {result.errors.slice(0, 5).map((err, i) => (
                    <div key={i} className="text-[11px] text-rose-600 bg-rose-50/70 p-1.5 rounded border border-rose-200">
                      {err.reason}
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="text-[10px] text-slate-500 italic">
                      + {result.errors.length - 5} more error(s)...
                    </div>
                  )}
                </div>
              )}

              {/* Sample Preview of Valid Records */}
              {result.validRecords.length > 0 && (
                <div className="pt-1">
                  <div className="text-[11px] font-bold text-slate-700 mb-1">
                    First 3 Students Preview:
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
                    {result.validRecords.slice(0, 3).map((std) => (
                      <div key={std.id} className="p-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{std.name}</span>
                          <span className="text-slate-400 text-[11px] ml-2">Sec: {std.section}</span>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono font-bold text-indigo-700 border-indigo-200">
                          {std.rollNo}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmSave}
            disabled={!result || result.validRecords.length === 0}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Save {result?.validRecords.length || 0} Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
