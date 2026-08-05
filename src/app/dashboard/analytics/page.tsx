
"use client";

import { useAllotment } from "@/lib/allotment-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";
import { BarChart3, Calendar, TrendingUp, ClipboardList } from "lucide-react";

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
            "Total": data.rooms + data.relievers
        }));
    }, [examinations]);
    
    const sessionTrendsData = useMemo(() => {
        if (!examinations.length) return [];
        const dailyData: Record<string, number> = {};
        
        const sortedExams = [...examinations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedExams.forEach(exam => {
            const date = format(new Date(exam.date), "yyyy-MM-dd");
            dailyData[date] = (dailyData[date] || 0) + exam.rooms + exam.relievers;
        });
        
        return Object.entries(dailyData).map(([date, count]) => ({
            date: format(new Date(date), "dd MMM"),
            duties: count
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
                        <Button asChild>
                            <Link href="/dashboard/examinations">Start New Allotment</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Allotment Analytics</h1>
                    <p className="text-muted-foreground">Detailed insights into duty distribution and exam requirements.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold">Daily Invigilator Workload</CardTitle>
                            <CardDescription>Assigned vs. Free Invigilators</CardDescription>
                        </div>
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="pt-4">
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailyWorkloadData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Assigned" stackId="a" fill="hsl(var(--primary))" />
                                <Bar dataKey="Free" stackId="a" fill="hsl(var(--muted))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold">Session Trends</CardTitle>
                            <CardDescription>Total duties required per day</CardDescription>
                        </div>
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={sessionTrendsData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="duties" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold">Duties Required per Exam Date</CardTitle>
                        <CardDescription>Breakdown of Rooms and Relievers</CardDescription>
                    </div>
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={dutiesRequiredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Rooms" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Relievers" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
