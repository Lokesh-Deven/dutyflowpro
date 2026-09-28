"use client";

import React, { useState, createContext, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/dashboard/header';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { AllotmentProvider } from '@/lib/allotment-context';
import { StudentSeatingProvider } from '@/lib/student-seating-context';
import { SubscriptionGuard } from '@/components/dashboard/subscription-guard';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getStudentSession } from '@/lib/student-portal-service';
import { getInvigilatorSession } from '@/lib/invigilator-portal-service';

interface DashboardLayoutContextType {
  isDesktopSidebarCollapsed: boolean;
  setIsDesktopSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextType | null>(null);

export const useDashboardLayout = () => {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    return {
      isDesktopSidebarCollapsed: false,
      setIsDesktopSidebarCollapsed: () => {},
      toggleSidebar: () => {},
    };
  }
  return context;
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAllotmentPage = pathname?.startsWith('/dashboard/allotment');
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  // Restrict student and invigilator roles from accessing administrative dashboard
  useEffect(() => {
    if (typeof window === 'undefined' || isAuthLoading) return;
    
    // If student session is active and no admin user is signed in, redirect student to My Examination
    const studentSession = getStudentSession();
    if (studentSession && studentSession.registerNumber && !user) {
      router.replace('/student/my-examination');
      return;
    }

    // If invigilator session is active and no admin user is signed in, redirect to Invigilator Dashboard
    const invigilatorSession = getInvigilatorSession();
    if (invigilatorSession && invigilatorSession.invigilatorId && !user) {
      router.replace('/invigilator/dashboard');
      return;
    }
  }, [user, isAuthLoading, router]);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsDesktopSidebarCollapsed(prev => !prev);
    } else {
      setIsMobileSidebarOpen(prev => !prev);
    }
  };

  return (
    <DashboardLayoutContext.Provider
      value={{
        isDesktopSidebarCollapsed,
        setIsDesktopSidebarCollapsed,
        toggleSidebar,
      }}
    >
      <AllotmentProvider>
        <StudentSeatingProvider>
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

                <main
                  className={cn(
                    "flex-1",
                    isAllotmentPage
                      ? "w-full max-w-none p-2 sm:p-3.5 lg:p-4"
                      : "p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto"
                  )}
                >
                  <SubscriptionGuard>
                    {children}
                  </SubscriptionGuard>
                </main>
              </div>
            </div>
          </TooltipProvider>
        </StudentSeatingProvider>
      </AllotmentProvider>
    </DashboardLayoutContext.Provider>
  );
}
