"use client";

import { useAllotment } from "@/lib/allotment-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink
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

export default function SavedAllotmentsPage() {
  const { savedAllotments, setActiveAllotment, deleteSavedAllotment } = useAllotment();
  const router = useRouter();

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

  return (
    <div className="space-y-8">
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
    </div>
  );
}
