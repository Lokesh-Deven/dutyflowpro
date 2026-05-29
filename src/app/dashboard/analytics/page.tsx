
"use client";

import { useAllotment } from "@/lib/allotment-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, LineChart } from "recharts";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Expand } from "lucide-react";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 text-sm bg-background/80 backdrop-blur-sm border rounded-md shadow-lg">
                <p className="font-bold text-foreground">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={`item-${index}`} style={{ color: entry.color || entry.stroke }}>
                        {`${entry.name}: ${entry.value}`}
                    </p>
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
        
        const examDates = [...new Set(examinations.map(e => format(e.date, "yyyy-MM-dd")))];

        examDates.forEach(date => {
            dailyData[date] = new Set();
        });

        for (const invId in activeAllotment.assignments) {
            const assignedExamIds = activeAllotment.assignments[invId];
            for (const examId of assignedExamIds) {
                const exam = examinations.find(e => e.id === examId);
                if (exam) {
                    const date = format(exam.date, "yyyy-MM-dd");
                    dailyData[date].add(invId);
                }
            }
        }
        
        return Object.entries(dailyData).map(([date, invIds]) => ({
            date: format(new Date(date), "dd/MM"),
            Assigned: invIds.size,
            Free: invigilators.length - invIds.size
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [examinations, invigilators, activeAllotment]);

    const dutiesRequiredData = useMemo(() => {
        if (!examinations.length) return [];
        const dailyData: Record<string, { rooms: number, relievers: number }> = {};
        examinations.forEach(exam => {
            const date = format(exam.date, "yyyy-MM-dd");
            if (!dailyData[date]) dailyData[date] = { rooms: 0, relievers: 0 };
            dailyData[date].rooms += exam.rooms;
            dailyData[date].relievers += exam.relievers;
        });

        return Object.entries(dailyData).map(([date, data]) => ({
            date: format(new Date(date), "dd/MM"),
            "No of Rooms": data.rooms,
            "No of Relievers": data.relievers,
            "Total Invigilators": data.rooms + data.relievers
        })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [examinations]);
    
    const sessionTrendsData = useMemo(() => {
        if (!examinations.length) return [];
        const dailyData: Record<string, { duties: number, relievers: number }> = {};
        examinations.forEach(exam => {
            const date = format(exam.date, "yyyy-MM-dd");
            if (!dailyData[date]) dailyData[date] = { duties: 0, relievers: 0 };
            dailyData[date].duties += exam.rooms + exam.relievers;
            dailyData[date].relievers += exam.relievers;
        });
        
        return Object.entries(dailyData).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()).map(([date, data]) => ({
            date: format(new Date(date), "dd/MM"),
            "Total Duties": data.duties,
            "Total Relievers": data.relievers
        }));

    }, [examinations]);


    if (invigilators.length === 0 || examinations.length === 0 || !activeAllotment || Object.keys(activeAllotment.assignments).length === 0) {
        return (
            <Card className="m-auto mt-10 max-w-lg text-center">
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
        );
    }


    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Allotment Analytics</h1>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Duties Required per Exam Date</CardTitle>
                        <CardDescription>Rooms, relievers, and total invigilators needed each day.</CardDescription>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <Expand className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[70vh] flex flex-col">
                            <h2 className="text-lg font-semibold">Duties Required per Exam Date</h2>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dutiesRequiredData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar dataKey="No of Rooms" fill="#ffc658" name="Rooms" />
                                        <Bar dataKey="No of Relievers" fill="#fb8c00" name="Relievers" />
                                        <Bar dataKey="Total Invigilators" fill="#e53935" name="Total Required" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={dutiesRequiredData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="No of Rooms" fill="#ffc658" name="Rooms" />
                            <Bar dataKey="No of Relievers" fill="#fb8c00" name="Relievers" />
                            <Bar dataKey="Total Invigilators" fill="#e53935" name="Total Required" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Daily Invigilator Workload</CardTitle>
                            <CardDescription>Number of invigilators assigned vs. free for each exam day.</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                    <Expand className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-[70vh] flex flex-col">
                                <h2 className="text-lg font-semibold">Daily Invigilator Workload</h2>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={dailyWorkloadData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                            <XAxis type="number" />
                                            <YAxis dataKey="date" type="category" tick={{ fontSize: 12 }} width={50} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="Assigned" stackId="a" fill="#4c51bf" name="Assigned" />
                                            <Bar dataKey="Free" stackId="a" fill="#a8b2d1" name="Free" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart layout="vertical" data={dailyWorkloadData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                <XAxis type="number" />
                                <YAxis dataKey="date" type="category" tick={{ fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="Assigned" stackId="a" fill="#4c51bf" name="Assigned" />
                                <Bar dataKey="Free" stackId="a" fill="#a8b2d1" name="Free" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Day-wise Session Trends</CardTitle>
                            <CardDescription>Total duties and relievers over the exam period.</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                    <Expand className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-[70vh] flex flex-col">
                                <h2 className="text-lg font-semibold">Day-wise Session Trends</h2>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={sessionTrendsData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Line type="monotone" dataKey="Total Duties" stroke="#38bdf8" strokeWidth={3} activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="Total Relievers" stroke="#f472b6" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={sessionTrendsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="Total Duties" stroke="#38bdf8" strokeWidth={3} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="Total Relievers" stroke="#f472b6" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
