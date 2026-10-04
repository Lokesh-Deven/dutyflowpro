"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInvigilatorPortal } from '@/lib/invigilator-portal-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export function InvigilatorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login } = useInvigilatorPortal();

  const [institutionCode, setInstitutionCode] = useState('001');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Read code query param if passed e.g. /invigilator/login?code=001
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setInstitutionCode(codeParam.replace(/\D/g, '').slice(0, 3));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = institutionCode.trim();
    const cleanId = identifier.trim();
    const cleanPin = pin.trim();

    if (!cleanCode) {
      setErrorMessage('Please enter your 3-digit Institution Code.');
      return;
    }
    if (!cleanId) {
      setErrorMessage('Please enter your Email ID or Mobile Number.');
      return;
    }
    if (!cleanPin) {
      setErrorMessage('Please enter your Password or PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(cleanCode, cleanId, cleanPin);
      if (res.success && res.session) {
        toast({
          title: 'Login Successful',
          description: `Welcome, ${res.session.name}! Connected to Institution ${res.session.institutionCode}.`,
        });
        router.push('/invigilator/dashboard');
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = () => {
    setInstitutionCode('001');
    setIdentifier('kumar@dutyflow.in');
    setPin('1234');
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-[420px] mx-auto bg-white border border-slate-300 rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 mb-3 shadow-xs">
          <UserCheck className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span className="font-headline font-black text-2xl text-[#1E2A5E]">Duty</span>
          <span className="font-headline font-black text-2xl text-blue-600">Flow</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Invigilator Login
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Access your daily duties &amp; submit room attendance
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed animate-in fade-in flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Institution Code Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="inv-inst-code" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Institution Code:
            </Label>
            <span className="text-[11px] text-slate-400 font-medium">3 Digits (e.g. 001)</span>
          </div>
          <Input
            id="inv-inst-code"
            type="text"
            maxLength={3}
            placeholder="e.g. 001"
            value={institutionCode}
            onChange={(e) => setInstitutionCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
            className="rounded-lg h-10 bg-slate-50/50 border-slate-300 text-sm font-mono font-bold tracking-widest text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-600"
            required
          />
        </div>

        {/* Identifier Field */}
        <div className="space-y-1.5">
          <Label htmlFor="inv-identifier" className="text-xs font-semibold text-slate-700">
            Email / Mobile Number:
          </Label>
          <Input
            id="inv-identifier"
            type="text"
            placeholder="e.g. kumar@dutyflow.in or 9876543210"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="rounded-lg h-10 bg-slate-50/50 border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-600"
            required
          />
        </div>

        {/* PIN / Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="inv-pin" className="text-xs font-semibold text-slate-700">
              Password / PIN:
            </Label>
            <span className="text-[11px] text-slate-400 font-medium">Default: 1234</span>
          </div>
          <div className="relative">
            <Input
              id="inv-pin"
              type={showPin ? 'text' : 'password'}
              placeholder="Enter PIN (e.g. 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="rounded-lg h-10 bg-slate-50/50 border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-600 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* First-time login helpful tip */}
        <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed flex items-start gap-2">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-600" />
          <div>
            <strong>First-time login?</strong> Use PIN <code>1234</code> or the last 4 digits of your registered mobile number.
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs tracking-wider py-2.5 rounded-xl shadow-xs transition-colors h-10 mt-1"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              VERIFYING CREDENTIALS...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              LOGIN TO DASHBOARD
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Quick Demo Fill for Evaluation */}
      <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-center">
        <button
          type="button"
          onClick={handleQuickDemo}
          className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Fill Quick Demo (001 • Mr. Kumar)
        </button>
      </div>

      {/* Bottom Switcher */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-800 transition-colors">
          ← College Admin
        </Link>
        <Link href="/student/login" className="hover:text-indigo-600 font-semibold transition-colors">
          Student Portal →
        </Link>
      </div>
    </div>
  );
}
