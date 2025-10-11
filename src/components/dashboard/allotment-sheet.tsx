"use client";

import { useState, useMemo } from 'react';
import type { Invigilator, Examination } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Download, Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
};

type AllotmentState = Record<string, Record<string, boolean>>;

export function AllotmentSheet({ invigilators, examinations }: AllotmentSheetProps) {
  const { toast } = useToast();
  const [allotment, setAllotment] = useState<AllotmentState>(() => {
    const initialState: AllotmentState = {};
    invigilators.forEach(inv => {
      initialState[inv.id] = {};
      examinations.forEach(exam => {
        initialState[inv.id][exam.id] = false;
      });
    });
    return initialState;
  });

  const handleToggle = (invigilatorId: string, examId: string) => {
    setAllotment(prev => ({
      ...prev,
      [invigilatorId]: {
        ...prev[invigilatorId],
        [examId]: !prev[invigilatorId][examId],
      },
    }));
  };

  const invigilatorTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    invigilators.forEach(inv => {
      totals[inv.id] = examinations.reduce((acc, exam) => acc + (allotment[inv.id][exam.id] ? 1 : 0), 0);
    });
    return totals;
  }, [allotment, invigilators, examinations]);

  const examTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    examinations.forEach(exam => {
      totals[exam.id] = invigilators.reduce((acc, inv) => acc + (allotment[inv.id][exam.id] ? 1 : 0), 0);
    });
    return totals;
  }, [allotment, invigilators, examinations]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duty Allotment Sheet</CardTitle>
        <CardDescription>Toggle the switches to assign duties. Totals are calculated automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 w-48">Invigilator</TableHead>
                {examinations.map(exam => (
                  <TableHead key={exam.id} className="text-center">
                    {exam.subject}<br />
                    <span className="text-xs font-normal text-muted-foreground">{exam.date.toLocaleDateString()}</span>
                  </TableHead>
                ))}
                <TableHead className="text-center sticky right-0 bg-card z-10">Total Duties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invigilators.map(invigilator => (
                <TableRow key={invigilator.id}>
                  <TableCell className="font-medium sticky left-0 bg-card z-10">{invigilator.name}</TableCell>
                  {examinations.map(exam => (
                    <TableCell key={exam.id} className="text-center">
                      <Switch
                        checked={allotment[invigilator.id][exam.id]}
                        onCheckedChange={() => handleToggle(invigilator.id, exam.id)}
                        aria-label={`Assign ${invigilator.name} to ${exam.subject}`}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="font-bold text-center sticky right-0 bg-card z-10">{invigilatorTotals[invigilator.id]}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead className="sticky left-0 bg-secondary z-10">Invigilators Required</TableHead>
                {examinations.map(exam => (
                  <TableHead key={exam.id} className="text-center">{exam.relievers + exam.rooms}</TableHead>
                ))}
                <TableHead className="sticky right-0 bg-secondary z-10"></TableHead>
              </TableRow>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead className="sticky left-0 bg-secondary z-10">Total Assigned</TableHead>
                {examinations.map(exam => (
                  <TableHead
                    key={exam.id}
                    className={`text-center font-bold ${examTotals[exam.id] !== (exam.relievers + exam.rooms) ? 'text-destructive' : 'text-accent-foreground'}`}
                  >
                    {examTotals[exam.id]}
                  </TableHead>
                ))}
                <TableHead className="sticky right-0 bg-secondary z-10"></TableHead>
              </TableRow>
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
