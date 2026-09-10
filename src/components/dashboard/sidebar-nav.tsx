"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bookmark,
  CalendarDays,
  BarChart2,
  ListChecks,
  Signature,
  BookUser,
  UserCircle,
  Settings,
  HelpCircle,
  ChevronDown,
  LogOut,
  PlusSquare,
  Sparkles,
  FileText,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useAllotment } from '@/lib/allotment-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const navItems = [
  { href: '/dashboard/examinations', label: 'New Allotment', icon: PlusSquare },
  { href: '/dashboard/saved', label: 'Saved Allotments', icon: Bookmark },
  { href: '/dashboard/schedule', label: 'Day-wise Schedule', icon: CalendarDays },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/instructions', label: 'Add Instructions', icon: ListChecks },
  { href: '/dashboard/signatory', label: 'Add Signatory', icon: Signature },
  { href: '/dashboard/directory', label: 'Invigilator Directory', icon: BookUser },
];

export const newAllotmentSteps = [
  { href: '/dashboard/examinations', label: 'Examinations', icon: FileText },
  { href: '/dashboard/invigilators', label: 'Invigilators', icon: Users },
];

interface SidebarNavProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
  className?: string;
}

export function SidebarNav({ isCollapsed = false, onItemClick, className }: SidebarNavProps) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const isGuest = !user || profile?.id === 'guest-session';
  const institutionName = isGuest
    ? (profile?.institution_name || "Guest Profile")
    : (profile?.institution_name && profile.institution_name !== 'Guest Profile' ? profile.institution_name : null)
    || (user?.user_metadata?.institution_name as string)
    || (user?.email ? user.email.split('@')[0] : "Institution");

  const userRole = isGuest
    ? 'Guest'
    : profile?.subscription_status === 'Subscribed'
      ? 'Pro Member'
      : 'Free Access';

  const singleInitial = (institutionName.trim().charAt(0) || user?.email?.trim().charAt(0) || "U").toUpperCase();

  const { clearCurrentAllotment } = useAllotment();

  const handleNavClick = (itemLabel?: string | React.MouseEvent) => {
    if (typeof itemLabel === 'string' && itemLabel === 'New Allotment') {
      clearCurrentAllotment();
    }
    if (onItemClick) {
      onItemClick();
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside
      className={cn(
        "bg-[#151241] text-white flex flex-col justify-between h-full border-r border-[#241d5e] select-none transition-all duration-300",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Top Branding */}
      <div className={cn("pb-6 transition-all duration-300", isCollapsed ? "p-3" : "p-5")}>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/examinations"
                onClick={handleNavClick}
                className="flex items-center justify-center hover:scale-110 transition-all duration-200 mx-auto w-8 h-8"
              >
                <Image
                  src="/images/dutyflow-logo.png"
                  alt="DutyFlow Logo"
                  width={32}
                  height={32}
                  priority
                  className="w-full h-full object-contain"
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1e1957] text-white border-[#31297e] font-semibold text-xs">
              DutyFlow Home
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/dashboard/examinations"
            onClick={handleNavClick}
            className="flex items-center gap-2.5 group select-none"
          >
            <div className="relative w-[21.33px] h-[21.33px] flex items-center justify-center shrink-0 translate-y-[2.5px] group-hover:scale-105 transition-transform duration-200">
              <Image
                src="/images/dutyflow-logo.png"
                alt="DutyFlow Logo"
                width={22}
                height={22}
                priority
                className="w-full h-full object-contain"
              />
            </div>

            <span className="text-2xl font-black font-headline tracking-tight text-white leading-none">
              Duty<span className="text-sky-400">Flow</span>
            </span>
          </Link>
        )}

        {/* Main Navigation Links */}
        <nav className={cn("space-y-1.5", isCollapsed ? "mt-6" : "mt-8")}>
          {navItems.map((item) => {
            const isNewAllotmentActive = item.href === '/dashboard/examinations' && (
              pathname.startsWith('/dashboard/invigilators') ||
              pathname.startsWith('/dashboard/examinations') ||
              pathname.startsWith('/dashboard/allotment')
            );
            const isActive = isNewAllotmentActive || pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      onClick={() => handleNavClick(item.label)}
                      className={cn(
                        "flex items-center justify-center w-11 h-11 mx-auto rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                        isActive
                          ? "bg-[#6342e8] text-white shadow-lg shadow-purple-900/40"
                          : "text-[#b4b1db] hover:text-white hover:bg-white/[0.07]"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-[#9d99ce]")} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1e1957] text-white border-[#31297e] font-semibold text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(item.label)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                  isActive
                    ? "bg-[#6342e8] text-white shadow-lg shadow-purple-900/30"
                    : "text-[#b4b1db] hover:text-white hover:bg-white/[0.07]"
                )}
              >
                <item.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-[#9d99ce]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className={cn("space-y-3 border-t border-white/[0.08] transition-all duration-300", isCollapsed ? "p-2.5" : "p-4")}>
        {/* Settings & Help Links */}
        <div className="space-y-1">
          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/profile"
                    onClick={handleNavClick}
                    className="flex items-center justify-center w-11 h-10 mx-auto rounded-xl text-[#b4b1db] hover:text-white hover:bg-white/[0.07] transition-all"
                  >
                    <Settings className="w-4 h-4 text-[#9d99ce]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1e1957] text-white border-[#31297e] font-semibold text-xs">
                  Settings
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://wa.me/919113815925?text=Hi%20DutyFlow%20Admin,%20I%20would%20like%20assistance%20with%20DutyFlow."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-11 h-10 mx-auto rounded-xl text-[#b4b1db] hover:text-white hover:bg-white/[0.07] transition-all"
                  >
                    <HelpCircle className="w-4 h-4 text-[#9d99ce]" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1e1957] text-white border-[#31297e] font-semibold text-xs">
                  Help & Support
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Link
                href="/dashboard/profile"
                onClick={handleNavClick}
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-[#b4b1db] hover:text-white hover:bg-white/[0.07] transition-all"
              >
                <Settings className="w-4 h-4 text-[#9d99ce]" />
                <span>Settings</span>
              </Link>

              <a
                href="https://wa.me/919113815925?text=Hi%20DutyFlow%20Admin,%20I%20would%20like%20assistance%20with%20DutyFlow."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-[#b4b1db] hover:text-white hover:bg-white/[0.07] transition-all"
              >
                <HelpCircle className="w-4 h-4 text-[#9d99ce]" />
                <span>Help & Support</span>
              </a>
            </>
          )}
        </div>

        {/* User Profile Card */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isCollapsed ? (
              <button
                className="w-11 h-11 mx-auto bg-[#1e1957]/90 hover:bg-[#251f69] border border-purple-500/20 rounded-2xl flex items-center justify-center transition-all group"
                aria-label="User Profile"
              >
                <Avatar className="h-8 w-8 ring-1 ring-purple-400/30 shrink-0">
                  <AvatarFallback className="bg-gradient-to-tr from-[#6342e8] to-[#4323c9] text-white font-bold text-xs">
                    {singleInitial}
                  </AvatarFallback>
                </Avatar>
              </button>
            ) : (
              <button className="w-full bg-[#1e1957]/90 hover:bg-[#251f69] border border-purple-500/20 rounded-2xl p-2.5 flex items-center justify-between gap-2.5 transition-all text-left group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-9 w-9 ring-1 ring-purple-400/30 shrink-0">
                    <AvatarFallback className="bg-gradient-to-tr from-[#6342e8] to-[#4323c9] text-white font-bold text-xs">
                      {singleInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate group-hover:text-purple-200 transition-colors">
                      {institutionName}
                    </span>
                    <span className="text-[10px] text-purple-300/80 truncate">
                      {userRole}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-purple-300/70 shrink-0 group-hover:text-white transition-colors" />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-xl bg-[#1e1957] border-[#31297e] text-white shadow-xl mb-2" align={isCollapsed ? "center" : "start"} side="top">
            <DropdownMenuLabel className="font-normal p-3 pb-2 text-white">
              <p className="text-xs font-bold text-white truncate">{institutionName}</p>
              <p className="text-[11px] text-purple-300/80 truncate pt-0.5">{user?.email || (profile?.email && profile.email !== 'guest@dutyflow.in' ? profile.email : null) || "guest@dutyflow.in"}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem asChild className="cursor-pointer m-1 rounded-lg hover:bg-white/10 focus:bg-white/10 text-white">
              <Link href="/dashboard/profile" onClick={handleNavClick} className="flex items-center gap-2 text-xs">
                <Settings className="h-4 w-4 text-purple-400" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-950/40 m-1 rounded-lg text-xs">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
