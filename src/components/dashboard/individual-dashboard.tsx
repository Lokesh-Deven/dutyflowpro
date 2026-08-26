"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Download,
  FolderArchive,
  Clock,
  Calendar as CalendarIcon,
  BookOpen,
  Mail,
  Sun,
  Moon,
  Phone,
  User,
  CalendarCheck,
  Building2,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { cn, formatTimeTo12Hour } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type IndividualDashboardProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
};

export default function IndividualDashboard({ invigilators, examinations, allotmentResult }: IndividualDashboardProps) {
  const { toast } = useToast();
  const [selectedInvigilatorId, setSelectedInvigilatorId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { activeAllotment } = useAllotment();
  const { recordDownload } = useAuth();

  useEffect(() => {
    if (invigilators.length > 0 && !selectedInvigilatorId) {
      setSelectedInvigilatorId(invigilators[0].id);
    }
  }, [invigilators, selectedInvigilatorId]);

  const selectedInvigilator = useMemo(() => {
    return invigilators.find(inv => inv.id === selectedInvigilatorId);
  }, [selectedInvigilatorId, invigilators]);

  const assignedDuties = useMemo(() => {
    if (!selectedInvigilatorId || !allotmentResult.assignments) return [];
    const dutyIds = allotmentResult.assignments[selectedInvigilatorId] || [];
    return examinations
      .filter(exam => dutyIds.includes(exam.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedInvigilatorId, allotmentResult, examinations]);

  const generateInvigilatorPDF = (invigilator: Invigilator, assignedDuties: Examination[]) => {
    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 0. Clean crisp white background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Helper to format timings as "10.00 - 01.00"
    const formatDutyTiming = (startTime: string, endTime: string) => {
      const formatSingle = (timeStr: string) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          let h = parseInt(parts[0], 10);
          const m = parts[1];
          if (h > 12) h = h - 12;
          if (h === 0) h = 12;
          return `${h.toString().padStart(2, '0')}.${m}`;
        }
        return timeStr;
      };
      return `${formatSingle(startTime)} - ${formatSingle(endTime)}`;
    };

    // Helper to compute single initial (first letter of first name)
    const getInitial = (name: string) => {
      return name.trim().charAt(0).toUpperCase() || '—';
    };

    const collegeName = examinations[0]?.college || activeAllotment?.examinations[0]?.college || "Seshadripuram Independent Pre - University College";
    const examName = assignedDuties.length > 0 ? assignedDuties[0].examName : (examinations[0]?.examName || activeAllotment?.examinations[0]?.examName || 'Annual Examination August 2026');

    // 1. Top Header Card (Soft Indigo #EEF2FF, Deep Indigo Text #312E81)
    const cardX = 12;
    const cardY = 14;
    const cardW = pageWidth - 24; // 186mm
    const cardH = 48;

    doc.setFillColor(238, 242, 255); // Soft Indigo Tint (#EEF2FF - indigo-50)
    doc.setDrawColor(199, 210, 254); // Subtle Indigo Border (#C7D2FE - indigo-200)
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, 'FD');

    // Line 1: College / Institution Name (Deep Indigo #312E81, Bold, Centered)
    const collegeFontSize = collegeName.length > 40 ? 15 : 17.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(collegeFontSize);
    doc.setTextColor(49, 46, 129); // Deep Indigo (#312E81)
    doc.text(collegeName, pageWidth / 2, cardY + 14, { align: 'center' });

    // Line 2: Examination Name (Primary Indigo #4F46E5, Centered)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // Primary Indigo (#4F46E5)
    doc.text(examName, pageWidth / 2, cardY + 24.5, { align: 'center' });

    // Line 3: Title (Deep Indigo #1E1B4B, Bold, Centered)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 27, 75); // #1E1B4B
    doc.text("Invigilator's Duty Summary", pageWidth / 2, cardY + 38, { align: 'center' });

    // 2. Faculty Profile Card (with Primary Indigo Border #4F46E5 & Duties Circle Badge)
    const profY = cardY + cardH + 7; // 69mm
    const profH = 27;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(79, 70, 229); // Primary Indigo Border (#4F46E5)
    doc.setLineWidth(0.7);
    doc.roundedRect(cardX, profY, cardW, profH, 4.5, 4.5, 'FD');

    // Left: Primary Indigo Avatar Circle with Single Initial
    const avatarX = cardX + 14;
    const avatarY = profY + profH / 2;
    doc.setFillColor(79, 70, 229); // Primary Indigo (#4F46E5)
    doc.circle(avatarX, avatarY, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(getInitial(invigilator.name), avatarX, avatarY + 4.2, { align: 'center' });

    // Middle: Faculty Info Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // Slate-900 (#0F172A)
    doc.text(invigilator.name, cardX + 27, profY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // Slate-600 (#475569)
    doc.text(invigilator.designation, cardX + 27, profY + 15.5);

    const contactStr = `${invigilator.mobile || '—'} | ${invigilator.email || '—'}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500 (#64748B)
    doc.text(contactStr, cardX + 27, profY + 21.5);

    // Right: Circular Duties Badge with Primary Indigo Ring
    const dutiesBadgeX = cardX + cardW - 17;
    const dutiesBadgeY = profY + profH / 2;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(79, 70, 229); // Primary Indigo (#4F46E5)
    doc.setLineWidth(0.7);
    doc.circle(dutiesBadgeX, dutiesBadgeY, 10, 'FD');

    // Large Duty Count Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // Primary Indigo
    doc.text(assignedDuties.length.toString(), dutiesBadgeX, dutiesBadgeY + 2, { align: 'center' });

    // "DUTIES" Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(79, 70, 229); // Primary Indigo
    doc.text("DUTIES", dutiesBadgeX, dutiesBadgeY + 6.5, { align: 'center' });

    // 3. Duty Schedule Table (Primary Indigo Header #4F46E5 & Cyan Timings Pill #0891B2)
    const tableStartY = profY + profH + 8; // 104mm
    const tableHead = [['SN', 'Date', 'Day', 'Subject', 'Timings']];
    const tableBody = assignedDuties.map((duty, index) => {
      return [
        index + 1,
        format(new Date(duty.date), "dd.MM.yyyy"),
        format(new Date(duty.date), "EEEE"),
        duty.subject,
        formatDutyTiming(duty.startTime, duty.endTime)
      ];
    });

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY,
      margin: { left: cardX, right: cardX },
      theme: 'plain',
      headStyles: {
        fillColor: [79, 70, 229], // Primary Indigo (#4F46E5)
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        fontSize: 10.5,
        cellPadding: 4.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18 },
        1: { halign: 'center', cellWidth: 35, fontSize: 10.5, textColor: [15, 23, 42] },
        2: { halign: 'center', cellWidth: 35, fontSize: 10.5, textColor: [71, 85, 105] },
        3: { halign: 'center', cellWidth: 54, fontStyle: 'bold', fontSize: 10.5, textColor: [15, 23, 42] },
        4: { halign: 'center', cellWidth: 44 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 255] // Soft Slate/Indigo Tint (#F8FAFF)
      },
      styles: {
        fontSize: 10.5,
        cellPadding: 4.5,
        valign: 'middle',
        lineColor: [224, 231, 255], // Soft Indigo Gridlines (#E0E7FF)
        lineWidth: 0.2
      },
      didParseCell: (data: any) => {
        // Clear text for columns with custom drawing so autoTable doesn't overlay text
        if (data.section === 'body' && (data.column.index === 0 || data.column.index === 4)) {
          data.cell.text = [];
        }
      },
      didDrawCell: (data: any) => {
        // 1. Column 0: Circular Primary Indigo badge with white serial number
        if (data.section === 'body' && data.column.index === 0) {
          const { x, y, width, height } = data.cell;
          const cx = x + width / 2;
          const cy = y + height / 2;

          doc.setFillColor(79, 70, 229); // Primary Indigo (#4F46E5)
          doc.circle(cx, cy, 4.6, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(255, 255, 255);
          doc.text(String(data.row.index + 1), cx, cy + 3.2, { align: 'center' });
        }

        // 2. Column 4: Soft Cyan pill capsule with Cyan timings text (#0891B2)
        if (data.section === 'body' && data.column.index === 4) {
          const { x, y, width, height } = data.cell;
          const pillW = 36;
          const pillH = 7.5;
          const px = x + (width - pillW) / 2;
          const py = y + (height - pillH) / 2;
          const timingText = data.cell.raw;

          doc.setFillColor(236, 254, 255); // Soft Cyan Pill (#ECFEFF - cyan-50)
          doc.setDrawColor(165, 243, 252); // Subtle Cyan Border (#A5F3FC - cyan-200)
          doc.setLineWidth(0.2);
          doc.roundedRect(px, py, pillW, pillH, 3, 3, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(8, 145, 178); // Secondary Cyan (#0891B2 - cyan-600)
          doc.text(String(timingText), x + width / 2, y + height / 2 + 3, { align: 'center' });
        }
      }
    });

    // 4. Bottom Footer Card (Soft Indigo #EEF2FF, Deep Indigo Message #312E81)
    const bottomCardH = 22;
    const bottomCardY = pageHeight - 16 - bottomCardH; // 259mm

    doc.setFillColor(238, 242, 255); // Soft Indigo (#EEF2FF)
    doc.setDrawColor(199, 210, 254); // Subtle Indigo Border (#C7D2FE)
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, bottomCardY, cardW, bottomCardH, 5, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(49, 46, 129); // Deep Indigo (#312E81)
    doc.text("Wishing you a smooth and successful examination duty", pageWidth / 2, bottomCardY + 13.5, { align: 'center' });

    return doc;
  };

  const handleDownload = () => {
    if (!selectedInvigilator) return;
    recordDownload();
    toast({
      title: "Generating PDF...",
      description: `Preparing summary for ${selectedInvigilator.name}.`,
    });
    const doc = generateInvigilatorPDF(selectedInvigilator, assignedDuties);
    doc.save(`Duty_Summary_${selectedInvigilator.name.replace(/ /g, '_')}.pdf`);
  };

  const handleDownloadAll = async () => {
    recordDownload();
    toast({
      title: "Generating ZIP...",
      description: "Creating individual duty summaries for all invigilators.",
    });

    const zip = new JSZip();
    for (const inv of invigilators) {
      const dutyIds = allotmentResult.assignments[inv.id] || [];
      const duties = examinations.filter(exam => dutyIds.includes(exam.id))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const doc = generateInvigilatorPDF(inv, duties);
      zip.file(`Duty_Summary_${inv.name.replace(/ /g, '_')}.pdf`, doc.output('blob'));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `All_Invigilator_Duty_Summaries.zip`);
  };

  const examName = examinations[0]?.examName || activeAllotment?.examinations[0]?.examName || 'Examination Session';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2">
      {/* Top Selector Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-indigo-50/25 to-card dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-slate-900/50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-[#4F46E5] dark:text-indigo-300 shadow-2xs">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground dark:text-slate-100">Select Invigilator</div>
          </div>
        </div>

        <div className="w-full sm:w-72">
          <Select onValueChange={setSelectedInvigilatorId} value={selectedInvigilatorId ?? undefined}>
            <SelectTrigger className="w-full h-10 bg-background/90 dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/80 focus:ring-1 focus:ring-[#4F46E5] focus:border-[#4F46E5] rounded-lg text-sm font-semibold text-foreground dark:text-slate-100 shadow-2xs">
              <SelectValue placeholder="Select an invigilator" />
            </SelectTrigger>
            <SelectContent className="max-h-64 rounded-xl dark:border-slate-800">
              {invigilators.map(inv => (
                <SelectItem key={inv.id} value={inv.id} className="cursor-pointer font-medium">
                  {inv.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedInvigilator && (
        <div className="space-y-6">
          {/* Profile Hero Card */}
          <Card className="border border-border/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />

            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 border-4 border-background dark:border-slate-800 shadow-md ring-2 ring-indigo-500/20">
                <AvatarFallback className="text-3xl bg-[#4F46E5] dark:bg-indigo-600 text-white font-bold">
                  {selectedInvigilator.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Info Details */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-slate-100">{selectedInvigilator.name}</h2>
                  <Badge variant="outline" className="text-xs font-semibold border-border dark:border-slate-700 text-muted-foreground dark:text-slate-300">
                    {selectedInvigilator.designation}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 pt-1 text-xs text-muted-foreground dark:text-slate-400">
                  <div className="inline-flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-[#F59E0B] dark:text-amber-400" />
                    <span>{selectedInvigilator.mobile || 'No phone provided'}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5 text-[#0891B2] dark:text-cyan-400" />
                    <span>{selectedInvigilator.email}</span>
                  </div>
                </div>
              </div>

              <div className="md:w-px h-16 bg-border/60 dark:bg-slate-800 hidden md:block" />

              {/* Metric Pill Card */}
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 text-center min-w-44">
                <span className="text-[12px] font-bold text-muted-foreground dark:text-slate-400 uppercase tracking-widest block">
                  Total Duties Assigned
                </span>
                <span className="text-4xl font-extrabold text-[#4F46E5] dark:text-indigo-400 leading-none block my-1">
                  {assignedDuties.length.toString().padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold text-muted-foreground dark:text-slate-400 truncate max-w-[150px] block mx-auto">
                  {examName}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Duty Schedule Table Card */}
          <Card className="border border-border/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1 w-full bg-gradient-to-r from-[#0891B2] to-[#4F46E5]" />

            <CardHeader className="pb-4 pt-5 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-[#0891B2] dark:text-cyan-300">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="font-headline text-lg font-bold text-foreground dark:text-slate-100">Assigned Duty Schedule</CardTitle>
                  </div>
                </div>

                <Badge className="bg-[#0891B2]/10 text-[#0891B2] dark:text-cyan-300 border-[#0891B2]/30 text-xs font-semibold">
                  {assignedDuties.length} {assignedDuties.length === 1 ? 'Duty' : 'Duties'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0">
              <div className="rounded-xl border border-border/70 dark:border-slate-800 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-slate-900/80 hover:bg-muted/50 dark:hover:bg-slate-900/80 border-b border-border/70 dark:border-slate-800">
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center w-28">Date</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Day</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Timings</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Session</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedDuties.length > 0 ? (
                      assignedDuties.map((duty, index) => {
                        const startHour = parseInt(duty.startTime.split(':')[0], 10);
                        const isMorning = startHour < 12;

                        return (
                          <TableRow
                            key={duty.id}
                            className={cn(
                              "transition-colors hover:bg-muted/40 dark:hover:bg-slate-800/40",
                              index % 2 === 1 && "bg-muted/15 dark:bg-slate-900/40"
                            )}
                          >
                            <TableCell className="text-center py-3.5">
                              <div className="bg-[#4F46E5] dark:bg-indigo-600 text-white px-3 py-1 rounded-lg inline-flex items-center justify-center gap-1.5 shadow-2xs">
                                <span className="text-sm font-bold">{format(new Date(duty.date), 'dd')}</span>
                                <span className="text-[12px] font-bold uppercase tracking-wider opacity-90">{format(new Date(duty.date), 'MMM')}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-xs text-foreground dark:text-slate-200">
                              {format(new Date(duty.date), 'EEEE')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 font-semibold text-sm text-foreground dark:text-slate-100">
                                <BookOpen className="h-3.5 w-3.5 text-[#0891B2] dark:text-cyan-400" />
                                <span>{duty.subject}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 dark:bg-slate-900 border dark:border-slate-800 text-xs font-medium text-muted-foreground dark:text-slate-300">
                                <Clock className="h-3 w-3 text-[#F59E0B] dark:text-amber-400" />
                                <span>{formatTimeTo12Hour(duty.startTime)} – {formatTimeTo12Hour(duty.endTime)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                                isMorning
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30"
                                  : "bg-indigo-500/10 text-[#4F46E5] dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30"
                              )}>
                                {isMorning ? (
                                  <Sun className="h-3 w-3 text-[#F59E0B] dark:text-amber-400" />
                                ) : (
                                  <Moon className="h-3 w-3 text-[#4F46E5] dark:text-indigo-400" />
                                )}
                                <span>{isMorning ? 'Morning' : 'Afternoon'}</span>
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                          No duties assigned for this invigilator in the current allotment sheet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border/70">
        <Button
          variant="outline"
          className="w-full sm:w-auto border-[#0891B2]/40 text-[#0891B2] hover:bg-[#0891B2]/10 dark:text-cyan-400 font-semibold rounded-lg h-10 px-5"
          onClick={() => setIsConfirmOpen(true)}
        >
          <FolderArchive className="mr-2 h-4 w-4" /> Download All Invigilators&apos; Summaries
        </Button>
        <Button
          className="w-full sm:w-auto bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold rounded-lg h-10 px-6 shadow-sm"
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" /> Download Individual PDF
        </Button>
      </div>

      {/* Confirmation Dialog for Downloading All Summaries */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="rounded-xl border-border dark:border-slate-800 shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-lg font-bold">
              Download All Summaries
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to download all invigilators&apos; summaries?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsConfirmOpen(false);
                handleDownloadAll();
              }}
              className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold rounded-lg shadow-sm"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
