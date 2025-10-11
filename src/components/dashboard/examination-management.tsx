"use client";

import React, { Dispatch, SetStateAction } from 'react';
import type { Examination } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Upload, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const examSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  subject: z.string().min(1, "Subject is required."),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().min(1, "End time is required."),
  rooms: z.coerce.number().min(1, "At least one room is required."),
  relievers: z.coerce.number().min(0),
  college: z.string().min(1, "College name is required.").default("University of Excellence"),
  examName: z.string().min(1, "Examination name is required."),
});

type ExaminationManagementProps = {
  examinations: Examination[];
  setExaminations: Dispatch<SetStateAction<Examination[]>>;
  onGenerate: () => void;
};

export function ExaminationManagement({ setExaminations, onGenerate }: ExaminationManagementProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof examSchema>>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      subject: '', startTime: '09:00', endTime: '12:00', rooms: 1, relievers: 1, college: 'University of Excellence', examName: 'Final Examinations Spring 2024'
    },
  });

  function onSubmit(values: z.infer<typeof examSchema>) {
    const newExamination: Examination = {
      id: `exam-${Date.now()}`,
      ...values,
    };
    setExaminations(prev => [...prev, newExamination]);
    toast({ title: "Examination Added", description: `${values.subject} has been added to the list.` });
    form.reset();
  }
  
  const handleBulkUpload = () => {
    toast({
        title: "Bulk Upload",
        description: "This feature will allow uploading exams from an Excel file. (This is a demo action)",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Examination Details</CardTitle>
        <CardDescription>Add the details for each examination to be scheduled.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <FormField control={form.control} name="examName" render={({ field }) => (
              <FormItem><FormLabel>Examination Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="college" render={({ field }) => (
              <FormItem><FormLabel>College Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} placeholder="e.g. Advanced Calculus" /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem className="flex flex-col pt-2"><FormLabel className="mb-1.5">Date</FormLabel>
                <Popover><PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover><FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="startTime" render={({ field }) => (
              <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="endTime" render={({ field }) => (
              <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="rooms" render={({ field }) => (
              <FormItem><FormLabel>Number of Rooms</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="relievers" render={({ field }) => (
              <FormItem><FormLabel>Number of Relievers</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="md:col-span-2 lg:col-span-4 flex justify-between items-end gap-4 pt-4">
              <div className="flex gap-2">
                 <Button type="submit">Add Examination</Button>
                 <Button type="button" variant="outline" onClick={handleBulkUpload}>
                    <Upload className="mr-2" />
                    Bulk Add
                </Button>
              </div>
              <Button type="button" variant="default" className="bg-accent hover:bg-accent/90" onClick={onGenerate}>
                <Sparkles className="mr-2" />
                Generate Duty Allotment
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
