"use client";

import React, { useRef, useState, useMemo } from 'react';
import type { Invigilator } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
    Plus,
    BookUser
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { SetAvailabilityDialog } from './set-availability-dialog';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { uploadUserFile } from '@/lib/storage-service';
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
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const [selectedInvigilator, setSelectedInvigilator] = useState<Invigilator | null>(null);
    const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
    const [isClearAllAlertOpen, setIsClearAllAlertOpen] = useState(false);
    const [isClearAllTableAlertOpen, setIsClearAllTableAlertOpen] = useState(false);

    const { invigilators, setInvigilators, examinations, saveCurrentAllotment, directoryInvigilators } = useAllotment();

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

    const handleAddFromDirectory = () => {
        if (!directoryInvigilators || directoryInvigilators.length === 0) {
            toast({
                variant: "destructive",
                title: "Directory is Empty",
                description: "No invigilators found in your directory. Please add faculty in the Invigilator Directory first.",
            });
            return;
        }

        // Deduplicate against faculty members already in the active list by Name (case-insensitive)
        const existingNames = new Set(
            invigilators.map(i => i.name.toLowerCase().trim()).filter(Boolean)
        );

        const newFromDirectory: Invigilator[] = [];
        let duplicateCount = 0;

        directoryInvigilators.forEach((dirItem, index) => {
            const cleanName = dirItem.name ? dirItem.name.toLowerCase().trim() : '';
            if (!cleanName) return;

            if (existingNames.has(cleanName)) {
                duplicateCount++;
            } else {
                newFromDirectory.push({
                    id: `inv-dir-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
                    name: dirItem.name.trim(),
                    designation: dirItem.designation ? dirItem.designation.trim() : '',
                    mobile: dirItem.mobile ? dirItem.mobile.trim() : '',
                    email: dirItem.email ? dirItem.email.trim() : '',
                    isAvailableAllDays: true,
                    availableExamIds: [],
                });
                existingNames.add(cleanName);
            }
        });

        if (newFromDirectory.length === 0) {
            toast({
                title: "Already in List",
                description: "All invigilators from your directory are already present in the active list.",
            });
            return;
        }

        setInvigilators(prev => [...prev, ...newFromDirectory]);
        toast({
            title: "Added from Directory",
            description: `${newFromDirectory.length} ${newFromDirectory.length === 1 ? 'invigilator' : 'invigilators'} added from your directory${duplicateCount > 0 ? ` (${duplicateCount} already present skipped)` : ''}.`,
        });
    };

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

                const newInvigilators: Invigilator[] = json.map((row: any, index) => {
                    const name = String(getColumnValue(row, ["Name", "Invigilator's Name", "Invigilator Name", "Faculty Name", "Staff Name", "Faculty"]) || '').trim();
                    const designation = String(getColumnValue(row, ["Designation", "Department", "Designation/Department", "Designation / Department", "Dept"]) || '').trim();
                    const rawMobile = String(getColumnValue(row, ["Mobile", "Mobile No", "Phone", "Contact", "Phone No", "Contact No"]) || '').replace(/\D/g, '').trim();
                    const rawEmail = String(getColumnValue(row, ["E-Mail ID", "Email", "E-Mail", "Email ID", "Email Address"]) || '').trim();

                    return {
                        id: `inv-bulk-${Date.now()}-${index}`,
                        name,
                        designation: designation || 'Faculty',
                        mobile: rawMobile.length >= 10 ? rawMobile.slice(-10) : (rawMobile || '9000000000'),
                        email: rawEmail || `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || `faculty${index + 1}`}@institution.local`,
                        isAvailableAllDays: true,
                        availableExamIds: [],
                    };
                }).filter(inv => Boolean(inv.name));

                if (newInvigilators.length > 0) {
                    setInvigilators(prev => [...prev, ...newInvigilators]);

                    // Save uploaded Excel file to Supabase Storage per user
                    if (user?.id) {
                        uploadUserFile({
                            file,
                            fileName: file.name,
                            fileType: 'excel',
                            category: 'upload',
                            subCategory: 'invigilators',
                            userId: user.id,
                            metadata: {
                                invigilatorCount: newInvigilators.length,
                            },
                        }).then(({ error }) => {
                            if (!error) {
                                toast({
                                    title: "Cloud Backup Complete",
                                    description: `"${file.name}" was successfully saved to your Supabase storage.`,
                                });
                            }
                        });
                    }

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

    const handleClearAllInvigilators = () => {
        setInvigilators([]);
        form.reset({ name: '', designation: '', mobile: '', email: '' });
        setIsClearAllAlertOpen(false);
        setIsClearAllTableAlertOpen(false);
        toast({
            title: "All Invigilators Cleared",
            description: "All invigilator details have been removed.",
            variant: "destructive",
        });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">
                    Invigilator Management
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Add faculty members and configure invigilation availability
                </p>
            </div>

            {/* Add Invigilator Card */}
            <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

                <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-400">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div className="flex items-center gap-3">
                                <CardTitle className="font-headline text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                                    Invigilator Details
                                </CardTitle>
                            </div>
                        </div>

                        <AlertDialog open={isClearAllAlertOpen} onOpenChange={setIsClearAllAlertOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={invigilators.length === 0}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/50 font-medium text-xs rounded-xl shadow-2xs transition-all h-8 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                    Clear All Details
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                                        Clear All Invigilator Details?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                                        Are you sure you want to clear all {invigilators.length} added invigilator {invigilators.length === 1 ? 'record' : 'records'}? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-2 sm:gap-2">
                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleClearAllInvigilators}
                                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                    >
                                        Clear All Details
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-6 pt-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {/* Invigilator Name */}
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center gap-2 text-[#6342e8] dark:text-purple-400 text-xs font-semibold">
                                            <User className="h-4 w-4" />
                                            <span className="text-slate-700 dark:text-slate-300">Invigilator&apos;s Name</span>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Dr. Jane Doe"
                                                {...field}
                                                className="bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 focus-visible:border-[#6342e8] focus-visible:ring-[#6342e8]/20 transition-all rounded-xl h-10 font-medium text-sm text-foreground"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs mt-1" />
                                    </FormItem>
                                )} />

                                {/* Designation/Department */}
                                <FormField control={form.control} name="designation" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center gap-2 text-[#6342e8] dark:text-purple-400 text-xs font-semibold">
                                            <Briefcase className="h-4 w-4" />
                                            <span className="text-slate-700 dark:text-slate-300">Designation / Department</span>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Lecturer in English"
                                                {...field}
                                                className="bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 focus-visible:border-[#6342e8] focus-visible:ring-[#6342e8]/20 transition-all rounded-xl h-10 font-medium text-sm text-foreground"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs mt-1" />
                                    </FormItem>
                                )} />

                                {/* Mobile No */}
                                <FormField control={form.control} name="mobile" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center gap-2 text-[#6342e8] dark:text-purple-400 text-xs font-semibold">
                                            <Phone className="h-4 w-4" />
                                            <span className="text-slate-700 dark:text-slate-300">Mobile No</span>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. 9876543210"
                                                {...field}
                                                className="bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 focus-visible:border-[#6342e8] focus-visible:ring-[#6342e8]/20 transition-all rounded-xl h-10 font-medium text-sm text-foreground"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs mt-1" />
                                    </FormItem>
                                )} />

                                {/* Email ID */}
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <div className="flex items-center gap-2 text-[#6342e8] dark:text-purple-400 text-xs font-semibold">
                                            <Mail className="h-4 w-4" />
                                            <span className="text-slate-700 dark:text-slate-300">E-Mail ID</span>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. lokesh@gmail.com"
                                                {...field}
                                                className="bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 focus-visible:border-[#6342e8] focus-visible:ring-[#6342e8]/20 transition-all rounded-xl h-10 font-medium text-sm text-foreground"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs mt-1" />
                                    </FormItem>
                                )} />
                            </div>

                            {/* Actions Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
                                {/* Extreme Left: Add from Directory */}
                                <div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAddFromDirectory}
                                        className="border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-[#6342e8] dark:text-purple-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 font-semibold rounded-xl px-4 py-2.5 shadow-2xs transition-all text-sm flex items-center gap-2"
                                    >
                                        <BookUser className="h-4 w-4 text-[#6342e8] dark:text-purple-300" />
                                        <span>Add from Directory</span>
                                        {directoryInvigilators && directoryInvigilators.length > 0 && (
                                            <span className="ml-1 px-2 py-0.5 bg-[#6342e8] text-white text-[11px] font-bold rounded-full">
                                                {directoryInvigilators.length}
                                            </span>
                                        )}
                                    </Button>
                                </div>

                                {/* Right Group: Add Invigilator OR Import from Excel */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept=".xlsx, .xls, .csv"
                                    />
                                    <Button
                                        type="submit"
                                        className="bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold shadow-xs rounded-xl px-5 py-2.5 transition-all text-sm flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Add Invigilator</span>
                                    </Button>
                                    <span className="text-xs uppercase font-bold text-slate-400 px-1">OR</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBulkUploadClick}
                                        className="border border-purple-300 dark:border-purple-800 text-[#6342e8] dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100/70 font-semibold rounded-xl px-5 py-2.5 shadow-2xs transition-all text-sm flex items-center gap-2"
                                    >
                                        <Upload className="h-4 w-4" />
                                        <span>Import from Excel</span>
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Invigilators Roster Table Card */}
            <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-400">
                                <Users className="h-5 w-5" />
                            </div>
                            <div className="flex items-center gap-3">
                                <CardTitle className="font-headline text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                                    Added Invigilators
                                </CardTitle>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            {invigilators.length > 0 && (
                                <Badge className="w-fit bg-[#6342e8]/10 text-[#6342e8] dark:text-purple-300 border-[#6342e8]/20 px-3 py-1 font-semibold rounded-full text-xs">
                                    {invigilators.length} {invigilators.length === 1 ? 'Staff Member' : 'Staff Members'}
                                </Badge>
                            )}

                            <AlertDialog open={isClearAllTableAlertOpen} onOpenChange={setIsClearAllTableAlertOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={invigilators.length === 0}
                                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/50 font-medium text-xs rounded-xl shadow-2xs transition-all h-8 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        Clear All Details
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                                            Clear All Invigilator Details?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                                            Are you sure you want to clear all {invigilators.length} added invigilator {invigilators.length === 1 ? 'record' : 'records'}? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2 sm:gap-2">
                                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleClearAllInvigilators}
                                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                        >
                                            Clear All Details
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                    {/* Summary Metric Cards */}
                    {invigilators.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 text-center">
                                <div className="text-xs font-medium text-slate-500">Total Registered</div>
                                <div className="text-xl font-bold text-[#6342e8] mt-0.5">{invigilators.length}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 text-center">
                                <div className="text-xs font-medium text-slate-500">Available All Days</div>
                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{availableAllDaysCount}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 text-center">
                                <div className="text-xs font-medium text-slate-500">Partial Availability</div>
                                <div className="text-xl font-bold text-[#f59e0b] mt-0.5">{customAvailabilityCount}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 text-center">
                                <div className="text-xs font-medium text-slate-500">Total Duties Needed</div>
                                <div className="text-xl font-bold text-[#6342e8] mt-0.5">{totalDutiesNeeded}</div>
                            </div>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="px-6 pb-6 pt-2">
                    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#f8f9fc] dark:bg-slate-800/60 hover:bg-[#f8f9fc] border-b border-slate-200/80 dark:border-slate-800">
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 w-12">#</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Invigilator & Designation</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Mobile No</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">E-Mail Address</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Availability Status</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-20">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invigilators.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-[#6342e8] flex items-center justify-center mb-1">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No invigilators registered yet.</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Add staff members above or import an Excel spreadsheet.</p>
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
                                                    "transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40",
                                                    index % 2 === 1 && "bg-slate-50/30 dark:bg-slate-800/20"
                                                )}
                                            >
                                                <TableCell className="font-semibold text-xs text-slate-500">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-0.5">
                                                        <div className="font-semibold text-sm text-slate-900 dark:text-white">{inv.name}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                                            <span>{inv.designation}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                        <Phone className="h-3 w-3 text-[#f59e0b]" />
                                                        <span>{inv.mobile || '—'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                        <Mail className="h-3 w-3 text-[#6342e8]" />
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
                                                                    ? "bg-purple-500/10 text-[#6342e8] dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/30"
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
                                                        className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/10 rounded-lg"
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
                                <TableFooter className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 font-medium">
                                    <TableRow>
                                        <TableCell colSpan={3} className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Roster Summary
                                        </TableCell>
                                        <TableCell colSpan={2} className="text-center font-bold text-xs text-[#6342e8]">
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

                <CardFooter className="justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800">
                    <Button
                        onClick={() => router.push('/dashboard/examinations')}
                        variant="ghost"
                        className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold rounded-xl"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Examinations
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        size="lg"
                        className="bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold shadow-xs rounded-xl px-6 transition-all flex items-center gap-2"
                    >
                        <span>Generate Duty Allotment</span>
                        <Sparkles className="h-4 w-4 text-[#f59e0b]" />
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
