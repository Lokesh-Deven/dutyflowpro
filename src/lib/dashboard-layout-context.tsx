"use client";

import React, { createContext, useContext } from 'react';

export interface DashboardLayoutContextType {
  isDesktopSidebarCollapsed: boolean;
  setIsDesktopSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

export const DashboardLayoutContext = createContext<DashboardLayoutContextType | null>(null);

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

