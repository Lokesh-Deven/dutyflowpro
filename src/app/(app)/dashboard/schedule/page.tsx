"use client"

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const scheduleData: { [key: string]: any[] } = {
  "2024-07-20": [
    { time: "09:00 - 12:00", subject: "Advanced Physics", rooms: 5 },
    { time: "14:00 - 17:00", subject: "Organic Chemistry", rooms: 3 },
  ],
  "2024-07-22": [
    { time: "10:00 - 13:00", subject: "Data Structures", rooms: 8 },
  ],
};

export default function SchedulePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const selectedDateString = date?.toISOString().split('T')[0];
  const dutiesForDay = selectedDateString ? scheduleData[selectedDateString] || [] : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Day-wise Schedule</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 flex justify-center items-start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="p-0"
            />
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              Duties for {date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dutiesForDay.length > 0 ? (
              <ul className="space-y-4">
                {dutiesForDay.map((duty, index) => (
                  <li key={index} className="flex items-center justify-between p-3 rounded-md bg-secondary">
                    <div>
                      <p className="font-semibold">{duty.subject}</p>
                      <p className="text-sm text-muted-foreground">{duty.time}</p>
                    </div>
                    <Badge variant="outline">Rooms: {duty.rooms}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-10">No duties scheduled for this day.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
