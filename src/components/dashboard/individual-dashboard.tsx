
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FolderArchive, Clock, Calendar as CalendarIcon, Book, User, Sun, Moon, Mail } from 'lucide-react';
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

    doc.setFillColor(midnightBlue);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(headerTextColor);
    
    const collegeName = activeAllotment?.examinations[0]?.college || "College Name";
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
            2: { halign: 'left', fontStyle: 'normal' },
            3: { halign: 'center' },
        },
        margin: { left: 20, right: 20 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || startY + 100;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(textColor);
    doc.text("Wishing you a smooth and successful examination duty", pageWidth / 2, finalY + 20, { align: 'center' });

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
    saveAs(content, `All_Invigilator_Summaries.zip`);
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

  const examName = assignedDuties.length > 0 ? assignedDuties[0].examName : (activeAllotment?.examinations[0]?.examName || 'Annual Examination');

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="text-center pb-8">
        <CardTitle className="text-3xl font-black text-[#1e293b] font-headline">Invigilator Duty Summary</CardTitle>
        <CardDescription className="text-base text-slate-500">Select an invigilator to view their detailed duty summary.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-10">
        <div className="max-w-xl mx-auto space-y-2">
          <label className="text-sm font-bold text-slate-700">Select Invigilator</label>
          <Select
            onValueChange={setSelectedInvigilatorId}
            value={selectedInvigilatorId ?? undefined}
          >
            <SelectTrigger className="w-full h-12 bg-white border-slate-200 shadow-sm focus:ring-primary">
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
        </div>

        {selectedInvigilator && (
          <div className="space-y-12">
            {/* Invigilator Profile Card */}
            <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
              <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                <AvatarFallback className="text-3xl bg-primary text-white font-black">
                  {selectedInvigilator.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h2 className="text-3xl font-black text-slate-900">{selectedInvigilator.name}</h2>
                <p className="text-lg font-medium text-slate-500">{selectedInvigilator.designation}</p>
                <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>{selectedInvigilator.email}</span>
                </div>
              </div>
              <Separator orientation="vertical" className="hidden md:block h-16 bg-slate-200" />
              <div className="text-center md:text-right min-w-[150px]">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">TOTAL DUTIES</span>
                <span className="text-5xl font-black text-primary leading-none block mb-1">
                  {assignedDuties.length.toString().padStart(2, '0')}
                </span>
                <span className="text-sm font-bold text-slate-600 block">{examName}</span>
              </div>
            </div>

            {/* Duty Schedule Header */}
            <div className="flex items-center gap-6">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-2 text-primary">
                <CalendarIcon className="h-5 w-5" />
                <span className="text-sm font-black uppercase tracking-widest">DUTY SCHEDULE</span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Duty Cards Grid */}
            {assignedDuties.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {assignedDuties.map(duty => (
                  <Card key={duty.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      {/* Date Header Section */}
                      <div className="p-6 pb-4 flex flex-col items-center">
                        <div className="bg-primary rounded-2xl w-24 h-24 flex flex-col items-center justify-center text-white shadow-lg mb-3 relative overflow-hidden">
                           <CalendarIcon className="w-4 h-4 opacity-50 absolute top-2 left-1/2 -translate-x-1/2" />
                           <span className="text-4xl font-black leading-none mt-2">{format(duty.date, 'dd')}</span>
                           <span className="text-[10px] font-black tracking-widest uppercase opacity-90">{format(duty.date, 'MMM')}</span>
                        </div>
                        <div className="bg-blue-50 text-primary text-[10px] font-black tracking-widest uppercase px-6 py-1 rounded-full border border-blue-100">
                          {format(duty.date, 'EEEE')}
                        </div>
                      </div>

                      <Separator className="bg-slate-50" />

                      {/* Info Section */}
                      <div className="p-6 space-y-6">
                        <div className="text-center">
                          <Book className="h-4 w-4 text-primary mx-auto mb-2 opacity-60" />
                          <h4 className="text-lg font-bold text-slate-800 leading-tight">
                            {duty.subject}
                          </h4>
                        </div>

                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-2 rounded-full">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DURATION</span>
                              <span className="text-sm font-bold text-primary">
                                {formatTimeTo12Hour(duty.startTime)} - {formatTimeTo12Hour(duty.endTime)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="bg-slate-50 p-2 rounded-full">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SESSION</span>
                              <span className="text-sm font-bold text-slate-700">
                                {parseInt(duty.startTime.split(':')[0]) < 12 ? 'Morning' : 'Afternoon'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Session Pill */}
                        <div className="pt-2">
                          <div className="bg-blue-50/50 border border-blue-100 rounded-xl py-2 px-4 flex items-center justify-center gap-2 text-primary text-sm font-bold">
                            {parseInt(duty.startTime.split(':')[0]) < 12 ? (
                              <Sun className="h-4 w-4" />
                            ) : (
                              <Moon className="h-4 w-4" />
                            )}
                            <span>{parseInt(duty.startTime.split(':')[0]) < 12 ? 'Morning' : 'Afternoon'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">No duties assigned for this invigilator.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 px-0 pt-10 border-t border-slate-100">
        <Button 
          variant="outline" 
          className="w-full sm:w-auto font-bold border-2 border-primary text-primary hover:bg-primary/5 transition-colors px-8 h-12 rounded-xl" 
          onClick={handleDownloadAll}
        >
          <FolderArchive className="mr-2 h-5 w-5" /> Download All Summaries
        </Button>
        <Button 
          className="w-full sm:w-auto bg-primary text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all" 
          onClick={handleDownload}
        >
          <Download className="mr-2 h-5 w-5" /> Download PDF
        </Button>
      </CardFooter>
    </Card>
  );
}
