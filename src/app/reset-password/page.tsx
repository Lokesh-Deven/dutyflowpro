"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Loader2, Eye, EyeOff, Lock, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { updatePassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check if recovery session is active
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        // If there's an active session or recovery token in hash, allow password update
        setIsCheckingSession(false);
      } catch {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        setErrorMessage(error.message || "Failed to update password. Your recovery link may have expired.");
        toast({
          variant: "destructive",
          title: "Password Update Failed",
          description: error.message || "Could not update your password. Please request a new link.",
        });
      } else {
        setIsSuccess(true);
        toast({
          title: "Password Reset Successfully",
          description: "Your new password has been set. You can now use it to sign in.",
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Brand Header */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto py-2">
        <Link href="/" className="inline-flex items-center gap-2">
          <h1 className="font-headline text-2xl font-black tracking-tight">
            <span className="text-[#1E2A5E]">Duty</span>
            <span className="bg-gradient-to-br from-[#1E40AF] via-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent">
              Flow
            </span>
          </h1>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E2A5E] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </Link>
      </div>

      {/* Main Centered Card */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-white border border-slate-300/80 rounded-2xl p-7 sm:p-9 shadow-md">
          {isSuccess ? (
            <div className="text-center space-y-4 py-3">
              <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="space-y-1.5">
                <h2 className="font-headline text-2xl font-bold text-slate-900">
                  Password Updated!
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Your password has been changed successfully. You can now access your account with your new credentials.
                </p>
              </div>

              <div className="pt-3">
                <Button
                  onClick={() => router.push('/dashboard/examinations')}
                  className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs tracking-wider h-10 rounded-lg shadow-sm"
                >
                  GO TO DASHBOARD
                </Button>
              </div>

              <div className="pt-1">
                <Link
                  href="/"
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Or return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950 text-[#4F46E5] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="font-headline text-2xl font-bold text-slate-800">
                  Set New Password
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please choose a strong password with at least 6 characters.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed animate-in fade-in">
                  {errorMessage}
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-semibold text-slate-700">
                  New Password:
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-md h-10 bg-white border-slate-300 text-sm text-slate-800 pr-10 focus-visible:border-[#1E2A5E] focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-700">
                  Confirm New Password:
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-md h-10 bg-white border-slate-300 text-sm text-slate-800 focus-visible:border-[#1E2A5E] focus-visible:ring-0"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs tracking-wider py-2.5 rounded-md shadow-xs transition-colors mt-2 h-10"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    UPDATING PASSWORD...
                  </span>
                ) : (
                  "UPDATE PASSWORD"
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Cancel and return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-slate-400 py-2">
        &copy; {new Date().getFullYear()} DutyFlow. All rights reserved.
      </div>
    </div>
  );
}
