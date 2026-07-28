
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Mail } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAllotment } from '@/lib/allotment-context';

type IndividualDashboardProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
};

export default function IndividualDashboard({ invigilators, examinations, allotmentResult }: IndividualDashboardProps) {
  const { toast } = useToast();
  const [selectedInvigilatorId, setSelectedInvigilatorId] = useState<string | null>(null);
  const { activeAllotment } = useAllotment();

  useEffect(() => {
    if(invigilators.length > 0 && !selectedInvigilatorId) {
        setSelectedInvigilatorId(invigilators[0].id);
    }
    if (invigilators.length > 0 && selectedInvigilatorId && !invigilators.some(i => i.id === selectedInvigilatorId)) {
        setSelectedInvigilatorId(invigilators[0].id);
    }
     if (invigilators.length === 0) {
        setSelectedInvigilatorId(null);
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
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedInvigilatorId, allotmentResult, examinations]);

  const handleEmail = () => {
    if (!selectedInvigilator) return;
    toast({
      title: "Emailing Summary",
      description: `Sending summary to ${selectedInvigilator.email}. (This is a demo action)`,
    });
  };

  const handleDownload = () => {
    if (!selectedInvigilator) return;
    
    toast({
      title: "Generating PDF...",
      description: `Preparing summary for ${selectedInvigilator.name}.`,
    });

    // A5 is standard half-page (148 x 210 mm)
    const doc = new jsPDF({ orientation: 'portrait', format: 'a5' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Theme Colors
    const primaryColor = '#115DA9'; 
    const textColor = '#1C304A';
    const headerTextColor = '#FFFFFF';
    const lightBlue = [230, 240, 255]; // Light blue for alternating rows/headers

    // --- Option 1: Premium Header Style ---

    // 1. Solid Header Banner
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // 2. Header Text (College & Exam Name)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(headerTextColor);
    const collegeName = activeAllotment?.examinations[0]?.college || "College Name";
    const collegeLines = doc.splitTextToSize(collegeName.toUpperCase(), pageWidth - 20);
    doc.text(collegeLines, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const examName = assignedDuties.length > 0 ? assignedDuties[0].examName : (activeAllotment?.examinations[0]?.examName || 'Examination Name');
    doc.text(examName, pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("INVIGILATOR'S DUTY SUMMARY", pageWidth / 2, 35, { align: 'center' });

    // 3. Personal Details Section
    const startY = 52;
    doc.setTextColor(textColor);
    
    // Label Column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Name:', 15, startY);
    doc.text('Designation:', 15, startY + 7);
    doc.text('Mobile:', 15, startY + 14);
    doc.text('E-Mail:', 15, startY + 21);
    
    // Value Column
    doc.setFont('helvetica', 'normal');
    doc.text(selectedInvigilator.name, 45, startY);
    doc.text(selectedInvigilator.designation, 45, startY + 7);
    doc.text(selectedInvigilator.mobile, 45, startY + 14);
    doc.text(selectedInvigilator.email, 45, startY + 21);

    // Load Counter (Right side)
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(pageWidth - 45, startY - 4, 30, 28, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOTAL DUTIES', pageWidth - 30, startY + 2, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(primaryColor);
    doc.text(assignedDuties.length.toString().padStart(2, '0'), pageWidth - 30, startY + 15, { align: 'center' });

    // 4. Duties Table
    const head = [['Sl.No', 'Date / Day', 'Subject', 'Timings']];
    const body = assignedDuties.map((duty, index) => [
      index + 1,
      `${format(duty.date, "dd.MM.yyyy")}\n${format(duty.date, "EEEE")}`,
      duty.subject,
      `${duty.startTime} - ${duty.endTime}`,
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: startY + 32,
        theme: 'grid',
        headStyles: {
            fillColor: [17, 93, 169], // Primary Blue
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8,
            cellPadding: 3,
        },
        styles: {
            cellPadding: 3,
            fontSize: 8,
            textColor: textColor,
            valign: 'middle'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', cellWidth: 25 },
            2: { halign: 'left', fontStyle: 'bold', textColor: [17, 93, 169] },
            3: { halign: 'center' },
        },
        margin: { left: 15, right: 15 },
        alternateRowStyles: {
            fillColor: [245, 250, 255]
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || startY + 60;

    // 5. Closing Message
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(textColor);
    const closingText = "Wishing you a smooth and successful examination duty.";
    doc.text(closingText, pageWidth / 2, finalY + 15, { align: 'center' });

    // Save PDF
    doc.save(`Duty_Summary_${selectedInvigilator.name.replace(/ /g, '_')}.pdf`);
  };
  
  if (invigilators.length === 0) {
    return (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>No Invigilators</CardTitle>
                <CardDescription>No invigilators have been added for this allotment.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  const examName = assignedDuties.length > 0 ? assignedDuties[0].examName : (activeAllotment?.examinations[0]?.examName || 'No duties assigned');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invigilator Duty Summary</CardTitle>
        <CardDescription>Select an invigilator to view their detailed duty summary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Select
          onValueChange={setSelectedInvigilatorId}
          value={selectedInvigilatorId ?? undefined}
        >
          <SelectTrigger className="w-full md:w-72">
            <SelectValue placeholder="Select an invigilator" />
          </SelectTrigger>
          <SelectContent>
            {invigilators.map(inv => (
              <SelectItem key={inv.id} value={inv.id}>
                {inv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedInvigilator && (
          <Card className="bg-secondary">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center">
                    {selectedInvigilator.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl font-headline">{selectedInvigilator.name}</CardTitle>
                  <CardDescription>{selectedInvigilator.designation}</CardDescription>
                  <CardDescription>{selectedInvigilator.email}</CardDescription>
                </div>
                 <div className="text-right">
                    <h3 className="font-semibold mb-1">Assigned Duties ({assignedDuties.length})</h3>
                    <h4 className="font-medium text-muted-foreground mb-2">{examName}</h4>
                </div>
            </CardHeader>
            <CardContent>
              {assignedDuties.length > 0 ? (
                <ul className="space-y-2">
                  {assignedDuties.map(duty => (
                    <li key={duty.id} className="flex justify-between items-center p-3 rounded-md bg-background">
                      <div>
                        <p className="font-medium">{format(duty.date, 'PPP')} ({format(duty.date, 'EEEE')})</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-primary font-semibold">{duty.subject}</span> | {duty.startTime} - {duty.endTime}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground p-4">No duties assigned.</p>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2" /> Download Summary
              </Button>
              <Button onClick={handleEmail}>
                <Mail className="mr-2" /> Email Summary
              </Button>
            </CardFooter>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
