"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Building2, UserCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserNav() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const institutionName = profile?.institution_name || (user?.user_metadata?.institution_name as string) || "Institution";
  const userEmail = user?.email || profile?.email || "faculty@institution.edu";
  
  // Single letter initial (first letter of institution name)
  const singleInitial = (institutionName.trim().charAt(0) || userEmail.trim().charAt(0) || "D").toUpperCase();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 ring-2 ring-[#4F46E5]/20 hover:ring-[#4F46E5]/50 transition-all">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-tr from-[#4F46E5] to-[#312E81] text-white font-extrabold text-sm select-none">
              {singleInitial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 rounded-xl border-border shadow-md" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex items-start gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
              {singleInitial}
            </div>
            <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
              <p className="text-sm font-bold leading-none text-foreground truncate">{institutionName}</p>
              <p className="text-xs leading-none text-muted-foreground truncate pt-0.5">
                {userEmail}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer m-1 rounded-lg">
          <Link href="/dashboard/profile" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-[#4F46E5]" />
            <span className="font-medium text-xs">Profile & Subscription</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive m-1 rounded-lg">
          <LogOut className="mr-2 h-4 w-4" />
          <span className="font-medium text-xs">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
