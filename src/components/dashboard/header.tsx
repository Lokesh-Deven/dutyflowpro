import { UserNav } from './user-nav';
import Link from 'next/link';
import { LeafyGreen } from 'lucide-react';
import { HeaderNav } from './header-nav';
import { ThemeToggle } from '../theme-toggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
            <LeafyGreen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
            <span className="text-lg font-bold font-headline" style={{color: 'navy'}}>DutyFlow</span>
            </div>
        </Link>
        <div className="hidden md:flex">
            <HeaderNav />
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-auto">
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
