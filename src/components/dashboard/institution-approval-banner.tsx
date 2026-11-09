"use client";

import React, { useState } from 'react';
import { Clock, ShieldAlert, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function InstitutionApprovalBanner() {
  const { user, profile, isApproved, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  // If user is guest or already approved, do not show banner
  if (!user || user.id === 'guest-session' || isApproved) {
    return null;
  }

  const isRejected = profile?.approval_status === 'rejected';
  const isSuspended = profile?.approval_status === 'suspended';

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await refreshProfile();
      toast({
        title: 'Status Checked',
        description: 'Profile status synchronized with server.',
      });
    } catch (_) {}
    finally {
      setIsChecking(false);
    }
  };

  if (isRejected) {
    return (
      <div className="bg-red-950/40 border-b border-red-800/80 px-4 sm:px-6 py-3 text-red-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            <strong>Registration Notice:</strong> Your institution registration was not approved.
            {profile?.rejection_reason && ` Reason: ${profile.rejection_reason}`} Contact support at admin@dutyflow.in.
          </span>
        </div>
        <Badge className="bg-red-900/80 text-red-200 border-red-700 text-[10px] shrink-0">
          Rejected
        </Badge>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="bg-amber-950/40 border-b border-amber-800/80 px-4 sm:px-6 py-3 text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Operations Suspended:</strong> Institutional generation features have been temporarily paused by Super Admin.
          </span>
        </div>
        <Badge className="bg-amber-900/80 text-amber-200 border-amber-700 text-[10px] shrink-0">
          Suspended
        </Badge>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-purple-500/15 border-b border-amber-500/30 dark:border-amber-500/20 px-4 sm:px-6 py-2.5 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div className="leading-relaxed">
          <span className="font-bold mr-1.5">Super Admin Verification:</span>
          Your institution registration is awaiting Super Admin approval. You can explore DutyFlow, but institutional generation and download features will become available after approval.
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] font-semibold">
          Pending Approval
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualCheck}
          disabled={isChecking}
          className="h-6 px-2 text-[10px] bg-white/50 dark:bg-slate-900/50 border-amber-400/40 hover:bg-white text-slate-700 dark:text-slate-200"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
          Check Status
        </Button>
      </div>
    </div>
  );
}
