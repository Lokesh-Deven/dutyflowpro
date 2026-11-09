"use client";

import React from 'react';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
          <span>User Management</span>
          <Badge className="bg-blue-950 text-blue-300 border-blue-800 text-xs">Phase 3</Badge>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Cross-institutional user accounts, login auditing, and session governance.
        </p>
      </div>

      <Card className="bg-[#0C1222] border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-950/80 border border-blue-800 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white">Cross-Institutional User Directory</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          Centralized administrative management for institutional staff and faculty accounts will be enabled in Phase 3.
        </p>
      </Card>
    </div>
  );
}

