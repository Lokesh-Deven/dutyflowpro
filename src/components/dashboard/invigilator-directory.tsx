"use client";

import React, { useRef, useState, useMemo } from 'react';
import type { DirectoryInvigilator } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  UserPlus,
  Trash2,
  Edit2,
  Users,
  User,
  Mail,
  Phone,
  Briefcase,
  BookUser,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  CloudUpload,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { uploadUserFile } from '@/lib/storage-service';
import { cn } from '@/lib/utils';

const directoryInvigilatorSchema = z.object({
  name: z.string().min(1, "Name is required."),
  designation: z.string().min(1, "Designation is required."),
  mobile: z.string().regex(/^\d{10}$/, "Must be a 10-digit number."),
  email: z.string().email("Invalid email address."),
});

type FormValues = z.infer<typeof directoryInvigilatorSchema>;

export function InvigilatorDirectory() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    directoryInvigilators,
    addDirectoryInvigilator,
    addDirectoryInvigilatorsBulk,
    updateDirectoryInvigilator,
    deleteDirectoryInvigilator,
    clearDirectoryInvigilators,
    saveDirectoryToCloud,
    isDirectoryCloudSynced
  } = useAllotment();

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Clear all confirmation dialog
  const [isClearAllAlertOpen, setIsClearAllAlertOpen] = useState(false);

  // Save directory confirmation dialog & loading state
  const [isSaveAlertOpen, setIsSaveAlertOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit dialog state
  const [editingInvigilator, setEditingInvigilator] = useState<DirectoryInvigilator | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Main Add Form
  const form = useForm<FormValues>({
    resolver: zodResolver(directoryInvigilatorSchema),
    defaultValues: { name: '', designation: '', mobile: '', email: '' },
  });

  // Edit Form
  const editForm = useForm<FormValues>({
    resolver: zodResolver(directoryInvigilatorSchema),
    defaultValues: { name: '', designation: '', mobile: '', email: '' },
  });

  const filteredInvigilators = useMemo(() => {
    if (!searchQuery.trim()) return directoryInvigilators;
    const q = searchQuery.toLowerCase().trim();
    return directoryInvigilators.filter(inv =>
      inv.name.toLowerCase().includes(q) ||
      inv.designation.toLowerCase().includes(q) ||
      inv.email.toLowerCase().includes(q) ||
      inv.mobile.includes(q)
    );
  }, [directoryInvigilators, searchQuery]);

  // Submit manual entry
  function onSubmit(values: FormValues) {
    addDirectoryInvigilator(values);
    toast({
      title: "Invigilator Added to Directory",
      description: `${values.name} has been permanently saved to your directory.`,
    });
    form.reset();
  }

  // Open Edit Dialog
  const handleOpenEdit = (inv: DirectoryInvigilator) => {
    setEditingInvigilator(inv);
    editForm.reset({
      name: inv.name,
      designation: inv.designation,
      mobile: inv.mobile,
      email: inv.email,
    });
    setIsEditDialogOpen(true);
  };

  // Submit Edit
  function onEditSubmit(values: FormValues) {
    if (!editingInvigilator) return;
    updateDirectoryInvigilator(editingInvigilator.id, values);
    toast({
      title: "Invigilator Updated",
      description: `Details for ${values.name} have been updated.`,
    });
    setIsEditDialogOpen(false);
    setEditingInvigilator(null);
  }

  // Delete single row
  const handleDeleteRow = (id: string, name: string) => {
    deleteDirectoryInvigilator(id);
    toast({
      title: "Removed from Directory",
      description: `${name} was removed from your directory.`,
    });
  };

  // Clear all
  const handleClearAll = () => {
    clearDirectoryInvigilators();
    setIsClearAllAlertOpen(false);
    toast({
      title: "Directory Cleared",
      description: "All invigilator records have been removed from your directory.",
    });
  };

  // Save directory permanently to user account
  const handleSaveDirectory = async () => {
    if (directoryInvigilators.length === 0) {
      toast({
        variant: "destructive",
        title: "Directory is Empty",
        description: "Please add faculty members before saving.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveDirectoryToCloud();
      if (res.success) {
        toast({
          title: "Directory Saved to Account",
          description: user?.email
            ? `${directoryInvigilators.length} faculty member${directoryInvigilators.length === 1 ? '' : 's'} permanently saved to your account (${user.email}).`
            : `${directoryInvigilators.length} faculty member${directoryInvigilators.length === 1 ? '' : 's'} saved to local storage.`,
        });
        setIsSaveAlertOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Could not save to cloud account. Please check your internet connection.",
        });
      }
    } catch (err) {
      console.error("Save directory error:", err);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "An unexpected error occurred while saving the directory.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk Excel Upload
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

        const newItems: Omit<DirectoryInvigilator, 'id'>[] = json.map((row: any, index: number) => {
          const name = String(getColumnValue(row, ["Name", "Invigilator's Name", "Invigilator Name", "Faculty Name", "Staff Name", "Faculty"]) || '').trim();
          const designation = String(getColumnValue(row, ["Designation", "Department", "Designation/Department", "Designation / Department", "Dept"]) || '').trim();
          const rawMobile = String(getColumnValue(row, ["Mobile", "Mobile No", "Phone", "Contact", "Phone No", "Contact No"]) || '').replace(/\D/g, '').trim();
          const rawEmail = String(getColumnValue(row, ["E-Mail ID", "Email", "E-Mail", "Email ID", "Email Address"]) || '').trim();

          return {
            name,
            designation: designation || 'Faculty',
            mobile: rawMobile.length >= 10 ? rawMobile.slice(-10) : (rawMobile || '9000000000'),
            email: rawEmail || `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || `faculty${index + 1}`}@institution.local`,
          };
        }).filter(inv => Boolean(inv.name));

        if (newItems.length > 0) {
          addDirectoryInvigilatorsBulk(newItems);

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
                directoryCount: newItems.length,
                isInvigilatorDirectory: true,
              },
            }).then(({ error }) => {
              if (!error) {
                toast({
                  title: "Cloud Backup Complete",
                  description: `"${file.name}" was successfully saved to your cloud storage.`,
                });
              }
            });
          }

          toast({
            title: "Bulk Import Successful",
            description: `${newItems.length} faculty members have been imported into your directory.`,
          });
        } else {
          throw new Error("No valid faculty records found in the Excel file.");
        }
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "Could not parse the Excel file. Please ensure columns: Name, Designation, Mobile, Email.",
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
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">
          Invigilator Directory
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Permanent repository of faculty members. Store once and reuse across all future examination allotments.
        </p>
      </div>

      {/* Main Form Card: "Invigilator Directory" */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-400">
                <BookUser className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="font-headline text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Invigilator Directory
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Enter faculty credentials or import in bulk using an Excel spreadsheet
                </CardDescription>
              </div>
            </div>

            {/* Clear All Details Button */}
            <AlertDialog open={isClearAllAlertOpen} onOpenChange={setIsClearAllAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={directoryInvigilators.length === 0}
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/50 font-medium text-xs rounded-xl shadow-2xs transition-all h-8 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear All Details
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Clear All Directory Records?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                    Are you sure you want to clear all {directoryInvigilators.length} registered faculty members from your directory? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-2">
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
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
              {/* 4 Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center gap-2 text-[#6342e8] dark:text-purple-400 text-xs font-semibold">
                        <User className="h-4 w-4" />
                        <span className="text-slate-700 dark:text-slate-300">Invigilator&apos;s Name</span>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="e.g. Lokesh D"
                          {...field}
                          className="bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 focus-visible:border-[#6342e8] focus-visible:ring-[#6342e8]/20 transition-all rounded-xl h-10 font-medium text-sm text-foreground"
                        />
                      </FormControl>
                      <FormMessage className="text-xs mt-1" />
                    </FormItem>
                  )}
                />

                {/* 2. Designation / Department */}
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
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
                  )}
                />

                {/* 3. Mobile No */}
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
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
                  )}
                />

                {/* 4. E-Mail ID */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center gap-2 text-[#6342e8] dark:text-purple-400 text-xs font-semibold">
                        <Mail className="h-4 w-4" />
                        <span className="text-slate-700 dark:text-slate-300">E-Mail ID</span>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="e.g. jane.doe@college.edu"
                          {...field}
                          className="bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 focus-visible:border-[#6342e8] focus-visible:ring-[#6342e8]/20 transition-all rounded-xl h-10 font-medium text-sm text-foreground"
                        />
                      </FormControl>
                      <FormMessage className="text-xs mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons: "Add Invigilator" OR "Import from Excel" */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
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
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Directory Roster Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-3">
                <CardTitle className="font-headline text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Directory Records
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-purple-100 dark:bg-purple-950/80 text-[#6342e8] dark:text-purple-300 border-none font-bold text-xs px-2.5 py-0.5 rounded-full"
                >
                  {directoryInvigilators.length} {directoryInvigilators.length === 1 ? 'Faculty Member' : 'Faculty Members'}
                </Badge>
              </div>
            </div>

            {/* Actions: Search & Save Directory */}
            <div className="flex flex-wrap items-center gap-2">
              {directoryInvigilators.length > 0 && (
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search faculty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                  />
                </div>
              )}

              <Button
                type="button"
                size="sm"
                onClick={() => setIsSaveAlertOpen(true)}
                disabled={directoryInvigilators.length === 0 || isSaving}
                className="bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold text-xs px-3.5 h-8 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Directory</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-0">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f8f9fc] dark:bg-slate-800/60 hover:bg-[#f8f9fc] border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 w-12 text-center">#</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Designation / Department</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Mobile No</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">E-Mail ID</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvigilators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <BookUser className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {searchQuery ? "No matching faculty found" : "No invigilators in directory yet"}
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm text-center">
                          {searchQuery
                            ? "Try searching with a different name, department, or email."
                            : "Add faculty members above manually or import an Excel spreadsheet to start your permanent directory."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvigilators.map((inv, index) => (
                    <TableRow
                      key={inv.id}
                      className={cn(
                        "transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40",
                        index % 2 === 1 && "bg-slate-50/30 dark:bg-slate-800/20"
                      )}
                    >
                      <TableCell className="text-center font-medium text-xs text-slate-500">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-slate-900 dark:text-white">
                        {inv.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                        {inv.designation}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {inv.mobile}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                        {inv.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(inv)}
                            className="h-7 w-7 text-slate-500 hover:text-[#6342e8] hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors"
                            title="Edit Invigilator"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRow(inv.id, inv.name)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Delete Invigilator"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bottom Action Bar: Save Directory to User Account Permanently */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#6342e8] dark:text-purple-300 shrink-0">
                <CloudUpload className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Permanent Account Storage
                  </span>
                  {isDirectoryCloudSynced ? (
                    <Badge className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-none text-[10px] font-bold py-0.5 px-2 rounded-full">
                      <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Cloud Saved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 text-[10px] font-medium py-0.5 px-2 rounded-full">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {user?.email
                    ? `Save all ${directoryInvigilators.length} faculty details permanently to your account (${user.email}).`
                    : `Save all ${directoryInvigilators.length} faculty details to your browser, or log in to sync permanently.`}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsSaveAlertOpen(true)}
              disabled={directoryInvigilators.length === 0 || isSaving}
              className="w-full sm:w-auto bg-gradient-to-r from-[#6342e8] to-[#8b5cf6] hover:from-[#5232d6] hover:to-[#7c3aed] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 h-11 shrink-0 disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving to Account...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Directory</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Directory Confirmation Dialog */}
      <AlertDialog open={isSaveAlertOpen} onOpenChange={setIsSaveAlertOpen}>
        <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-[#6342e8] dark:text-purple-400">
                <CloudUpload className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Save Directory to Account?
                </AlertDialogTitle>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Permanent cloud storage
                </div>
              </div>
            </div>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-400 space-y-2 pt-2">
              <p>
                Are you sure you want to permanently save this list of <strong className="text-slate-900 dark:text-white">{directoryInvigilators.length} faculty member{directoryInvigilators.length === 1 ? '' : 's'}</strong> to your account?
              </p>
              {user?.email ? (
                <div className="text-xs bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200/60 dark:border-purple-900/40 text-purple-950 dark:text-purple-300 space-y-1">
                  <div>Account: <strong className="font-semibold text-[#6342e8] dark:text-purple-300">{user.email}</strong></div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Once saved, these faculty records will be permanently preserved in your account and accessible from any device or browser whenever you allocate duties.
                  </div>
                </div>
              ) : (
                <div className="text-xs bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200/60 text-amber-800 dark:text-amber-300">
                  You are currently in guest mode. This directory will be saved to your local browser storage. Log in to permanently attach it to your account.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-2">
            <AlertDialogCancel disabled={isSaving} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={handleSaveDirectory}
              className="bg-[#6342e8] hover:bg-[#5232d6] text-white rounded-xl font-semibold flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Confirm & Save Permanently</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Invigilator Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Edit Faculty Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update credentials for {editingInvigilator?.name}.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-2">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl h-9 text-xs" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="designation"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">Designation / Department</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl h-9 text-xs" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mobile No</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl h-9 text-xs" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">E-Mail ID</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl h-9 text-xs" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#6342e8] hover:bg-[#5232d6] text-white rounded-xl text-xs font-semibold"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
