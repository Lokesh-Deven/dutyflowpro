"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ShieldAlert, CheckCircle2, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ApprovalRestrictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function ApprovalRestrictionDialog({
  open,
  onOpenChange,
  featureName = 'Institutional Generation',
}: ApprovalRestrictionDialogProps) {
  const { profile } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 sm:p-7">
        <DialogHeader className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-7 h-7" />
          </div>

          <DialogTitle className="text-lg font-headline font-bold text-slate-900 dark:text-white">
            Super Admin Approval Pending
          </DialogTitle>

          <DialogDescription className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Your institution registration is awaiting Super Admin approval. You can explore DutyFlow, but institutional generation and download features will become available after approval.
          </DialogDescription>
        </DialogHeader>

        {/* Informational Status Card */}
        <div className="my-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Institution:</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{profile?.institution_name || 'Your Institution'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Status:</span>
            <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px]">
              Pending Approval
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Feature Requested:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] font-semibold">{featureName}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center leading-normal">
          Once the Super Admin verifies your institution, an official 3-digit Institution Code will be assigned and generation features unlocked automatically.
        </p>

        <DialogFooter className="mt-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-10 rounded-xl"
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

