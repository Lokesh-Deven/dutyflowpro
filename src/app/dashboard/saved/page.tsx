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
    <div className="space-y-6">
      {savedAllotments.length === 0 ? (
        <Card className="text-center py-16 px-6 max-w-lg mx-auto border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl shadow-none bg-white dark:bg-slate-900">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] ring-8 ring-purple-50/50 dark:ring-purple-950/20">
              <FolderArchive className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">No Saved Allotments Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You haven&apos;t saved any allotment sheets yet. Create an allotment and save it to easily access it here anytime.
              </p>
            </div>
            <Button asChild className="bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold rounded-xl shadow-xs gap-2">
              <Link href="/dashboard/examinations">
                <PlusCircle className="h-4 w-4" />
                <span>Create New Allotment</span>
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
                className="group relative overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:border-[#6342e8]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl"
              >
                {/* Decorative Top Accent Gradient */}
                <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

                <div>
                  <CardHeader className="pb-3 pt-5 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-300 shrink-0">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base leading-tight truncate text-slate-900 dark:text-white group-hover:text-[#6342e8] dark:group-hover:text-purple-400 transition-colors" title={allotment.name}>
                            {allotment.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{format(new Date(allotment.createdAt), "MMM d, yyyy • h:mm a")}</span>
                          </div>
                        </div>
                      </div>

                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 dark:border-slate-800 shadow-md">
                            <DropdownMenuItem onClick={() => handleOpen(allotment.id)} className="cursor-pointer text-xs rounded-lg">
                              <ExternalLink className="mr-2 h-4 w-4 text-[#6342e8]" /> Open Sheet
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer text-xs rounded-lg">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Saved Allotment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently remove &quot;{allotment.name}&quot; from your saved sheets.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSavedAllotment(allotment.id)}
                              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl"
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
                      <span className="text-xs font-semibold text-slate-500">Status</span>
                      {allotment.status === 'Finalized' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/20 text-xs px-2.5 py-0.5 font-semibold rounded-full">
                          Finalized
                        </Badge>
                      ) : (
                        <Badge className="bg-[#f59e0b]/10 text-[#d97706] dark:text-[#fbbf24] hover:bg-[#f59e0b]/15 border-[#f59e0b]/30 text-xs px-2.5 py-0.5 font-semibold rounded-full">
                          Draft
                        </Badge>
                      )}
                    </div>

                    {/* Stats Metric Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 text-center border border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center justify-center text-[#6342e8] dark:text-purple-400 mb-1">
                          <Users className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-base font-bold leading-none text-slate-900 dark:text-white">{allotment.invigilators.length}</div>
                        <div className="text-[11px] text-slate-500 mt-1 uppercase font-semibold tracking-wide">Staff</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 text-center border border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center justify-center text-[#6342e8] dark:text-purple-400 mb-1">
                          <GraduationCap className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-base font-bold leading-none text-slate-900 dark:text-white">{allotment.examinations.length}</div>
                        <div className="text-[11px] text-slate-500 mt-1 uppercase font-semibold tracking-wide">Exams</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 text-center border border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center justify-center text-[#f59e0b] dark:text-amber-400 mb-1">
                          <Briefcase className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-base font-bold leading-none text-slate-900 dark:text-white">{totalDuties}</div>
                        <div className="text-[11px] text-slate-500 mt-1 uppercase font-semibold tracking-wide">Duties</div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="px-5 pb-5 pt-2">
                  <Button
                    onClick={() => handleOpen(allotment.id)}
                    variant="outline"
                    className="w-full justify-between font-semibold border-slate-200 dark:border-slate-800 hover:border-[#6342e8]/60 hover:bg-[#6342e8]/5 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 group-hover:text-[#6342e8] dark:group-hover:text-purple-300 rounded-xl transition-all"
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
