
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

    const doc = new jsPDF({ orientation: 'portrait', format: 'a5' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const primaryColor = '#003366'; 
    const secondaryColor = '#00a8e8';
    const textColor = '#333333';
    const headerTextColor = '#ffffff';

    // -- Header --
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFillColor(secondaryColor);
    doc.triangle(0, 42, 0, 30, pageWidth, 40, 'F');

    // Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(headerTextColor);
    doc.text('INVIGILATION DUTY', pageWidth - 10, 20, { align: 'right' });
    doc.setFontSize(10);
    doc.text('SUMMARY REPORT', pageWidth - 10, 28, { align: 'right' });
    
    // Logo Placeholder
    doc.setFillColor(headerTextColor);
    doc.circle(18, 20, 8, 'F');
    doc.setFontSize(7);
    doc.setTextColor(primaryColor);
    doc.text('DF', 18, 20.5, { align: 'center'});

    // -- Invigilator Details Card --
    const cardX = 10;
    const cardY = 50;
    const cardWidth = pageWidth - 20;
    const cardHeight = 25;
    doc.setFillColor('#ffffff');
    doc.setDrawColor('#e0e0e0');
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor);
    doc.text('Invigilator Details', cardX + 8, cardY + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textColor);
    doc.text(`Name: ${selectedInvigilator.name}`, cardX + 8, cardY + 15);
    doc.text(`Designation: ${selectedInvigilator.designation}`, cardX + 8, cardY + 20);
    doc.text(`Email: ${selectedInvigilator.email}`, cardX + 70, cardY + 15);
    
    // -- Table --
    const head = [['Sl.No', 'Date', 'Day', 'Subject', 'Timings']];
    const body = assignedDuties.map((duty, index) => [
      index + 1,
      format(duty.date, "dd-MMM-yy"),
      format(duty.date, "EEEE"),
      duty.subject,
      `${duty.startTime} - ${duty.endTime}`,
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: cardY + cardHeight + 8,
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: headerTextColor,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8,
            cellPadding: 1.5,
        },
        styles: {
            cellPadding: 1.5,
            fontSize: 8,
            textColor: textColor
        },
        alternateRowStyles: {
            fillColor: '#f5f5f5'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'left' },
            4: { halign: 'center' }
        },
        margin: { left: 10, right: 10 }
    });

    // -- Footer --
    const finalY = (doc as any).lastAutoTable.finalY || pageHeight - 30;
    doc.setFillColor(primaryColor);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    doc.setFillColor(secondaryColor);
    doc.triangle(0, pageHeight - 20, pageWidth, pageHeight - 22, pageWidth, pageHeight - 20, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(headerTextColor);
    const collegeName = activeAllotment?.examinations[0]?.college || "DutyFlow Institution";
    doc.text(collegeName, 10, pageHeight - 9);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth - 10, pageHeight - 9, { align: 'right' });


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
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${selectedInvigilator.id}`} />
                <AvatarFallback>{selectedInvigilator.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-headline">{selectedInvigilator.name}</CardTitle>
                <CardDescription>{selectedInvigilator.designation}</CardDescription>
                <CardDescription>{selectedInvigilator.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">Assigned Duties ({assignedDuties.length})</h3>
              {assignedDuties.length > 0 ? (
                <ul className="space-y-2">
                  {assignedDuties.map(duty => (
                    <li key={duty.id} className="flex justify-between items-center p-3 rounded-md bg-background">
                      <div>
                        <p className="font-medium">{duty.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(duty.date, 'PPP')} | {duty.startTime} - {duty.endTime}
                        </p>
                      </div>
                      <Badge variant="outline">{duty.examName}</Badge>
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

    

    