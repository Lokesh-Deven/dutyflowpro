"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { navItems } from './sidebar-nav';
import { Button } from '../ui/button';
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
    <nav className="flex items-center space-x-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Button
            key={item.href}
            asChild
            variant="default"
            className={cn(
              "gap-2 transition-all",
              isActive 
                ? "font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700" 
                : "hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600"
            )}
          >
            <Link href={item.href} onClick={() => handleNavClick(item.href)}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
