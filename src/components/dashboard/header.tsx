"use client";

import { UserNav } from './user-nav';
import Link from 'next/link';
import { CalendarCheck2 } from 'lucide-react';
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
};

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
};

export default function Header() {
  const { clearCurrentAllotment } = useAllotment();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
      {/* Top Gradient Accent Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />

      <div className="h-16 px-4 sm:px-6 lg:px-8 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        {/* Left Section: Modern Brand Logo */}
        <div className="flex items-center">
          <Link
            href="/dashboard/examinations"
            onClick={clearCurrentAllotment}
            className="flex items-center gap-3 group"
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#4F46E5] via-[#4338ca] to-[#0891B2] text-white shadow-sm ring-2 ring-[#4F46E5]/20 group-hover:scale-105 transition-all duration-200 flex items-center justify-center">
              <CalendarCheck2 className="w-5 h-5" />
            </div>

            <div className="flex flex-col">
              <span className="text-2xl font-black font-headline tracking-tight text-foreground leading-none">
                Duty<span className="bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#0891B2] bg-clip-text text-transparent">Flow</span>
              </span>
              <span className="text-[10px] font-medium tracking-tight text-muted-foreground mt-0.5">
                Exam Duty Allocation Software
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section: Navigation (Equidistant & Centered) */}
        <div className="flex justify-center">
          <ClientHeaderNav />
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center justify-end gap-3">
          <div className="p-1 rounded-lg bg-muted/40 border border-border/60">
            <ClientThemeToggle />
          </div>
          <UserNav />
        </div>
      </div>
    </header>
  );
}
