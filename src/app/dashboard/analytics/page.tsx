
"use client";

import { useAllotment } from "@/lib/allotment-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
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
    LineChart,
    Area,
    AreaChart
} from "recharts";
import { format } from "date-fns";
import { BarChart3, Maximize2 } from "lucide-react";

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
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <BarChart3 className="w-16 h-16 text-muted-foreground/20" />
                <Card className="max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Analytics Not Available</CardTitle>
                        <CardDescription>
                            Analytics require an active allotment with assigned duties. Please create or open one and ensure duties are assigned.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="bg-gradient-to-r from-purple-500 to-indigo-600">
                            <Link href="/dashboard/examinations">Start New Allotment</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Allotment Analytics</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Invigilator Workload - Horizontal Bar Chart */}
                <Card className="border-l-4 border-l-purple-500 shadow-sm relative">
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 text-muted-foreground">
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Daily Invigilator Workload</CardTitle>
                        <CardDescription>Number of invigilators assigned vs. free for each exam day.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart 
                                data={dailyWorkloadData} 
                                layout="vertical" 
                                margin={{ left: 20, right: 30, top: 10, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide={false} axisLine={true} tickLine={true} />
                                <YAxis 
                                    dataKey="date" 
                                    type="category" 
                                    axisLine={true} 
                                    tickLine={true}
                                    width={60}
                                />
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                                <Bar dataKey="Assigned" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={20} />
                                <Bar dataKey="Free" stackId="a" fill="#e2e8f0" radius={[0, 0, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Day-wise Session Trends - Line Chart */}
                <Card className="border-l-4 border-l-emerald-500 shadow-sm relative">
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 text-muted-foreground">
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Day-wise Session Trends</CardTitle>
                        <CardDescription>Total duties and relievers over the exam period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={sessionTrendsData} margin={{ left: 10, right: 30, top: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={true} tickLine={true} />
                                <YAxis domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} axisLine={true} tickLine={true} />
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                                <Line 
                                    type="monotone" 
                                    dataKey="Total Duties" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2} 
                                    dot={{ r: 4, fill: "#fff", stroke: "#3b82f6", strokeWidth: 2 }} 
                                    activeDot={{ r: 6 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="Total Relievers" 
                                    stroke="#10b981" 
                                    strokeWidth={2} 
                                    dot={{ r: 4, fill: "#fff", stroke: "#10b981", strokeWidth: 2 }} 
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Duties Required per Exam Date - Breakdown */}
            <Card className="shadow-sm border-l-4 border-l-blue-600 relative">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 text-muted-foreground">
                    <Maximize2 className="h-4 w-4" />
                </Button>
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Duties Required per Exam Date</CardTitle>
                    <CardDescription>Rooms, relievers, and total invigilators needed each day.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={dutiesRequiredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" axisLine={true} tickLine={true} />
                            <YAxis domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} axisLine={true} tickLine={true} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="rect" />
                            <Bar dataKey="Rooms" fill="#94a3b8" radius={[0, 0, 0, 0]} barSize={40} />
                            <Bar dataKey="Relievers" fill="#10b981" radius={[0, 0, 0, 0]} barSize={40} />
                            <Bar dataKey="Total Required" fill="#2563eb" radius={[0, 0, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
