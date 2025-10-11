"use client";

import { useState } from 'react';
import type { Invigilator, Examination } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type IndividualDashboardProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
};

export default function IndividualDashboard({ invigilators, examinations }: IndividualDashboardProps) {
  const { toast } = useToast();
  const [selectedInvigilatorId, setSelectedInvigilatorId] = useState<string | null>(invigilators.length > 0 ? invigilators[0].id : null);

  const selectedInvigilator = invigilators.find(inv => inv.id === selectedInvigilatorId);

  // This is mock data. In a real app, this would be derived from the allotment state.
  const assignedDuties = examinations.filter((_, index) => index % (invigilators.findIndex(i => i.id === selectedInvigilatorId) + 2) === 0);

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
      title: "Downloading Summary",
      description: `Preparing PDF for ${selectedInvigilator.name}. (This is a demo action)`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invigilator Duty Summary</CardTitle>
        <CardDescription>Select an invigilator to view their detailed duty summary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Select
          onValueChange={setSelectedInvigilatorId}
          defaultValue={selectedInvigilatorId ?? undefined}
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
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${selectedInvigilator.id}`} />
                <AvatarFallback>{selectedInvigilator.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-headline">{selectedInvigilator.name}</CardTitle>
                <CardDescription>{selectedInvigilator.designation}</CardDescription>
                <CardDescription>{selectedInvigilator.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">Assigned Duties ({assignedDuties.length})</h3>
              {assignedDuties.length > 0 ? (
                <ul className="space-y-2">
                  {assignedDuties.map(duty => (
                    <li key={duty.id} className="flex justify-between items-center p-3 rounded-md bg-background">
                      <div>
                        <p className="font-medium">{duty.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {duty.date.toLocaleDateString()} | {duty.startTime} - {duty.endTime}
                        </p>
                      </div>
                      <Badge variant="outline">{duty.examName}</Badge>
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
