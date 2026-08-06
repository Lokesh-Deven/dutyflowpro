
"use client";

import { UserNav } from './user-nav';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { HeaderNav } from './header-nav';
import { ThemeToggle } from '../theme-toggle';
import { useEffect, useState } from 'react';
import { useAllotment } from '@/lib/allotment-context';

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
        return null; 
    }

    return (
        <div className="hidden md:flex">
            <HeaderNav />
        </div>
    );
}


export default function Header() {
  const { clearCurrentAllotment } = useAllotment();

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-card px-4 sm:px-6 lg:px-8 dark:bg-slate-900">
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center">
        {/* Left Section: Logo */}
        <div className="flex justify-start">
          <Link href="/dashboard/examinations" onClick={clearCurrentAllotment} className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black font-roboto text-primary leading-tight">DutyFlow</span>
            </div>
          </Link>
        </div>

        {/* Center Section: Navigation (Equidistant from both sides) */}
        <div className="flex justify-center">
          <ClientHeaderNav />
        </div>

        {/* Right Section: Actions */}
        <div className="flex justify-end gap-4">
          <ClientThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
