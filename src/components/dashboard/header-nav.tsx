"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Bookmark, CalendarDays, BarChart2, ListChecks, Signature, BookUser } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HeaderNav() {
  const pathname = usePathname();

  const items = [
    { href: '/dashboard/examinations', label: 'New Allotment', icon: Plus, isAction: true },
    { href: '/dashboard/saved', label: 'Saved Allotments', icon: Bookmark },
    { href: '/dashboard/schedule', label: 'Day-wise Schedule', icon: CalendarDays },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/dashboard/instructions', label: 'Instructions', icon: ListChecks },
    { href: '/dashboard/signatory', label: 'Signatory', icon: Signature },
    { href: '/dashboard/directory', label: 'Directory', icon: BookUser },
  ];

  return (
    <nav className="flex items-center gap-2">
      {items.map((item) => {
        const isNewAllotmentActive = item.href === '/dashboard/examinations' && (
          pathname.startsWith('/dashboard/invigilators') ||
          pathname.startsWith('/dashboard/examinations') ||
          pathname.startsWith('/dashboard/allotment')
        );
        const isActive = isNewAllotmentActive || pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        if (item.isAction) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 shadow-xs",
                isActive
                  ? "bg-[#6342e8] text-white hover:bg-[#5232d6]"
                  : "bg-[#6342e8]/10 text-[#6342e8] hover:bg-[#6342e8]/20"
              )}
            >
              <item.icon className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200",
              isActive
                ? "text-[#6342e8] bg-[#6342e8]/10 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            )}
          >
            <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-[#6342e8]" : "text-slate-500")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
