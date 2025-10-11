"use client";

import React, { Dispatch, SetStateAction, useRef } from 'react';
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
import * as XLSX from 'xlsx';

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

export function ExaminationManagement({ examinations, setExaminations, onGenerate }: ExaminationManagementProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  
  const handleBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const excelSerialDateToJSDate = (serial: number) => {
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const rows = json.slice(1);
            
            const newExams: Examination[] = rows.map((row: any, index) => {
                const [examName, college, subject, date, startTime, endTime, rooms, relievers] = row;
                
                let examDate;
                if (typeof date === 'number') {
                  examDate = excelSerialDateToJSDate(date);
                } else if (typeof date === 'string') {
                  examDate = new Date(date);
                } else {
                  examDate = new Date();
                }

                return {
                    id: `exam-bulk-${Date.now()}-${index}`,
                    examName: String(examName || ''),
                    college: String(college || ''),
                    subject: String(subject || ''),
                    date: examDate,
                    startTime: String(startTime || ''),
                    endTime: String(endTime || ''),
                    rooms: Number(rooms || 0),
                    relievers: Number(relievers || 0),
                };
            }).filter(exam => exam.subject && exam.examName);

            if (newExams.length > 0) {
                setExaminations(prev => [...prev, ...newExams]);
                toast({
                    title: "Bulk Import Successful",
                    description: `${newExams.length} examinations have been added.`,
                });
            } else {
                throw new Error("No valid examination data found in the file.");
            }
        } catch (error) {
            console.error("Error processing Excel file:", error);
            toast({
                variant: "destructive",
                title: "Import Failed",
                description: "Could not parse the Excel file. Please ensure it is in the correct format.",
            });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Examination Details</CardTitle>
        <CardDescription>Add the details for each examination to be scheduled. For bulk add, use an Excel file with columns: Examination Name, College Name, Subject, Date, Start Time, End Time, Number of Rooms, Number of Relievers.</CardDescription>
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
                 <Button type="button" variant="outline" onClick={handleBulkUploadClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Add
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".xlsx, .xls"
                />
              </div>
              <Button type="button" variant="default" className="bg-accent hover:bg-accent/90" onClick={onGenerate}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Duty Allotment
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
