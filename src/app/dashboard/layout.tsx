"use client";

import React, { useState } from 'react';
import Header from '@/components/dashboard/header';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { AllotmentProvider } from '@/lib/allotment-context';
import { SubscriptionGuard } from '@/components/dashboard/subscription-guard';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsDesktopSidebarCollapsed(prev => !prev);
    } else {
      setIsMobileSidebarOpen(prev => !prev);
    }
  };

  return (
    <AllotmentProvider>
      <TooltipProvider delayDuration={150}>
        <div className="min-h-screen bg-[#f4f6fa] dark:bg-[#0b0f19] text-foreground flex">
          {/* Desktop Persistent Left Sidebar (collapsible between w-64 and w-20) */}
          <div
            className={cn(
              "hidden lg:block fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out",
              isDesktopSidebarCollapsed ? "w-20" : "w-64"
            )}
          >
            <SidebarNav
              isCollapsed={isDesktopSidebarCollapsed}
              className="h-full w-full"
            />
          </div>

          {/* Mobile / Tablet Drawer Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              {/* Sidebar drawer content */}
              <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#151241] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
                <button
                  type="button"
                  className="absolute top-4 right-4 p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/10 z-20 transition-colors"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
                <SidebarNav
                  isCollapsed={false}
                  onItemClick={() => setIsMobileSidebarOpen(false)}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
              isDesktopSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
            )}
          >
            <Header
              onToggleSidebar={toggleSidebar}
              isSidebarCollapsed={isDesktopSidebarCollapsed}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              <SubscriptionGuard>
                {children}
              </SubscriptionGuard>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </AllotmentProvider>
  );
}
