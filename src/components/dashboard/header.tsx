import { UserNav } from './user-nav';
import Link from 'next/link';
import { LeafyGreen } from 'lucide-react';
import { HeaderNav } from './header-nav';
import { Button } from '../ui/button';
import { Sun } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
            <LeafyGreen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
            <span className="text-lg font-bold font-headline text-primary-foreground">DutyFlow</span>
            <span className="text-xs text-muted-foreground -mt-1">The AI-Powered Allotments</span>
            </div>
        </Link>
        <div className="hidden md:flex">
            <HeaderNav />
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-auto">
        <Button variant="ghost" size="icon">
            <Sun className="h-5 w-5" />
            <span className="sr-only">Toggle theme</span>
        </Button>
        <UserNav />
      </div>
    </header>
  );
}
