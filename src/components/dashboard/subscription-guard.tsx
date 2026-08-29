"use client";

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldX, Mail, MessageCircle, LogOut, Lock, RefreshCcw } from 'lucide-react';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { profile, isUnsubscribed, signOut, isLoading } = useAuth();

  if (isLoading) {
    return <>{children}</>;
  }

  if (isUnsubscribed) {
    const supportEmail = "admin@dutyflow.in";
    const whatsappNumber = "9113815925";
    const emailLink = `mailto:${supportEmail}?subject=Subscription%20Activation%20Request%20-%20${encodeURIComponent(profile?.institution_name || 'DutyFlow Account')}`;
    const whatsappLink = `https://wa.me/919113815925?text=Hi%20DutyFlow%20Admin,%20I%20would%20like%20to%20activate/renew%20the%20subscription%20for%20${encodeURIComponent(profile?.institution_name || 'my institution')}.`;

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
        <Card className="w-full max-w-lg border border-destructive/30 shadow-xl rounded-2xl overflow-hidden bg-card">
          {/* Top Warning Strip */}
          <div className="h-2 w-full bg-gradient-to-r from-red-500 via-rose-600 to-amber-500" />

          <CardHeader className="text-center pb-4 pt-8 px-6 sm:px-8 space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
              <ShieldX className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Badge variant="destructive" className="font-bold text-xs py-0.5 px-3 uppercase tracking-wider">
                  Permission Denied
                </Badge>
              </div>
              <CardTitle className="text-2xl font-headline font-black text-foreground pt-1">
                Subscription Inactive
              </CardTitle>
            </div>

            <CardDescription className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your account for <strong className="text-foreground">{profile?.institution_name || 'your institution'}</strong> is currently marked as <strong className="text-rose-600 dark:text-rose-400">Unsubscribed</strong> in the system.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 space-y-4">
            {/* Notice Box */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-left space-y-2">
              <p className="text-xs font-semibold text-foreground leading-relaxed">
                To unlock access to examination management, automated allotments, and duty reports, please activate your institutional subscription:
              </p>
              <div className="pt-1 text-xs text-muted-foreground space-y-1 font-medium">
                <p>• Contact Email: <strong className="text-foreground">{supportEmail}</strong></p>
                <p>• WhatsApp Helpline: <strong className="text-foreground">+91 {whatsappNumber}</strong></p>
              </div>
            </div>

            {/* Direct Contact Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Button asChild className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold text-xs h-10 shadow-xs rounded-xl">
                <a href={emailLink}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email: {supportEmail}
                </a>
              </Button>

              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 shadow-xs rounded-xl">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp: {whatsappNumber}
                </a>
              </Button>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-6 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Check Status Again
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30 h-8 rounded-lg w-full sm:w-auto"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Log Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
