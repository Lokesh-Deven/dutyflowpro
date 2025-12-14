
"use client";

import { UserNav } from './user-nav';
import Link from 'next/link';
import { LeafyGreen } from 'lucide-react';
import { HeaderNav } from './header-nav';
import { ThemeToggle } from '../theme-toggle';
import { useEffect, useState } from 'react';

const ClientThemeToggle = () => {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return <ThemeToggle />;
}

const ClientHeaderNav = () => {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // Or a placeholder/skeleton
    }

    return <HeaderNav />;
}


export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 lg:px-8 dark:bg-slate-900">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
            <LeafyGreen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
            <span className="text-lg font-bold font-headline text-slate-800 dark:text-white">DutyFlow</span>
            </div>
        </Link>
        <div className="hidden md:flex">
            <ClientHeaderNav />
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-auto">
        <ClientThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
