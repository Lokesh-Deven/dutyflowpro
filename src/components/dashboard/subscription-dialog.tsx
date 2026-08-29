"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Copy, Check, Lock, Sparkles, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DownloadCategory } from '@/lib/auth-context';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: DownloadCategory;
  customTitle?: string;
  customMessage?: string;
}

const CATEGORY_NAMES: Record<DownloadCategory, string> = {
  master_roster: "Master Roster",
  individual_profile: "Individual Profile",
  daywise_profile: "Day-wise Profile",
};

export function SubscriptionDialog({
  open,
  onOpenChange,
  category,
  customTitle,
  customMessage,
}: SubscriptionDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const supportEmail = "admin@dutyflow.in";
  const whatsappNumber = "9113815925";
  const whatsappDisplay = "+91 91138 15925";
  const whatsappLink = `https://wa.me/919113815925?text=Hi%20DutyFlow%20Admin,%20I%20would%20like%20to%20subscribe%20for%20unlimited%20downloads.`;
  const emailLink = `mailto:${supportEmail}?subject=Subscription%20Inquiry%20-%20DutyFlow&body=Hi%20DutyFlow%20Team,%0A%0AI%20would%20like%20to%20upgrade%20my%20DutyFlow%20account%20to%20Subscribed%20tier%20for%20unlimited%20downloads.%0A%0AThank%20you!`;

  const categoryName = category ? CATEGORY_NAMES[category] : "Downloads";

  const handleCopyContact = () => {
    navigator.clipboard.writeText(`Email: ${supportEmail} | WhatsApp: ${whatsappNumber}`);
    setCopied(true);
    toast({
      title: "Contact Details Copied",
      description: `Copied ${supportEmail} and ${whatsappNumber} to your clipboard.`,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden border border-border/80 shadow-2xl">
        {/* Top Decorative Stripe */}
        <div className="h-2 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />

        <div className="p-6 sm:p-7 space-y-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center justify-between">
              <div className="h-11 w-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                <Lock className="h-5 w-5" />
              </div>
              <Badge className="bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 font-bold text-xs py-0.5 px-2.5">
                3/3 Free Limit Reached
              </Badge>
            </div>

            <DialogTitle className="text-xl font-headline font-bold text-foreground">
              {customTitle || `Free Access Quota Completed`}
            </DialogTitle>

            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              You have completed the <strong className="text-foreground">3 free {categoryName} downloads</strong> included with your Free Access trial.
            </DialogDescription>
          </DialogHeader>

          {/* Core User-Requested Prompt Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/90 via-indigo-50/50 to-cyan-50/60 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-cyan-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Subscription Information
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">
              Please Subscribe to Download. Contact:{" "}
              <a href={emailLink} className="text-[#4F46E5] dark:text-indigo-300 hover:underline font-bold">
                {supportEmail}
              </a>{" "}
              or WhatsApp:{" "}
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
                {whatsappNumber}
              </a>
            </p>
          </div>

          {/* Action Contacts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <Button
              asChild
              className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold text-xs h-10 shadow-xs rounded-xl"
            >
              <a href={emailLink}>
                <Mail className="mr-2 h-4 w-4" />
                Email Admin
              </a>
            </Button>

            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 shadow-xs rounded-xl"
            >
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp: {whatsappNumber}
              </a>
            </Button>
          </div>

          <DialogFooter className="pt-2 flex flex-row items-center justify-between sm:justify-between border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyContact}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Copied Contact
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Contact Details
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold h-8 rounded-lg"
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
