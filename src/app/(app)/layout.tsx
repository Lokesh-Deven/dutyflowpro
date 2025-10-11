import Header from '@/components/dashboard/header';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { Sidebar, SidebarProvider, SidebarInset, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { LeafyGreen } from 'lucide-react';
import Link from 'next/link';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <LeafyGreen className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-bold font-headline text-primary-fpreground">DutyFlow</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <Header />
          <main className="p-4 sm:p-6 lg:p-8 bg-background flex-1">
            {children}
          </main>
        </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
