"use client";

import { useAllotment } from "@/lib/allotment-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { 
    Bar, 
    BarChart, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    Line, 
    LineChart
} from "recharts";
import { format } from "date-fns";
import { 
    BarChart3, 
    Maximize2, 
    Users, 
    GraduationCap, 
    CheckCircle2, 
    FileSpreadsheet, 
    TrendingUp, 
    Activity,
    CalendarDays,
    Layers
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border text-popover-foreground p-3.5 rounded-xl shadow-xl space-y-2 min-w-40 text-xs">
        <div className="font-bold text-foreground border-b border-border/60 pb-1">{label}</div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-muted-foreground">{entry.name}</span>
              </span>
              <span className="font-bold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
    const { invigilators, examinations, activeAllotment } = useAllotment();
    const [expandedChart, setExpandedChart] = useState<string | null>(null);

    const totalRooms = useMemo(() => examinations.reduce((acc, e) => acc + e.rooms, 0), [examinations]);
    const totalRelievers = useMemo(() => examinations.reduce((acc, e) => acc + e.relievers, 0), [examinations]);
    const totalDutiesRequired = totalRooms + totalRelievers;

    const dailyWorkloadData = useMemo(() => {
        if (!examinations.length || !invigilators.length || !activeAllotment) return [];
        const dailyData: Record<string, Set<string>> = {};
        
        const sortedExams = [...examinations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const examDates = [...new Set(sortedExams.map(e => format(new Date(e.date), "yyyy-MM-dd")))];

        examDates.forEach(date => {
            dailyData[date] = new Set();
        });

        for (const invId in activeAllotment.assignments) {
            const assignedExamIds = activeAllotment.assignments[invId];
            for (const examId of assignedExamIds) {
                const exam = examinations.find(e => e.id === examId);
                if (exam) {
                    const date = format(new Date(exam.date), "yyyy-MM-dd");
                    dailyData[date]?.add(invId);
                }
            }
        }
        
        return Object.entries(dailyData).map(([date, invIds]) => ({
            date: format(new Date(date), "dd/MM"),
            Assigned: invIds.size,
            Free: Math.max(0, invigilators.length - invIds.size)
        }));
    }, [examinations, invigilators, activeAllotment]);

    const sessionTrendsData = useMemo(() => {
        if (!examinations.length) return [];
        const dailyData: Record<string, { duties: number, relievers: number }> = {};
        
        const sortedExams = [...examinations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedExams.forEach(exam => {
            const date = format(new Date(exam.date), "yyyy-MM-dd");
            if (!dailyData[date]) dailyData[date] = { duties: 0, relievers: 0 };
            dailyData[date].duties += exam.rooms;
            dailyData[date].relievers += exam.relievers;
        });
        
        return Object.entries(dailyData).map(([date, data]) => ({
            date: format(new Date(date), "dd/MM"),
            "Total Duties": data.duties,
            "Total Relievers": data.relievers
        }));

    }, [examinations]);

    const dutiesRequiredData = useMemo(() => {
        if (!examinations.length) return [];
        const dailyData: Record<string, { rooms: number, relievers: number }> = {};
        
        const sortedExams = [...examinations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedExams.forEach(exam => {
            const date = format(new Date(exam.date), "yyyy-MM-dd");
            if (!dailyData[date]) dailyData[date] = { rooms: 0, relievers: 0 };
            dailyData[date].rooms += exam.rooms;
            dailyData[date].relievers += exam.relievers;
        });

        return Object.entries(dailyData).map(([date, data]) => ({
            date: format(new Date(date), "dd/MM"),
            "Rooms": data.rooms,
            "Relievers": data.relievers,
            "Total Required": data.rooms + data.relievers
        }));
    }, [examinations]);

    if (invigilators.length === 0 || examinations.length === 0 || !activeAllotment || Object.keys(activeAllotment.assignments).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
                <Card className="w-full max-w-md text-center border-dashed border-2 shadow-none bg-muted/20 rounded-2xl overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />
                    <CardHeader className="pt-8 pb-4">
                        <div className="mx-auto p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-300 ring-8 ring-indigo-50/50 dark:ring-indigo-950/20 w-fit mb-2">
                            <BarChart3 className="h-8 w-8" />
                        </div>
                        <CardTitle className="text-xl font-bold font-headline text-foreground dark:text-slate-100">Analytics Not Available</CardTitle>
                        <CardDescription className="text-sm max-w-xs mx-auto text-muted-foreground">
                            Analytics require an active allotment with assigned duties. Please generate an allotment sheet to view metrics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <Button asChild className="bg-[#4F46E5] hover:bg-[#4338ca] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-semibold px-6 shadow-sm">
                            <Link href="/dashboard/examinations">Configure & Generate Allotment</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">
                    Analytics & Insights
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Visual workload distributions, duty requirements, and session trends
                </p>
            </div>

            {/* Top Overview Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#6342e8] dark:text-purple-300">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Staff</div>
                            <div className="text-2xl font-bold text-[#6342e8] dark:text-purple-400">{invigilators.length}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#6342e8] dark:text-purple-300">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Exam Sessions</div>
                            <div className="text-2xl font-bold text-[#6342e8] dark:text-purple-400">{examinations.length}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Staff Duties Req.</div>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalDutiesRequired}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[#f59e0b] dark:text-amber-300">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Sheet</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={activeAllotment.name}>
                                {activeAllotment.name}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Invigilator Workload Card */}
                <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900 relative">
                    <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg"
                        onClick={() => setExpandedChart('workload')}
                        title="Maximize Chart"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                    <CardHeader className="pb-2 pt-5 px-6">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#6342e8] dark:text-purple-300">
                                <Users className="h-4 w-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Daily Invigilator Workload</CardTitle>
                                <CardDescription className="text-xs text-slate-500">Assigned vs. available invigilators per exam date.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailyWorkloadData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800/70" />
                                <XAxis type="number" hide={false} stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor', fontSize: 13 }} />
                                <YAxis dataKey="date" type="category" stroke="currentColor" className="text-slate-400 dark:text-slate-500" width={50} tick={{ fill: 'currentColor', fontSize: 13 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                                <Bar dataKey="Assigned" stackId="a" fill="#6342e8" barSize={18} radius={[4, 0, 0, 4]} />
                                <Bar dataKey="Free" stackId="a" fill="#8b5cf6" barSize={18} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Day-wise Session Trends Card */}
                <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900 relative">
                    <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] to-[#f59e0b]" />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg"
                        onClick={() => setExpandedChart('trends')}
                        title="Maximize Chart"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                    <CardHeader className="pb-2 pt-5 px-6">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#6342e8] dark:text-purple-300">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Day-wise Session Trends</CardTitle>
                                <CardDescription className="text-xs text-slate-500">Room duties and relievers required across dates.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={sessionTrendsData} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="currentColor" className="text-slate-200 dark:text-slate-800/70" />
                                <XAxis dataKey="date" stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor', fontSize: 13 }} />
                                <YAxis domain={[0, 'auto']} stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor', fontSize: 13 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                                <Line 
                                    type="monotone" 
                                    dataKey="Total Duties" 
                                    stroke="#6342e8" 
                                    strokeWidth={2.5} 
                                    dot={{ r: 4, fill: "#fff", stroke: "#6342e8", strokeWidth: 2 }} 
                                    activeDot={{ r: 6, fill: "#6342e8" }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="Total Relievers" 
                                    stroke="#f59e0b" 
                                    strokeWidth={2.5} 
                                    dot={{ r: 4, fill: "#fff", stroke: "#f59e0b", strokeWidth: 2 }} 
                                    activeDot={{ r: 6, fill: "#f59e0b" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Duties Required per Exam Date Card */}
            <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900 relative">
                <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 right-4 h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg"
                    onClick={() => setExpandedChart('requirements')}
                    title="Maximize Chart"
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>
                <CardHeader className="pb-2 pt-5 px-6">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#6342e8] dark:text-purple-300">
                            <BarChart3 className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Duties Required per Exam Date</CardTitle>
                            <CardDescription className="text-xs text-slate-500">Comparative distribution of room invigilators, relievers, and total required staff.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-2">
                    <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={dutiesRequiredData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800/70" />
                            <XAxis dataKey="date" stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor', fontSize: 13 }} />
                            <YAxis domain={[0, 'auto']} stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor', fontSize: 13 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                            <Bar dataKey="Rooms" fill="#6342e8" barSize={28} radius={[6, 6, 0, 0]} />
                            <Bar dataKey="Relievers" fill="#8b5cf6" barSize={28} radius={[6, 6, 0, 0]} />
                            <Bar dataKey="Total Required" fill="#f59e0b" barSize={28} radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Expanded Chart Modal */}
            <Dialog open={expandedChart !== null} onOpenChange={(open) => !open && setExpandedChart(null)}>
                <DialogContent className="max-w-[90vw] w-full max-h-[90vh] rounded-2xl overflow-hidden p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-foreground dark:text-slate-100">
                                {expandedChart === 'workload' && 'Daily Invigilator Workload (Full View)'}
                                {expandedChart === 'trends' && 'Day-wise Session Trends (Full View)'}
                                {expandedChart === 'requirements' && 'Duties Required per Exam Date (Full View)'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Detailed analytical perspective</DialogDescription>
                        </DialogHeader>
                        <div className="h-[60vh] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                {expandedChart === 'workload' ? (
                                    <BarChart data={dailyWorkloadData} layout="vertical" margin={{ left: 40, right: 40, top: 20, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800/70" />
                                        <XAxis type="number" stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor' }} />
                                        <YAxis dataKey="date" type="category" stroke="currentColor" className="text-slate-400 dark:text-slate-500" width={80} tick={{ fill: 'currentColor' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar dataKey="Assigned" stackId="a" fill="#4F46E5" radius={[4, 0, 0, 4]} />
                                        <Bar dataKey="Free" stackId="a" fill="#0891B2" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                ) : expandedChart === 'trends' ? (
                                    <LineChart data={sessionTrendsData} margin={{ left: 40, right: 40, top: 20, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800/70" />
                                        <XAxis dataKey="date" stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor' }} />
                                        <YAxis stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line type="monotone" dataKey="Total Duties" stroke="#4F46E5" strokeWidth={3} dot={{ r: 6, fill: "#fff", stroke: "#4F46E5", strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                        <Line type="monotone" dataKey="Total Relievers" stroke="#0891B2" strokeWidth={3} dot={{ r: 6, fill: "#fff", stroke: "#0891B2", strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                    </LineChart>
                                ) : (
                                    <BarChart data={dutiesRequiredData} margin={{ left: 40, right: 40, top: 20, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800/70" />
                                        <XAxis dataKey="date" stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor' }} />
                                        <YAxis stroke="currentColor" className="text-slate-400 dark:text-slate-500" tick={{ fill: 'currentColor' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar dataKey="Rooms" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="Relievers" fill="#0891B2" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="Total Required" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
