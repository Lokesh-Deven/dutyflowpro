"use client";

import { useState } from 'react';
import type { Invigilator, Examination } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvigilatorManagement } from '@/components/dashboard/invigilator-management';
import { ExaminationManagement } from '@/components/dashboard/examination-management';
import { AllotmentSheet } from '@/components/dashboard/allotment-sheet';
import IndividualDashboard from '@/components/dashboard/individual-dashboard';
import AnalyticsDashboard from '@/components/dashboard/analytics-dashboard';

export default function DashboardPage() {
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState("setup");

  const handleGenerate = () => {
    if (invigilators.length > 0 && examinations.length > 0) {
      setIsGenerated(true);
      setActiveTab("allotment");
    } else {
      // In a real app, show a toast notification
      alert("Please add at least one invigilator and one examination.");
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight font-headline">New Allotment</h1>
            <TabsList>
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="allotment" disabled={!isGenerated}>Duty Allotment</TabsTrigger>
                <TabsTrigger value="invigilator-view" disabled={!isGenerated}>Invigilator View</TabsTrigger>
                <TabsTrigger value="analytics" disabled={!isGenerated}>Analytics</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="setup" className="space-y-6">
          <InvigilatorManagement invigilators={invigilators} setInvigilators={setInvigilators} />
          <ExaminationManagement examinations={examinations} setExaminations={setExaminations} onGenerate={handleGenerate} />
        </TabsContent>
        <TabsContent value="allotment">
          <AllotmentSheet invigilators={invigilators} examinations={examinations} />
        </TabsContent>
        <TabsContent value="invigilator-view">
            <IndividualDashboard invigilators={invigilators} examinations={examinations} />
        </TabsContent>
        <TabsContent value="analytics">
            <AnalyticsDashboard invigilators={invigilators} examinations={examinations}/>
        </TabsContent>
      </Tabs>
    </div>
  );
}
