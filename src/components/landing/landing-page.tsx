"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth, clearActiveAllotmentStorage } from '@/lib/auth-context';
import { Loader2, Eye, EyeOff, Building2, Mail, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

export function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  // Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up fields
  const [institutionName, setInstitutionName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Loading & error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = loginEmail.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }
    if (!loginPassword) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn(cleanEmail, loginPassword);

      if (error) {
        setErrorMessage(error.message || "Invalid email or password. Please check your credentials and try again.");
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message || "Invalid credentials. Please verify your email and password.",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome to DutyFlow! Taking you to New Allotment...",
        });
        router.push('/dashboard/examinations');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Up
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!institutionName.trim()) {
      setErrorMessage("Please enter your Institution Name.");
      return;
    }
    if (!signupEmail.trim()) {
      setErrorMessage("Please enter your Email ID.");
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, needsEmailConfirmation } = await signUp(institutionName, signupEmail, signupPassword);

      if (error) {
        setErrorMessage(error.message || "Sign up failed. Please check your information.");
        toast({
          variant: "destructive",
          title: "Registration Error",
          description: error.message || "Could not complete account registration.",
        });
      } else {
        if (needsEmailConfirmation) {
          toast({
            title: "Account Created!",
            description: "Please check your email to confirm your account, or sign in now.",
          });
          setAuthMode('login');
          setLoginEmail(signupEmail);
        } else {
          toast({
            title: "Account Created Successfully!",
            description: `Welcome ${institutionName}! Taking you to New Allotment...`,
          });
          router.push('/dashboard/examinations');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Guest Access
  const handleGuestDemo = () => {
    clearActiveAllotmentStorage();
    toast({
      title: "Guest Session Started",
      description: "Entering New Allotment workspace...",
    });
    router.push('/dashboard/examinations');
  };

  return (
    <main className="min-h-screen w-full bg-white text-slate-900 flex items-center justify-center p-4 sm:p-8 selection:bg-[#1E2A5E] selection:text-white">
      <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16 py-6">

        {/* ========================================================================= */}
        {/* LEFT COLUMN: Title & Vector Illustration */}
        {/* ========================================================================= */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center space-y-5 px-2">
          {/* Main Title */}
          <div className="relative inline-flex flex-col items-center select-none">
            {/* Soft vector ambient glow echoing the illustration fluid background */}
            <div className="absolute -inset-x-8 -inset-y-3 bg-gradient-to-r from-[#CADDFE]/50 via-[#DBEAFE]/40 to-[#CADDFE]/50 rounded-3xl blur-xl -z-10 pointer-events-none" />

            <h1 className="font-headline text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-center leading-none">
              <span className="text-[#1E2A5E] drop-shadow-[0_1px_2px_rgba(30,42,94,0.12)]">Duty</span>
              <span className="bg-gradient-to-br from-[#1E40AF] via-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(59,130,246,0.3)]">
                Flow
              </span>
            </h1>
          </div>

          {/* Vector Illustration */}
          <div className="relative w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] flex items-center justify-center">
            <Image
              src="/images/team-illustration.png"
              alt="DutyFlow AI Invigilation Illustration"
              width={440}
              height={420}
              priority
              className="object-contain w-full h-auto drop-shadow-xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER DIVIDER LINE (as in attachment) */}
        {/* ========================================================================= */}
        <div className="hidden md:block w-[3px] h-[460px] bg-black rounded-full self-center" />

        {/* Mobile Horizontal Divider */}
        <div className="block md:hidden w-3/4 h-[2px] bg-slate-300 rounded-full my-2" />

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Modern & Professional Auth Card */}
        {/* ========================================================================= */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="w-full max-w-[400px] bg-white border border-slate-400/80 rounded-2xl p-7 sm:p-9 shadow-sm transition-all">

            {/* Header Tabs: Log In / Sign Up */}
            <div className="flex items-center justify-center border-b border-slate-200 pb-3 mb-5">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${authMode === 'login'
                    ? 'bg-white text-[#1E2A5E] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${authMode === 'signup'
                    ? 'bg-white text-[#1E2A5E] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Error Banner if any */}
            {errorMessage && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed animate-in fade-in">
                {errorMessage}
              </div>
            )}

            {/* =================================================================== */}
            {/* LOG IN FORM */}
            {/* =================================================================== */}
            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="text-center mb-1">
                  <h2 className="font-headline text-2xl font-bold text-slate-800">
                    Login
                  </h2>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-semibold text-slate-700">
                    Email:
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="rounded-md h-9 bg-white border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#1E2A5E] focus-visible:ring-0"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                    Password:
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="rounded-md h-9 bg-white border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#1E2A5E] focus-visible:ring-0 pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 focus:outline-hidden"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Show Password Checkbox */}
                <div className="flex items-center space-x-2 pt-0.5">
                  <Checkbox
                    id="show-login-password"
                    checked={showLoginPassword}
                    onCheckedChange={(checked) => setShowLoginPassword(Boolean(checked))}
                    className="data-[state=checked]:bg-[#1E2A5E] data-[state=checked]:border-[#1E2A5E]"
                  />
                  <label
                    htmlFor="show-login-password"
                    className="text-xs font-medium text-slate-600 leading-none cursor-pointer select-none"
                  >
                    Show Password
                  </label>
                </div>

                {/* SIGN IN Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs tracking-wider py-2.5 rounded-md shadow-xs transition-colors mt-2 h-10"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      SIGNING IN...
                    </span>
                  ) : (
                    "SIGN IN"
                  )}
                </Button>

                {/* Sub-links */}
                <div className="mt-5 pt-3 text-center space-y-1.5 text-xs text-slate-600">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        toast({
                          title: "Password Reset",
                          description: "Please enter your registered email and contact your system administrator or check Supabase auth settings.",
                        });
                      }}
                      className="hover:underline text-slate-700 font-medium"
                    >
                      Forgot Username / Password?
                    </button>
                  </div>
                  <div>
                    <span>Don&apos;t have an account? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setErrorMessage(null);
                      }}
                      className="text-[#1E2A5E] font-bold hover:underline ml-1"
                    >
                      Sign up
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* =================================================================== */
              /* SIGN UP FORM */
              /* =================================================================== */
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div className="text-center mb-1">
                  <h2 className="font-headline text-2xl font-bold text-slate-800">
                    Sign Up
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Open an account for your institution
                  </p>
                </div>

                {/* Institution Name Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="signup-institution" className="text-xs font-semibold text-slate-700">
                    Institution Name:
                  </Label>
                  <Input
                    id="signup-institution"
                    type="text"
                    placeholder="Enter full name of college or school"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="rounded-md h-9 bg-white border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#1E2A5E] focus-visible:ring-0"
                    required
                  />
                </div>

                {/* Email ID Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs font-semibold text-slate-700">
                    Email ID:
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="rounded-md h-9 bg-white border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#1E2A5E] focus-visible:ring-0"
                    required
                  />
                </div>

                {/* Create Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-semibold text-slate-700">
                    Create Password:
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Enter password (min 6 chars)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="rounded-md h-9 bg-white border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#1E2A5E] focus-visible:ring-0 pr-9"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 focus:outline-hidden"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Show Password Checkbox */}
                <div className="flex items-center space-x-2 pt-0.5">
                  <Checkbox
                    id="show-signup-password"
                    checked={showSignupPassword}
                    onCheckedChange={(checked) => setShowSignupPassword(Boolean(checked))}
                    className="data-[state=checked]:bg-[#1E2A5E] data-[state=checked]:border-[#1E2A5E]"
                  />
                  <label
                    htmlFor="show-signup-password"
                    className="text-xs font-medium text-slate-600 leading-none cursor-pointer select-none"
                  >
                    Show Password
                  </label>
                </div>

                {/* CREATE ACCOUNT Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs tracking-wider py-2.5 rounded-md shadow-xs transition-colors mt-2 h-10"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      CREATING ACCOUNT...
                    </span>
                  ) : (
                    "CREATE ACCOUNT"
                  )}
                </Button>

                {/* Sub-links */}
                <div className="mt-4 pt-2.5 text-center text-xs text-slate-600">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-[#1E2A5E] font-bold hover:underline ml-1"
                  >
                    Log in
                  </button>
                </div>
              </form>
            )}

            {/* Quick Demo Access (for frictionless testing) */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGuestDemo}
                className="w-full text-xs text-[#1E2A5E] font-semibold hover:bg-slate-50 h-8"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                Instant Guest Access (Direct Entry)
              </Button>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
