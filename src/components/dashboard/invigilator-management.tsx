"use client";

import React, { useRef, useState, useMemo } from 'react';
import type { Invigilator } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  UserPlus, 
  ArrowLeft, 
  Trash2, 
  Sparkles, 
  ArrowRight,
  Users,
  User,
  Mail,
  Phone,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { SetAvailabilityDialog } from './set-availability-dialog';
import { useAllotment } from '@/lib/allotment-context';
import { generateAllotment } from '@/lib/allotment';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const invigilatorSchema = z.object({
  name: z.string().min(1, "Name is required."),
  designation: z.string().min(1, "Designation is required."),
  mobile: z.string().regex(/^\d{10}$/, "Must be a 10-digit number."),
  email: z.string().email("Invalid email address."),
});

export function InvigilatorManagement() {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const [selectedInvigilator, setSelectedInvigilator] = useState<Invigilator | null>(null);
    const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);

    const { invigilators, setInvigilators, examinations, saveCurrentAllotment } = useAllotment();

    const form = useForm<z.infer<typeof invigilatorSchema>>({
        resolver: zodResolver(invigilatorSchema),
        defaultValues: { name: '', designation: '', mobile: '', email: '' },
    });

    const totalDutiesNeeded = useMemo(() => 
        examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0), 
        [examinations]
    );

    const availableAllDaysCount = useMemo(() => 
        invigilators.filter(i => i.isAvailableAllDays).length, 
        [invigilators]
    );

    const customAvailabilityCount = useMemo(() => 
        invigilators.filter(i => !i.isAvailableAllDays && i.availableExamIds && i.availableExamIds.length > 0).length, 
        [invigilators]
    );

    function onSubmit(values: z.infer<typeof invigilatorSchema>) {
        const newInvigilator: Invigilator = {
            id: `inv-${Date.now()}`,
            ...values,
            isAvailableAllDays: true,
            availableExamIds: [],
        };
        setInvigilators(prev => [...prev, newInvigilator]);
        toast({ title: "Invigilator Added", description: `${values.name} has been added to the list.` });
        form.reset();
    }

    const handleBulkUploadClick = () => {
        fileInputRef.current?.click();
    };

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

                const newInvigilators: Invigilator[] = json.map((row: any, index) => ({
                    id: `inv-bulk-${Date.now()}-${index}`,
                    name: String(getColumnValue(row, ["Name", "Invigilator's Name"]) || ''),
                    designation: String(getColumnValue(row, ["Designation"]) || ''),
                    mobile: String(getColumnValue(row, ["Mobile", "Mobile No"]) || '').replace(/\D/g, ''),
                    email: String(getColumnValue(row, ["E-Mail ID", "Email", "E-Mail"]) || ''),
                    isAvailableAllDays: true,
                    availableExamIds: [],
                })).filter(inv => inv.name && inv.email);

                if (newInvigilators.length > 0) {
                    setInvigilators(prev => [...prev, ...newInvigilators]);
                    toast({
                        title: "Bulk Import Successful",
                        description: `${newInvigilators.length} invigilators have been added.`,
                    });
                } else {
                    throw new Error("No valid invigilator data found in the file.");
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

    const handleOpenAvailabilityDialog = (invigilator: Invigilator) => {
        setSelectedInvigilator(invigilator);
        setIsAvailabilityDialogOpen(true);
    };

    const handleSaveAvailability = (invigilatorId: string, availability: { isAvailableAllDays: boolean, availableExamIds: string[] }) => {
        setInvigilators(prev =>
            prev.map(inv => {
                if (inv.id === invigilatorId) {
                    return { ...inv, ...availability };
                }
                return inv;
            })
        );
        toast({ title: "Availability Saved", description: `Availability for ${selectedInvigilator?.name} has been updated.` });
    };

    const handleGenerate = () => {
        if (invigilators.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Invigilators Added',
                description: 'Please add at least one invigilator before proceeding.',
            });
            return;
        }
        if (examinations.length === 0) {
            toast({
                variant: "destructive",
                title: "No Examinations Added",
                description: "Please go back and add examinations before proceeding.",
            });
            return;
        }

        router.push(`/dashboard/allotment`);
    };

    const handleDelete = (id: string) => {
        setInvigilators(prev => prev.filter(inv => inv.id !== id));
        toast({
            title: "Invigilator Removed",
            variant: "destructive"
        });
    };

    return (
        <div className="space-y-8">
            {/* Add Invigilator Card */}
            <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] to-[#0891B2]" />
                
                <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="font-headline text-xl font-bold tracking-tight">Invigilator Details</CardTitle>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-6 pt-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {/* Invigilator Name */}
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                            Invigilator&apos;s Name
                                        </FormLabel>
                                        <div className="relative mt-1">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-[#4F46E5]" />
                                            <FormControl>
                                                <Input 
                                                    placeholder="e.g. Lokesh D" 
                                                    {...field} 
                                                    className="pl-9 bg-muted/30 focus-visible:bg-background border-border/80 focus-visible:border-[#4F46E5] rounded-lg h-10 transition-colors" 
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}/>

                                {/* Designation/Department */}
                                <FormField control={form.control} name="designation" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                            Designation/Department
                                        </FormLabel>
                                        <div className="relative mt-1">
                                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-[#0891B2]" />
                                            <FormControl>
                                                <Input 
                                                    placeholder="e.g. Lecturer in English" 
                                                    {...field} 
                                                    className="pl-9 bg-muted/30 focus-visible:bg-background border-border/80 focus-visible:border-[#0891B2] rounded-lg h-10 transition-colors" 
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}/>

                                {/* Mobile No */}
                                <FormField control={form.control} name="mobile" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                            Mobile No
                                        </FormLabel>
                                        <div className="relative mt-1">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-[#F59E0B]" />
                                            <FormControl>
                                                <Input 
                                                    placeholder="e.g. 9876543210" 
                                                    {...field} 
                                                    className="pl-9 bg-muted/30 focus-visible:bg-background border-border/80 focus-visible:border-[#F59E0B] rounded-lg h-10 transition-colors" 
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}/>

                                {/* Email ID */}
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                            E-Mail ID
                                        </FormLabel>
                                        <div className="relative mt-1">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                            <FormControl>
                                                <Input 
                                                    placeholder="e.g. lokesh@gmail.com" 
                                                    {...field} 
                                                    className="pl-9 bg-muted/30 focus-visible:bg-background border-border/80 focus-visible:border-[#4F46E5] rounded-lg h-10 transition-colors" 
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>

                            {/* Actions Bar */}
                            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border/60">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".xlsx, .xls, .csv"
                                />
                                <Button 
                                    type="submit" 
                                    className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold shadow-sm rounded-lg transition-all"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Invigilator
                                </Button>
                                <span className="text-xs uppercase font-medium text-muted-foreground px-1">or</span>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleBulkUploadClick} 
                                    className="border-[#0891B2]/40 text-[#0891B2] hover:bg-[#0891B2]/10 dark:text-cyan-400 font-semibold rounded-lg shadow-sm"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Import from Excel
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Invigilators Roster Table Card */}
            <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#0891B2] via-[#4F46E5] to-[#F59E0B]" />
                
                <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-[#0891B2] dark:text-cyan-300">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="font-headline text-xl font-bold tracking-tight">Added Invigilators</CardTitle>
                            </div>
                        </div>

                        {invigilators.length > 0 && (
                            <Badge className="w-fit bg-[#4F46E5]/10 text-[#4F46E5] dark:text-indigo-300 border-[#4F46E5]/30 px-3 py-1 font-semibold rounded-full text-xs">
                                {invigilators.length} {invigilators.length === 1 ? 'Staff Member' : 'Staff Members'}
                            </Badge>
                        )}
                    </div>

                    {/* Summary Metric Cards */}
                    {invigilators.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                            <div className="bg-muted/40 dark:bg-slate-900/60 border border-border/60 dark:border-slate-800 rounded-lg p-3 text-center">
                                <div className="text-xs font-medium text-muted-foreground">Total Registered</div>
                                <div className="text-xl font-bold text-[#4F46E5] dark:text-indigo-400 mt-0.5">{invigilators.length}</div>
                            </div>
                            <div className="bg-muted/40 dark:bg-slate-900/60 border border-border/60 dark:border-slate-800 rounded-lg p-3 text-center">
                                <div className="text-xs font-medium text-muted-foreground">Available All Days</div>
                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{availableAllDaysCount}</div>
                            </div>
                            <div className="bg-muted/40 dark:bg-slate-900/60 border border-border/60 dark:border-slate-800 rounded-lg p-3 text-center">
                                <div className="text-xs font-medium text-muted-foreground">Partial Availability</div>
                                <div className="text-xl font-bold text-[#0891B2] dark:text-cyan-400 mt-0.5">{customAvailabilityCount}</div>
                            </div>
                            <div className="bg-muted/40 dark:bg-slate-900/60 border border-border/60 dark:border-slate-800 rounded-lg p-3 text-center">
                                <div className="text-xs font-medium text-muted-foreground">Total Duties Needed</div>
                                <div className="text-xl font-bold text-[#F59E0B] dark:text-amber-400 mt-0.5">{totalDutiesNeeded}</div>
                            </div>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="px-6 pb-6 pt-2">
                    <div className="rounded-xl border border-border/70 dark:border-slate-800 overflow-hidden shadow-xs">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 dark:bg-slate-900/80 hover:bg-muted/50 dark:hover:bg-slate-900/80 border-b border-border/70 dark:border-slate-800">
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground w-12">#</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Invigilator & Designation</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Mobile No</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">E-Mail Address</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Availability Status</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-right w-20">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invigilators.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="p-3 rounded-full bg-muted dark:bg-slate-800 text-muted-foreground/60">
                                                    <Users className="h-6 w-6" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-foreground dark:text-slate-100">No invigilators registered yet</p>
                                                    <p className="text-xs text-muted-foreground">Add staff members above or import an Excel spreadsheet.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    invigilators.map((inv, index) => {
                                        const isAllDays = inv.isAvailableAllDays;
                                        const specificDaysCount = inv.availableExamIds?.length || 0;
                                        
                                        return (
                                            <TableRow 
                                                key={inv.id}
                                                className={cn(
                                                    "transition-colors hover:bg-muted/40 dark:hover:bg-slate-800/40",
                                                    index % 2 === 1 && "bg-muted/15 dark:bg-slate-900/40"
                                                )}
                                            >
                                                <TableCell className="font-medium text-xs text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-0.5">
                                                        <div className="font-semibold text-sm text-foreground dark:text-slate-100">{inv.name}</div>
                                                        <div className="text-xs text-muted-foreground dark:text-slate-400 flex items-center gap-1.5">
                                                            <span>{inv.designation}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground dark:text-slate-300 font-medium">
                                                        <Phone className="h-3 w-3 text-[#F59E0B] dark:text-amber-400" />
                                                        <span>{inv.mobile || '—'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground dark:text-slate-300">
                                                        <Mail className="h-3 w-3 text-[#0891B2] dark:text-cyan-400" />
                                                        <span className="truncate max-w-[200px]" title={inv.email}>{inv.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className={cn(
                                                            "h-7 text-xs font-semibold px-3 rounded-full transition-all flex items-center gap-1.5 mx-auto",
                                                            isAllDays 
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30" 
                                                                : specificDaysCount > 0 
                                                                    ? "bg-[#0891B2]/10 text-[#0891B2] dark:text-cyan-400 hover:bg-[#0891B2]/20 border border-[#0891B2]/30"
                                                                    : "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30"
                                                        )}
                                                        onClick={() => handleOpenAvailabilityDialog(inv)}
                                                        title="Click to modify availability"
                                                    >
                                                        <CalendarClock className="h-3.5 w-3.5" />
                                                        <span>
                                                            {isAllDays ? 'All Days' : specificDaysCount > 0 ? `${specificDaysCount} Day(s)` : 'Not Available'}
                                                        </span>
                                                        <SlidersHorizontal className="h-3 w-3 opacity-60 ml-0.5" />
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(inv.id)}
                                                        title="Remove invigilator"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                            {invigilators.length > 0 && (
                                <TableFooter className="bg-muted/60 border-t-2 border-border font-medium">
                                    <TableRow>
                                        <TableCell colSpan={3} className="font-bold text-xs uppercase tracking-wider text-foreground">
                                            Roster Summary
                                        </TableCell>
                                        <TableCell colSpan={2} className="text-center font-bold text-xs text-[#4F46E5]">
                                            {availableAllDaysCount} Full Time • {customAvailabilityCount} Partial
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                            {invigilators.length} Total
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                </CardContent>

                <CardFooter className="justify-between px-6 py-4 bg-muted/10 border-t border-border/60">
                    <Button 
                        onClick={() => router.push('/dashboard/examinations')} 
                        variant="ghost" 
                        className="text-muted-foreground hover:text-foreground font-semibold rounded-lg"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Examinations
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        size="lg"
                        className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold shadow-sm rounded-lg px-6 transition-all flex items-center gap-2"
                    >
                        <span>Generate Duty Allotment</span>
                        <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                    </Button>
                </CardFooter>
            </Card>

            <SetAvailabilityDialog
                isOpen={isAvailabilityDialogOpen}
                onClose={() => setIsAvailabilityDialogOpen(false)}
                invigilator={selectedInvigilator}
                onSave={handleSaveAvailability}
                examinations={examinations}
            />
        </div>
    );
}
