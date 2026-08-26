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
    <Card className="w-full max-w-sm rounded-2xl shadow-sm border-slate-300">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">
          <div className="h-10 w-10 rounded-xl bg-[#1E2A5E] text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <CardTitle className="text-2xl font-headline font-bold text-slate-800">Create an Account</CardTitle>
        <CardDescription className="text-xs">Join DutyFlow to streamline your invigilation rosters.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="institution" className="text-xs font-semibold text-slate-700">Institution Name</Label>
            <Input 
              id="institution" 
              placeholder="e.g. Carmel Pre-University College" 
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              required 
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email ID</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="admin@institution.edu" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="create-password" className="text-xs font-semibold text-slate-700">Create Password</Label>
            <Input 
              id="create-password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={6}
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-700">Confirm Password</Label>
            <Input 
              id="confirm-password" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
              minLength={6}
              className="h-9"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button 
            className="w-full bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs tracking-wider h-10" 
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
          <p className="text-xs text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/" className="font-bold underline text-[#1E2A5E]">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
