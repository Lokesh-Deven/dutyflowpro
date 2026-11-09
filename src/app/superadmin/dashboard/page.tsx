"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Clock,
  CheckCircle2,
  Ban,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Users,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SuperAdminStats, InstitutionRegistrationRecord } from '@/lib/superadmin-types';

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<SuperAdminStats>({
    total_institutions: 0,
    pending_approvals: 0,
    approved_institutions: 0,
    suspended_institutions: 0,
  });
  const [recentPending, setRecentPending] = useState<InstitutionRegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch('/api/superadmin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) setStats(statsData.stats);
      }

      // 2. Fetch Pending Queue
      const approvalsRes = await fetch('/api/superadmin/approvals?status=pending');
      if (approvalsRes.ok) {
        const approvalsData = await approvalsRes.json();
        if (approvalsData.data) {
          setRecentPending(approvalsData.data.slice(0, 5));
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-white">
              Super Admin Console
            </h1>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-xs">
              Live Control
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Institutional approval, automated code generation, and access governance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/superadmin/approvals">
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-md shadow-indigo-950/40">
              <span>Institution Approvals</span>
              {stats.pending_approvals > 0 && (
                <span className="bg-white text-indigo-700 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {stats.pending_approvals}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Institutions */}
        <Card className="bg-[#0C1222] border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Institutions</span>
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white font-mono">
              {isLoading ? <Loader2 className="w-7 h-7 animate-spin text-slate-500" /> : stats.total_institutions}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">All registered administrator accounts</p>
          </CardContent>
        </Card>

        {/* Card 2: Pending Approvals */}
        <Card className="bg-[#0C1222] border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Approvals</span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 font-mono">
                {isLoading ? <Loader2 className="w-7 h-7 animate-spin text-slate-500" /> : stats.pending_approvals}
              </span>
              {stats.pending_approvals > 0 && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting Super Admin verification</p>
          </CardContent>
        </Card>

        {/* Card 3: Approved Institutions */}
        <Card className="bg-[#0C1222] border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved Institutions</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              {isLoading ? <Loader2 className="w-7 h-7 animate-spin text-slate-500" /> : stats.approved_institutions}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Active with assigned 3-digit Code</p>
          </CardContent>
        </Card>

        {/* Card 4: Suspended Institutions */}
        <Card className="bg-[#0C1222] border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-red-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Suspended</span>
              <Ban className="w-5 h-5 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-400 font-mono">
              {isLoading ? <Loader2 className="w-7 h-7 animate-spin text-slate-500" /> : stats.suspended_institutions}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Temporarily locked from generation</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Quick Review Table */}
      <Card className="bg-[#0C1222] border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800/80 px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Pending Institution Approvals Queue</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5">
              Registrations waiting for institutional verification and code allocation
            </CardDescription>
          </div>
          <Link href="/superadmin/approvals">
            <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-white hover:bg-slate-800 text-xs gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading pending registrations...</span>
            </div>
          ) : recentPending.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-300">All caught up!</p>
              <p className="text-slate-500 text-[11px]">There are no pending registrations requiring approval at this moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-6">Institution Name</th>
                    <th className="py-3 px-6">Admin Email</th>
                    <th className="py-3 px-6">Registered On</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentPending.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-white">
                        {inst.institution_name}
                      </td>
                      <td className="py-3.5 px-6 text-slate-300 font-mono text-[11px]">
                        {inst.email}
                      </td>
                      <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                        {new Date(inst.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge className="bg-amber-950/80 text-amber-300 border-amber-800 text-[10px] font-semibold">
                          Pending Approval
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Link href="/superadmin/approvals">
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold h-7 px-3 rounded-lg">
                            Review &amp; Approve
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
