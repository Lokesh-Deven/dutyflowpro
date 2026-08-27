"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Save, FileSpreadsheet, Building2, GraduationCap, CalendarCheck, CheckCircle2, AlertTriangle, Users, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { uploadUserFile } from '@/lib/storage-service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn, formatTimeTo12Hour } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
  onAllotmentChange: (newResult: AllotmentResult) => void;
};

export function AllotmentSheet({ invigilators, examinations, allotmentResult: initialAllotmentResult, onAllotmentChange }: AllotmentSheetProps) {
  const { toast } = useToast();
  const { activeAllotment, saveCurrentAllotment } = useAllotment();
  const { user, recordDownload } = useAuth();
  const [allotmentResult, setAllotmentResult] = useState<AllotmentResult>(initialAllotmentResult);
  const [isSaveAlertOpen, setIsSaveAlertOpen] = useState(false);

  const defaultSaveName = useMemo(() => {
    return activeAllotment?.name || (examinations.length > 0 ? examinations[0].examName : 'New Allotment');
  }, [activeAllotment, examinations]);

  const [saveName, setSaveName] = useState(defaultSaveName);

  const uniqueDates = useMemo(() => {
    const dates = examinations.map(exam => format(new Date(exam.date), 'yyyy-MM-dd'));
    return [...new Set(dates)].sort();
  }, [examinations]);

  const dateColorMap = useMemo(() => {
    const colors = [
      'bg-gradient-to-b from-indigo-100 to-indigo-200/90 text-indigo-700 border border-indigo-300/80 dark:from-indigo-950/70 dark:to-indigo-900/60 dark:text-indigo-300 dark:border-indigo-700/60',
      'bg-gradient-to-b from-cyan-100 to-cyan-200/90 text-cyan-800 border border-cyan-300/80 dark:from-cyan-950/70 dark:to-cyan-900/60 dark:text-cyan-300 dark:border-cyan-700/60',
      'bg-gradient-to-b from-amber-100 to-amber-200/90 text-amber-900 border border-amber-300/80 dark:from-amber-950/70 dark:to-amber-900/60 dark:text-amber-300 dark:border-amber-700/60',
      'bg-gradient-to-b from-emerald-100 to-emerald-200/90 text-emerald-800 border border-emerald-300/80 dark:from-emerald-950/70 dark:to-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700/60',
      'bg-gradient-to-b from-purple-100 to-purple-200/90 text-purple-800 border border-purple-300/80 dark:from-purple-950/70 dark:to-purple-900/60 dark:text-purple-300 dark:border-purple-700/60',
      'bg-gradient-to-b from-rose-100 to-rose-200/90 text-rose-800 border border-rose-300/80 dark:from-rose-950/70 dark:to-rose-900/60 dark:text-rose-300 dark:border-rose-700/60',
      'bg-gradient-to-b from-sky-100 to-sky-200/90 text-sky-800 border border-sky-300/80 dark:from-sky-950/70 dark:to-sky-900/60 dark:text-sky-300 dark:border-sky-700/60',
      'bg-gradient-to-b from-teal-100 to-teal-200/90 text-teal-800 border border-teal-300/80 dark:from-teal-950/70 dark:to-teal-900/60 dark:text-teal-300 dark:border-teal-700/60',
    ];
    return uniqueDates.reduce((acc, date, index) => {
      acc[date] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [uniqueDates]);

  useEffect(() => {
    setAllotmentResult(initialAllotmentResult);
  }, [initialAllotmentResult]);

  useEffect(() => {
    setSaveName(defaultSaveName);
  }, [defaultSaveName]);

  const handleDutyToggle = (invigilatorId: string, examId: string) => {
    const newResult = { ...allotmentResult };
    const newAssignments = { ...newResult.assignments };
    const currentDuties = newAssignments[invigilatorId] || [];

    const dutyIndex = currentDuties.indexOf(examId);

    if (dutyIndex > -1) {
      const updatedDuties = [...currentDuties];
      updatedDuties.splice(dutyIndex, 1);
      newAssignments[invigilatorId] = updatedDuties;
    } else {
      newAssignments[invigilatorId] = [...currentDuties, examId];
    }

    const updatedResult = { ...newResult, assignments: newAssignments };
    setAllotmentResult(updatedResult);
    onAllotmentChange(updatedResult);
  };

  const handleSave = () => {
    saveCurrentAllotment(saveName, allotmentResult.assignments);
    setIsSaveAlertOpen(false);
    toast({
      title: "Allotment Saved",
      description: `"${saveName}" has been saved successfully.`
    });
  };

  const handleDownload = () => {
    recordDownload();
    toast({
      title: "Generating PDF...",
      description: "Your download will begin shortly.",
    });

    const doc = new jsPDF({ orientation: 'landscape' });

    const examInfo = examinations.length > 0 ? examinations[0] : null;
    const title = `${examInfo?.college || 'College Name'}`;
    const subtitle = `${examInfo?.examName || 'Invigilation Duty Allotment'}`;
    const staticTitle = "Invigilation Duty Allotment Sheet";

    let currentY = 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });

    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });

    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(staticTitle, doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });

    doc.setFont('helvetica', 'normal');

    const examHeaderData = examinations.map(exam => ({
      date: format(new Date(exam.date), "dd/MM/yy"),
      subject: exam.subject,
      time: `${formatTimeTo12Hour(exam.startTime)} - ${formatTimeTo12Hour(exam.endTime)}`
    }));

    const head = [
      ['Sl.No', "Invigilator's Name", 'Designation', ...examinations.map(() => ''), 'Total']
    ];

    const body = invigilators.map((invigilator, index) => {
      const duties = allotmentResult.assignments[invigilator.id] || [];
      const dutyCount = duties.length;
      const row = [
        index + 1,
        invigilator.name,
        invigilator.designation,
        ...examinations.map(exam => {
          const hasDuty = duties.includes(exam.id);
          return hasDuty ? '1' : '0';
        }),
        dutyCount
      ];
      return row;
    });

    const dutiesPerExam = examinations.map(exam => {
      return invigilators.reduce((count, invigilator) => {
        const duties = allotmentResult.assignments[invigilator.id] || [];
        return count + (duties.includes(exam.id) ? 1 : 0);
      }, 0);
    });
    const totalRooms = examinations.reduce((acc, exam) => acc + exam.rooms, 0);
    const totalRelievers = examinations.reduce((acc, exam) => acc + exam.relievers, 0);
    const totalInvigilatorsRequired = examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0);
    const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

    (doc as any).autoTable({
      head: head,
      body: body,
      foot: [
        ['', 'No of Invigilators', '', ...examinations.map(exam => exam.rooms), totalRooms],
        ['', 'No of Relievers', '', ...examinations.map(exam => exam.relievers), totalRelievers],
        ['', 'Total Invigilators', '', ...examinations.map(exam => exam.rooms + exam.relievers), totalInvigilatorsRequired],
        ['', 'Total Duties Allotted', '', ...dutiesPerExam, totalDutiesAllotted],
      ],
      startY: currentY + 7,
      theme: 'grid',
      headStyles: {
        fillColor: [8, 37, 103], // Sapphire #082567
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        fontSize: 8,
        minCellHeight: 35,
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      styles: {
        cellPadding: 1,
        fontSize: 9,
        halign: 'center',
        minCellHeight: 5,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 35 },
        2: { halign: 'left', cellWidth: 35 },
        [examinations.length + 3]: { halign: 'center', cellWidth: 10, fontStyle: 'bold' }
      },
      didDrawCell: (data: any) => {
        if (data.section === 'head' && data.column.index >= 3 && data.column.index < head[0].length - 1) {
          const doc = data.doc;
          const cell = data.cell;
          const info = examHeaderData[data.column.index - 3];

          doc.setFontSize(7);
          doc.setTextColor(255);
          doc.setFont('helvetica', 'bold');

          const centerX = cell.x + (cell.width / 2);
          const baselineY = cell.y + cell.height - 3;

          doc.text(info.date, centerX - 3, baselineY, { angle: 90 });
          doc.text(info.subject, centerX, baselineY, { angle: 90 });
          doc.setFontSize(6);
          doc.text(info.time, centerX + 3, baselineY, { angle: 90 });
        }
      },
      didDrawPage: (data: any) => {
        doc.setFontSize(10);
        doc.text(
          `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
          doc.internal.pageSize.getWidth() - 30,
          doc.internal.pageSize.getHeight() - 10
        );
      }
    });

    const fileName = `${saveName.replace(/ /g, '_')}.pdf`;
    const pdfBlob = doc.output('blob');
    doc.save(fileName);

    // Save generated PDF to Supabase Storage per user
    if (user?.id) {
      uploadUserFile({
        file: pdfBlob,
        fileName,
        fileType: 'pdf',
        category: 'download',
        subCategory: 'allotment_sheet',
        userId: user.id,
        metadata: {
          allotmentName: saveName,
          invigilatorCount: invigilators.length,
          examCount: examinations.length,
          totalDuties: totalDutiesAllotted,
        },
        mimeType: 'application/pdf',
      }).then(({ error }) => {
        if (!error) {
          toast({
            title: "Cloud Backup Complete",
            description: `"${fileName}" was saved to your Supabase cloud files.`,
          });
        }
      });
    }
  };

  const examInfo = examinations.length > 0 ? examinations[0] : null;
  const totalRooms = examinations.reduce((acc, exam) => acc + exam.rooms, 0);
  const totalRelievers = examinations.reduce((acc, exam) => acc + exam.relievers, 0);
  const totalInvigilatorsRequired = examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0);
  const dutiesPerExam = examinations.map(exam => invigilators.reduce((count, invigilator) => count + ((allotmentResult.assignments[invigilator.id] || []).includes(exam.id) ? 1 : 0), 0));
  const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

  return (
    <TooltipProvider>
      <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
        {/* Top Accent Gradient Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />

        <CardHeader className="pb-5 pt-6 px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Institution & Examination Cards */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg px-3.5 py-1.5 min-w-[140px]">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <Building2 className="h-3 w-3 text-[#4F46E5]" />
                  <span>Institution</span>
                </div>
                <div className="text-sm font-bold text-[#4F46E5] dark:text-indigo-300">
                  {examInfo?.college || 'College Name'}
                </div>
              </div>

              <div className="bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/40 rounded-lg px-3.5 py-1.5 min-w-[160px]">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <GraduationCap className="h-3 w-3 text-[#0891B2]" />
                  <span>Examination</span>
                </div>
                <div className="text-sm font-bold text-[#0891B2] dark:text-cyan-300">
                  {activeAllotment?.name || examInfo?.examName || 'Examination Duty Allotment'}
                </div>
              </div>
            </div>

            {/* Live Metrics Chips Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">INVIGILATORS</div>
                <div className="text-sm font-bold text-[#4F46E5]">{totalRooms}</div>
              </div>
              <div className="bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/40 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Relievers</div>
                <div className="text-sm font-bold text-[#0891B2]">{totalRelievers}</div>
              </div>
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Staff Req.</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{totalInvigilatorsRequired}</div>
              </div>
              <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Allotted</div>
                <div className="text-sm font-bold text-[#F59E0B]">{totalDutiesAllotted}</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-0">
          <div className="rounded-xl border border-border/70 dark:border-slate-800 overflow-x-auto shadow-2xs">
            <Table className="min-w-full border-collapse">
              <TableHeader>
                <TableRow className="bg-muted/60 dark:bg-slate-900/90 hover:bg-muted/60 dark:hover:bg-slate-900/90 border-b border-border/70 dark:border-slate-800">
                  <TableHead className="sticky left-0 bg-card dark:bg-slate-900/95 backdrop-blur-sm z-20 w-12 font-bold text-xs uppercase tracking-wider text-muted-foreground text-center border-r border-border/60 dark:border-slate-800">
                    #
                  </TableHead>
                  <TableHead className="sticky left-12 bg-card dark:bg-slate-900/95 backdrop-blur-sm z-20 min-w-44 font-bold text-xs uppercase tracking-wider text-muted-foreground border-r border-border/60 dark:border-slate-800">
                    Invigilator&apos;s Name
                  </TableHead>
                  <TableHead className="min-w-40 font-bold text-xs uppercase tracking-wider text-muted-foreground border-r border-border/60 dark:border-slate-800">
                    Designation
                  </TableHead>
                  {examinations.map(exam => (
                    <TableHead 
                      key={exam.id} 
                      className="whitespace-nowrap h-44 p-2 text-center border-r border-border/40 dark:border-slate-800/80 min-w-12"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      <div className="flex flex-col items-start justify-end w-full pl-1">
                        <span className="text-[13px] font-bold text-[#4F46E5] dark:text-indigo-400">{format(new Date(exam.date), "dd/MM/yy")}</span>
                        <span className="text-xs font-semibold text-foreground dark:text-slate-200 truncate max-h-24 my-0.5">{exam.subject}</span>
                        <span className="text-[12px] text-muted-foreground font-normal">{formatTimeTo12Hour(exam.startTime)}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center sticky right-0 bg-card dark:bg-slate-900/95 backdrop-blur-sm z-20 min-w-16 font-bold text-xs uppercase tracking-wider text-muted-foreground border-l border-border/60 dark:border-slate-800">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {invigilators.map((invigilator, index) => {
                  const duties = allotmentResult.assignments[invigilator.id] || [];
                  const dutyCount = duties.length;
                  
                  return (
                    <TableRow 
                      key={invigilator.id} 
                      className={cn(
                        "transition-colors hover:bg-muted/40 dark:hover:bg-slate-800/40 group/row",
                        index % 2 === 1 && "bg-muted/15 dark:bg-slate-900/40"
                      )}
                    >
                      <TableCell className="sticky left-0 bg-card group-hover/row:bg-muted/40 dark:bg-slate-900 dark:group-hover/row:bg-slate-850 z-10 text-center font-medium text-xs text-muted-foreground border-r border-border/60 dark:border-slate-800">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-xs sticky left-12 bg-card group-hover/row:bg-muted/40 dark:bg-slate-900 dark:group-hover/row:bg-slate-850 z-10 text-foreground dark:text-slate-100 border-r border-border/60 dark:border-slate-800">
                        {invigilator.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground dark:text-slate-300 border-r border-border/60 dark:border-slate-800">
                        {invigilator.designation}
                      </TableCell>
                      {examinations.map(exam => {
                        const hasDuty = duties.includes(exam.id);
                        const examDate = format(new Date(exam.date), 'yyyy-MM-dd');

                        return (
                          <TableCell 
                            key={exam.id} 
                            className="p-1 text-center cursor-pointer transition-colors hover:bg-[#4F46E5]/10 dark:hover:bg-indigo-950/40 border-r border-border/40 dark:border-slate-800/70"
                            onClick={() => handleDutyToggle(invigilator.id, exam.id)}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-full h-8 flex items-center justify-center">
                                  {hasDuty ? (
                                    <div className={cn(
                                      "font-bold text-xs rounded-md w-6 h-6 flex items-center justify-center shadow-xs transition-all hover:scale-110",
                                      dateColorMap[examDate] || 'bg-gradient-to-b from-indigo-100 to-indigo-200/90 text-indigo-700 border border-indigo-300/80 dark:from-indigo-950/70 dark:to-indigo-900/60 dark:text-indigo-300'
                                    )}>
                                      1
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/30 hover:text-muted-foreground">0</span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="rounded-lg shadow-md border-border dark:border-slate-800 text-xs">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-foreground">{exam.subject}</div>
                                  <div className="text-muted-foreground">{format(new Date(exam.date), 'PPP')} ({format(new Date(exam.date), 'EEEE')})</div>
                                  <div className="text-[12px] text-muted-foreground">{formatTimeTo12Hour(exam.startTime)} – {formatTimeTo12Hour(exam.endTime)}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center sticky right-0 bg-card group-hover/row:bg-muted/40 dark:bg-slate-900 dark:group-hover/row:bg-slate-850 z-10 border-l border-border/60 dark:border-slate-800">
                        <div className="bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 font-bold rounded-lg w-7 h-7 flex items-center justify-center mx-auto text-xs">
                          {dutyCount}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

              <TableFooter className="border-t-2 border-border dark:border-slate-800 font-medium bg-muted/30 dark:bg-slate-900/60">
                {/* Invigilators Row */}
                <TableRow className="hover:bg-muted/40 dark:hover:bg-slate-800/40 border-b border-border/40 dark:border-slate-800/60">
                  <TableCell colSpan={3} className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/80 dark:bg-slate-900/90 z-10">
                    No of Invigilators
                  </TableCell>
                  {examinations.map((exam) => (
                    <TableCell key={`rooms-${exam.id}`} className="text-center text-xs font-bold text-[#4F46E5] dark:text-indigo-400">
                      {exam.rooms}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold text-xs text-[#4F46E5] dark:text-indigo-400 sticky right-0 bg-muted/80 dark:bg-slate-900/90 z-10 border-l border-border/60 dark:border-slate-800">
                    {totalRooms}
                  </TableCell>
                </TableRow>

                {/* Relievers Row */}
                <TableRow className="hover:bg-muted/40 dark:hover:bg-slate-800/40 border-b border-border/40 dark:border-slate-800/60">
                  <TableCell colSpan={3} className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/80 dark:bg-slate-900/90 z-10">
                    No of Relievers
                  </TableCell>
                  {examinations.map((exam) => (
                    <TableCell key={`relievers-${exam.id}`} className="text-center text-xs font-bold text-[#0891B2] dark:text-cyan-400">
                      {exam.relievers}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold text-xs text-[#0891B2] dark:text-cyan-400 sticky right-0 bg-muted/80 dark:bg-slate-900/90 z-10 border-l border-border/60 dark:border-slate-800">
                    {totalRelievers}
                  </TableCell>
                </TableRow>

                {/* Total Invigilators Required Row */}
                <TableRow className="hover:bg-muted/40 dark:hover:bg-slate-800/40 border-b border-border/40 dark:border-slate-800/60 bg-muted/60 dark:bg-slate-900/80">
                  <TableCell colSpan={3} className="text-right font-bold text-xs uppercase tracking-wider text-foreground dark:text-slate-200 sticky left-0 bg-muted/90 dark:bg-slate-900 z-10">
                    Total Required
                  </TableCell>
                  {examinations.map((exam) => (
                    <TableCell key={`invigilators-${exam.id}`} className="text-center text-xs font-bold text-foreground dark:text-slate-200">
                      {exam.rooms + exam.relievers}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 sticky right-0 bg-muted/90 dark:bg-slate-900 z-10 border-l border-border/60 dark:border-slate-800">
                    {totalInvigilatorsRequired}
                  </TableCell>
                </TableRow>

                {/* Total Duties Allotted Row */}
                <TableRow className="hover:bg-muted/40 dark:hover:bg-slate-800/40 bg-indigo-50/40 dark:bg-indigo-950/20">
                  <TableCell colSpan={3} className="text-right font-bold text-xs uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400 sticky left-0 bg-indigo-50/90 dark:bg-indigo-950/90 z-10">
                    Total Allotted
                  </TableCell>
                  {dutiesPerExam.map((count, index) => {
                    const exam = examinations[index];
                    const requiredInvigilators = exam.rooms + exam.relievers;
                    const isMismatch = count !== requiredInvigilators;
                    return (
                      <TableCell 
                        key={`total-duties-${exam.id}`} 
                        className={cn(
                          "text-center text-xs font-bold",
                          isMismatch ? "text-destructive font-black" : "text-[#4F46E5] dark:text-indigo-400"
                        )}
                      >
                        {count}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-black text-xs text-[#4F46E5] dark:text-indigo-400 sticky right-0 bg-indigo-50/90 dark:bg-indigo-950/90 z-10 border-l border-border/60 dark:border-slate-800">
                    {totalDutiesAllotted}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-3 px-6 py-4 bg-muted/10 border-t border-border/60">
          <AlertDialog open={isSaveAlertOpen} onOpenChange={setIsSaveAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-[#4F46E5]/40 text-[#4F46E5] hover:bg-[#4F46E5]/10 font-semibold rounded-lg">
                <Save className="mr-2 h-4 w-4" />
                Save Allotment
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold">Save Allotment Sheet</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  Save this current configuration to resume editing or download reports later from the &quot;Saved Allotments&quot; page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="save-sheet-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Allotment Sheet Name
                </Label>
                <Input
                  id="save-sheet-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="mt-1.5 rounded-lg"
                  placeholder="e.g. Mid-Term Invigilation 2027"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSave} className="bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-lg">
                  Save Allotment
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={handleDownload}
            className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold rounded-lg shadow-sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF Report
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
