
"use client"

import { useState, useMemo } from "react";
import { useAllotment } from "@/lib/allotment-context";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { Invigilator, Examination } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function SchedulePage() {
  const { invigilators, examinations, activeAllotment } = useAllotment();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const dailyDuties = useMemo(() => {
    if (!date || !activeAllotment) return { duties: [], invigilators: [] };

    const selectedDateString = format(date, 'yyyy-MM-dd');
    
    // 1. Find all examinations scheduled for the selected day.
    const examsOnDay = examinations.filter(exam => format(new Date(exam.date), 'yyyy-MM-dd') === selectedDateString);

    if (examsOnDay.length === 0) return { duties: [], invigilators: [] };

    // 2. Find all invigilators assigned to those examinations.
    const invigilatorIdsOnDuty = new Set<string>();
    for (const invigilatorId in activeAllotment.assignments) {
      const assignedExamIds = activeAllotment.assignments[invigilatorId];
      for (const examId of assignedExamIds) {
        if (examsOnDay.some(exam => exam.id === examId)) {
          invigilatorIdsOnDuty.add(invigilatorId);
        }
      }
    }

    const invigilatorsOnDuty = invigilators.filter(inv => invigilatorIdsOnDuty.has(inv.id));
    
    return {
        duties: examsOnDay,
        invigilators: invigilatorsOnDuty
    }

  }, [date, examinations, invigilators, activeAllotment]);

  const formatTimeTo12Hour = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const adjustedHour = h % 12 || 12;
    return `${adjustedHour.toString().padStart(2, '0')}:${minutes} ${period}`;
  };
  
  const handleDownload = () => {
    if (!date || dailyDuties.invigilators.length === 0) {
        toast({
            variant: "destructive",
            title: "No data to export",
            description: "There are no duties scheduled for the selected date."
        });
        return;
    }
    toast({ title: "Generating PDF...", description: "Your download will begin shortly." });
    
    const doc = new jsPDF();
    const examDetails = dailyDuties.duties.length > 0 ? dailyDuties.duties[0] : (examinations.length > 0 ? examinations[0] : null);
    
    doc.setFontSize(22);
    doc.text(examDetails?.college || 'Seshadripuram Independent Pre-University College', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(18);
    doc.text(examDetails?.examName || 'Examination Duty', doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
    doc.setFontSize(15);
    doc.text(`Invigilation Duty List for ${format(date, "MMMM do, yyyy")}`, doc.internal.pageSize.getWidth() / 2, 36, { align: 'center' });

    const head = [["Sl No", "Name of the Invigilators", "Designation", "Examination Timings"]];
    const timings = dailyDuties.duties.length > 0 ? `${formatTimeTo12Hour(dailyDuties.duties[0].startTime)} - ${formatTimeTo12Hour(dailyDuties.duties[0].endTime)}` : '';
    const body = dailyDuties.invigilators.map((inv, index) => [
        index + 1,
        inv.name,
        inv.designation,
        timings
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', fontSize: 12 },
        styles: { fontSize: 12 }
    });

    doc.save(`Duty_Schedule_${format(date, "yyyy-MM-dd")}.pdf`);
  };

  const handleEmail = () => {
    if (dailyDuties.invigilators.length === 0) {
        toast({ variant: "destructive", title: "No one to email!" });
        return;
    }
    toast({
        title: "Emailing Invigilators",
        description: `Sending notifications to ${dailyDuties.invigilators.length} invigilator(s). (This is a demo action)`
    });
  };

  const examDetails = dailyDuties.duties.length > 0 ? dailyDuties.duties[0] : (examinations.length > 0 ? examinations[0] : null);
  const subjects = dailyDuties.duties.map(d => d.subject).join(' | ');
  const timings = dailyDuties.duties.length > 0 ? `${formatTimeTo12Hour(dailyDuties.duties[0].startTime)} - ${formatTimeTo12Hour(dailyDuties.duties[0].endTime)}` : '';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Day-wise Schedule</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Select a Date</CardTitle>
                    <CardDescription>Choose a date to view the invigilation duty list.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="p-0"
                    />
                </CardContent>
             </Card>
        </div>

        <div className="md:col-span-2">
            <Card>
                <CardHeader className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-primary font-headline">{examDetails?.college || 'Seshadripuram Independent Pre-University College'}</h2>
                    <h3 className="text-xl font-semibold">{examDetails?.examName || 'Examination Name'}</h3>
                    <p className="text-lg font-medium">Invigilation Duty</p>
                    <p className="text-muted-foreground">{date ? format(date, "MMMM do, yyyy (EEEE)") : 'Select a date'}</p>
                </CardHeader>
                <CardContent>
                    {dailyDuties.invigilators.length > 0 ? (
                        <>
                         <div className="mb-4">
                            <span className="font-semibold">Subject: </span><span>{subjects}</span>
                         </div>
                         <Table>
                            <TableHeader>
                                <TableRow className="bg-primary/90 hover:bg-primary/90">
                                    <TableHead className="text-primary-foreground w-[80px]">Sl No</TableHead>
                                    <TableHead className="text-primary-foreground">Name of the Invigilators</TableHead>
                                    <TableHead className="text-primary-foreground">Designation</TableHead>
                                    <TableHead className="text-primary-foreground text-center">Examination Timings</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyDuties.invigilators.map((invigilator, index) => (
                                    <TableRow key={invigilator.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-medium">{invigilator.name}</TableCell>
                                        <TableCell>{invigilator.designation}</TableCell>
                                        <TableCell className="text-center">{timings}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                        </>
                    ) : (
                        <p className="text-center text-muted-foreground py-16">No invigilators assigned for duty on this day.</p>
                    )}
                </CardContent>
                {dailyDuties.invigilators.length > 0 && (
                    <CardFooter className="justify-end gap-2">
                        <Button variant="outline" onClick={handleDownload}>
                            <Download className="mr-2 h-4 w-4" />
                            Download as PDF
                        </Button>
                        <Button onClick={handleEmail}>
                            <Mail className="mr-2 h-4 w-4" />
                            Email Invigilators
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
}

    
