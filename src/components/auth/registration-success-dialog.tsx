"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail } from "lucide-react";

interface RegistrationSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onConfirm?: () => void;
}

export function RegistrationSuccessDialog({
  open,
  onOpenChange,
  email,
  onConfirm,
}: RegistrationSuccessDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl bg-white dark:bg-slate-900">
        {/* Accent Top Gradient Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#10B981] via-[#3B82F6] to-[#6342E8]" />

        <div className="p-6 sm:p-7 text-center">
          {/* Success Ring Badge */}
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center ring-8 ring-emerald-50/60 dark:ring-emerald-950/30">
            <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
          </div>

          {/* Exact Title */}
          <DialogTitle className="font-headline text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Registration Successful
          </DialogTitle>

          {/* Exact Required Message */}
          <div className="mt-3.5 px-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              Please check your email and click the confirmation link to verify your email address. You must confirm your email before you can sign in.
            </p>
          </div>

          {/* Highlighted Email Identification Box */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Confirmation sent to:</span>
                <div className="font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                  {email || "your registered email"}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Look for email titled:</span>
              <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                Confirm your email address
              </span>
            </div>
          </div>

          {/* Spam / Junk reminder */}
          <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
            Didn&apos;t receive it? Please check your <strong>Spam</strong> or <strong>Promotions</strong> folder.
          </p>

          {/* OK / Got it Button */}
          <div className="mt-6">
            <Button
              onClick={handleClose}
              className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs tracking-wider h-11 rounded-xl shadow-md transition-all cursor-pointer"
            >
              OK, GOT IT
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
