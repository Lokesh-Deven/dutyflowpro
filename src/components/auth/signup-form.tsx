"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Mail, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { RegistrationSuccessDialog } from "@/components/auth/registration-success-dialog";

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { signUp } = useAuth();

  const [institutionName, setInstitutionName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmationPending, setIsConfirmationPending] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Please make sure both password fields are identical.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signUp(institutionName, email, password);

      if (error) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: error.message || "Failed to create account.",
        });
      } else {
        // Trigger both the prominent popup and the on-page status
        setIsConfirmationPending(true);
        setShowSuccessPopup(true);
        toast({
          title: "Registration Successful",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isConfirmationPending) {
    return (
      <>
        {/* The Information Popup */}
        <RegistrationSuccessDialog
          open={showSuccessPopup}
          onOpenChange={setShowSuccessPopup}
          email={email}
        />

        {/* The Clearly Visible On-Page Confirmation Message */}
        <Card className="w-full max-w-md rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#10B981] via-[#3B82F6] to-[#6342E8]" />
          
          <CardHeader className="text-center pt-8 pb-3 px-6">
            <div className="flex justify-center mb-3">
              <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center ring-8 ring-emerald-50/60 dark:ring-emerald-950/30 border border-emerald-100 dark:border-emerald-800">
                <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
              </div>
            </div>
            <CardTitle className="text-2xl font-headline font-black text-slate-900 dark:text-white tracking-tight">
              Registration Successful
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Account created for <strong className="text-slate-800 dark:text-slate-200">{institutionName}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 py-2 space-y-4">
            {/* Primary prominent highlighted notice required by user */}
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-semibold leading-relaxed shadow-xs text-center">
              Please check your email and click the confirmation link to verify your email address. You must confirm your email before you can sign in.
            </div>

            {/* Step-by-Step Guidance Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <span className="text-slate-500">Sent to:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{email}</span>
              </div>

              <div className="flex items-baseline gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11.5px]">
                <span className="text-slate-500 shrink-0">Look for email:</span>
                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                  Confirm your email address
                </span>
              </div>
            </div>

            {/* Spam Reminder */}
            <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
              Didn&apos;t receive the email? Check your <strong>Spam</strong> or <strong>Promotions</strong> folder.
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 px-6 pb-6 pt-2">
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs tracking-wider h-11 rounded-xl shadow-md transition-all cursor-pointer"
            >
              GO TO SIGN IN
            </Button>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center justify-center gap-1 py-1"
            >
              View confirmation popup again
            </button>
          </CardFooter>
        </Card>
      </>
    );
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-lg border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
      {/* Top Accent Gradient Stripe */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

      <CardHeader className="text-center pt-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 flex items-center justify-center">
            <Image
              src="/images/dutyflow-logo.png"
              alt="DutyFlow Logo"
              width={48}
              height={48}
              priority
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <CardTitle className="text-2xl font-headline font-bold text-slate-900 dark:text-white">Create an Account</CardTitle>
        <CardDescription className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Your Smart Exam Partner</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="grid gap-3.5 px-6">
          <div className="grid gap-1.5">
            <Label htmlFor="institution" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Institution Name</Label>
            <Input 
              id="institution" 
              placeholder="Enter full name of college or school" 
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              required 
              className="h-10 rounded-xl"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email ID</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="admin@institution.edu" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="h-10 rounded-xl"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="create-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Create Password</Label>
            <Input 
              id="create-password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={6}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm Password</Label>
            <Input 
              id="confirm-password" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
              minLength={6}
              className="h-10 rounded-xl"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-2 px-6 pb-6">
          <Button 
            className="w-full bg-[#6342e8] hover:bg-[#5232d6] text-white font-bold text-xs tracking-wider h-10 rounded-xl shadow-xs" 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                CREATING ACCOUNT...
              </span>
            ) : (
              "SIGN UP"
            )}
          </Button>
          <p className="text-xs text-center text-slate-500">
            Already have an account?{" "}
            <Link href="/" className="font-bold underline text-[#6342e8] hover:text-[#5232d6]">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
