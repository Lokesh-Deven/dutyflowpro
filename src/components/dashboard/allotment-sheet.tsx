"use client";

import type { Invigilator, Examination } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Send, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AllotmentResult } from '@/lib/allotment';
import { format } from 'date-fns';
import { useAllotment } from '@/lib/allotment-context';
import { optimizeDutyAssignments } from '@/ai/flows/optimize-duty-assignments';

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
      title: "Downloading Allotment Sheet",
      description: "Your download will begin shortly. (This is a demo action)",
    });
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
