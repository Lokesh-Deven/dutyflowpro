"use client";

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Building2,
  Mail,
  Calendar,
  Key,
  ShieldCheck,
  Check,
  Ban,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { InstitutionRegistrationRecord } from '@/lib/superadmin-types';

export default function InstitutionApprovalsPage() {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<InstitutionRegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Modals state
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionRegistrationRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Success approval popup
  const [approvedCodeResult, setApprovedCodeResult] = useState<{
    collegeName: string;
    code: string;
    email: string;
  } | null>(null);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/superadmin/approvals'
        : `/api/superadmin/approvals?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setRegistrations(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [statusFilter]);

  // Execute Approval
  const handleConfirmApproval = async () => {
    if (!selectedInstitution) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/superadmin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          institutionId: selectedInstitution.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast({
          variant: 'destructive',
          title: 'Approval Failed',
          description: data.error || 'Could not approve institution.',
        });
        return;
      }

      setApprovedCodeResult({
        collegeName: selectedInstitution.institution_name,
        code: data.institution_code,
        email: selectedInstitution.email,
      });

      toast({
        title: 'Institution Approved',
        description: `Code ${data.institution_code} generated and assigned. Notification dispatched.`,
      });

      setIsApproveOpen(false);
      fetchRegistrations();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Error processing approval.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Rejection
  const handleConfirmRejection = async () => {
    if (!selectedInstitution) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/superadmin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          institutionId: selectedInstitution.id,
          reason: rejectReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast({
          variant: 'destructive',
          title: 'Rejection Failed',
          description: data.error || 'Could not reject registration.',
        });
        return;
      }

      toast({
        title: 'Registration Rejected',
        description: 'Notice dispatched to administrator.',
      });

      setIsRejectOpen(false);
      setRejectReason('');
      fetchRegistrations();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Error processing rejection.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter list by search query
  const filteredRegistrations = registrations.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.institution_name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.institution_code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Institution Approval System</span>
            <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800 text-xs">
              Phase 2 Engine
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Review institution registrations, verify identity, and trigger automatic 3-digit Institution Code generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRegistrations}
            disabled={isLoading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0C1222] p-3.5 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by college, email, or code..."
            className="pl-9 bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 h-9 text-xs"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {status === 'all' ? 'All Registrations' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Registrations Table */}
      <Card className="bg-[#0C1222] border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Loading institution registrations from database...</span>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Building2 className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-300">No institutions found</p>
              <p className="text-slate-500 text-[11px]">No records match your selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-6">Institution Name</th>
                    <th className="py-3 px-6">Administrator Email</th>
                    <th className="py-3 px-6">Institution Code</th>
                    <th className="py-3 px-6">Registration Date</th>
                    <th className="py-3 px-6">Approval Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRegistrations.map((inst) => {
                    const status = inst.approval_status || (inst.institution_code ? 'approved' : 'pending');
                    return (
                      <tr key={inst.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-white text-sm">
                            {inst.institution_name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            ID: {inst.id.slice(0, 8)}...
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-300 font-mono text-[11px]">
                          {inst.email}
                        </td>

                        <td className="py-4 px-6">
                          {inst.institution_code ? (
                            <Badge className="bg-[#6342E8] text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-lg tracking-wider">
                              {inst.institution_code}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Unassigned (Pending)</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-slate-400 text-[11px]">
                          {new Date(inst.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-4 px-6">
                          {status === 'approved' ? (
                            <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-800 text-[10px] font-semibold gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </Badge>
                          ) : status === 'pending' ? (
                            <Badge className="bg-amber-950/80 text-amber-300 border-amber-800 text-[10px] font-semibold gap-1">
                              <Clock className="w-3 h-3" />
                              Pending Approval
                            </Badge>
                          ) : status === 'rejected' ? (
                            <Badge className="bg-red-950/80 text-red-300 border-red-800 text-[10px] font-semibold gap-1">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-semibold">
                              {status}
                            </Badge>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInstitution(inst);
                                setIsDetailsOpen(true);
                              }}
                              className="h-8 px-2.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs gap-1"
                              title="View Institution Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </Button>

                            {status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInstitution(inst);
                                    setIsApproveOpen(true);
                                  }}
                                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg gap-1 shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedInstitution(inst);
                                    setIsRejectOpen(true);
                                  }}
                                  className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs rounded-lg"
                                >
                                  <span>Reject</span>
                                </Button>
                              </>
                            )}

                            {status === 'approved' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (!confirm(`Are you sure you want to suspend operations for ${inst.institution_name}?`)) return;
                                  await fetch('/api/superadmin/approvals', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'suspend', institutionId: inst.id }),
                                  });
                                  fetchRegistrations();
                                }}
                                className="h-8 px-2 text-slate-500 hover:text-amber-400 text-xs"
                              >
                                Suspend
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

      {/* 1. View Details Modal */}
      {selectedInstitution && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="bg-[#0C1222] border-slate-800 text-slate-100 max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>Institution Registration Details</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Detailed metadata and registration verification information
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Official Institution Name</span>
                <p className="text-sm font-bold text-white">{selectedInstitution.institution_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Administrator Email</span>
                  <p className="font-mono text-slate-200">{selectedInstitution.email}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Institution Code</span>
                  <p className="font-mono font-bold text-indigo-300">
                    {selectedInstitution.institution_code || 'Pending Super Admin Approval'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Internal Institution ID (UUID)</span>
                <p className="font-mono text-[11px] text-slate-400 break-all">{selectedInstitution.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Registration Date</span>
                  <p className="text-slate-300">
                    {new Date(selectedInstitution.created_at).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Current Status</span>
                  <div>
                    <Badge className="capitalize text-[10px] font-semibold">
                      {selectedInstitution.approval_status || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedInstitution.rejection_reason && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                  <strong>Rejection Reason:</strong> {selectedInstitution.rejection_reason}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDetailsOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 2. Approve Confirmation Dialog */}
      {selectedInstitution && (
        <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
          <DialogContent className="bg-[#0C1222] border-slate-800 text-slate-100 max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Confirm Institution Approval</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Authorizing institutional operations and assigning code
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <p className="text-slate-300">
                  You are about to approve <strong>{selectedInstitution.institution_name}</strong> (<code>{selectedInstitution.email}</code>).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/50 space-y-2 text-indigo-200">
                <span className="font-bold text-[11px] uppercase tracking-wider block text-indigo-300">
                  What happens upon approval:
                </span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                  <li>Automatic sequential 3-digit Institution Code generated</li>
                  <li>Institution Code permanently linked to institution ID</li>
                  <li>All institutional download &amp; duty generation features unlocked</li>
                  <li>Welcome &amp; code activation email dispatched to administrator</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsApproveOpen(false)}
                disabled={isProcessing}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApproval}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Assigning Code...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve &amp; Assign Code</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. Reject Confirmation Dialog */}
      {selectedInstitution && (
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent className="bg-[#0C1222] border-slate-800 text-slate-100 max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Reject Institution Registration</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Reject this registration and notify the administrator
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <p className="text-slate-300">
                Rejecting registration for <strong>{selectedInstitution.institution_name}</strong>.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Reason for Rejection (Included in email notification)
                </Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Institution accreditation details could not be verified."
                  className="bg-slate-900 border-slate-700 text-white text-xs min-h-[90px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsRejectOpen(false)}
                disabled={isProcessing}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRejection}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 4. Success Approval Result Popup */}
      {approvedCodeResult && (
        <Dialog open={!!approvedCodeResult} onOpenChange={() => setApprovedCodeResult(null)}>
          <DialogContent className="bg-[#0C1222] border-emerald-800/80 text-slate-100 max-w-md rounded-2xl text-center">
            <div className="py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Institution Approved!</h3>
                <p className="text-xs text-slate-400 mt-1">{approvedCodeResult.collegeName}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 max-w-xs mx-auto">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  Assigned 3-Digit Institution Code
                </span>
                <div className="font-mono text-4xl font-black text-white tracking-widest mt-1">
                  {approvedCodeResult.code}
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Official code activation email has been delivered to <strong>{approvedCodeResult.email}</strong>.
              </p>

              <Button
                onClick={() => setApprovedCodeResult(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 rounded-xl"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
