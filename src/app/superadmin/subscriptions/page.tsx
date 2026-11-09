"use client";

import React from 'react';
import { CreditCard, Sparkles, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
          <span>Subscription Management</span>
          <Badge className="bg-purple-950 text-purple-300 border-purple-800 text-xs">Phase 3</Badge>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Institutional plans, tier quotas, and renewal monitoring.
        </p>
      </div>

      <Card className="bg-[#0C1222] border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-800 text-purple-400 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white">Subscription Management Module</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          Currently, all approved institutions have unrestricted Free Access. Tiered subscription billing and institutional license packages will be manageable here in Phase 3.
        </p>
      </Card>
    </div>
  );
}

