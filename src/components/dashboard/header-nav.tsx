"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { navItems } from './sidebar-nav';
import { cn } from '@/lib/utils';
import { useAllotment } from '@/lib/allotment-context';

export function HeaderNav() {
  const pathname = usePathname();
  const { clearCurrentAllotment } = useAllotment();

  const handleNavClick = (href: string) => {
    if (href === '/dashboard/examinations') {
      clearCurrentAllotment();
    }
  };

  return (
    <nav className="flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/70 shadow-2xs">
      {navItems.map((item) => {
        const isNewAllotmentActive = item.href === '/dashboard/examinations' && (pathname.startsWith('/dashboard/invigilators') || pathname.startsWith('/dashboard/examinations') || pathname.startsWith('/dashboard/allotment'));
        const isActive = isNewAllotmentActive || pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => handleNavClick(item.href)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all duration-200",
              isActive 
                ? "bg-[#4F46E5] text-white shadow-xs" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/80"
            )}
          >
            <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-muted-foreground")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
