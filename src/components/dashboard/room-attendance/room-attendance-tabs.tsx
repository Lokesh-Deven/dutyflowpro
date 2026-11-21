"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserCheck, Smartphone, FileSpreadsheet, BarChart2 } from 'lucide-react';

export const ROOM_ATTENDANCE_TABS = [
  {
    href: '/dashboard/room-attendance/invigilator',
    label: 'Invigilator Attendance',
    badge: 'Portal-Based',
    icon: UserCheck,
    description: 'Publish rooms to invigilator portal & manage access',
  },
  {
    href: '/dashboard/room-attendance/admin',
    label: 'Admin Attendance',
    badge: 'Mobile Floor Walk',
    icon: Smartphone,
    description: 'Take attendance sequentially room-to-room',
  },
  {
    href: '/dashboard/room-attendance/manual',
    label: 'Manual Attendance',
    badge: 'Print & Web Entry',
    icon: FileSpreadsheet,
    description: 'A4 Landscape printable sheets & post-exam digitization',
  },
  {
    href: '/dashboard/room-attendance/status',
    label: 'Attendance Status',
    badge: 'Single Source of Truth',
    icon: BarChart2,
    description: 'Real-time room-wise completion & absentees reporting',
  },
];

export function RoomAttendanceTabs() {
  const pathname = usePathname();

  return (
    <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {ROOM_ATTENDANCE_TABS.map((tab, idx) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === '/dashboard/room-attendance/manual' && pathname === '/dashboard/room-attendance-manual') ||
            (tab.href === '/dashboard/room-attendance/status' && (pathname === '/dashboard/room-attendance' || pathname === '/dashboard/room-attendance/status'));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "py-2.5 px-3 rounded-xl font-headline font-bold text-xs flex items-center gap-2.5 transition-all select-none",
                isActive
                  ? "bg-white text-[#1E2A5E] shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  isActive ? "bg-indigo-50 text-indigo-700" : "bg-slate-200/80 text-slate-500"
                )}
              >
                <tab.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate">{idx + 1}. {tab.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold truncate">
                  {tab.badge}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
