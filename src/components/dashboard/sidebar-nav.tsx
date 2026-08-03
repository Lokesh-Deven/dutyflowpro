
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
  CalendarDays,
  BarChart2,
  Info,
  Users,
  FileText
} from 'lucide-react';

export const navItems = [
  { href: '/dashboard/examinations', label: 'New Allotment', icon: LayoutGrid },
  { href: '/dashboard/saved', label: 'Saved Allotments', icon: Save },
  { href: '/dashboard/schedule', label: 'Day-wise Schedule', icon: CalendarDays },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/about', label: 'About', icon: Info },
];

export const newAllotmentSteps = [
    { href: '/dashboard/examinations', label: 'Examinations', icon: FileText },
    { href: '/dashboard/invigilators', label: 'Invigilators', icon: Users },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href) && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        const isNewAllotmentActive = item.href === '/dashboard/examinations' && (pathname.startsWith('/dashboard/invigilators') || pathname.startsWith('/dashboard/examinations'));

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isNewAllotmentActive || isActive} tooltip={item.label}>
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
