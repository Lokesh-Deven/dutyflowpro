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
import { formatTimeTo12Hour } from "@/lib/utils";

interface DutySlot {
    time: string;
    duties: Examination[];
    invigilators: Invigilator[];
    subjects: string;
}

export default function SchedulePage() {
  const { invigilators, examinations, activeAllotment } = useAllotment();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const dailySlots = useMemo(() => {
    if (!date || !activeAllotment?.assignments) return [];

    const selectedDateString = format(date, 'yyyy-MM-dd');
    
    const examsOnDay = examinations.filter(exam => format(new Date(exam.date), 'yyyy-MM-dd') === selectedDateString);

    if (examsOnDay.length === 0) return [];

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

    return Object.entries(slots).map(([time, data]): DutySlot => ({
        time,
        duties: data.duties,
        invigilators: invigilators.filter(inv => data.invigilatorIds.has(inv.id)),
        subjects: data.duties.map(d => d.subject).join(' | '),
    })).sort((a,b) => a.time.localeCompare(b.time));

  }, [date, examinations, invigilators, activeAllotment]);

  
  const handleDownload = () => {
    if (!date || dailySlots.length === 0) {
        toast({
            variant: "destructive",
            title: "No data to export",
            description: "There are no duties scheduled for the selected date."
        });
        return;
    }
    toast({ title: "Generating PDF...", description: "Your download will begin shortly." });
    
    const doc = new jsPDF();
    const examDetails = examinations.length > 0 ? examinations[0] : null;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

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
    doc.text('Invigilation Duty', pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(format(date, "MMMM do, yyyy (EEEE)"), pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    let startY = currentY;

    dailySlots.forEach((slot, slotIndex) => {
        if (slotIndex > 0) {
            startY = (doc as any).lastAutoTable.finalY + 15;
            if (startY > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                startY = 20;
            }
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Subject:', 15, startY);
        doc.setFont('helvetica', 'normal');
        
        const subjectLines = doc.splitTextToSize(slot.subjects, pageWidth - 30 - 20);
        doc.text(subjectLines, 15 + 20, startY);
        startY += (subjectLines.length * 5) + 5;
        
        const head = [["Sl No", "Name of the Invigilators", "Designation", "Examination Timings"]];
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
            headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', fontSize: 12 },
            styles: { fontSize: 12 },
        });
    });

    doc.save(`Duty_Schedule_${format(date, "yyyy-MM-dd")}.pdf`);
  };

  const handleEmail = () => {
    const totalInvigilatorsToEmail = new Set(dailySlots.flatMap(slot => slot.invigilators.map(inv => inv.id))).size;
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
                    <h2 className="text-2xl font-bold text-primary font-headline">{examDetails?.college || 'College Name'}</h2>
                    <h3 className="text-xl font-semibold">{examDetails?.examName || 'Examination Name'}</h3>
                    <p className="text-lg font-medium">Invigilation Duty</p>
                    <p className="text-muted-foreground">{date ? format(date, "MMMM do, yyyy (EEEE)") : 'Select a date'}</p>
                </CardHeader>
                <CardContent>
                    {dailySlots.length > 0 ? (
                        <div className="space-y-8">
                            {dailySlots.map((slot, index) => (
                                <div key={index}>
                                    <div className="mb-4">
                                        <span className="font-semibold">Subject: </span><span>{slot.subjects}</span>
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
                                            {slot.invigilators.map((invigilator, invIndex) => (
                                                <TableRow key={invigilator.id}>
                                                    <TableCell>{invIndex + 1}</TableCell>
                                                    <TableCell className="font-medium">{invigilator.name}</TableCell>
                                                    <TableCell>{invigilator.designation}</TableCell>
                                                    <TableCell className="text-center">{slot.time}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-16">No duties scheduled for this day.</p>
                    )}
                </CardContent>
                {dailySlots.length > 0 && (
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
