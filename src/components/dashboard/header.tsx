import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from './user-nav';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 lg:px-8">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="hidden md:flex items-center gap-4">
        {/* Potentially add breadcrumbs or other header content here */}
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <UserNav />
      </div>
    </header>
  );
}
