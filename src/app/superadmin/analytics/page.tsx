"use client";

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
          <span>Platform Analytics</span>
          <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-xs">Phase 3</Badge>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Examination volume, duty allotments, and student seating throughput metrics.
        </p>
      </div>

      <Card className="bg-[#0C1222] border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white">Platform Usage &amp; Analytics</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          Aggregated system performance, examination duty volume, and seating allocation analytics will be presented here in Phase 3.
        </p>
      </Card>
    </div>
  );
}

