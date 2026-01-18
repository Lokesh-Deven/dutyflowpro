
"use client";

import React, { useRef, useState, useEffect } from 'react';
import type { Invigilator } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, UserPlus, ArrowRight, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { SetAvailabilityDialog } from './set-availability-dialog';
import { useAllotment } from '@/lib/allotment-context';
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
    const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
    const [selectedInvigilator, setSelectedInvigilator] = useState<Invigilator | null>(null);

    const { invigilators, setInvigilators } = useAllotment();

    const form = useForm<z.infer<typeof invigilatorSchema>>({
        resolver: zodResolver(invigilatorSchema),
        defaultValues: { name: '', designation: '', mobile: '', email: '' },
    });

    function onSubmit(values: z.infer<typeof invigilatorSchema>) {
        const newInvigilator: Invigilator = {
            id: `inv-${Date.now()}`,
            ...values,
            availableDays: [],
            isPartTime: false,
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
                    isPartTime: false,
                    availableDays: [],
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

    const handleSaveAvailability = (invigilatorId: string, availableDays: string[]) => {
        setInvigilators(prev =>
            prev.map(inv => {
                const isPartTime = availableDays.length > 0 && availableDays.length < 7;
                if (inv.id === invigilatorId) {
                    return { ...inv, availableDays, isPartTime };
                }
                return inv;
            })
        );
        toast({ title: "Availability Saved", description: `Availability for ${selectedInvigilator?.name} has been updated.` });
    };

    const formatAvailableDays = (inv: Invigilator) => {
        if (!inv.isPartTime || !inv.availableDays || inv.availableDays.length === 0) return 'Full-Time';
        return inv.availableDays.map(day => day.substring(0, 3)).join(', ');
    }

    const handleContinue = () => {
        if (invigilators.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Invigilators Added',
                description: 'Please add at least one invigilator before proceeding.',
            });
            return;
        }
        router.push(`/dashboard/examinations`);
    };

    const handleDelete = (id: string) => {
        setInvigilators(prev => prev.filter(inv => inv.id !== id));
        toast({
            title: "Invigilator Removed",
            variant: "destructive"
        });
    };

    return (
        <>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-3xl font-extrabold text-black dark:text-white">Invigilators' Details</CardTitle>
                <CardDescription>Add all available invigilators.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Invigilator's Name</FormLabel><FormControl><Input placeholder="e.g. Lokesh D" {...field} className="bg-slate-100 dark:bg-slate-800" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="designation" render={({ field }) => (
                                <FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="e.g. Lecturer in English" {...field} className="bg-slate-100 dark:bg-slate-800" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="mobile" render={({ field }) => (
                                <FormItem><FormLabel>Mobile No</FormLabel><FormControl><Input placeholder="e.g. 9876543210" {...field} className="bg-slate-100 dark:bg-slate-800" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                               <FormItem><FormLabel>E-Mail ID</FormLabel><FormControl><Input placeholder="e.g. lokesh@example.com" {...field} className="bg-slate-100 dark:bg-slate-800" /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="flex items-center gap-4">
                           <Button type="submit"><UserPlus className="mr-2 h-4 w-4" /> Add Invigilator</Button>
                           <span className="text-sm text-muted-foreground">or</span>
                           <Button type="button" onClick={handleBulkUploadClick} className="text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
                                <Upload className="mr-2 h-4 w-4" />
                                Import from Excel
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".xlsx, .xls, .csv"
                            />
                        </div>
                    </form>
                </Form>

                <div className="mt-8">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">Sl. No</TableHead>
                                <TableHead>Invigilator's Name</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>E-Mail ID</TableHead>
                                <TableHead>Availability</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invigilators.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center h-24">No invigilators added yet.</TableCell></TableRow>
                            ) : (
                                invigilators.map((inv, index) => (
                                    <TableRow key={inv.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-medium">{inv.name}</TableCell>
                                        <TableCell>{inv.designation}</TableCell>
                                        <TableCell>{inv.email}</TableCell>
                                        <TableCell>
                                            <Button variant="secondary" size="sm" className="h-7" onClick={() => handleOpenAvailabilityDialog(inv)}>
                                                 {formatAvailableDays(inv)}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button
                  onClick={handleContinue}
                  size="lg"
                  className={cn(
                    "bg-primary text-primary-foreground",
                    "hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600"
                  )}
                >
                    Continue to Examination Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
        <SetAvailabilityDialog
            isOpen={isAvailabilityDialogOpen}
            onClose={() => setIsAvailabilityDialogOpen(false)}
            invigilator={selectedInvigilator}
            onSave={handleSaveAvailability}
        />
        </>
    );
}
    
