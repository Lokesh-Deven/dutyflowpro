"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileSpreadsheet,
  CalendarDays,
  Users,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Info,
  Clock,
  Building2,
  GraduationCap
} from 'lucide-react';
import {
  downloadTimetableTemplate,
  downloadInvigilatorTemplate,
  SAMPLE_TIMETABLE_ROWS,
  SAMPLE_INVIGILATOR_ROWS,
} from '@/lib/excel-templates';
import { useToast } from '@/hooks/use-toast';

export default function DownloadTemplatesPage() {
  const { toast } = useToast();
  const [downloadingTimetable, setDownloadingTimetable] = useState(false);
  const [downloadingInvigilator, setDownloadingInvigilator] = useState(false);

  const handleDownloadTimetable = () => {
    try {
      setDownloadingTimetable(true);
      downloadTimetableTemplate();
      toast({
        title: "Template Downloaded",
        description: "examination_timetable_template.xlsx is ready for editing.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not generate the timetable template file.",
      });
    } finally {
      setTimeout(() => setDownloadingTimetable(false), 800);
    }
  };

  const handleDownloadInvigilator = () => {
    try {
      setDownloadingInvigilator(true);
      downloadInvigilatorTemplate();
      toast({
        title: "Template Downloaded",
        description: "invigilators_template.xlsx is ready for editing.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not generate the invigilator template file.",
      });
    } finally {
      setTimeout(() => setDownloadingInvigilator(false), 800);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header Banner */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">
            Download Templates
          </h1>
          <Badge className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-none font-semibold text-xs px-2.5 py-0.5 rounded-full">
            Excel (.xlsx)
          </Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
          Download standardized Excel templates to prepare your examination timetable and invigilator rosters. Enter your data in the prescribed columns and seamlessly upload using the <strong>&ldquo;Import from Excel&rdquo;</strong> feature.
        </p>
      </div>

      {/* Two Horizontal Panels/Cards */}
      <div className="space-y-6">
        {/* PANEL 1: Timetable Template */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-[3px] w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />
          
          <CardHeader className="p-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold font-headline text-slate-900 dark:text-white">
                      Timetable Template
                    </CardTitle>
                    <Badge variant="outline" className="border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300 text-[10px] font-bold">
                      Examinations
                    </Badge>
                  </div>
                  <CardDescription className="text-sm italic text-slate-600 dark:text-slate-400 mt-1">
                    Use this template to create and prepare your examination timetable.
                  </CardDescription>
                </div>
              </div>

              {/* Download Button */}
              <Button
                type="button"
                onClick={handleDownloadTimetable}
                disabled={downloadingTimetable}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 h-11 shrink-0 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download ⬇</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-2 space-y-4">
            {/* Metadata Preview callout matching Image 1 */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Header Rows:</span>
                <span className="text-slate-500">Institution Name &amp; Examination Name (Rows 1–2)</span>
              </div>
              <div className="text-slate-300 dark:text-slate-700 hidden sm:block">•</div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span className="text-slate-500">Date Format: <strong>DD/MM/YYYY</strong> (e.g. 10/03/2027)</span>
              </div>
              <div className="text-slate-300 dark:text-slate-700 hidden sm:block">•</div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span className="text-slate-500">Time Format: e.g., <strong>10.00 AM</strong> or <strong>10:00 AM</strong></span>
              </div>
            </div>

            {/* Miniature Excel Table Preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="bg-slate-100/90 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Spreadsheet Preview: examination_timetable_template.xlsx</span>
                <span className="font-mono text-[10px] text-blue-600 font-semibold lowercase">.xlsx</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-[11px]">
                      <th className="py-2 px-3.5 font-bold border-r border-blue-200 dark:border-blue-800 bg-blue-100/70 dark:bg-blue-900/40">Institution Name</th>
                      <th colSpan={5} className="py-2 px-3.5 italic text-slate-500 font-normal">Type your Institution name here</th>
                    </tr>
                    <tr className="bg-blue-50 dark:bg-blue-950/50 border-b-2 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-200 text-[11px]">
                      <th className="py-2 px-3.5 font-bold border-r border-blue-200 dark:border-blue-800 bg-blue-100/70 dark:bg-blue-900/40">Examination Name</th>
                      <th colSpan={5} className="py-2 px-3.5 italic text-slate-500 font-normal">Type name of the examination here</th>
                    </tr>
                    <tr className="bg-blue-600 text-white font-bold">
                      <th className="py-2.5 px-3.5 border-r border-blue-500">Date (DD/MM/YYYY)</th>
                      <th className="py-2.5 px-3.5 border-r border-blue-500">Subject</th>
                      <th className="py-2.5 px-3.5 border-r border-blue-500 text-center">Start Time</th>
                      <th className="py-2.5 px-3.5 border-r border-blue-500 text-center">End Time</th>
                      <th className="py-2.5 px-3.5 border-r border-blue-500 text-center">Number of Invigilators</th>
                      <th className="py-2.5 px-3.5 text-center">Number of Relievers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-mono text-[11px]">
                    {SAMPLE_TIMETABLE_ROWS.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100">{row.date}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 font-sans font-semibold text-slate-800 dark:text-slate-200">{row.subject}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 text-center text-slate-600 dark:text-slate-300">{row.startTime}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 text-center text-slate-600 dark:text-slate-300">{row.endTime}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-blue-600">{row.invigilators}</td>
                        <td className="py-2.5 px-3.5 text-center font-bold text-indigo-600">{row.relievers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PANEL 2: Invigilator Template */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-purple-500" />
          
          <CardHeader className="p-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-400 shrink-0 mt-0.5">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold font-headline text-slate-900 dark:text-white">
                      Invigilator Template
                    </CardTitle>
                    <Badge variant="outline" className="border-purple-200 text-[#6342e8] dark:border-purple-800 dark:text-purple-300 text-[10px] font-bold">
                      Faculty Rosters
                    </Badge>
                  </div>
                  <CardDescription className="text-sm italic text-slate-600 dark:text-slate-400 mt-1">
                    Use this template to enter and prepare invigilators’ details.
                  </CardDescription>
                </div>
              </div>

              {/* Download Button */}
              <Button
                type="button"
                onClick={handleDownloadInvigilator}
                disabled={downloadingInvigilator}
                className="w-full sm:w-auto bg-gradient-to-r from-[#6342e8] to-[#8b5cf6] hover:from-[#5232d6] hover:to-[#7c3aed] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 h-11 shrink-0 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download ⬇</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-2 space-y-4">
            {/* Metadata Preview callout matching Image 2 */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#6342e8]" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Required Columns:</span>
                <span className="text-slate-500">Sl No, Name, Designation / Department, Mobile No, Email ID</span>
              </div>
              <div className="text-slate-300 dark:text-slate-700 hidden sm:block">•</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-slate-500">Mobile numbers: 10 digits without country code</span>
              </div>
            </div>

            {/* Miniature Excel Table Preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="bg-slate-100/90 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Spreadsheet Preview: invigilators_template.xlsx</span>
                <span className="font-mono text-[10px] text-[#6342e8] font-semibold lowercase">.xlsx</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#6342e8] text-white font-bold">
                      <th className="py-2.5 px-3.5 border-r border-purple-400/60 text-center w-14">Sl No</th>
                      <th className="py-2.5 px-3.5 border-r border-purple-400/60">Name</th>
                      <th className="py-2.5 px-3.5 border-r border-purple-400/60">Designation / Department</th>
                      <th className="py-2.5 px-3.5 border-r border-purple-400/60">Mobile No</th>
                      <th className="py-2.5 px-3.5">Email ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-sans text-xs">
                    {SAMPLE_INVIGILATOR_ROWS.map((row) => (
                      <tr key={row.slNo} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 text-center font-mono font-bold text-slate-500">{row.slNo}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">{row.name}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">{row.designation}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-100 dark:border-slate-800 font-mono text-slate-700 dark:text-slate-200">{row.mobile}</td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-600 dark:text-slate-300">{row.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How to use workflow card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-800/40 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-[#6342e8]" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Quick 3-Step Import Workflow
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1.5 shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Download Template</div>
            <p className="text-slate-500 dark:text-slate-400">
              Click <strong>&ldquo;Download ⬇&rdquo;</strong> on either template above to get the ready-to-edit Excel file.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1.5 shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-purple-100 text-[#6342e8] dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Fill in Your Data</div>
            <p className="text-slate-500 dark:text-slate-400">
              Paste or type your institution&apos;s records into the respective columns. Keep column headers untouched.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1.5 shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Import from Excel</div>
            <p className="text-slate-500 dark:text-slate-400">
              Click <strong>&ldquo;Import from Excel&rdquo;</strong> on Examinations or Directory to populate records in 1 second.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
