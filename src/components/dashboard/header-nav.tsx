
"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { navItems } from './sidebar-nav';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "default" : "ghost"}
            className={cn(
              "gap-2",
              isActive 
                ? "font-semibold text-primary-foreground" 
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
