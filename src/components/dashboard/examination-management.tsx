
"use client";

import React, { useMemo, useRef, useState } from 'react';
import type { Examination } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { cn, formatTimeTo12Hour } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Upload, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { useAllotment } from '@/lib/allotment-context';

const examSessionSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  startTimeHour: z.string().min(1),
  startTimeMinute: z.string().min(1),
  startTimePeriod: z.string().min(1),
  endTimeHour: z.string().min(1),
  endTimeMinute: z.string().min(1),
  endTimePeriod: z.string().min(1),
  rooms: z.coerce.number().min(1, "At least one room is required."),
  relievers: z.coerce.number().min(0),
});

const examinationSchema = z.object({
  college: z.string().min(1, "College name is required."),
  examName: z.string().min(1, "Examination name is required."),
  date: z.date({ required_error: "A date is required." }),
});

const getColumnValue = (row: any, keys: string[]): any => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/gi, '');
        const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/gi, '') === lowerKey);
        if (foundKey && row[foundKey] !== null && row[foundKey] !== undefined) {
            return row[foundKey];
        }
    }
    return null;
};

const excelSerialDateToJSDate = (serial: number) => {
    return new Date(Date.UTC(0, 0, serial - 1));
};

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

export function ExaminationManagement() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { examinations, setExaminations } = useAllotment();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [sessionDetails, setSessionDetails] = useState({
    subject: '',
    startTimeHour: '09',
    startTimeMinute: '00',
    startTimePeriod: 'AM',
    endTimeHour: '12',
    endTimeMinute: '00',
    endTimePeriod: 'PM',
    rooms: 1,
    relievers: 0,
  });

  const form = useForm<z.infer<typeof examinationSchema>>({
    resolver: zodResolver(examinationSchema),
    defaultValues: {
      college: '',
      examName: '',
    },
  });
  
  const totalRooms = useMemo(() => examinations.reduce((acc, exam) => acc + exam.rooms, 0), [examinations]);
  const totalRelievers = useMemo(() => examinations.reduce((acc, exam) => acc + exam.relievers, 0), [examinations]);

  const formatTime = (hour: string, minute: string, period: string) => {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
  }

  function onAddExamination() {
    const examinationData = form.getValues();
    const validation = examinationSchema.safeParse(examinationData);
    const sessionValidation = examSessionSchema.safeParse({ ...sessionDetails, subject: sessionDetails.subject || 'None', rooms: Number(sessionDetails.rooms), relievers: Number(sessionDetails.relievers) });

    if (!validation.success || !sessionValidation.success) {
      if (!validation.success) {
        validation.error.errors.forEach(err => {
          form.setError(err.path[0] as keyof z.infer<typeof examinationSchema>, { message: err.message });
        });
      }
      if (!sessionValidation.success) {
         toast({ title: "Session Details Invalid", description: sessionValidation.error.errors[0].message, variant: "destructive" });
      }
      return;
    }
    
    const newExamination: Examination = {
      id: `exam-${Date.now()}`,
      college: examinationData.college,
      examName: examinationData.examName,
      date: examinationData.date,
      subject: sessionDetails.subject || 'None',
      startTime: formatTime(sessionDetails.startTimeHour, sessionDetails.startTimeMinute, sessionDetails.startTimePeriod),
      endTime: formatTime(sessionDetails.endTimeHour, sessionDetails.endTimeMinute, sessionDetails.endTimePeriod),
      rooms: Number(sessionDetails.rooms),
      relievers: Number(sessionDetails.relievers),
    };

    setExaminations(prev => [...prev, newExamination]);
    toast({ title: "Examination Added", description: `${sessionDetails.subject} on ${format(examinationData.date, "PPP")} has been added.` });
  }
  
  const handleDelete = (id: string) => {
    setExaminations(prev => prev.filter(exam => exam.id !== id));
    toast({ title: "Examination Removed", variant: "destructive" });
  }

  const handleBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            const newExams: Examination[] = json.map((row: any, index) => {
                let dateValue = getColumnValue(row, ['Date', 'date']);
                if(typeof dateValue === 'number') {
                    dateValue = excelSerialDateToJSDate(dateValue);
                } else if (typeof dateValue === 'string') {
                    dateValue = new Date(dateValue);
                } else if (!(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
                    dateValue = new Date();
                }
                
                const parseTimeTo24hr = (timeStr: string) => {
                  if (!timeStr) return '00:00';
                  const date = new Date(`01/01/1970 ${timeStr.replace(/\./g, ':')}`);
                  return isNaN(date.getTime()) ? '00:00' : format(date, 'HH:mm');
                }

                const timingsValue = getColumnValue(row, ['Timings', 'Time']);
                let startTime = '00:00';
                let endTime = '00:00';

                if (typeof timingsValue === 'string') {
                    const times = timingsValue.split('-').map(t => t.trim());
                    if (times.length === 2) {
                        startTime = parseTimeTo24hr(times[0]);
                        endTime = parseTimeTo24hr(times[1]);
                    }
                } else {
                    const startTimeRaw = getColumnValue(row, ['Start Time', 'startTime', 'start time']);
                    const endTimeRaw = getColumnValue(row, ['End Time', 'endTime', 'end time']);
                    if (startTimeRaw) startTime = parseTimeTo24hr(String(startTimeRaw));
                    if (endTimeRaw) endTime = parseTimeTo24hr(String(endTimeRaw));
                }

                return {
                    id: `exam-bulk-${Date.now()}-${index}`,
                    examName: String(getColumnValue(row, ['Examination Name', 'examName', 'exam name']) || form.getValues('examName') || 'Imported Exam'),
                    college: String(getColumnValue(row, ['College Name', 'collegeName', 'college name']) || form.getValues('college') || 'Imported College'),
                    subject: String(getColumnValue(row, ['Subject', 'subject']) || 'None'),
                    date: dateValue,
                    startTime: startTime,
                    endTime: endTime,
                    rooms: Number(getColumnValue(row, ['Number of Rooms', 'No of Rooms', 'rooms', 'No. of Rooms Alloted']) || 1),
                    relievers: Number(getColumnValue(row, ['Number of Relievers', 'No of Relievers', 'relievers', 'Relievers Required']) || 0),
                };
            }).filter(exam => exam.subject && exam.date && !isNaN(exam.date.getTime()));

            if (newExams.length > 0) {
                setExaminations(prev => [...prev, ...newExams]);
                toast({
                    title: "Bulk Import Successful",
                    description: `${newExams.length} examinations have been added.`,
                });
            } else {
                throw new Error("No valid examination data found in the file.");
            }
        } catch (error: any) {
            console.error("Error processing Excel file:", error);
            toast({
                variant: "destructive",
                title: "Import Failed",
                description: error.message || "Could not parse the Excel file.",
            });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleSessionDetailChange = (field: keyof typeof sessionDetails, value: string | number) => {
    setSessionDetails(prev => ({...prev, [field]: value}));
  }

  const handleContinue = () => {
    if (examinations.length > 0) {
      router.push(`/dashboard/invigilators`);
    } else {
      toast({
        variant: "destructive",
        title: "No Examinations",
        description: "Please add at least one examination to continue.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-black dark:text-white font-extrabold text-2xl">Examination Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="college" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name of the College</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Seshadripuram College" {...field} className="bg-blue-50/50 dark:bg-slate-800/50 border-primary dark:border-slate-700" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="examName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name of the Examination</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Annual Examination, March 2025" className="bg-blue-50/50 dark:bg-slate-800/50 border-primary dark:border-slate-700" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <Card className="border-l-4 border-l-blue-500 shadow-md mt-6">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-black dark:text-white font-extrabold">Session Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="md:col-span-2">
                             <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date for Session</FormLabel>
                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal bg-blue-50/50 dark:bg-slate-800/50 border-primary dark:border-slate-700", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : <span>Select a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50 text-primary" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar 
                                                mode="single" 
                                                selected={field.value} 
                                                onSelect={(date) => {
                                                    field.onChange(date);
                                                    setIsCalendarOpen(false);
                                                }} 
                                                initialFocus 
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        
                        <div className="md:col-span-2" />

                        <div className="md:col-span-2">
                           <Label>Subject</Label>
                           <Input 
                              placeholder="Type or select a subject..." 
                              value={sessionDetails.subject} 
                              onChange={(e) => handleSessionDetailChange('subject', e.target.value)}
                              list="subject-options"
                              className="bg-blue-50/50 dark:bg-slate-800/50 border-primary dark:border-slate-700"
                           />
                           <datalist id="subject-options">
                              <option value="Accountancy" />
                              <option value="Basic Mathematics" />
                              <option value="Biology" />
                              <option value="Business Studies" />
                              <option value="Chemistry" />
                              <option value="Computer Science" />
                              <option value="Economics" />
                              <option value="Electronics" />
                              <option value="English" />
                              <option value="Geography" />
                              <option value="Hindi" />
                              <option value="History" />
                              <option value="Home Science" />
                              <option value="Kannada" />
                              <option value="Logic" />
                              <option value="None" />
                              <option value="Political Science" />
                              <option value="Sanskrit" />
                              <option value="Sociology" />
                              <option value="Statistics" />
                           </datalist>
                        </div>
                        
                        <div>
                            <Label>No of Rooms</Label>
                             <Select value={sessionDetails.rooms.toString()} onValueChange={(value) => handleSessionDetailChange('rooms', parseInt(value, 10))}>
                                <SelectTrigger className="bg-blue-50/50 dark:bg-slate-800/50 border-primary dark:border-slate-700"><SelectValue/></SelectTrigger>
                                <SelectContent>{Array.from({ length: 50 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                           <Label>No of Relievers</Label>
                            <Select value={sessionDetails.relievers.toString()} onValueChange={(value) => handleSessionDetailChange('relievers', parseInt(value, 10))}>
                                <SelectTrigger className="bg-blue-50/50 dark:bg-slate-800/50 border-primary dark:border-slate-700"><SelectValue/></SelectTrigger>
                                <SelectContent>{Array.from({ length: 26 }, (_, i) => i).map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        
                        <div className="md:col-span-2">
                           <Label>Time</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <Select value={sessionDetails.startTimeHour} onValueChange={(v) => handleSessionDetailChange('startTimeHour', v)}><SelectTrigger className="bg-blue-50/50 border-primary dark:bg-slate-800/50 dark:border-slate-700"><SelectValue/></SelectTrigger><SelectContent>{hours.map(h => <SelectItem key={`st-h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                                <Select value={sessionDetails.startTimeMinute} onValueChange={(v) => handleSessionDetailChange('startTimeMinute', v)}><SelectTrigger className="bg-blue-50/50 border-primary dark:bg-slate-800/50 dark:border-slate-700"><SelectValue/></SelectTrigger><SelectContent>{minutes.map(m => <SelectItem key={`st-m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                                <Select value={sessionDetails.startTimePeriod} onValueChange={(v) => handleSessionDetailChange('startTimePeriod', v)}><SelectTrigger className="bg-blue-50/50 border-primary dark:bg-slate-800/50 dark:border-slate-700"><SelectValue/></SelectTrigger><SelectContent>{periods.map(p => <SelectItem key={`st-p-${p}`} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                <Select value={sessionDetails.endTimeHour} onValueChange={(v) => handleSessionDetailChange('endTimeHour', v)}><SelectTrigger className="bg-blue-50/50 border-primary dark:bg-slate-800/50 dark:border-slate-700"><SelectValue/></SelectTrigger><SelectContent>{hours.map(h => <SelectItem key={`et-h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                                <Select value={sessionDetails.endTimeMinute} onValueChange={(v) => handleSessionDetailChange('endTimeMinute', v)}><SelectTrigger className="bg-blue-50/50 border-primary dark:bg-slate-800/50 dark:border-slate-700"><SelectValue/></SelectTrigger><SelectContent>{minutes.map(m => <SelectItem key={`et-m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                                <Select value={sessionDetails.endTimePeriod} onValueChange={(v) => handleSessionDetailChange('endTimePeriod', v)}><SelectTrigger className="bg-blue-50/50 border-primary dark:bg-slate-800/50 dark:border-slate-700"><SelectValue/></SelectTrigger><SelectContent>{periods.map(p => <SelectItem key={`et-p-${p}`} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                    </div>
                     <div className="flex justify-end items-center pt-4 gap-4">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                        <Button 
                            type="button" 
                            onClick={handleBulkUploadClick} 
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md hover:opacity-90 font-bold"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Import from Excel
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground">or</span>
                        <Button type="button" onClick={onAddExamination} className="bg-primary text-white shadow-md hover:bg-primary/90 font-bold">+ Add Examination</Button>
                    </div>
                </CardContent>
              </Card>

            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-black dark:text-white font-extrabold">Added Examinations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800">
                      <TableHead className="font-bold text-primary">Sl.No</TableHead>
                      <TableHead className="font-bold text-primary">Date</TableHead>
                      <TableHead className="font-bold text-primary">Day</TableHead>
                      <TableHead className="font-bold text-primary">Subject</TableHead>
                      <TableHead className="font-bold text-primary">Timings</TableHead>
                      <TableHead className="font-bold text-primary">No of Rooms</TableHead>
                      <TableHead className="font-bold text-primary">No of Relievers</TableHead>
                      <TableHead className="text-right font-bold text-primary">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {examinations.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No examinations added yet.</TableCell></TableRow>
                  ) : (
                      examinations.map((exam, index) => (
                          <TableRow 
                            key={exam.id}
                            className={cn(
                                "transition-colors hover:bg-blue-100/50",
                                index % 2 === 0 ? "bg-blue-50/40" : "bg-slate-50/60"
                            )}
                          >
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{format(exam.date, "dd/MM/yyyy")}</TableCell>
                              <TableCell>{format(exam.date, "EEEE")}</TableCell>
                              <TableCell className="font-bold text-slate-800 dark:text-slate-200">{exam.subject}</TableCell>
                              <TableCell>{formatTimeTo12Hour(exam.startTime)} - {formatTimeTo12Hour(exam.endTime)}</TableCell>
                              <TableCell className="font-medium">{exam.rooms}</TableCell>
                              <TableCell className="font-medium">{exam.relievers}</TableCell>
                              <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                              </TableCell>
                          </TableRow>
                      ))
                  )}
              </TableBody>
              {examinations.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-blue-100/30">
                    <TableCell colSpan={5} className="text-right font-black text-primary uppercase">Total Requirements</TableCell>
                    <TableCell className="font-black text-primary text-lg">{totalRooms}</TableCell>
                    <TableCell className="font-black text-primary text-lg">{totalRelievers}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
          </Table>
        </CardContent>
        <CardFooter className="justify-end pt-6 border-t">
            <Button type="button" size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:opacity-90 font-bold" onClick={handleContinue}>
                Continue to Invigilator Details
                <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
