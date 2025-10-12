"use client";

import React, { Dispatch, SetStateAction, useRef } from 'react';
import type { Invigilator } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Upload, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const invigilatorSchema = z.object({
  name: z.string().min(1, "Name is required."),
  designation: z.string().min(1, "Designation is required."),
  mobile: z.string().regex(/^\d{10}$/, "Must be a 10-digit number."),
  email: z.string().email("Invalid email address."),
  isPartTime: z.boolean().default(false),
});

type InvigilatorManagementProps = {
  invigilators: Invigilator[];
  setInvigilators: Dispatch<SetStateAction<Invigilator[]>>;
};

export function InvigilatorManagement({ invigilators, setInvigilators }: InvigilatorManagementProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof invigilatorSchema>>({
        resolver: zodResolver(invigilatorSchema),
        defaultValues: { name: '', designation: '', mobile: '', email: '', isPartTime: false },
    });

    function onSubmit(values: z.infer<typeof invigilatorSchema>) {
        const newInvigilator: Invigilator = {
            id: `inv-${Date.now()}`,
            ...values,
        };
        setInvigilators(prev => [...prev, newInvigilator]);
        toast({ title: "Invigilator Added", description: `${values.name} has been added to the list.` });
        form.reset();
    }
    
    const handleDelete = (id: string) => {
        setInvigilators(prev => prev.filter(inv => inv.id !== id));
        toast({ title: "Invigilator Removed", variant: "destructive" });
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
                
                const newInvigilators: Invigilator[] = json.map((row: any, index) => {
                    return {
                        id: `inv-bulk-${Date.now()}-${index}`,
                        name: String(row.Name || ''),
                        designation: String(row.Designation || ''),
                        mobile: String(row.Mobile || '').replace(/\D/g, ''),
                        email: String(row['E-Mail ID'] || row.Email || ''),
                        isPartTime: row.Availability?.toLowerCase() === 'part-time',
                    };
                }).filter(inv => inv.name && inv.email);

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
                // Reset file input
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
                <CardTitle>Invigilators' Details</CardTitle>
                <CardDescription>Add all available invigilators.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Invigilator's Name</FormLabel><FormControl><Input placeholder="e.g. Lokesh D" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="designation" render={({ field }) => (
                                <FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="e.g. Lecturer in English" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="mobile" render={({ field }) => (
                                <FormItem><FormLabel>Mobile No</FormLabel><FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                               <FormItem><FormLabel>E-Mail ID</FormLabel><FormControl><Input placeholder="e.g. lokesh@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="flex items-center gap-4">
                           <Button type="submit"><UserPlus className="mr-2 h-4 w-4" /> Add Invigilator</Button>
                           <span className="text-sm text-muted-foreground">or</span>
                           <Button type="button" variant="secondary" onClick={handleBulkUploadClick}>
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
                                <TableHead>Availability</TableHead>
                                <TableHead>E-Mail ID</TableHead>
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
                                        <TableCell>{inv.isPartTime ? 'Part-Time' : 'Full-Time'}</TableCell>
                                        <TableCell>{inv.email}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
