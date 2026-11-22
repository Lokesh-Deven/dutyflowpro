"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { StudentMasterProfile } from '@/lib/student-master-types';
import { StudentMasterDirectory } from '@/components/dashboard/hall-tickets/student-master-directory';
import { HallTicketGeneratorView } from '@/components/dashboard/hall-tickets/hall-ticket-generator-view';
import { Users, Ticket, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HallTicketsPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'generator'>('directory');
  const [selectedStudentForGeneration, setSelectedStudentForGeneration] = useState<StudentMasterProfile | null>(null);

  const handleGenerateForStudent = (student: StudentMasterProfile) => {
    setSelectedStudentForGeneration(student);
    setActiveTab('generator');
  };

  const handleNavigateToGenerator = () => {
    setActiveTab('generator');
  };

  const handleSwitchToDirectory = () => {
    setActiveTab('directory');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Main Navigation Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer",
              activeTab === 'directory'
                ? "bg-[#6342e8] text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            )}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>1. Student Master Directory</span>
            <span className="hidden md:inline-block text-[11px] font-normal opacity-80">
              (Data & Photos)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer",
              activeTab === 'generator'
                ? "bg-[#6342e8] text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            )}
          >
            <Ticket className="w-4 h-4 shrink-0" />
            <span>2. Generate Hall Tickets</span>
            <span className="hidden md:inline-block text-[11px] font-normal opacity-80">
              (Live Timetable)
            </span>
          </button>
        </div>

        {/* Informative Sub-Badge */}
        <div className="hidden xl:flex items-center gap-2 pr-3 text-xs font-semibold text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>PU Board & Degree Examination Standard Admit Cards</span>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'directory' ? (
        <StudentMasterDirectory
          onGenerateForStudent={handleGenerateForStudent}
          onNavigateToGenerator={handleNavigateToGenerator}
        />
      ) : (
        <HallTicketGeneratorView
          selectedStudentFromDirectory={selectedStudentForGeneration}
          onClearSelectedStudent={() => setSelectedStudentForGeneration(null)}
          onSwitchToDirectory={handleSwitchToDirectory}
        />
      )}
    </div>
  );
}
