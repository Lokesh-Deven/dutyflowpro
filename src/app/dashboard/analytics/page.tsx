
"use client";

import { useAllotment } from "@/lib/allotment-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, LabelList } from "recharts";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Maximize2, Calendar, TrendingUp, ClipboardList, BarChart3 } from "lucide-react";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 text-sm bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl ring-1 ring-black/5">
                <p className="font-bold text-slate-900 mb-2 border-b pb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={`item-${index}`} className="flex items-center gap-2 py-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }}></div>
                        <span className="text-slate-600 font-medium">{entry.name}:</span>
                        <span className="text-slate-900 font-bold ml-auto">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function AnalyticsPage() {
    const { invigilators, examinations, activeAllotment } = useAllotment();

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
                    dailyData[date].add(invId);
                }
            }
        }
        
        return Object.entries(dailyData).map(([date, invIds]) => ({
            date: format(new Date(date), "dd MMM"),
            Assigned: invIds.size,
            Free: invigilators.length - invIds.size
        }));
    }, [examinations, invigilators, activeAllotment]);

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
            date: format(new Date(date), "dd MMM"),
            "Rooms": data.rooms,
            "Relievers": data.relievers,
            "Total Required": data.rooms + data.relievers
        }));
    }, [examinations]);
    
    const sessionTrendsData = useMemo(() => {
        if (!examinations.length) return [];
        const dailyData: Record<string, { duties: number, relievers: number }> = {};
        
        const sortedExams = [...examinations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedExams.forEach(exam => {
            const date = format(new Date(exam.date), "yyyy-MM-dd");
            if (!dailyData[date]) dailyData[date] = { duties: 0, relievers: 0 };
            dailyData[date].duties += exam.rooms + exam.relievers;
            dailyData[date].relievers += exam.relievers;
        });
        
        return Object.entries(dailyData).map(([date, data]) => ({
            date: format(new Date(date), "dd MMM"),
            "Total Duties": data.duties,
            "Total Relievers": data.relievers
        }));

    }, [examinations]);


    if (invigilators.length === 0 || examinations.length === 0 || !activeAllotment || Object.keys(activeAllotment.assignments).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="p-6 rounded-full bg-slate-100 animate-pulse">
                    <BarChart3 className="w-16 h-16 text-slate-300" />
                </div>
                <Card className="max-w-md text-center border-none shadow-2xl bg-white/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline text-slate-800">Analytics Not Available</CardTitle>
                        <CardDescription className="text-slate-500">
                            Analytics require an active allotment with assigned duties. Please create or open one and ensure duties are assigned.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all">
                            <Link href="/dashboard/examinations">Start New Allotment</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
                    <BarChart3 className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-black tracking-tight font-headline text-slate-900 dark:text-white">Allotment Analytics</h1>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Invigilator Workload Card */}
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group">
                    <div className="h-1.5 w-full bg-purple-500/80"></div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-purple-100 text-purple-600 shadow-inner group-hover:scale-110 transition-transform">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-800">Daily Invigilator Workload</CardTitle>
                                <CardDescription className="text-xs font-medium text-slate-400 uppercase tracking-wider">Assigned vs. Free</CardDescription>
                            </div>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                    <Maximize2 className="h-4 w-4 text-slate-400" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-[70vh] flex flex-col rounded-3xl">
                                <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Calendar className="text-purple-500"/> Daily Invigilator Workload</h2>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={dailyWorkloadData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="date" type="category" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} width={60} axisLine={false} tickLine={false} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }}/>
                                            <Legend iconType="circle" />
                                            <Bar dataKey="Assigned" stackId="a" fill="#8b5cf6" name="Assigned" radius={[0, 0, 0, 0]}>
                                                <LabelList dataKey="Assigned" position="center" fill="#fff" fontSize={12} fontWeight={800} />
                                            </Bar>
                                            <Bar dataKey="Free" stackId="a" fill="#f1f5f9" name="Free" radius={[0, 10, 10, 0]}>
                                                <LabelList dataKey="Free" position="center" fill="#94a3b8" fontSize={12} fontWeight={700} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="pb-8">
                         <ResponsiveContainer width="100%" height={320}>
                            <BarChart layout="vertical" data={dailyWorkloadData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }} barSize={32}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="date" type="category" tick={{ fontSize: 13, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="Assigned" stackId="a" fill="#8b5cf6" name="Assigned" radius={[0, 0, 0, 0]}>
                                    <LabelList dataKey="Assigned" position="center" fill="#fff" fontSize={12} fontWeight={800} />
                                </Bar>
                                <Bar dataKey="Free" stackId="a" fill="#f1f5f9" name="Free" radius={[0, 12, 12, 0]}>
                                    <LabelList dataKey="Free" position="center" fill="#94a3b8" fontSize={12} fontWeight={700} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Assigned</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200"></div><span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Free</span></div>
                        </div>
                    </CardContent>
                </Card>

                {/* Day-wise Session Trends Card */}
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group">
                    <div className="h-1.5 w-full bg-teal-500/80"></div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-teal-100 text-teal-600 shadow-inner group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-800">Day-wise Session Trends</CardTitle>
                                <CardDescription className="text-xs font-medium text-slate-400 uppercase tracking-wider">Duties across exam period</CardDescription>
                            </div>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                    <Maximize2 className="h-4 w-4 text-slate-400" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-[70vh] flex flex-col rounded-3xl">
                                <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><TrendingUp className="text-teal-500"/> Day-wise Session Trends</h2>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={sessionTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                            <defs>
                                                <linearGradient id="colorDuties" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorRelievers" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                            <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                                            <YAxis hide />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="Total Duties" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorDuties)" animationDuration={1500}>
                                                <LabelList dataKey="Total Duties" position="top" offset={15} fill="#3b82f6" fontSize={14} fontWeight={800} />
                                            </Area>
                                            <Area type="monotone" dataKey="Total Relievers" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRelievers)" animationDuration={2000}>
                                                <LabelList dataKey="Total Relievers" position="top" offset={10} fill="#10b981" fontSize={12} fontWeight={700} />
                                            </Area>
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={sessionTrendsData} margin={{ top: 30, right: 20, left: 20, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorDuties2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorRelievers2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="Total Duties" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorDuties2)" animationDuration={1500}>
                                    <LabelList dataKey="Total Duties" position="top" offset={10} fill="#3b82f6" fontSize={13} fontWeight={800} />
                                </Area>
                                <Area type="monotone" dataKey="Total Relievers" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRelievers2)" animationDuration={2000}>
                                    <LabelList dataKey="Total Relievers" position="top" offset={8} fill="#10b981" fontSize={11} fontWeight={700} />
                                </Area>
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Total Duties</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Total Relievers</span></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Duties Required per Exam Date Card */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group">
                <div className="h-1.5 w-full bg-orange-500/80"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-orange-100 text-orange-600 shadow-inner group-hover:scale-110 transition-transform">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black text-slate-800">Duties Required per Exam Date</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-400 uppercase tracking-wider">Rooms, Relievers & Total Capacity</CardDescription>
                        </div>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                <Maximize2 className="h-4 w-4 text-slate-400" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[70vh] flex flex-col rounded-3xl">
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><ClipboardList className="text-orange-500"/> Duties Required per Exam Date</h2>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dutiesRequiredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 13, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis hide />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="Rooms" fill="#f59e0b" name="Rooms" radius={[6, 6, 0, 0]} animationDuration={1000}>
                                            <LabelList dataKey="Rooms" position="top" fill="#f59e0b" fontSize={12} fontWeight={800} />
                                        </Bar>
                                        <Bar dataKey="Relievers" fill="#10b981" name="Relievers" radius={[6, 6, 0, 0]} animationDuration={1500}>
                                            <LabelList dataKey="Relievers" position="top" fill="#10b981" fontSize={12} fontWeight={800} />
                                        </Bar>
                                        <Bar dataKey="Total Required" fill="#3b82f6" name="Total Required" radius={[6, 6, 0, 0]} animationDuration={2000}>
                                            <LabelList dataKey="Total Required" position="top" fill="#3b82f6" fontSize={14} fontWeight={900} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="pb-8">
                    <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={dutiesRequiredData} margin={{ top: 30, right: 20, left: 20, bottom: 5 }} barGap={12}>
                            <XAxis dataKey="date" tick={{ fontSize: 13, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="Rooms" fill="#f59e0b" name="Rooms" radius={[8, 8, 0, 0]} animationDuration={1000}>
                                <LabelList dataKey="Rooms" position="top" offset={8} fill="#f59e0b" fontSize={13} fontWeight={800} />
                            </Bar>
                            <Bar dataKey="Relievers" fill="#10b981" name="Relievers" radius={[8, 8, 0, 0]} animationDuration={1500}>
                                <LabelList dataKey="Relievers" position="top" offset={8} fill="#10b981" fontSize={13} fontWeight={800} />
                            </Bar>
                            <Bar dataKey="Total Required" fill="#3b82f6" name="Total Required" radius={[8, 8, 0, 0]} animationDuration={2000}>
                                <LabelList dataKey="Total Required" position="top" offset={8} fill="#3b82f6" fontSize={15} fontWeight={900} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-8 mt-6">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-lg bg-orange-400"></div><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rooms</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-lg bg-emerald-500"></div><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Relievers</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-lg bg-blue-500"></div><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Required</span></div>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
