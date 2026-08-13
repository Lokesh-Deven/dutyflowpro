"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAllotment } from '@/lib/allotment-context';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn, formatTimeTo12Hour } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '../ui/input';
import { Label } from '../ui/label';


type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
  onAllotmentChange: (newResult: AllotmentResult) => void;
};

export function AllotmentSheet({ invigilators, examinations, allotmentResult: initialAllotmentResult, onAllotmentChange }: AllotmentSheetProps) {
  const { toast } = useToast();
  const { activeAllotment, saveCurrentAllotment } = useAllotment();
  const [allotmentResult, setAllotmentResult] = useState<AllotmentResult>(initialAllotmentResult);
  const [isSaveAlertOpen, setIsSaveAlertOpen] = useState(false);
  const [saveName, setSaveName] = useState(activeAllotment?.name || 'New Allotment');

  const uniqueDates = useMemo(() => {
    const dates = examinations.map(exam => format(new Date(exam.date), 'yyyy-MM-dd'));
    return [...new Set(dates)].sort();
  }, [examinations]);

  const dateColorMap = useMemo(() => {
    const colors = [
      'bg-yellow-200/60 dark:bg-yellow-800/40',
      'bg-pink-200/60 dark:bg-pink-800/40',
      'bg-green-200/60 dark:bg-green-800/40',
      'bg-sky-200/60 dark:bg-sky-800/40',
      'bg-purple-200/60 dark:bg-purple-800/40',
      'bg-orange-200/60 dark:bg-orange-800/40',
      'bg-lime-200/60 dark:bg-lime-800/40',
    ];
    return uniqueDates.reduce((acc, date, index) => {
      acc[date] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [uniqueDates]);

  useEffect(() => {
    setAllotmentResult(initialAllotmentResult);
  }, [initialAllotmentResult]);

  useEffect(() => {
    setSaveName(activeAllotment?.name || 'New Allotment');
  }, [activeAllotment]);

  const handleDutyToggle = (invigilatorId: string, examId: string) => {
    const newResult = { ...allotmentResult };
    const newAssignments = { ...newResult.assignments };
    const currentDuties = newAssignments[invigilatorId] || [];
    
    const dutyIndex = currentDuties.indexOf(examId);

    if (dutyIndex > -1) {
      const updatedDuties = [...currentDuties];
      updatedDuties.splice(dutyIndex, 1);
      newAssignments[invigilatorId] = updatedDuties;
    } else {
      newAssignments[invigilatorId] = [...currentDuties, examId];
    }
    
    const updatedResult = { ...newResult, assignments: newAssignments };
    setAllotmentResult(updatedResult);
    onAllotmentChange(updatedResult);
  };

  const handleSave = () => {
    saveCurrentAllotment(saveName, allotmentResult.assignments);
    setIsSaveAlertOpen(false);
    toast({
        title: "Allotment Saved",
        description: `"${saveName}" has been saved successfully.`
    })
  }

  const handleDownload = () => {
    toast({
      title: "Generating PDF...",
      description: "Your download will begin shortly.",
    });

    const doc = new jsPDF({ orientation: 'landscape' });

    const examInfo = examinations.length > 0 ? examinations[0] : null;
    const title = `${examInfo?.college || 'College Name'}`;
    const subtitle = `${examInfo?.examName || 'Invigilation Duty Allotment'}`;
    const staticTitle = "Invigilation Duty Allotment Sheet";
    
    let currentY = 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(staticTitle, doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');

    const examHeaderData = examinations.map(exam => ({
        date: format(new Date(exam.date), "dd/MM/yy"),
        subject: exam.subject,
        time: `${formatTimeTo12Hour(exam.startTime)} - ${formatTimeTo12Hour(exam.endTime)}`
    }));

    const head = [
        ['Sl.No', "Invigilator's Name", 'Designation', ...examinations.map(() => ''), 'Total']
    ];

    const body = invigilators.map((invigilator, index) => {
        const duties = allotmentResult.assignments[invigilator.id] || [];
        const dutyCount = duties.length;
        const row = [
            index + 1,
            invigilator.name,
            invigilator.designation,
            ...examinations.map(exam => {
                const hasDuty = duties.includes(exam.id);
                return hasDuty ? '1' : '0';
            }),
            dutyCount
        ];
        return row;
    });

    const dutiesPerExam = examinations.map(exam => {
        return invigilators.reduce((count, invigilator) => {
            const duties = allotmentResult.assignments[invigilator.id] || [];
            return count + (duties.includes(exam.id) ? 1 : 0);
        }, 0);
    });
    const totalRooms = examinations.reduce((acc, exam) => acc + exam.rooms, 0);
    const totalRelievers = examinations.reduce((acc, exam) => acc + exam.relievers, 0);
    const totalInvigilatorsRequired = examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0);
    const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

    (doc as any).autoTable({
        head: head,
        body: body,
        foot: [
            ['', 'No of Rooms', '', ...examinations.map(exam => exam.rooms), totalRooms],
            ['', 'No of Relievers', '', ...examinations.map(exam => exam.relievers), totalRelievers],
            ['', 'Total Invigilators', '', ...examinations.map(exam => exam.rooms + exam.relievers), totalInvigilatorsRequired],
            ['', 'Total Duties Allotted', '', ...dutiesPerExam, totalDutiesAllotted],
        ],
        startY: currentY + 7,
        theme: 'grid',
        headStyles: {
            fillColor: [17, 93, 169],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            minCellHeight: 35,
        },
        footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center'
        },
        styles: {
            cellPadding: 1,
            fontSize: 9,
            halign: 'center',
            minCellHeight: 5,
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', cellWidth: 35 },
            2: { halign: 'left', cellWidth: 35 },
            [examinations.length + 3]: { halign: 'center', cellWidth: 10, fontStyle: 'bold' }
        },
        didDrawCell: (data: any) => {
            if (data.section === 'head' && data.column.index >= 3 && data.column.index < head[0].length - 1) {
                const doc = data.doc;
                const cell = data.cell;
                const info = examHeaderData[data.column.index - 3];
                
                doc.setFontSize(7);
                doc.setTextColor(255);
                doc.setFont('helvetica', 'bold');
                
                const centerX = cell.x + (cell.width / 2);
                const baselineY = cell.y + cell.height - 3;
                
                doc.text(info.date, centerX - 3, baselineY, { angle: 90 });
                doc.text(info.subject, centerX, baselineY, { angle: 90 });
                doc.setFontSize(6);
                doc.text(info.time, centerX + 3, baselineY, { angle: 90 });
            }
        },
        didDrawPage: (data: any) => {
            doc.setFontSize(10);
            doc.text(
                `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
                doc.internal.pageSize.getWidth() - 30,
                doc.internal.pageSize.getHeight() - 10
            );
        }
    });

    doc.save(`${saveName.replace(/ /g, '_')}.pdf`);
  };

  const examInfo = examinations.length > 0 ? examinations[0] : null;
  const totalRooms = examinations.reduce((acc, exam) => acc + exam.rooms, 0);
  const totalRelievers = examinations.reduce((acc, exam) => acc + exam.relievers, 0);
  const totalInvigilatorsRequired = examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0);
  const dutiesPerExam = examinations.map(exam => invigilators.reduce((count, invigilator) => count + ((allotmentResult.assignments[invigilator.id] || []).includes(exam.id) ? 1 : 0), 0));
  const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-primary">{examInfo?.college || 'College Name'}</CardTitle>
          <CardDescription className="text-lg font-semibold">{examInfo?.examName}</CardDescription>
          <p className="text-md text-muted-foreground">{activeAllotment?.name || 'Invigilation Duty Allotment Sheet'}</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 w-12">Sl.No</TableHead>
                  <TableHead className="sticky left-12 bg-card z-10 w-48">Invigilator's Name</TableHead>
                  <TableHead className="w-48">Designation</TableHead>
                  {examinations.map(exam => (
                    <TableHead key={exam.id} className="whitespace-nowrap h-48 p-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      <div className="flex flex-col items-start w-full">
                        <span className="text-xs font-normal text-muted-foreground">{format(new Date(exam.date), "dd/MM/yy")}</span>
                        <span className="font-normal">{exam.subject}</span>
                        <span className="text-xs font-normal text-muted-foreground">{formatTimeTo12Hour(exam.startTime)} - {formatTimeTo12Hour(exam.endTime)}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center sticky right-0 bg-card z-10">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invigilators.map((invigilator, index) => {
                  const duties = allotmentResult.assignments[invigilator.id] || [];
                  const dutyCount = duties.length;
                  return (
                    <TableRow key={invigilator.id}>
                      <TableCell className="sticky left-0 bg-card z-10">{index + 1}</TableCell>
                      <TableCell className="font-medium sticky left-12 bg-card z-10">{invigilator.name}</TableCell>
                      <TableCell>{invigilator.designation}</TableCell>
                      {examinations.map(exam => {
                         const hasDuty = duties.includes(exam.id);
                         const examDate = format(new Date(exam.date), 'yyyy-MM-dd');
                         
                         return (
                            <TableCell key={exam.id} className={cn("text-center cursor-pointer transition-colors hover:bg-secondary")} onClick={() => handleDutyToggle(invigilator.id, exam.id)}>
                              <Tooltip>
                                <TooltipTrigger className="w-full h-full flex items-center justify-center">
                                    {hasDuty ? (
                                      <div className={cn("font-bold rounded-md w-6 h-6 flex items-center justify-center", dateColorMap[examDate] || 'bg-primary/20')}>1</div>
                                    ) : (<span className="text-muted-foreground">0</span>)}
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-3 h-3 rounded-full", dateColorMap[examDate])}></div>
                                        <p>{format(new Date(exam.date), 'PPP')} ({format(new Date(exam.date), 'EEEE')})</p>
                                    </div>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                         )
                      })}
                      <TableCell className="font-bold text-center sticky right-0 bg-card z-10">
                        <div className="bg-pink-100 text-black font-bold rounded-md w-6 h-6 flex items-center justify-center mx-auto">{dutyCount}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
               <TableFooter>
                  <TableRow className="bg-secondary/50 font-bold"><TableCell colSpan={3} className="text-right text-primary">No of Rooms</TableCell>{examinations.map((exam) => (<TableCell key={`rooms-${exam.id}`} className="text-center text-primary">{exam.rooms}</TableCell>))}<TableCell className="text-center text-primary sticky right-0 bg-secondary/50">{totalRooms}</TableCell></TableRow>
                  <TableRow className="bg-secondary/50 font-bold"><TableCell colSpan={3} className="text-right text-primary">No of Relievers</TableCell>{examinations.map((exam) => (<TableCell key={`relievers-${exam.id}`} className="text-center text-primary">{exam.relievers}</TableCell>))}<TableCell className="text-center text-primary sticky right-0 bg-secondary/50">{totalRelievers}</TableCell></TableRow>
                   <TableRow className="bg-secondary/50 font-bold"><TableCell colSpan={3} className="text-right text-primary">No of Invigilators</TableCell>{examinations.map((exam) => (<TableCell key={`invigilators-${exam.id}`} className="text-center text-primary">{exam.rooms + exam.relievers}</TableCell>))}
                      <TableCell className="text-center text-primary sticky right-0 bg-secondary/50">{totalInvigilatorsRequired}</TableCell>
                  </TableRow>
                  <TableRow className="bg-accent/20 font-bold">
                      <TableCell colSpan={3} className="text-right">Total Duties Allotted</TableCell>
                      {dutiesPerExam.map((count, index) => {
                          const exam = examinations[index];
                          const requiredInvigilators = exam.rooms + exam.relievers;
                          const isMismatch = count !== requiredInvigilators;
                          return (<TableCell key={`total-duties-${exam.id}`} className={cn("text-center", isMismatch && "text-red-500 font-extrabold")}>{count}</TableCell>)
                      })}
                      <TableCell className="text-center sticky right-0 bg-accent/20">{totalDutiesAllotted}</TableCell>
                  </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
           <AlertDialog open={isSaveAlertOpen} onOpenChange={setIsSaveAlertOpen}>
            <AlertDialogTrigger asChild>
                <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save/Update
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Save Allotment</AlertDialogTitle>
                    <AlertDialogDescription>
                        You can save the current state of this allotment to access it later from the "Saved Allotments" page.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
           </AlertDialog>
           <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4" />Download as PDF</Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
