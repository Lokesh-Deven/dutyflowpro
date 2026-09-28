"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useStudentPortal } from '@/lib/student-portal-context';
import {
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
  ShieldCheck,
  Building2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export function StudentLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useStudentPortal();

  const [registerNumber, setRegisterNumber] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanRegNo = registerNumber.trim();
    if (!cleanRegNo) {
      setErrorMessage('Please enter your Register Number.');
      return;
    }

    if (!pin.trim()) {
      setErrorMessage('Please enter your PIN or Password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(cleanRegNo, pin.trim());

      if (res.success && res.session) {
        toast({
          title: `Welcome, ${res.session.studentName}!`,
          description: 'Taking you to your examination schedule and seating details...',
        });
        router.push('/student/my-examination');
      } else {
        setErrorMessage(
          res.error || 'Login failed. Please check your Register Number and PIN.'
        );
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: res.error || 'Invalid credentials.',
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during student login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wide mb-1 shadow-2xs">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          <span>DutyFlow Student Access</span>
        </div>

        <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Student Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mx-auto">
          Access your personalized examination schedule, hall allotment, and bench seating.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="leading-relaxed font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Register Number Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="reg-number"
                className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                Register Number / Roll No. <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">As in college roster</span>
            </div>

            <div className="relative">
              <Input
                id="reg-number"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="e.g. 123456 or 23UG0101"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                className="h-11 rounded-xl text-sm font-semibold tracking-wider text-slate-900 placeholder:text-slate-400 bg-slate-50/60 focus:bg-white border-slate-200 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-100 transition-all uppercase"
                required
              />
            </div>
          </div>

          {/* Password / PIN Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="student-pin"
                className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                PIN / Password <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">4–6 digits</span>
            </div>

            <div className="relative">
              <Input
                id="student-pin"
                type={showPin ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter password or PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-11 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-slate-50/60 focus:bg-white border-slate-200 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-100 transition-all pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 focus:outline-hidden p-1 transition-colors"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* First Time Helper Box */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-left">
            <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[11px]">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>First Time Logging In?</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Use your <strong>Register Number</strong> or <strong>last 4 digits</strong> as your initial PIN. You can change your PIN inside the portal.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-900/10 gap-2 transition-all active:scale-[0.99]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                VERIFYING...
              </span>
            ) : (
              <>
                <span>Access My Examination</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Security Assurance */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Strictly private to your Register Number</span>
        </div>
      </div>

      {/* Switch to Admin Login */}
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 transition-colors"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Institution Admin / Invigilator Sign In &rarr;</span>
        </Link>
      </div>
    </div>
  );
}
