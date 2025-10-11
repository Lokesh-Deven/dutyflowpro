"use client";

import React, { Dispatch, SetStateAction } from 'react';
import type { Invigilator } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

    const handleBulkUpload = () => {
        toast({
            title: "Bulk Upload",
            description: "This feature will allow uploading invigilators from an Excel file. (This is a demo action)",
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invigilator Details</CardTitle>
                <CardDescription>Add or manage invigilators for duty allotment.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 items-start">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem className="lg:col-span-2"><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="designation" render={({ field }) => (
                            <FormItem><FormLabel>Designation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="mobile" render={({ field }) => (
                            <FormItem><FormLabel>Mobile No</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="email" render={({ field }) => (
                           <FormItem><FormLabel>E-Mail ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="isPartTime" render={({ field }) => (
                            <FormItem className="flex flex-col pt-2"><FormLabel className="mb-2">Part-time</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )}/>
                        <div className="md:col-span-3 lg:col-span-6 flex gap-2">
                           <Button type="submit">Add Invigilator</Button>
                           <Button type="button" variant="outline" onClick={handleBulkUpload}>
                                <Upload className="mr-2" />
                                Bulk Add
                            </Button>
                        </div>
                    </form>
                </Form>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Part-time</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invigilators.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center">No invigilators added yet.</TableCell></TableRow>
                        ) : (
                            invigilators.map(inv => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.name}</TableCell>
                                    <TableCell>{inv.designation}</TableCell>
                                    <TableCell>{inv.email}</TableCell>
                                    <TableCell>{inv.isPartTime ? 'Yes' : 'No'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
