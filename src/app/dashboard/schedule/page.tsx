"use client";

import { useState, useMemo } from "react";
import { useAllotment } from "@/lib/allotment-context";
import { useAuth } from "@/lib/auth-context";
import { uploadUserFile } from "@/lib/storage-service";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { Invigilator, Examination } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Download,
  CalendarDays,
  FileSpreadsheet,
  Building2,
  GraduationCap,
  Clock,
  BookOpen,
  CalendarCheck,
  Sparkles,
  Info,
  Layers,
  UserCheck,
  CalendarRange
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn, formatTimeTo12Hour } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SubscriptionDialog } from "@/components/dashboard/subscription-dialog";

interface DutySlot {
  date: Date;
  time: string;
  duties: Examination[];
  invigilators: Invigilator[];
  subjects: string;
}

export default function SchedulePage() {
  const { invigilators, examinations, activeAllotment, savedAllotments, setActiveAllotment } = useAllotment();
  const { user, profile, canDownload, recordCategoryDownload } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAllotmentChange = (id: string) => {
    const selected = savedAllotments.find(a => a.id === id);
    if (selected) {
      setActiveAllotment(selected);
      toast({ title: "Examination Selected", description: `Viewing schedule for "${selected.name}"` });
    }
  };

  const scheduleData = useMemo(() => {
    if (!activeAllotment?.assignments) return [];

    const datesToProcess = showFullSchedule
      ? [...new Set(examinations.map(e => format(new Date(e.date), 'yyyy-MM-dd')))].sort()
      : [format(date || new Date(), 'yyyy-MM-dd')];

    const allSlots: DutySlot[] = [];

    datesToProcess.forEach(dateStr => {
      const examsOnDay = examinations.filter(exam => format(new Date(exam.date), 'yyyy-MM-dd') === dateStr);
      if (examsOnDay.length === 0) return;

      const slots: Record<string, { duties: Examination[], invigilatorIds: Set<string> }> = {};

      for (const exam of examsOnDay) {
        const start = formatTimeTo12Hour(exam.startTime, true);
        const end = formatTimeTo12Hour(exam.endTime, true);
        const timeSlot = start && end ? `${start} - ${end}` : (start || end || 'Timings Not Specified');
        if (!slots[timeSlot]) {
          slots[timeSlot] = { duties: [], invigilatorIds: new Set<string>() };
        }
        slots[timeSlot].duties.push(exam);
      }

      for (const timeSlot in slots) {
        const examsInSlot = slots[timeSlot].duties;
        const examIdsInSlot = new Set(examsInSlot.map(e => e.id));

        for (const invigilatorId in activeAllotment.assignments) {
          const assignedExamIds = activeAllotment.assignments[invigilatorId];
          for (const examId of assignedExamIds) {
            if (examIdsInSlot.has(examId)) {
              slots[timeSlot].invigilatorIds.add(invigilatorId);
            }
          }
        }
      }

      const daySlots = Object.entries(slots).map(([time, data]): DutySlot => ({
        date: new Date(dateStr),
        time,
        duties: data.duties,
        invigilators: invigilators.filter(inv => data.invigilatorIds.has(inv.id)),
        subjects: data.duties.map(d => d.subject).join(' | '),
      })).sort((a, b) => {
        const aStart = a.duties[0]?.startTime || '';
        const bStart = b.duties[0]?.startTime || '';
        return aStart.localeCompare(bStart) || a.time.localeCompare(b.time);
      });

      allSlots.push(...daySlots);
    });

    return allSlots;
  }, [date, examinations, invigilators, activeAllotment, showFullSchedule]);

  const totalAssignedInView = useMemo(() => {
    return new Set(scheduleData.flatMap(slot => slot.invigilators.map(inv => inv.id))).size;
  }, [scheduleData]);

  const handleDownload = async (isFull: boolean = false) => {
    const check = canDownload('daywise_profile');
    if (!check.allowed) {
      setIsSubscriptionDialogOpen(true);
      return;
    }

    const dataToExport = isFull
      ? scheduleData
      : scheduleData.filter(s => format(s.date, 'yyyy-MM-dd') === format(date || new Date(), 'yyyy-MM-dd'));

    if (dataToExport.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no duties scheduled for the selection."
      });
      return;
    }

    recordCategoryDownload('daywise_profile');
    toast({ title: "Generating PDF...", description: "Your download will begin shortly." });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const examDetails = examinations.length > 0 ? examinations[0] : null;
    const collegeName = (examDetails?.college || profile?.institution_name || 'College Name').trim();
    const examName = (examDetails?.examName || activeAllotment?.name || 'Midterm Examination \u2013 September, 2026').trim();

    const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
    const leftMargin = 14;
    const rightMargin = 14;
    const contentWidth = pageWidth - leftMargin - rightMargin; // 182 mm

    dataToExport.forEach((slot, slotIndex) => {
      if (slotIndex > 0) {
        doc.addPage();
      }

      // 1. Classic Executive Navy Banner Header
      const bannerY = 12;
      const bannerHeight = 25;
      const goldStripeHeight = 1.4;

      // Deep Executive Navy Box
      doc.setFillColor(31, 58, 95); // Deep Executive Navy #1F3A5F
      doc.rect(leftMargin, bannerY, contentWidth, bannerHeight, 'F');

      // Classic Gold Accent Stripe at bottom edge of banner
      doc.setFillColor(197, 168, 128); // Classic Gold #C5A880
      doc.rect(leftMargin, bannerY + bannerHeight - goldStripeHeight, contentWidth, goldStripeHeight, 'F');

      // Text inside Navy Banner (Centered)
      let textY = bannerY + 7.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(collegeName, pageWidth / 2, textY, { align: 'center' });

      textY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(226, 232, 240); // #E2E8F0
      doc.text(examName, pageWidth / 2, textY, { align: 'center' });

      textY += 6.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("INVIGILATION DUTY SCHEDULE", pageWidth / 2, textY, { align: 'center' });

      // 2. Metadata Grid (2 rows x 4 cols) with exact aligned columns
      const metaStartY = bannerY + bannerHeight + 3.5;
      const colWidths = [24, 67, 40, 51]; // Sum = 182mm

      const formattedDate = format(slot.date, "MMMM do, yyyy (EEEE)");
      const totalInvigilatorsCount = slot.invigilators.length;

      const metaData = [
        [
          { content: 'DATE', styles: { fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [248, 250, 252] } },
          { content: formattedDate, styles: { textColor: [30, 41, 59], fillColor: [255, 255, 255] } },
          { content: 'SUBJECT', styles: { fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [248, 250, 252] } },
          { content: slot.subjects, styles: { textColor: [30, 41, 59], fillColor: [255, 255, 255] } },
        ],
        [
          { content: 'TIMINGS', styles: { fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [248, 250, 252] } },
          { content: slot.time, styles: { textColor: [30, 41, 59], fillColor: [255, 255, 255] } },
          { content: 'TOTAL INVIGILATORS', styles: { fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [248, 250, 252] } },
          { content: String(totalInvigilatorsCount), styles: { textColor: [30, 41, 59], fillColor: [255, 255, 255] } },
        ]
      ];

      (doc as any).autoTable({
        body: metaData,
        startY: metaStartY,
        margin: { left: leftMargin, right: rightMargin },
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          valign: 'middle',
          cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
          lineWidth: 0.15,
          lineColor: [203, 213, 225], // #CBD5E1
        },
        columnStyles: {
          0: { cellWidth: colWidths[0] },
          1: { cellWidth: colWidths[1] },
          2: { cellWidth: colWidths[2] },
          3: { cellWidth: colWidths[3] },
        }
      });

      const tableStartY = (doc as any).lastAutoTable.finalY + 3.5;

      // 3. Invigilator Duty Roster Table
      const head = [["Sl. No.", "Name of the Invigilator", "Designation", "Timings"]];
      const body = slot.invigilators.length > 0
        ? slot.invigilators.map((inv, index) => [
            index + 1,
            inv.name,
            inv.designation,
            slot.time
          ])
        : [["-", "No invigilators assigned", "-", slot.time]];

      (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY,
        margin: { left: leftMargin, right: rightMargin, bottom: 15 },
        theme: 'grid',
        headStyles: {
          fillColor: [31, 58, 95], // #1F3A5F Deep Executive Navy
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 7.5,
          lineWidth: 0.15,
          lineColor: [205, 214, 225],
          cellPadding: { top: 2.2, bottom: 2.2, left: 1.5, right: 1.5 },
        },
        bodyStyles: {
          textColor: [30, 41, 59], // #1E293B
          fontSize: 7.2,
          valign: 'middle',
          lineWidth: 0.15,
          lineColor: [212, 221, 230], // #D4DDE6
          cellPadding: { top: 1.3, bottom: 1.3, left: 2, right: 2 },
          minCellHeight: 4.8,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // #F8FAFC
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 66, halign: 'left' },
          2: { cellWidth: 64, halign: 'left' },
          3: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
        },
      });
    });

    // 4. Elegant Footer across all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // #64748B
      const footerText = `${collegeName} \u2022 ${examName}`;
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      if (totalPages > 1) {
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
      }
    }

    const fileName = isFull
      ? `Full_Schedule_${activeAllotment?.name ? activeAllotment.name.replace(/ /g, '_') : 'Comprehensive'}.pdf`
      : `Duty_Schedule_${format(date || new Date(), "yyyy-MM-dd")}.pdf`;

    const pdfBlob = doc.output('blob');
    doc.save(fileName);

    // Save generated Schedule PDF to Supabase Storage per user
    if (user?.id) {
      uploadUserFile({
        file: pdfBlob,
        fileName,
        fileType: 'pdf',
        category: 'download',
        subCategory: 'schedule',
        userId: user.id,
        metadata: {
          isFull,
          date: isFull ? 'all' : (date ? format(date, 'yyyy-MM-dd') : null),
          slotCount: dataToExport.length,
          allotmentName: activeAllotment?.name || 'Active Schedule',
        },
        mimeType: 'application/pdf',
      }).then(({ error }) => {
        if (!error) {
          toast({
            title: "Cloud Backup Complete",
            description: `"${fileName}" has been saved to your Supabase storage.`,
          });
        }
      });
    }
  };

  const examDetails = examinations.length > 0 ? examinations[0] : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Sidebar: Controls & Date Picker */}
        <div className="md:col-span-4 space-y-6">
          {/* Date Selector Card */}
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-400">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Select Exam Date</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Pick a day to inspect sessions.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center p-2 pb-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setShowFullSchedule(false);
                }}
                className="p-1 rounded-xl"
              />
            </CardContent>
          </Card>

          {/* Allotment & Options Card */}
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] to-[#f59e0b]" />
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Allotment Sheet</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Choose saved plan and view mode.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active Allotment Plan
                </Label>
                <Select onValueChange={handleAllotmentChange} value={activeAllotment?.id}>
                  <SelectTrigger className="w-full h-10 bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium">
                    <SelectValue placeholder="Choose an examination..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    {savedAllotments.map(allotment => (
                      <SelectItem key={allotment.id} value={allotment.id} className="cursor-pointer">
                        {allotment.name}
                      </SelectItem>
                    ))}
                    {savedAllotments.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground text-center">No saved allotments found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Full Schedule Switch */}
              <div className="flex items-center justify-between p-3 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40">
                <div className="space-y-0.5">
                  <Label htmlFor="full-schedule" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                    Show Full Schedule
                  </Label>
                  <p className="text-[11px] text-slate-500">List all dates in single view</p>
                </div>
                <Switch
                  id="full-schedule"
                  checked={showFullSchedule}
                  onCheckedChange={setShowFullSchedule}
                  className="data-[state=checked]:bg-[#6342e8]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Main Schedule View */}
        <div className="md:col-span-8">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

            <CardHeader className="text-center space-y-3 pb-6 pt-6 px-6">
              {/* Institution & Examination Cards matching Duty Allotment Sheet format */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl px-3.5 py-1.5 min-w-[140px] text-left shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                    <Building2 className="h-3 w-3 text-[#6342e8]" />
                    <span>Institution</span>
                  </div>
                  <div className="text-sm font-bold text-[#6342e8] dark:text-purple-300">
                    {examDetails?.college || 'College Name'}
                  </div>
                </div>

                <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl px-3.5 py-1.5 min-w-[160px] text-left shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                    <GraduationCap className="h-3 w-3 text-[#6342e8]" />
                    <span>Examination</span>
                  </div>
                  <div className="text-sm font-bold text-[#6342e8] dark:text-purple-300">
                    {activeAllotment?.name || examDetails?.examName || 'Examination Name'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
                <span className={cn(
                  "px-3.5 py-1 rounded-full text-xs font-semibold border shadow-2xs",
                  showFullSchedule
                    ? "bg-[#6342e8]/10 text-[#6342e8] border-[#6342e8]/30"
                    : "bg-[#6342e8]/10 text-[#6342e8] border-[#6342e8]/30"
                )}>
                  {showFullSchedule ? 'COMPREHENSIVE FULL SCHEDULE' : 'DAY-WISE ALLOTMENT'}
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {showFullSchedule
                    ? `All Examination Dates (${scheduleData.length} Session Slots)`
                    : (date ? format(date, "MMMM do, yyyy (EEEE)") : 'Select a date')}
                </span>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0">
              {scheduleData.length > 0 ? (
                <div className="space-y-8">
                  {scheduleData.map((slot, index) => (
                    <div key={index} className="space-y-3">
                      {/* Sticky Date Separator in Full Schedule mode */}
                      {showFullSchedule && (index === 0 || format(slot.date, 'yyyy-MM-dd') !== format(scheduleData[index - 1].date, 'yyyy-MM-dd')) && (
                        <div className="flex items-center gap-3 pt-4 mb-2 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 py-1">
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6342e8] bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-900/50 shadow-2xs">
                            <CalendarRange className="h-3.5 w-3.5" />
                            <span>{format(slot.date, "EEEE, MMMM do, yyyy")}</span>
                          </div>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        </div>
                      )}

                      {/* Subject & Timing Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 border-l-4 border-l-[#6342e8]">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-4 w-4 text-[#6342e8] shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">Subject:</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{slot.subjects}</span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 w-fit shrink-0">
                          <Clock className="h-3 w-3 text-[#f59e0b]" />
                          <span>{slot.time}</span>
                        </div>
                      </div>

                      {/* Invigilators Table */}
                      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#f8f9fc] dark:bg-slate-800/60 hover:bg-[#f8f9fc] border-b border-slate-200/80 dark:border-slate-800">
                              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 w-12 text-center">#</TableHead>
                              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Name of the Invigilator</TableHead>
                              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Designation</TableHead>
                              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center w-44">Timings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {slot.invigilators.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-xs text-slate-500">
                                  No invigilators assigned to this session yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              slot.invigilators.map((invigilator, invIndex) => (
                                <TableRow
                                  key={invigilator.id}
                                  className={cn(
                                    "transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40",
                                    invIndex % 2 === 1 && "bg-slate-50/30 dark:bg-slate-800/20"
                                  )}
                                >
                                  <TableCell className="text-center font-medium text-xs text-slate-500">
                                    {invIndex + 1}
                                  </TableCell>
                                  <TableCell className="font-semibold text-xs text-slate-900 dark:text-white">
                                    {invigilator.name}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-500">
                                    {invigilator.designation}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-semibold text-[#6342e8] dark:text-purple-300 whitespace-nowrap">
                                    {slot.time}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8]">
                    <CalendarDays className="w-8 h-8" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">No duties scheduled for this selection</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Choose a different date or toggle &quot;Show Full Schedule&quot;.</p>
                  </div>
                </div>
              )}
            </CardContent>

            {scheduleData.length > 0 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Info className="h-3.5 w-3.5 text-[#6342e8]" />
                  <span>Reflects assignments from &quot;{activeAllotment?.name || 'Active'}&quot; allotment.</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    className="bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold rounded-xl text-xs h-9 shadow-xs"
                    onClick={() => handleDownload(showFullSchedule)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {showFullSchedule ? 'Download Full PDF' : 'Download Day PDF'}
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      <SubscriptionDialog
        open={isSubscriptionDialogOpen}
        onOpenChange={setIsSubscriptionDialogOpen}
        category="daywise_profile"
      />
    </div>
  );
}
