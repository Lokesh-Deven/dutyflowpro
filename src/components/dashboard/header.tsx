"use client";

import React, { useEffect, useState } from 'react';
import { UserNav } from './user-nav';
import { ThemeToggle } from '../theme-toggle';
import { Menu, Bell, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useAllotment } from '@/lib/allotment-context';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  institutionName?: string;
}

const ClientThemeToggle = () => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <ThemeToggle />;
};

const DEFAULT_INSTITUTION_NAME = "Seshadripuram Independent Pre-University College";

export default function Header({
  onToggleSidebar,
  isSidebarCollapsed = false,
  institutionName: propInstitutionName,
}: HeaderProps) {
  const { user, profile } = useAuth();
  const { examinations, activeAllotment } = useAllotment();

  // Resolve active institution name from prop, auth profile, exam state, or default fallback
  const resolvedInstitutionName =
    propInstitutionName?.trim() ||
    (profile?.institution_name && profile.institution_name !== 'Guest Profile' && profile.institution_name !== 'Institution'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    examinations?.[0]?.college?.trim() ||
    activeAllotment?.examinations?.[0]?.college?.trim() ||
    DEFAULT_INSTITUTION_NAME;

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 min-w-0">
        {/* Left Section: Sidebar Toggle Button + Active Institution Display */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="h-9 w-9 shrink-0 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            </TooltipContent>
          </Tooltip>

          {/* Active Institution Name & Icon */}
          <div
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 group"
            title={resolvedInstitutionName}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[#6342e8] dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-900/40 shadow-2xs">
              <Building2 className="w-3.5 h-3.5" />
            </div>

            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate min-w-0 tracking-tight select-none">
              {resolvedInstitutionName}
            </span>
          </div>
        </div>

        {/* Right Section: Notification Bell, Theme/Settings Toggle & Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Notification Bell with indicator */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#6342e8] ring-2 ring-white dark:ring-slate-900" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4 rounded-xl shadow-lg border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Notifications</h4>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="p-2.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                  <p className="font-semibold text-slate-900 dark:text-white">Welcome to DutyFlow</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Automate and streamline exam invigilation allocations effortlessly.</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme / Appearance Toggle */}
          <div className="p-0.5 rounded-full">
            <ClientThemeToggle />
          </div>

          {/* User Profile Avatar with Settings & Logout Menu */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
