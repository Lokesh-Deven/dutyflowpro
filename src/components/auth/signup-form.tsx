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
import { Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { signUp } = useAuth();

  const [institutionName, setInstitutionName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast({
          title: "Account Created",
          description: `Welcome ${institutionName}! Taking you to New Allotment...`,
        });
        router.push("/dashboard/examinations");
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

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-lg border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
      {/* Top Accent Gradient Stripe */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

      <CardHeader className="text-center pt-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-2xl bg-[#6342e8] text-white flex items-center justify-center shadow-md shadow-purple-500/20 ring-4 ring-purple-100 dark:ring-purple-950">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-headline font-bold text-slate-900 dark:text-white">Create an Account</CardTitle>
        <CardDescription className="text-xs text-slate-500">Join DutyFlow to streamline your invigilation rosters.</CardDescription>
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
