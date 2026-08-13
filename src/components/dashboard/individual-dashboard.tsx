"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FolderArchive, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAllotment } from '@/lib/allotment-context';
import { formatTimeTo12Hour } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Separator } from '@/components/ui/separator';

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

  const generateInvigilatorPDF = (invigilator: Invigilator, assignedDuties: Examination[]) => {
    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const midnightBlue = '#1C304A';
    const textColor = '#1C304A';
    const headerTextColor = '#FFFFFF';

    // Header Banner
    doc.setFillColor(midnightBlue);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setFont('helvetica', 'bold');
    let collegeFontSize = 18;
    doc.setFontSize(collegeFontSize);
    doc.setTextColor(headerTextColor);
    
    const collegeName = activeAllotment?.examinations[0]?.college || "College Name";
    
    while (doc.getTextWidth(collegeName) > (pageWidth - 20) && collegeFontSize > 8) {
        collegeFontSize -= 0.5;
        doc.setFontSize(collegeFontSize);
    }
    doc.text(collegeName, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    const examName = assignedDuties.length > 0 ? assignedDuties[0].examName : (activeAllotment?.examinations[0]?.examName || 'Examination Name');
    doc.text(examName, pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("INVIGILATOR'S DUTY SUMMARY", pageWidth / 2, 40, { align: 'center' });

    const startY = 65;
    doc.setTextColor(textColor);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Name:', 20, startY);
    doc.text('Designation:', 20, startY + 12);
    doc.text('Mobile:', 20, startY + 24);
    doc.text('E-Mail:', 20, startY + 36);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invigilator.name, 55, startY);
    doc.text(invigilator.designation, 55, startY + 12);
    doc.text(invigilator.mobile, 55, startY + 24);
    doc.text(invigilator.email, 55, startY + 36);

    // Summary Card
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(pageWidth - 60, startY - 5, 40, 42, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL DUTIES', pageWidth - 40, startY + 5, { align: 'center' });
    doc.setFontSize(24);
    doc.setTextColor(midnightBlue);
    doc.text(assignedDuties.length.toString().padStart(2, '0'), pageWidth - 40, startY + 24, { align: 'center' });

    const head = [['SN', 'Date / Day', 'Subject', 'Timings']];
    const body = assignedDuties.map((duty, index) => [
      index + 1,
      `${format(duty.date, "dd.MM.yyyy")}\n${format(duty.date, "EEEE")}`,
      duty.subject,
      `${formatTimeTo12Hour(duty.startTime)} - ${formatTimeTo12Hour(duty.endTime)}`,
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: startY + 50,
        theme: 'grid',
        headStyles: {
            fillColor: [28, 48, 74],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 12,
            cellPadding: 5,
        },
        styles: {
            cellPadding: 4,
            fontSize: 12,
            textColor: textColor,
            valign: 'middle'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left', cellWidth: 40 },
            2: { halign: 'left', fontStyle: 'normal', textColor: [28, 48, 74] },
            3: { halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        alternateRowStyles: {
            fillColor: [245, 250, 255]
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || startY + 100;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(textColor);
    const closingText = "Wishing you a smooth and successful examination duty";
    doc.text(closingText, pageWidth / 2, finalY + 20, { align: 'center' });

    // Footer banner
    doc.setFillColor(midnightBlue);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');

    return doc;
  };

  const handleDownload = () => {
    if (!selectedInvigilator) return;
    toast({
      title: "Generating PDF...",
      description: `Preparing summary for ${selectedInvigilator.name}.`,
    });
    const doc = generateInvigilatorPDF(selectedInvigilator, assignedDuties);
    doc.save(`Duty_Summary_${selectedInvigilator.name.replace(/ /g, '_')}.pdf`);
  };

  const handleDownloadAll = async () => {
    toast({
      title: "Generating ZIP...",
      description: "Creating summaries for all invigilators.",
    });

    const zip = new JSZip();
    
    for (const inv of invigilators) {
      const dutyIds = allotmentResult.assignments[inv.id] || [];
      const duties = examinations
        .filter(exam => dutyIds.includes(exam.id))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const doc = generateInvigilatorPDF(inv, duties);
      const pdfBlob = doc.output('blob');
      const fileName = `Duty_Summary_${inv.name.replace(/ /g, '_')}.pdf`;
      zip.file(fileName, pdfBlob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `All_Invigilator_Summaries_${format(new Date(), 'yyyyMMdd_HHmm')}.zip`);
    
    toast({
      title: "ZIP Generated",
      description: "All duty summaries have been downloaded.",
    });
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
          <SelectTrigger className="w-full md:w-72 bg-blue-50/50 border-blue-100 dark:bg-slate-800/50 dark:border-slate-700">
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
          <div className="space-y-6">
            <Card className="bg-secondary/30 border-dashed border-2">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center">
                        {selectedInvigilator.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                    <CardTitle className="text-2xl font-headline font-extrabold">{selectedInvigilator.name}</CardTitle>
                    <CardDescription className="font-medium text-slate-600">{selectedInvigilator.designation}</CardDescription>
                    <CardDescription className="text-slate-500">{selectedInvigilator.email}</CardDescription>
                    </div>
                    <div className="text-right sm:border-l sm:pl-6 border-slate-200">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Duties</span>
                            <span className="text-3xl font-black text-primary">{assignedDuties.length.toString().padStart(2, '0')}</span>
                            <h4 className="text-xs font-semibold text-slate-500 max-w-[150px] text-right line-clamp-2 mt-1">{examName}</h4>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Duty Schedule
              </h3>
              {assignedDuties.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  {assignedDuties.map(duty => (
                    <div key={duty.id} className="group flex rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300">
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-4 flex flex-col items-center justify-center text-white w-28 shrink-0 relative">
                        <span className="text-3xl font-black leading-none">{format(duty.date, 'dd')}</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-90">{format(duty.date, 'MMM')}</span>
                        <div className="h-px w-8 bg-white/30 my-2" />
                        <span className="text-[10px] uppercase font-medium tracking-tighter opacity-80">{format(duty.date, 'EEEE')}</span>
                        
                        <div className="absolute top-1/2 -right-1.5 h-3 w-3 bg-white dark:bg-slate-900 rounded-full -translate-y-1/2" />
                      </div>
                      
                      <div className="flex-1 p-5 flex flex-col justify-center border-l border-dashed border-slate-300">
                        <h4 className="text-lg font-headline font-normal text-slate-900 dark:text-slate-100 mb-2 leading-tight">
                          {duty.subject}
                        </h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Duration</span>
                            <span className="text-xs font-bold text-primary flex items-center gap-1">
                               <Clock className="w-3 h-3" />
                               {formatTimeTo12Hour(duty.startTime)} - {formatTimeTo12Hour(duty.endTime)}
                            </span>
                          </div>
                          <Separator orientation="vertical" className="h-8" />
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Session</span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              {parseInt(duty.startTime.split(':')[0]) < 12 ? 'Morning' : 'Afternoon'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200">
                    <p className="text-muted-foreground">No duties assigned for this invigilator.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
        <Button variant="outline" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold" onClick={handleDownloadAll}>
          <FolderArchive className="mr-2 h-4 w-4" /> Download All Summaries
        </Button>
        <div className="flex w-full sm:w-auto gap-2">
          <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
