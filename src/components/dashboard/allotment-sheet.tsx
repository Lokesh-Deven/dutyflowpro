
"use client";

import { useState, useEffect } from 'react';
import type { Invigilator, Examination } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Send, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AllotmentResult } from '@/lib/allotment';
import { format } from 'date-fns';
import { useAllotment } from '@/lib/allotment-context';
import { optimizeDutyAssignments } from '@/ai/flows/optimize-duty-assignments';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
};

export function AllotmentSheet({ invigilators, examinations, allotmentResult: initialAllotmentResult }: AllotmentSheetProps) {
  const { toast } = useToast();
  const [allotmentResult, setAllotmentResult] = useState<AllotmentResult>(initialAllotmentResult);

  useEffect(() => {
    setAllotmentResult(initialAllotmentResult);
  }, [initialAllotmentResult]);

  const handleDutyToggle = (invigilatorId: string, examId: string) => {
    setAllotmentResult(prevResult => {
      const newAssignments = { ...prevResult.assignments };
      const currentDuties = newAssignments[invigilatorId] || [];
      
      const dutyIndex = currentDuties.indexOf(examId);

      if (dutyIndex > -1) {
        // Duty exists, remove it
        const updatedDuties = [...currentDuties];
        updatedDuties.splice(dutyIndex, 1);
        newAssignments[invigilatorId] = updatedDuties;
      } else {
        // Duty doesn't exist, add it
        newAssignments[invigilatorId] = [...currentDuties, examId];
      }

      return { ...prevResult, assignments: newAssignments };
    });
  };


  const handleEmailAll = () => {
    toast({
      title: "Emailing Summaries",
      description: "Preparing to email all individual summaries. (This is a demo action)",
    });
  };

  const handleDownload = () => {
    toast({
      title: "Generating PDF...",
      description: "Your download will begin shortly.",
    });

    const doc = new jsPDF({ orientation: 'landscape' });

    const examInfo = examinations.length > 0 ? examinations[0] : null;
    const title = `${examInfo?.college || 'Institution'}\n${examInfo?.examName || 'Examination'}\nInvigilation Duty Allotment Sheet`;
    
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

    const head = [
        ['Sl.No', "Invigilator's Name", 'Designation', ...examinations.map(exam => `${format(exam.date, "dd/MM/yy")}\n${exam.subject}\n${exam.startTime} - ${exam.endTime}`), 'Total']
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

    const totalRooms = examinations.reduce((acc, exam) => acc + exam.rooms, 0);
    const totalRelievers = examinations.reduce((acc, exam) => acc + exam.relievers, 0);
    const totalInvigilatorsRequired = examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0);
    const dutiesPerExam = examinations.map(exam => {
        return invigilators.reduce((count, invigilator) => {
            const duties = allotmentResult.assignments[invigilator.id] || [];
            return count + (duties.includes(exam.id) ? 1 : 0);
        }, 0);
    });
    const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

    (doc as any).autoTable({
        head: head,
        body: body,
        foot: [
            ['', 'No of Rooms', '', ...examinations.map(exam => exam.rooms), totalRooms],
            ['', 'No of Relievers', '', ...examinations.map(exam => exam.relievers), totalRelievers],
            ['', 'No of Invigilators', '', ...examinations.map(exam => exam.rooms + exam.relievers), totalInvigilatorsRequired],
            ['', 'Total Duties Allotted', '', ...dutiesPerExam, totalDutiesAllotted],
        ],
        startY: 35,
        theme: 'grid',
        headStyles: {
            fillColor: [22, 163, 74], // green-600
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        footStyles: {
            fillColor: [244, 244, 245], // zinc-100
            textColor: [0, 0, 0],
            fontStyle: 'bold',
        },
        styles: {
            cellPadding: 2,
            fontSize: 8,
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left', cellWidth: 40 },
            2: { halign: 'left', cellWidth: 40 },
        },
        didDrawPage: (data: any) => {
          // In case of multiple pages, ensure the title is not repeated by default
        }
    });

    doc.save('duty-allotment.pdf');
  };

  const handleOptimize = async () => {
    toast({
      title: "Optimizing Allotment",
      description: "AI is re-evaluating the duty assignments..."
    });

    try {
      const result = await optimizeDutyAssignments({
        invigilators,
        exams: examinations,
        constraints: {
          hard: [
            "Part-time lecturers can have a maximum of two duties.",
            "Part-time lecturers must only be assigned duties on their available days."
          ],
          soft: [
            "Senior invigilators should not be allotted more duties than junior invigilators.",
            "Excess duties should be assigned to the most junior invigilators."
          ]
        }
      });

      toast({
        title: "Optimization Complete",
        description: result.message,
      });

      if (result.success && result.optimizedAllotment) {
        // In a real scenario, you'd update your state with the optimized allotment.
        // For this MVP, we are just showing a message.
        // e.g., setAllotmentResult(result.optimizedAllotment)
      }

    } catch (error) {
      console.error("Optimization failed:", error);
      toast({
        variant: "destructive",
        title: "Optimization Failed",
        description: "The AI optimization process encountered an error.",
      });
    }
  };
  
  const examInfo = examinations.length > 0 ? examinations[0] : null;

  const totalRooms = examinations.reduce((acc, exam) => acc + exam.rooms, 0);
  const totalRelievers = examinations.reduce((acc, exam) => acc + exam.relievers, 0);
  const totalInvigilatorsRequired = examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0);

  const dutiesPerExam = examinations.map(exam => {
    return invigilators.reduce((count, invigilator) => {
        const duties = allotmentResult.assignments[invigilator.id] || [];
        return count + (duties.includes(exam.id) ? 1 : 0);
    }, 0);
  });
  const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-primary">{examInfo?.college}</CardTitle>
          <CardDescription className="text-lg font-semibold">{examInfo?.examName}</CardDescription>
          <p className="text-md text-muted-foreground">Invigilation Duty Allotment Sheet</p>
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
                    <TableHead key={exam.id} className="text-center whitespace-nowrap h-48" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      <span className="text-xs font-normal text-muted-foreground">{format(exam.date, "dd/MM/yy")}</span>
                      <br />
                      {exam.subject}
                      <br/>
                      <span className="text-xs font-normal text-muted-foreground">{exam.startTime} - {exam.endTime}</span>
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
                         return (
                            <TableCell 
                              key={exam.id} 
                              className="text-center cursor-pointer hover:bg-secondary"
                              onClick={() => handleDutyToggle(invigilator.id, exam.id)}
                            >
                              <Tooltip>
                                <TooltipTrigger className="w-full h-full flex items-center justify-center">
                                    {hasDuty ? (
                                        <div className="bg-primary/20 text-primary-foreground font-bold rounded-md w-6 h-6 flex items-center justify-center">1</div>
                                    ) : (
                                        <span>0</span>
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{format(exam.date, 'PPP')} ({format(exam.date, 'EEEE')})</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                         )
                      })}
                      <TableCell className="font-bold text-center sticky right-0 bg-card z-10">{dutyCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
               <TableFooter>
                  <TableRow className="bg-secondary/50 font-bold">
                      <TableCell colSpan={3} className="text-right text-primary">No of Rooms</TableCell>
                      {examinations.map((exam) => (
                          <TableCell key={`rooms-${exam.id}`} className="text-center text-primary">{exam.rooms}</TableCell>
                      ))}
                      <TableCell className="text-center text-primary sticky right-0 bg-secondary/50">{totalRooms}</TableCell>
                  </TableRow>
                  <TableRow className="bg-secondary/50 font-bold">
                      <TableCell colSpan={3} className="text-right text-primary">No of Relievers</TableCell>
                      {examinations.map((exam) => (
                          <TableCell key={`relievers-${exam.id}`} className="text-center text-primary">{exam.relievers}</TableCell>
                      ))}
                      <TableCell className="text-center text-primary sticky right-0 bg-secondary/50">{totalRelievers}</TableCell>
                  </TableRow>
                   <TableRow className="bg-secondary/50 font-bold">
                      <TableCell colSpan={3} className="text-right text-primary">No of Invigilators</TableCell>
                      {examinations.map((exam) => (
                          <TableCell key={`invigilators-${exam.id}`} className="text-center text-primary">{exam.rooms + exam.relievers}</TableCell>
                      ))}
                      <TableCell className="text-center text-primary sticky right-0 bg-secondary/50">{totalInvigilatorsRequired}</TableCell>
                  </TableRow>
                  <TableRow className="bg-accent/20 font-bold">
                      <TableCell colSpan={3} className="text-right">Total Duties Allotted</TableCell>
                      {dutiesPerExam.map((count, index) => {
                          const exam = examinations[index];
                          const requiredInvigilators = exam.rooms + exam.relievers;
                          const isMismatch = count !== requiredInvigilators;
                          return (
                              <TableCell key={`total-duties-${exam.id}`} className={cn("text-center", isMismatch && "text-red-500 font-extrabold")}>
                                  {count}
                              </TableCell>
                          )
                      })}
                      <TableCell className="text-center sticky right-0 bg-accent/20">{totalDutiesAllotted}</TableCell>
                  </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
           <Button variant="outline" onClick={handleOptimize}>
            <Sparkles className="mr-2 h-4 w-4" />
            Optimize
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download as PDF
          </Button>
          <Button onClick={handleEmailAll}>
            <Send className="mr-2 h-4 w-4" />
            Email All Summaries
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
