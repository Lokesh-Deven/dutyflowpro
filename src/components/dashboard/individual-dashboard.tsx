"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FolderArchive, Clock, Calendar as CalendarIcon, Book, Mail, Sun, Moon, Phone } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAllotment } from '@/lib/allotment-context';
import { formatTimeTo12Hour } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    const midnightBlue = '#1C304A';
    
    // Header Block
    doc.setFillColor(midnightBlue);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#FFFFFF');
    // Priority: Prop examinations -> Active Allotment -> Default
    const collegeName = (examinations[0]?.college || activeAllotment?.examinations[0]?.college || "College Name").toUpperCase();
    doc.text(collegeName, pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const examName = assignedDuties.length > 0 ? assignedDuties[0].examName : (examinations[0]?.examName || activeAllotment?.examinations[0]?.examName || 'Examination Name');
    doc.text(examName, pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("INVIGILATOR'S DUTY SUMMARY", pageWidth / 2, 38, { align: 'center' });

    // Profile Section
    doc.setTextColor('#000000');
    doc.setFontSize(11);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Name:`, 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(invigilator.name, 55, 60);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Designation:`, 20, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(invigilator.designation, 55, 70);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Mobile:`, 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(invigilator.mobile, 55, 80);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`E-Mail:`, 20, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(invigilator.email, 55, 90);

    // Total Duties Box
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(pageWidth - 65, 55, 45, 35, 3, 3, 'FD');
    doc.setTextColor(midnightBlue);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL DUTIES", pageWidth - 42.5, 65, { align: 'center' });
    doc.setFontSize(28);
    doc.text(assignedDuties.length.toString().padStart(2, '0'), pageWidth - 42.5, 82, { align: 'center' });

    // Schedule Table
    const head = [['Sl.\nNo', 'Date / Day', 'Subject', 'Timings']];
    const body = assignedDuties.map((duty, index) => [
      index + 1,
      `${format(duty.date, "dd.MM.yyyy")}\n${format(duty.date, "EEEE")}`,
      duty.subject,
      `${formatTimeTo12Hour(duty.startTime)} - ${formatTimeTo12Hour(duty.endTime)}`
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: 105,
        theme: 'grid',
        headStyles: { 
            fillColor: [28, 48, 74], 
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 10
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'center', cellWidth: 40 },
            2: { halign: 'center', fontStyle: 'bold', textColor: [28, 48, 74] },
            3: { halign: 'center', cellWidth: 40 }
        },
        styles: { 
            fontSize: 10, 
            cellPadding: 5,
            valign: 'middle',
            lineColor: [220, 220, 220]
        },
    });

    // Add wishing message
    const finalY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFontSize(12);
    doc.setTextColor(midnightBlue);
    doc.setFont('helvetica', 'normal');
    doc.text("Wishing you a smooth and successful examination duty", pageWidth / 2, finalY, { align: 'center' });

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
      const duties = examinations.filter(exam => dutyIds.includes(exam.id))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const doc = generateInvigilatorPDF(inv, duties);
      zip.file(`Duty_Summary_${inv.name.replace(/ /g, '_')}.pdf`, doc.output('blob'));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `All_Invigilator_Summaries.zip`);
  };
  
  const examName = examinations[0]?.examName || activeAllotment?.examinations[0]?.examName || 'Annual Examination';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6">
      <div className="max-w-md mx-auto">
        <Select onValueChange={setSelectedInvigilatorId} value={selectedInvigilatorId ?? undefined}>
          <SelectTrigger className="w-full h-12 bg-white border-slate-200 shadow-sm focus:ring-primary rounded-xl">
            <SelectValue placeholder="Select an invigilator" />
          </SelectTrigger>
          <SelectContent>
            {invigilators.map(inv => (
              <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedInvigilator && (
        <div className="space-y-8">
          {/* Profile Card */}
          <Card className="border-slate-100 shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8 bg-[#f8fafc]/50">
              <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
                <AvatarFallback className="text-4xl bg-primary text-white font-black">
                  {selectedInvigilator.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left space-y-2">
                <h2 className="text-3xl font-black text-slate-900">{selectedInvigilator.name}</h2>
                <p className="text-lg font-bold text-slate-500">{selectedInvigilator.designation}</p>
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-bold">
                    <Phone className="h-4 w-4" />
                    <span>{selectedInvigilator.mobile}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-bold">
                    <Mail className="h-4 w-4" />
                    <span>{selectedInvigilator.email}</span>
                  </div>
                </div>
              </div>
              <div className="md:w-px h-16 bg-slate-200 hidden md:block" />
              <div className="text-center md:text-right min-w-[200px]">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">TOTAL DUTIES</span>
                <span className="text-6xl font-black text-primary leading-none block">
                  {assignedDuties.length.toString().padStart(2, '0')}
                </span>
                <span className="text-sm font-bold text-slate-600 mt-1 block">{examName}</span>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Segment Header */}
          <div className="flex items-center gap-4">
            <div className="h-[2px] flex-1 bg-slate-100" />
            <div className="flex items-center gap-2 text-primary">
              <CalendarIcon className="h-5 w-5" />
              <span className="text-sm font-black uppercase tracking-widest">DUTY SCHEDULE</span>
            </div>
            <div className="h-[2px] flex-1 bg-slate-100" />
          </div>

          {/* Duty Schedule Table */}
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-[#f1f5f9]">
                <TableRow>
                  <TableHead className="text-slate-900 font-black text-center py-4 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-slate-900 font-black text-center py-4 uppercase tracking-wider">Day</TableHead>
                  <TableHead className="text-slate-900 font-black text-center py-4 uppercase tracking-wider">Subject</TableHead>
                  <TableHead className="text-slate-900 font-black text-center py-4 uppercase tracking-wider">Duration</TableHead>
                  <TableHead className="text-slate-900 font-black text-center py-4 uppercase tracking-wider">Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedDuties.length > 0 ? (
                  assignedDuties.map((duty) => (
                    <TableRow key={duty.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                      <TableCell className="text-center py-6">
                        <div className="bg-primary text-white w-24 h-10 rounded-lg flex items-center justify-center gap-1 mx-auto shadow-md">
                          <span className="text-lg font-black">{format(duty.date, 'dd')}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">{format(duty.date, 'MMM')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{format(duty.date, 'EEEE')}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-700 font-normal">
                          <Book className="h-4 w-4 text-primary opacity-60" />
                          {duty.subject}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-700 font-bold">
                          <Clock className="h-4 w-4 text-primary opacity-60" />
                          {formatTimeTo12Hour(duty.startTime)} - {formatTimeTo12Hour(duty.endTime)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-700 font-bold">
                          {parseInt(duty.startTime.split(':')[0]) < 12 ? (
                            <Sun className="h-4 w-4 text-primary opacity-60" />
                          ) : (
                            <Moon className="h-4 w-4 text-primary opacity-60" />
                          )}
                          {parseInt(duty.startTime.split(':')[0]) < 12 ? 'Morning' : 'Afternoon'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-bold italic">
                      No duties assigned for this invigilator.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-100">
        <Button 
          variant="outline" 
          className="w-full sm:w-auto font-bold border-2 border-primary text-primary hover:bg-primary/5 transition-all px-8 h-12 rounded-xl" 
          onClick={handleDownloadAll}
        >
          <FolderArchive className="mr-2 h-5 w-5" /> Download All Summaries
        </Button>
        <Button 
          className="w-full sm:w-auto bg-primary text-white font-bold px-12 h-12 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all" 
          onClick={handleDownload}
        >
          <Download className="mr-2 h-5 w-5" /> Download PDF
        </Button>
      </div>
    </div>
  );
}
