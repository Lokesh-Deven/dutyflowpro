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
    const secondaryColor = '#00A8E8';
    const textColor = '#333333';
    const headerTextColor = '#FFFFFF';

    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(headerTextColor);
    const collegeName = activeAllotment?.examinations[0]?.college || "College Name";
    doc.text(collegeName, pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(headerTextColor);
    const examName = assignedDuties.length > 0 ? assignedDuties[0].examName : 'No duties assigned';
    doc.text(examName, pageWidth / 2, 26, { align: 'center' });

    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(primaryColor);
    doc.text("Invigilator's Duty Summary", pageWidth / 2, 55, { align: 'center' });

    const startY = 70;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textColor);
    
    doc.text('Name:', 15, startY);
    doc.text('Designation:', pageWidth / 2, startY);
    doc.text('Mobile No:', 15, startY + 7);
    doc.text('E-Mail ID:', pageWidth / 2, startY + 7);
    doc.text('No of Duties:', 15, startY + 14);
    
    doc.setFont('helvetica', 'normal');
    doc.text(selectedInvigilator.name, 40, startY);
    doc.text(selectedInvigilator.designation, (pageWidth / 2) + 25, startY);
    doc.text(selectedInvigilator.mobile, 40, startY + 7);
    doc.text(selectedInvigilator.email, (pageWidth / 2) + 25, startY + 7);
    doc.setFont('helvetica', 'bold');
    doc.text(assignedDuties.length.toString().padStart(2, '0'), 40, startY + 14);

    const head = [['Sl.No', 'Date', 'Day', 'Subject', 'Timings']];
    const body = assignedDuties.map((duty, index) => [
      index + 1,
      format(duty.date, "dd.MM.yyyy"),
      format(duty.date, "EEEE"),
      duty.subject,
      `${duty.startTime} - ${duty.endTime}`,
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: startY + 22,
        theme: 'grid',
        headStyles: {
            fillColor: [230, 230, 230],
            textColor: [30, 30, 30],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8,
            cellPadding: 2,
        },
        styles: {
            cellPadding: 2,
            fontSize: 8,
            textColor: textColor
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', fontStyle: 'bold' },
            2: { halign: 'left' },
            3: { halign: 'left', fontStyle: 'bold', textColor: [29, 171, 226] },
            4: { halign: 'center' },
        },
        didParseCell: function(data: any) {
            if (data.column.index === 3 && data.cell.section === 'body') {
                data.cell.styles.textColor = '#1DABE2';
            }
        },
        margin: { left: 15, right: 15 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || startY + 40;

    // Add the wishing message
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.text("Wishing you a smooth and successful examination duty.", pageWidth / 2, finalY + 15, { align: 'center' });

    doc.setFillColor(primaryColor);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(headerTextColor);
    doc.text(`Date: ${format(new Date(), 'PPP')}`, 15, pageHeight - 11);
    doc.text(`Generated by DutyFlow`, pageWidth - 15, pageHeight - 11, { align: 'right' });

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

  const examName = assignedDuties.length > 0 ? assignedDuties[0].examName : 'No duties assigned';

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
                  <AvatarImage src={`https://i.pravatar.cc/150?u=${selectedInvigilator.id}`} />
                  <AvatarFallback>{selectedInvigilator.name.charAt(0)}</AvatarFallback>
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
