"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('lokeshconnects@gmail.com');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== 'lokeshconnects@gmail.com') {
      setErrorMsg('Unauthorized: Access to this console is restricted exclusively to the authorized Super Administrator.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your Super Admin password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      toast({
        title: 'Two-Factor Verification Required',
        description: `Security OTP code dispatched to ${cleanEmail}.`,
      });
      setStep('2fa');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error connecting to security server.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit 2FA OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otp || otp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit security code received in your email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Invalid or expired 2FA verification code.');
        return;
      }

      toast({
        title: 'Super Admin Access Granted',
        description: 'Establishing encrypted administrative session...',
      });

      router.push('/superadmin/dashboard');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error verifying 2FA code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Resend OTP
  const handleResendOtp = async () => {
    setErrorMsg(null);
    setIsResending(true);
    try {
      const res = await fetch('/api/superadmin/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to resend verification code.');
      } else {
        toast({
          title: 'New Code Dispatched',
          description: data.message || 'Check your inbox for the fresh 2FA code.',
        });
      }
    } catch (err: any) {
      setErrorMsg('Error requesting fresh OTP.');
    } finally {
      setIsResending(false);
    }
  };

  // 4. Recovery Request
  const handleRecovery = async () => {
    setErrorMsg(null);
    setIsRecovering(true);
    try {
      const res = await fetch('/api/superadmin/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to initiate recovery.');
      } else {
        toast({
          title: 'Recovery Notification Sent',
          description: 'Instructions dispatched to registered recovery email (lokeshdeven@gmail.com).',
        });
      }
    } catch (_) {
      setErrorMsg('Network error requesting recovery.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#090D16] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden text-slate-100">
      {/* Ambient background security glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand Shield Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 mb-3.5 shadow-lg shadow-indigo-950/50">
            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="font-headline font-black text-2xl tracking-tight text-white">Duty</span>
            <span className="font-headline font-black text-2xl tracking-tight text-indigo-400">Flow</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/50 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Central Institutional Control &amp; Approval System
          </p>
        </div>

        {/* Security Card */}
        <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Super Admin Username / Email
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lokeshconnects@gmail.com"
                  className="bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 h-11 text-sm font-medium focus-visible:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-400 font-medium">
                  Restricted exclusively to authorized Super Admin identity.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Master Password
                  </Label>
                  <button
                    type="button"
                    onClick={handleRecovery}
                    disabled={isRecovering}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    {isRecovering ? 'Notifying...' : 'Forgot password?'}
                  </button>
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your master password"
                  className="bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 h-11 text-sm font-medium focus-visible:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-900/30 gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to 2FA Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="text-xs text-indigo-200">
                  Enter 6-digit code sent to <strong className="text-white">{email}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Two-Factor Authentication Code
                </Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="bg-slate-900/80 border-slate-700 text-white text-center font-mono text-2xl tracking-[8px] font-black h-14 focus-visible:ring-indigo-500"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500 text-center">
                  Code expires in 10 minutes.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-950/40 gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authorizing Session...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify &amp; Enter Dashboard</span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setOtp('');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  &larr; Back to Password
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  <span>Resend Code</span>
                </button>
              </div>
            </form>
          )}

          {/* Recovery Footer Info */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              Recovery: <code>lokeshdeven@gmail.com</code>
            </span>
            <span className="text-slate-400">DutyFlow 2.0 SuperAdmin</span>
          </div>
        </div>
      </div>
    </main>
  );
}

