"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAllotment } from "@/lib/allotment-context";
import { useAuth } from "@/lib/auth-context";
import { getUserFiles, deleteUserFile, UserFileRecord } from "@/lib/storage-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  MoreVertical,
  Trash2,
  Users,
  GraduationCap,
  Briefcase,
  Calendar,
  ArrowRight,
  FolderArchive,
  FileSpreadsheet,
  PlusCircle,
  ExternalLink,
  Download,
  Cloud,
  FileText,
  Archive,
  RefreshCw,
  Clock,
  Sparkles,
  HardDrive,
  Filter,
  CheckCircle2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SavedAllotmentsPage() {
  const { savedAllotments, setActiveAllotment, deleteSavedAllotment, isCloudSynced } = useAllotment();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<string>("allotments");
  const [cloudFiles, setCloudFiles] = useState<UserFileRecord[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [fileFilter, setFileFilter] = useState<'all' | 'upload' | 'download'>('all');

  const loadCloudFiles = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingFiles(true);
    try {
      const files = await getUserFiles(user.id);
      setCloudFiles(files);
    } catch (err) {
      console.error("Error loading cloud files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadCloudFiles();
    }
  }, [user?.id, loadCloudFiles]);

  const handleOpen = (allotmentId: string) => {
    const allotmentToOpen = savedAllotments.find(a => a.id === allotmentId);
    if (allotmentToOpen) {
      setActiveAllotment(allotmentToOpen);
      router.push("/dashboard/allotment");
    }
  };

  const calculateAssignedDuties = (assignments: Record<string, string[]> | undefined) => {
    if (!assignments) return 0;
    return Object.values(assignments).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
  };

  const handleDeleteFile = async (file: UserFileRecord) => {
    if (!user?.id) return;
    try {
      const res = await deleteUserFile(file.id, file.file_path, user.id);
      if (res.success) {
        setCloudFiles(prev => prev.filter(f => f.id !== file.id));
        toast({
          title: "File Deleted",
          description: `"${file.file_name}" has been removed from cloud storage.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: res.error?.message || "Could not delete file from cloud storage.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete Error",
        description: err.message || "An unexpected error occurred.",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getSubCategoryLabel = (subCat: string) => {
    switch (subCat) {
      case 'examinations': return 'Examinations Timetable';
      case 'invigilators': return 'Invigilators Roster';
      case 'allotment_sheet': return 'Master Allotment Sheet';
      case 'duty_summary': return 'Faculty Duty Summary';
      case 'schedule': return 'Exam Duty Schedule';
      case 'all_summaries_zip': return 'Faculty Summaries ZIP';
      default: return subCat || 'Document';
    }
  };

  const filteredFiles = useMemo(() => {
    if (fileFilter === 'all') return cloudFiles;
    return cloudFiles.filter(f => f.category === fileFilter);
  }, [cloudFiles, fileFilter]);

  const totalStorageBytes = useMemo(() => {
    return cloudFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
  }, [cloudFiles]);

  const uploadCount = useMemo(() => cloudFiles.filter(f => f.category === 'upload').length, [cloudFiles]);
  const downloadCount = useMemo(() => cloudFiles.filter(f => f.category === 'download').length, [cloudFiles]);

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Allotment & File Repository</span>
              {isCloudSynced && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
                  <Cloud className="h-3 w-3" />
                  Cloud Synced
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Access saved allotment plans and files saved in your Supabase storage bucket.
            </p>
          </div>

          <TabsList className="bg-muted/70 dark:bg-slate-900 border border-border/80 p-1 rounded-xl h-10">
            <TabsTrigger value="allotments" className="rounded-lg text-xs font-semibold px-4 flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <FolderArchive className="h-3.5 w-3.5 text-[#4F46E5]" />
              <span>Saved Allotments ({savedAllotments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="cloud-files" className="rounded-lg text-xs font-semibold px-4 flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Cloud className="h-3.5 w-3.5 text-[#0891B2]" />
              <span>Cloud Files Archive ({cloudFiles.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Saved Allotments */}
        <TabsContent value="allotments" className="space-y-6 m-0">
          {savedAllotments.length === 0 ? (
            <Card className="text-center py-16 px-6 max-w-lg mx-auto border-dashed border-2 shadow-none bg-muted/20">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] ring-8 ring-indigo-50/50 dark:ring-indigo-950/20">
                  <FolderArchive className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold tracking-tight">No Saved Allotments Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    You haven&apos;t saved any allotment sheets yet. Create an allotment and save it to easily access it here anytime.
                  </p>
                </div>
                <Button asChild className="bg-[#4F46E5] hover:bg-[#4338ca] text-white shadow-sm gap-2">
                  <Link href="/dashboard/examinations">
                    <PlusCircle className="h-4 w-4" />
                    Create New Allotment
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {savedAllotments.map((allotment) => {
                const totalDuties = calculateAssignedDuties(allotment.assignments);

                return (
                  <Card
                    key={allotment.id}
                    className="group relative overflow-hidden border border-border/70 hover:border-[#4F46E5]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between bg-card"
                  >
                    {/* Decorative Top Accent Gradient */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />

                    <div>
                      <CardHeader className="pb-3 pt-5 px-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300 shrink-0">
                              <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-base leading-tight truncate text-foreground dark:text-slate-100 group-hover:text-[#4F46E5] dark:group-hover:text-indigo-400 transition-colors" title={allotment.name}>
                                {allotment.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-slate-400 mt-1">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                <span>{format(new Date(allotment.createdAt), "MMM d, yyyy • h:mm a")}</span>
                              </div>
                            </div>
                          </div>

                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 dark:border-slate-800">
                                <DropdownMenuItem onClick={() => handleOpen(allotment.id)} className="cursor-pointer">
                                  <ExternalLink className="mr-2 h-4 w-4" /> Open Sheet
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent className="dark:border-slate-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Saved Allotment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently remove &quot;{allotment.name}&quot; from your saved sheets.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSavedAllotment(allotment.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardHeader>

                      <CardContent className="px-5 py-3 space-y-4">
                        {/* Status Pill */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Status</span>
                          {allotment.status === 'Finalized' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/20 text-xs px-2.5 py-0.5 font-medium">
                              Finalized
                            </Badge>
                          ) : (
                            <Badge className="bg-[#F59E0B]/10 text-[#D97706] dark:text-[#FBBF24] hover:bg-[#F59E0B]/15 border-[#F59E0B]/30 text-xs px-2.5 py-0.5 font-medium">
                              Draft
                            </Badge>
                          )}
                        </div>

                        {/* Stats Metric Grid */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="bg-muted/40 dark:bg-slate-900/60 rounded-lg p-2.5 text-center border border-border/40 dark:border-slate-800">
                            <div className="flex items-center justify-center text-[#4F46E5] dark:text-indigo-400 mb-1">
                              <Users className="h-3.5 w-3.5" />
                            </div>
                            <div className="text-base font-bold leading-none text-foreground dark:text-slate-100">{allotment.invigilators.length}</div>
                            <div className="text-[12px] text-muted-foreground mt-1 uppercase font-medium tracking-wide">Staff</div>
                          </div>

                          <div className="bg-muted/40 dark:bg-slate-900/60 rounded-lg p-2.5 text-center border border-border/40 dark:border-slate-800">
                            <div className="flex items-center justify-center text-[#0891B2] dark:text-cyan-400 mb-1">
                              <GraduationCap className="h-3.5 w-3.5" />
                            </div>
                            <div className="text-base font-bold leading-none text-foreground dark:text-slate-100">{allotment.examinations.length}</div>
                            <div className="text-[12px] text-muted-foreground mt-1 uppercase font-medium tracking-wide">Exams</div>
                          </div>

                          <div className="bg-muted/40 dark:bg-slate-900/60 rounded-lg p-2.5 text-center border border-border/40 dark:border-slate-800">
                            <div className="flex items-center justify-center text-[#F59E0B] dark:text-amber-400 mb-1">
                              <Briefcase className="h-3.5 w-3.5" />
                            </div>
                            <div className="text-base font-bold leading-none text-foreground dark:text-slate-100">{totalDuties}</div>
                            <div className="text-[12px] text-muted-foreground mt-1 uppercase font-medium tracking-wide">Duties</div>
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    <CardFooter className="px-5 pb-5 pt-2">
                      <Button 
                        onClick={() => handleOpen(allotment.id)} 
                        variant="outline" 
                        className="w-full justify-between font-semibold border-border/80 dark:border-slate-800 hover:border-[#4F46E5]/60 hover:bg-[#4F46E5]/5 dark:hover:bg-indigo-950/40 text-foreground dark:text-slate-200 group-hover:text-[#4F46E5] dark:group-hover:text-indigo-300 rounded-lg transition-all"
                      >
                        <span>Open Allotment</span>
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Cloud Files Archive */}
        <TabsContent value="cloud-files" className="space-y-6 m-0">
          {/* Cloud Storage Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border border-border/70 bg-card rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Files</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{cloudFiles.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5]">
                  <Cloud className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border/70 bg-card rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Excel Uploads</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{uploadCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border/70 bg-card rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PDF Downloads</p>
                  <p className="text-2xl font-bold text-[#0891B2] dark:text-cyan-400 mt-1">{downloadCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-[#0891B2]">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border/70 bg-card rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storage Used</p>
                  <p className="text-2xl font-bold text-[#F59E0B] dark:text-amber-400 mt-1">{formatFileSize(totalStorageBytes)}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-[#F59E0B]">
                  <HardDrive className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Files Filter & Table Container */}
          <Card className="border border-border/80 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />
            
            <CardHeader className="pb-4 pt-5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>Supabase Cloud File Archive</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  All Excel spreadsheets uploaded and PDF documents generated for your account.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter buttons */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                  <Button
                    size="sm"
                    variant={fileFilter === 'all' ? 'default' : 'ghost'}
                    className={cn("h-7 px-2.5 text-xs font-semibold rounded-md", fileFilter === 'all' ? "bg-[#4F46E5] text-white" : "")}
                    onClick={() => setFileFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={fileFilter === 'upload' ? 'default' : 'ghost'}
                    className={cn("h-7 px-2.5 text-xs font-semibold rounded-md", fileFilter === 'upload' ? "bg-[#4F46E5] text-white" : "")}
                    onClick={() => setFileFilter('upload')}
                  >
                    Uploads ({uploadCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={fileFilter === 'download' ? 'default' : 'ghost'}
                    className={cn("h-7 px-2.5 text-xs font-semibold rounded-md", fileFilter === 'download' ? "bg-[#4F46E5] text-white" : "")}
                    onClick={() => setFileFilter('download')}
                  >
                    Downloads ({downloadCount})
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs font-semibold rounded-lg"
                  onClick={loadCloudFiles}
                  disabled={isLoadingFiles}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoadingFiles && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-16 px-4 border border-dashed border-border rounded-xl bg-muted/10">
                  <Cloud className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-semibold text-foreground">No cloud files found</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Uploaded Excel spreadsheets and downloaded PDF reports will automatically be backed up here.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 dark:bg-slate-900/80 hover:bg-muted/50 border-b border-border/70">
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">#</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Document Name</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Type & Category</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Size</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file, index) => {
                        const isExcel = file.file_type === 'excel' || file.file_name.endsWith('.xlsx') || file.file_name.endsWith('.xls');
                        const isZip = file.file_type === 'zip' || file.file_name.endsWith('.zip');
                        const isPdf = file.file_type === 'pdf' || file.file_name.endsWith('.pdf');

                        return (
                          <TableRow
                            key={file.id}
                            className={cn(
                              "transition-colors hover:bg-muted/30 dark:hover:bg-slate-800/40",
                              index % 2 === 1 && "bg-muted/10 dark:bg-slate-900/30"
                            )}
                          >
                            <TableCell className="text-center font-medium text-xs text-muted-foreground">
                              {index + 1}
                            </TableCell>

                            <TableCell className="font-semibold text-xs text-foreground">
                              <div className="flex items-center gap-2.5">
                                <div className={cn(
                                  "p-2 rounded-lg shrink-0",
                                  isExcel && "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50",
                                  isPdf && "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50",
                                  isZip && "bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50"
                                )}>
                                  {isExcel && <FileSpreadsheet className="h-4 w-4" />}
                                  {isPdf && <FileText className="h-4 w-4" />}
                                  {isZip && <Archive className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs truncate max-w-xs sm:max-w-md text-foreground dark:text-slate-100" title={file.file_name}>
                                    {file.file_name}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {getSubCategoryLabel(file.sub_category)}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 font-semibold",
                                    file.category === 'upload'
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : "bg-[#0891B2]/10 text-[#0891B2] dark:text-cyan-400 border-[#0891B2]/30"
                                  )}
                                >
                                  {file.category === 'upload' ? 'Upload' : 'Download'}
                                </Badge>
                                <span className="text-xs uppercase font-bold text-muted-foreground">
                                  {file.file_type}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground font-medium">
                              {formatFileSize(file.file_size)}
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {file.created_at ? format(new Date(file.created_at), "MMM d, yyyy • h:mm a") : '—'}
                            </TableCell>

                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1.5">
                                {file.public_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs font-semibold rounded-lg text-[#0891B2] hover:text-[#0891B2] hover:bg-[#0891B2]/10 border-border/80"
                                    asChild
                                  >
                                    <a href={file.public_url} target="_blank" rel="noopener noreferrer" download={file.file_name}>
                                      <Download className="h-3.5 w-3.5 mr-1" />
                                      Download
                                    </a>
                                  </Button>
                                )}

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="dark:border-slate-800">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Cloud File?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to permanently delete &quot;{file.file_name}&quot; from your Supabase cloud storage?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteFile(file)}
                                        className="bg-destructive hover:bg-destructive/90 text-white"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
