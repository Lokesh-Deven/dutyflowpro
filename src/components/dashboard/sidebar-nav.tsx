"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutGrid,
  Save,
  History,
  CalendarDays,
  BarChart2,
  Info,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'New Allotment', icon: LayoutGrid },
  { href: '/dashboard/saved', label: 'Saved Allotments', icon: Save },
  { href: '/dashboard/history', label: 'History', icon: History },
  { href: '/dashboard/schedule', label: 'Day-wise Schedule', icon: CalendarDays },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/about', label: 'About', icon: Info },
];

export function SidebarNav() {
  const pathname = usePathname();

  // Simple logic to match base path for dashboard
  const cleanPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const isDashboardActive = cleanPathname === '/dashboard';

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        // Special check for the main dashboard page
        const isActive = item.href === '/dashboard' ? isDashboardActive : pathname.startsWith(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

// Update Next.js Link usage in `sidebar-nav.tsx` to align with App Router best practices.
const OriginalSidebarNav = () => {
  const pathname = usePathname();
  const getPath = (href: string) => {
    // For App Router, we handle root path differently
    if (href === '/dashboard' && (pathname === '/dashboard' || pathname === '/')) {
      return '/';
    }
    return href;
  }
  
  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const path = getPath(item.href);
        const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={path} passHref>
              <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
};
