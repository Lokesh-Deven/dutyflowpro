"use client";

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  Loader2,
  Eye,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { InstitutionRegistrationRecord } from '@/lib/superadmin-types';
import { useToast } from '@/hooks/use-toast';

export default function InstitutionManagementPage() {
  const { toast } = useToast();
  const [institutions, setInstitutions] = useState<InstitutionRegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInst, setSelectedInst] = useState<InstitutionRegistrationRecord | null>(null);

  const fetchInstitutions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin/approvals?status=all');
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setInstitutions(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching institutions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleToggleSuspend = async (inst: InstitutionRegistrationRecord) => {
    const isSuspended = inst.approval_status === 'suspended';
    const action = isSuspended ? 'reactivate' : 'suspend';
    const promptMsg = isSuspended
      ? `Reactivate operational access for ${inst.institution_name}?`
      : `Suspend operations for ${inst.institution_name}? Institutional outputs will be paused.`;

    if (!confirm(promptMsg)) return;

    try {
      const res = await fetch('/api/superadmin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, institutionId: inst.id }),
      });
      if (res.ok) {
        toast({
          title: isSuspended ? 'Institution Reactivated' : 'Institution Suspended',
          description: `Status updated for ${inst.institution_name}.`,
        });
        fetchInstitutions();
      }
    } catch (_) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.' });
    }
  };

  const filtered = institutions.filter((inst) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      inst.institution_name?.toLowerCase().includes(q) ||
      inst.email?.toLowerCase().includes(q) ||
      inst.institution_code?.toLowerCase().includes(q) ||
      inst.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Institution Directory &amp; Governance</span>
            <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800 text-xs">
              Management
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Comprehensive registry of all institutions, status monitoring, suspension, and reactivation.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchInstitutions}
          disabled={isLoading}
          className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 h-9 text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0C1222] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, code, or UUID..."
            className="pl-9 bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 h-9 text-xs"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Total Institutions: <strong className="text-white">{institutions.length}</strong>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-[#0C1222] border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Loading institutions...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <Building2 className="w-6 h-6 mx-auto text-slate-500" />
              <p className="font-semibold text-slate-300">No matching institutions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-6">Institution Name</th>
                    <th className="py-3 px-6">Institution Code</th>
                    <th className="py-3 px-6">Institution ID (UUID)</th>
                    <th className="py-3 px-6">Admin Email</th>
                    <th className="py-3 px-6">Registration Date</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((inst) => {
                    const status = inst.approval_status || (inst.institution_code ? 'approved' : 'pending');
                    return (
                      <tr key={inst.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-bold text-white text-sm">
                          {inst.institution_name}
                        </td>
                        <td className="py-4 px-6">
                          {inst.institution_code ? (
                            <Badge className="bg-[#6342E8] text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-lg tracking-wider">
                              {inst.institution_code}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Pending Approval</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-mono text-[11px] text-slate-400 max-w-[140px] truncate" title={inst.id}>
                          {inst.id}
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-mono text-[11px]">
                          {inst.email}
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-[11px]">
                          {new Date(inst.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-6">
                          <Badge
                            className={`text-[10px] font-semibold capitalize ${
                              status === 'approved'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : status === 'pending'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : status === 'suspended'
                                ? 'bg-red-950/80 text-red-300 border-red-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {status}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInst(inst)}
                              className="h-8 px-2.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </Button>

                            {status === 'approved' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleSuspend(inst)}
                                className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs"
                              >
                                Suspend
                              </Button>
                            )}

                            {status === 'suspended' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleSuspend(inst)}
                                className="h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 text-xs"
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedInst && (
        <Dialog open={!!selectedInst} onOpenChange={() => setSelectedInst(null)}>
          <DialogContent className="bg-[#0C1222] border-slate-800 text-slate-100 max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>{selectedInst.institution_name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Institutional ID and governance metadata
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Institution Code</span>
                  <p className="font-mono text-base font-black text-indigo-400">
                    {selectedInst.institution_code || 'Pending'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Status</span>
                  <div>
                    <Badge className="capitalize text-[10px]">
                      {selectedInst.approval_status || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Admin Email</span>
                <p className="font-mono text-slate-200">{selectedInst.email}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Permanent Institution ID</span>
                <p className="font-mono text-[11px] text-slate-400 break-all">{selectedInst.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Registered On</span>
                  <p className="text-slate-300">{new Date(selectedInst.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Approved By</span>
                  <p className="text-slate-300">{selectedInst.approved_by || '—'}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedInst(null)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
