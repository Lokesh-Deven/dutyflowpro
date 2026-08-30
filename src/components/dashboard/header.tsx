"use client";

import React, { useEffect, useState } from 'react';
import { UserNav } from './user-nav';
import { HeaderNav } from './header-nav';
import { ThemeToggle } from '../theme-toggle';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function Header({ onToggleSidebar, isSidebarCollapsed = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left Section: Mobile/Desktop Sidebar Hamburger Toggle + Quick Nav */}
        <div className="flex items-center gap-3 md:gap-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="h-9 w-9 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            </TooltipContent>
          </Tooltip>

          <div className="hidden md:flex items-center">
            <HeaderNav />
          </div>
        </div>

        {/* Right Section: Notification, Theme Toggle & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell with indicator */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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

          {/* Theme Toggle */}
          <div className="p-0.5 rounded-full">
            <ClientThemeToggle />
          </div>

          {/* User Nav */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
