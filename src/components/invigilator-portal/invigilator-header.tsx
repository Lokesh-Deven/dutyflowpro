"use client";

import React from 'react';
import { useInvigilatorPortal } from '@/lib/invigilator-portal-context';
import { getInvigilatorInitial } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Wifi,
  WifiOff,
  UserCheck,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import Link from 'next/link';

interface InvigilatorHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: 'today' | 'attendance' | 'history' | 'profile') => void;
}

export function InvigilatorHeader({ activeTab = 'today', onTabChange }: InvigilatorHeaderProps) {
  const { session, logout, isOnline } = useInvigilatorPortal();
  const initial = getInvigilatorInitial(session?.name);

  return (
    <header className="sticky top-0 z-30 bg-[#151241] text-white border-b border-white/10 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xs">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-headline font-black text-lg text-white">Duty</span>
              <span className="font-headline font-black text-lg text-blue-400">Flow</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-400/30 uppercase tracking-wider ml-1">
                Invigilator
              </span>
              {session?.institutionCode && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 tracking-wider">
                  Inst {session.institutionCode}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
              {session?.institutionName || 'Examination Portal'}
            </p>
          </div>
        </div>

        {/* Right: Network Status, Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Online / Offline indicator for exam hall resilience */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
            title={isOnline ? 'Connected to Examination Network' : 'Working in Offline Mode. Attendance is saved locally.'}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                <span>Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline Draft</span>
              </>
            )}
          </div>

          {/* Invigilator Monogram Avatar */}
          <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-white/10">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-lg leading-none shadow-sm ring-2 ring-indigo-400/30 shrink-0 select-none cursor-pointer"
              title={session?.name}
              onClick={() => onTabChange?.('profile')}
            >
              {initial}
            </div>

            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-white leading-tight truncate max-w-[130px]">
                {session?.name || 'Invigilator'}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                {session?.designation || 'Faculty'}
              </div>
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-300 hover:text-white hover:bg-white/10 text-xs font-semibold px-2.5 h-8 gap-1.5 ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
