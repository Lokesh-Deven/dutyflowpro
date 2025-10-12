"use client"

import { useState, useMemo } from "react";
import { useAllotment } from "@/lib/allotment-context";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function SchedulePage() {
  const { examinations } = useAllotment();
  const [date, setDate] = useState<Date | undefined>(new Date());

  const dutiesForDay = useMemo(() => {
    if (!date) return [];
    const selectedDateString = format(date, 'yyyy-MM-dd');
    return examinations.filter(exam => format(new Date(exam.date), 'yyyy-MM-dd') === selectedDateString);
  }, [date, examinations]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Day-wise Schedule</h1>
      <Card>
        <CardHeader>
            <CardTitle>Active Allotment Schedule</CardTitle>
            <CardDescription>Select a date to see the examinations scheduled for that day from your currently active allotment.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-1 flex justify-center items-start pt-4">
                    <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="p-0"
                    />
                </div>

                <div className="md:col-span-2">
                    <h3 className="font-semibold mb-4">
                    Duties for {date ? format(date, 'PPP') : '...'}
                    </h3>
                    {dutiesForDay.length > 0 ? (
                    <ul className="space-y-4">
                        {dutiesForDay.map((duty, index) => (
                        <li key={duty.id} className="flex items-center justify-between p-3 rounded-md bg-secondary">
                            <div>
                            <p className="font-semibold">{duty.subject}</p>
                            <p className="text-sm text-muted-foreground">{duty.startTime} - {duty.endTime}</p>
                            </div>
                            <Badge variant="outline">Rooms: {duty.rooms}</Badge>
                        </li>
                        ))}
                    </ul>
                    ) : (
                    <p className="text-center text-muted-foreground py-10">No duties scheduled for this day in the active allotment.</p>
                    )}
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
