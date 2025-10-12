
"use client";

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


type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
};

export function AllotmentSheet({ invigilators, examinations, allotmentResult }: AllotmentSheetProps) {
  const { toast } = useToast();
  const { setExaminations, setInvigilators } = useAllotment();


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

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: 35,
        theme: 'grid',
        headStyles: {
            fillColor: [22, 163, 74], // green-600
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
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
        // e.g., setInvigilators(result.optimizedAllotment.invigilators)
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

  const dutiesPerExam = examinations.map(exam => {
    return invigilators.reduce((count, invigilator) => {
        const duties = allotmentResult.assignments[invigilator.id] || [];
        return count + (duties.includes(exam.id) ? 1 : 0);
    }, 0);
  });
  const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

  return (
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
                  <TableHead key={exam.id} className="text-center whitespace-nowrap -rotate-90" style={{ writingMode: 'vertical-rl' }}>
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
                          <TableCell key={exam.id} className="text-center">
                            {hasDuty ? 1 : 0}
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
                    <TableCell colSpan={3} className="text-right text-primary">No of Rooms/Invigilators</TableCell>
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
                <TableRow className="bg-accent/20 font-bold">
                    <TableCell colSpan={3} className="text-right">Total Duties Allotted</TableCell>
                    {dutiesPerExam.map((count, index) => (
                        <TableCell key={`total-duties-${examinations[index].id}`} className="text-center">{count}</TableCell>
                    ))}
                    <TableCell className="text-center sticky right-0 bg-accent/20">{totalDutiesAllotted}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
         <Button variant="outline" onClick={handleOptimize}>
          <Sparkles className="mr-2" />
          Optimize
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2" />
          Download as PDF
        </Button>
        <Button onClick={handleEmailAll}>
          <Send className="mr-2" />
          Email All Summaries
        </Button>
      </CardFooter>
    </Card>
  );
}
