
"use client"

import { useState, useMemo, useEffect } from "react";
import { useAllotment } from "@/lib/allotment-context";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { Invigilator, Examination } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, Mail, CalendarDays, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatTimeTo12Hour } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DutySlot {
    date: Date;
    time: string;
    duties: Examination[];
    invigilators: Invigilator[];
    subjects: string;
}

export default function SchedulePage() {
  const { invigilators, examinations, activeAllotment, savedAllotments, setActiveAllotment } = useAllotment();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showFullSchedule, setShowFullSchedule] = useState(false);
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
      
      for(const timeSlot in slots) {
          const examsInSlot = slots[timeSlot].duties;
          const examIdsInSlot = new Set(examsInSlot.map(e => e.id));

          for (const invigilatorId in activeAllotment.assignments) {
              const assignedExamIds = activeAllotment.assignments[invigilatorId];
              for (const examId of assignedExamIds) {
                  if(examIdsInSlot.has(examId)) {
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
      })).sort((a,b) => a.time.localeCompare(b.time));

      allSlots.push(...daySlots);
    });

    return allSlots;
  }, [date, examinations, invigilators, activeAllotment, showFullSchedule]);

  
  const handleDownload = (isFull: boolean = false) => {
    const dataToExport = isFull ? scheduleData : scheduleData.filter(s => format(s.date, 'yyyy-MM-dd') === format(date || new Date(), 'yyyy-MM-dd'));

    if (dataToExport.length === 0) {
        toast({
            variant: "destructive",
            title: "No data to export",
            description: "There are no duties scheduled for the selection."
        });
        return;
    }

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

        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text(examDetails?.examName || 'Examination Name', pageWidth / 2, currentY, { align: 'center' });
        currentY += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(15);
        doc.text('Invigilation Duty Schedule', pageWidth / 2, currentY, { align: 'center' });
        currentY += 7;

        if (titleDate) {
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text(format(titleDate, "MMMM do, yyyy (EEEE)"), pageWidth / 2, currentY, { align: 'center' });
            currentY += 12;
        } else {
            doc.setFontSize(12);
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
                // Don't re-render full header on every page, just page context
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
            headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', fontSize: 10 },
            styles: { fontSize: 10 },
        });
    });

    const fileName = isFull 
      ? `Full_Schedule_${activeAllotment?.name.replace(/ /g, '_')}.pdf`
      : `Duty_Schedule_${format(date || new Date(), "yyyy-MM-dd")}.pdf`;

    doc.save(fileName);
  };

  const handleEmail = () => {
    const totalInvigilatorsToEmail = new Set(scheduleData.flatMap(slot => slot.invigilators.map(inv => inv.id))).size;
    if (totalInvigilatorsToEmail === 0) {
        toast({ variant: "destructive", title: "No one to email!" });
        return;
    }
    toast({
        title: "Emailing Invigilators",
        description: `Sending notifications to ${totalInvigilatorsToEmail} invigilator(s). (This is a demo action)`
    });
  };

  const examDetails = examinations.length > 0 ? examinations[0] : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Examination Schedules</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
             <Card className="shadow-md border-t-4 border-t-primary">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <CalendarDays className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">Select a Date</CardTitle>
                    </div>
                    <CardDescription>View duties for a specific day.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center p-0 pb-4">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                            setDate(d);
                            setShowFullSchedule(false);
                        }}
                        className="p-0"
                    />
                </CardContent>
             </Card>

             <Card className="shadow-md border-t-4 border-t-purple-600">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-lg">Select Examination</CardTitle>
                    </div>
                    <CardDescription>Choose from saved allotments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select onValueChange={handleAllotmentChange} value={activeAllotment?.id}>
                        <SelectTrigger className="w-full bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Choose an examination..." />
                        </SelectTrigger>
                        <SelectContent>
                            {savedAllotments.map(allotment => (
                                <SelectItem key={allotment.id} value={allotment.id}>
                                    {allotment.name}
                                </SelectItem>
                            ))}
                            {savedAllotments.length === 0 && (
                                <div className="p-2 text-xs text-muted-foreground text-center">No saved allotments found</div>
                            )}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200">
                        <div className="space-y-0.5">
                            <Label htmlFor="full-schedule" className="text-sm font-bold">Show Full Schedule</Label>
                            <p className="text-[10px] text-muted-foreground">List all dates in one view</p>
                        </div>
                        <Switch
                            id="full-schedule"
                            checked={showFullSchedule}
                            onCheckedChange={setShowFullSchedule}
                        />
                    </div>
                </CardContent>
             </Card>
        </div>

        <div className="md:col-span-2">
            <Card className="shadow-lg border-0">
                <CardHeader className="text-center space-y-2 pb-8">
                    <h2 className="text-3xl font-black text-primary font-headline uppercase tracking-tight">{examDetails?.college || 'College Name'}</h2>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">{examDetails?.examName || 'Examination Name'}</h3>
                    <div className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold mt-2">
                        INVIGILATION DUTY {showFullSchedule ? 'FULL SCHEDULE' : 'DAY-WISE LIST'}
                    </div>
                    <p className="text-slate-500 font-medium pt-2">
                        {showFullSchedule 
                            ? `Comprehensive Schedule for ${activeAllotment?.name || 'Allotment'}` 
                            : (date ? format(date, "MMMM do, yyyy (EEEE)") : 'Select a date')}
                    </p>
                </CardHeader>
                <CardContent>
                    {scheduleData.length > 0 ? (
                        <div className="space-y-12">
                            {scheduleData.map((slot, index) => (
                                <div key={index} className="relative">
                                    {showFullSchedule && (index === 0 || format(slot.date, 'yyyy-MM-dd') !== format(scheduleData[index-1].date, 'yyyy-MM-dd')) && (
                                        <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10 py-2">
                                            <div className="h-px flex-1 bg-slate-200" />
                                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                                                {format(slot.date, "EEEE, MMMM do")}
                                            </span>
                                            <div className="h-px flex-1 bg-slate-200" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border-l-4 border-l-primary">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Subject: </span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{slot.subjects}</span>
                                    </div>
                                    <Table className="border rounded-md overflow-hidden">
                                        <TableHeader>
                                            <TableRow className="bg-primary/95 hover:bg-primary/95">
                                                <TableHead className="text-primary-foreground w-[80px] font-bold">Sl No</TableHead>
                                                <TableHead className="text-primary-foreground font-bold">Name of the Invigilators</TableHead>
                                                <TableHead className="text-primary-foreground font-bold">Designation</TableHead>
                                                <TableHead className="text-primary-foreground text-center font-bold">Timings</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {slot.invigilators.map((invigilator, invIndex) => (
                                                <TableRow key={invigilator.id} className={invIndex % 2 === 0 ? "bg-slate-50/50" : ""}>
                                                    <TableCell className="font-medium text-slate-500">{invIndex + 1}</TableCell>
                                                    <TableCell className="font-bold text-slate-900 dark:text-slate-100">{invigilator.name}</TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-400">{invigilator.designation}</TableCell>
                                                    <TableCell className="text-center font-bold text-primary">{slot.time}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <CalendarDays className="w-16 h-16 text-slate-200" />
                            <p className="text-center text-slate-400 font-medium">No duties scheduled for this selection.</p>
                        </div>
                    )}
                </CardContent>
                {scheduleData.length > 0 && (
                    <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t mt-8">
                        <p className="text-xs text-muted-foreground italic">
                            * Schedule reflects all assignments from the "{activeAllotment?.name || 'Active'}" allotment.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" className="font-bold" onClick={() => handleDownload(showFullSchedule)}>
                                <Download className="mr-2 h-4 w-4" />
                                {showFullSchedule ? 'Download Full PDF' : 'Download Day PDF'}
                            </Button>
                            <Button className="font-bold bg-gradient-to-r from-purple-600 to-blue-600" onClick={handleEmail}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email Schedule
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
}

