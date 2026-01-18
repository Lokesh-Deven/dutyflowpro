"use client";

import { UserNav } from './user-nav';
import Link from 'next/link';
import { Users } from 'lucide-react';
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
        return <div className="hidden md:flex" />; // Render the container but empty
    }

    return (
        <div className="hidden md:flex">
            <HeaderNav />
        </div>
    );
}


export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 lg:px-8 dark:bg-slate-900">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
            <span className="text-2xl font-bold font-headline text-primary">DutyFlow</span>
            </div>
        </Link>
        <ClientHeaderNav />
      </div>
      
      <div className="flex items-center gap-4 ml-auto">
        <ClientThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
