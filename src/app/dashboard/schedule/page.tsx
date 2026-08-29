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
  const { user, canDownload, recordCategoryDownload } = useAuth();
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
        const timeSlot = `${formatTimeTo12Hour(exam.startTime)} - ${formatTimeTo12Hour(exam.endTime)}`;
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
      })).sort((a, b) => a.time.localeCompare(b.time));

      allSlots.push(...daySlots);
    });

    return allSlots;
  }, [date, examinations, invigilators, activeAllotment, showFullSchedule]);

  const totalAssignedInView = useMemo(() => {
    return new Set(scheduleData.flatMap(slot => slot.invigilators.map(inv => inv.id))).size;
  }, [scheduleData]);

  const handleDownload = (isFull: boolean = false) => {
    const check = canDownload('daywise_profile');
    if (!check.allowed) {
      setIsSubscriptionDialogOpen(true);
      return;
    }

    const dataToExport = isFull ? scheduleData : scheduleData.filter(s => format(s.date, 'yyyy-MM-dd') === format(date || new Date(), 'yyyy-MM-dd'));

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

    const doc = new jsPDF();
    const examDetails = examinations.length > 0 ? examinations[0] : null;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    const renderHeader = (titleDate?: Date) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(examDetails?.college || 'College Name', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      doc.setFontSize(15);
      doc.setFont('helvetica', 'normal');
      doc.text(examDetails?.examName || 'Examination Name', pageWidth / 2, currentY, { align: 'center' });
      currentY += 7;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Invigilation Duty Schedule', pageWidth / 2, currentY, { align: 'center' });
      currentY += 7;

      if (titleDate) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(format(titleDate, "MMMM do, yyyy (EEEE)"), pageWidth / 2, currentY, { align: 'center' });
        currentY += 12;
      } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text("Full Examination Period", pageWidth / 2, currentY, { align: 'center' });
        currentY += 12;
      }
    };

    renderHeader(isFull ? undefined : date);

    let startY = currentY;

    dataToExport.forEach((slot, slotIndex) => {
      if (slotIndex > 0) {
        startY = (doc as any).lastAutoTable.finalY + 15;
        if (startY > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          startY = 20;
          currentY = 20;
        }
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);

      if (isFull) {
        doc.text(`${format(slot.date, "dd/MM/yyyy")} (${format(slot.date, "EEEE")})`, 15, startY);
        startY += 6;
      }

      doc.text('Subject:', 15, startY);
      doc.setFont('helvetica', 'normal');
      const subjectLines = doc.splitTextToSize(slot.subjects, pageWidth - 30 - 20);
      doc.text(subjectLines, 15 + 20, startY);
      startY += (subjectLines.length * 5) + 5;

      const head = [["Sl No", "Name of the Invigilators", "Designation", "Timings"]];
      const body = slot.invigilators.map((inv, index) => [
        index + 1,
        inv.name,
        inv.designation,
        slot.time
      ]);

      (doc as any).autoTable({
        head: head,
        body: body,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [8, 37, 103], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 10 },
      });
    });

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
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Sidebar: Controls & Date Picker */}
        <div className="md:col-span-4 space-y-6">
          {/* Date Selector Card */}
          <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] to-[#0891B2]" />
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Select Exam Date</CardTitle>
                  <CardDescription className="text-xs">Pick a day to inspect sessions.</CardDescription>
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
                className="p-1 rounded-lg"
              />
            </CardContent>
          </Card>

          {/* Allotment & Options Card */}
          <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#0891B2] to-[#F59E0B]" />
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-[#0891B2] dark:text-cyan-300">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Allotment Sheet</CardTitle>
                  <CardDescription className="text-xs">Choose saved plan and view mode.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Allotment Plan
                </Label>
                <Select onValueChange={handleAllotmentChange} value={activeAllotment?.id}>
                  <SelectTrigger className="w-full h-10 bg-background border-border/80 rounded-lg text-xs font-medium">
                    <SelectValue placeholder="Choose an examination..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
              <div className="flex items-center justify-between p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <div className="space-y-0.5">
                  <Label htmlFor="full-schedule" className="text-xs font-bold text-foreground cursor-pointer">
                    Show Full Schedule
                  </Label>
                  <p className="text-[11px] text-muted-foreground">List all dates in single view</p>
                </div>
                <Switch
                  id="full-schedule"
                  checked={showFullSchedule}
                  onCheckedChange={setShowFullSchedule}
                  className="data-[state=checked]:bg-[#4F46E5]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Main Schedule View */}
        <div className="md:col-span-8">
          <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />

            <CardHeader className="text-center space-y-3 pb-6 pt-6 px-6">
              {/* Institution & Examination Cards matching Duty Allotment Sheet format */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg px-3.5 py-1.5 min-w-[140px] text-left shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <Building2 className="h-3 w-3 text-[#4F46E5]" />
                    <span>Institution</span>
                  </div>
                  <div className="text-sm font-bold text-[#4F46E5] dark:text-indigo-300">
                    {examDetails?.college || 'College Name'}
                  </div>
                </div>

                <div className="bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/40 rounded-lg px-3.5 py-1.5 min-w-[160px] text-left shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <GraduationCap className="h-3 w-3 text-[#0891B2]" />
                    <span>Examination</span>
                  </div>
                  <div className="text-sm font-bold text-[#0891B2] dark:text-cyan-300">
                    {activeAllotment?.name || examDetails?.examName || 'Examination Name'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs",
                  showFullSchedule
                    ? "bg-[#0891B2]/10 text-[#0891B2] border-[#0891B2]/30"
                    : "bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/30"
                )}>
                  {showFullSchedule ? 'COMPREHENSIVE FULL SCHEDULE' : 'DAY-WISE ALLOTMENT'}
                </span>

                <span className="text-xs text-muted-foreground font-medium">
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
                        <div className="flex items-center gap-3 pt-4 mb-2 sticky top-0 bg-background/90 backdrop-blur-sm z-10 py-1">
                          <div className="h-px flex-1 bg-border/80" />
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F46E5] bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                            <CalendarRange className="h-3.5 w-3.5" />
                            <span>{format(slot.date, "EEEE, MMMM do, yyyy")}</span>
                          </div>
                          <div className="h-px flex-1 bg-border/80" />
                        </div>
                      )}

                      {/* Subject & Timing Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3.5 rounded-xl bg-muted/40 dark:bg-slate-900/70 border border-border/80 dark:border-slate-800 border-l-4 border-l-[#4F46E5] dark:border-l-indigo-500">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-4 w-4 text-[#0891B2] dark:text-cyan-400 shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Subject:</span>
                          <span className="text-sm font-bold text-foreground dark:text-slate-100 truncate">{slot.subjects}</span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-background dark:bg-slate-950 border border-border/60 dark:border-slate-800 text-xs font-semibold text-muted-foreground dark:text-slate-300 w-fit shrink-0">
                          <Clock className="h-3 w-3 text-[#F59E0B] dark:text-amber-400" />
                          <span>{slot.time}</span>
                        </div>
                      </div>

                      {/* Invigilators Table */}
                      <div className="rounded-xl border border-border/70 dark:border-slate-800 overflow-hidden shadow-2xs">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 dark:bg-slate-900/80 hover:bg-muted/50 dark:hover:bg-slate-900/80 border-b border-border/70 dark:border-slate-800">
                              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">#</TableHead>
                              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Name of the Invigilator</TableHead>
                              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Designation</TableHead>
                              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center w-36">Timings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {slot.invigilators.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                                  No invigilators assigned to this session yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              slot.invigilators.map((invigilator, invIndex) => (
                                <TableRow 
                                  key={invigilator.id} 
                                  className={cn(
                                    "transition-colors hover:bg-muted/40 dark:hover:bg-slate-800/40",
                                    invIndex % 2 === 1 && "bg-muted/15 dark:bg-slate-900/40"
                                  )}
                                >
                                  <TableCell className="text-center font-medium text-xs text-muted-foreground">
                                    {invIndex + 1}
                                  </TableCell>
                                  <TableCell className="font-semibold text-xs text-foreground dark:text-slate-100">
                                    {invigilator.name}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground dark:text-slate-400">
                                    {invigilator.designation}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-semibold text-[#4F46E5] dark:text-indigo-300">
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
                  <div className="p-4 rounded-2xl bg-muted/60 text-muted-foreground/60">
                    <CalendarDays className="w-8 h-8" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-sm text-foreground">No duties scheduled for this selection</p>
                    <p className="text-xs text-muted-foreground">Choose a different date or toggle &quot;Show Full Schedule&quot;.</p>
                  </div>
                </div>
              )}
            </CardContent>

            {scheduleData.length > 0 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-muted/10 border-t border-border/60">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 text-[#0891B2]" />
                  <span>Reflects assignments from &quot;{activeAllotment?.name || 'Active'}&quot; allotment.</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    className="border-[#0891B2]/40 text-[#0891B2] hover:bg-[#0891B2]/10 dark:text-cyan-400 font-semibold rounded-lg text-xs h-9"
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
