"use client";

import type { Invigilator, Examination } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AllotmentResult } from '@/lib/allotment';
import { format } from 'date-fns';

type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
};

export function AllotmentSheet({ invigilators, examinations, allotmentResult }: AllotmentSheetProps) {
  const { toast } = useToast();

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
                return (
                  <TableRow key={invigilator.id}>
                    <TableCell className="sticky left-0 bg-card z-10">{index + 1}</TableCell>
                    <TableCell className="font-medium sticky left-12 bg-card z-10">{invigilator.name}</TableCell>
                    <TableCell>{invigilator.designation}</TableCell>
                    {examinations.map(exam => {
                       const dutyCount = duties.filter(dutyId => dutyId === exam.id).length;
                       return (
                          <TableCell key={exam.id} className="text-center">
                            {dutyCount > 0 ? <span className="inline-block bg-primary/10 text-primary font-bold rounded-full h-6 w-6 text-center leading-6">{dutyCount}</span> : 0}
                          </TableCell>
                       )
                    })}
                    <TableCell className="font-bold text-center sticky right-0 bg-card z-10">{duties.length}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
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
