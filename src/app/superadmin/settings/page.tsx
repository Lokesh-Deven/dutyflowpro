"use client";

import React, { useState } from 'react';
import { Settings, ShieldCheck, Mail, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SUPERADMIN_EMAIL, SUPERADMIN_RECOVERY_EMAIL } from '@/lib/superadmin-types';

export default function SuperAdminSettingsPage() {
  const { toast } = useToast();
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  const handleTestRecovery = async () => {
    setIsSendingRecovery(true);
    try {
      const res = await fetch('/api/superadmin/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: SUPERADMIN_EMAIL }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'Recovery Notification Delivered',
          description: data.message || `Dispatched to ${SUPERADMIN_RECOVERY_EMAIL}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to dispatch recovery test.',
        });
      }
    } catch (_) {
      toast({ variant: 'destructive', title: 'Error', description: 'Network error.' });
    } finally {
      setIsSendingRecovery(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
          <span>Super Admin Security Settings</span>
          <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800 text-xs">Security</Badge>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Super Administrator identity parameters, 2FA protocols, and emergency recovery mailbox.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Identity Card */}
        <Card className="bg-[#0C1222] border-slate-800 rounded-2xl shadow-lg">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
                <CardTitle className="text-base font-bold text-white">Authorized Super Admin Account</CardTitle>
              </div>
              <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-800 text-[10px] font-semibold gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Exclusive account permitted to access institutional approval controls
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Super Admin Username / Email</span>
                <p className="font-mono text-sm font-bold text-white mt-0.5">{SUPERADMIN_EMAIL}</p>
              </div>
              <Badge className="bg-indigo-600 text-white font-mono text-[10px] px-2 py-0.5">
                Restricted Identity
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Designated Recovery Mailbox</span>
                <p className="font-mono text-sm font-bold text-indigo-300 mt-0.5">{SUPERADMIN_RECOVERY_EMAIL}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Emergency notifications and password reset confirmations are routed here.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestRecovery}
                disabled={isSendingRecovery}
                className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs h-8"
              >
                {isSendingRecovery ? 'Dispatching...' : 'Test Recovery Email'}
              </Button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Two-Factor Authentication (2FA)</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-800 font-semibold text-xs">
                  Active
                </Badge>
                <span className="text-slate-400 text-xs">
                  Encrypted 6-digit OTP delivered via SendGrid SMTP to {SUPERADMIN_EMAIL} on every login.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
