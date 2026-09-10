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
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign In Failed",
          description: error.message || "Invalid email or password.",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome to DutyFlow! Taking you to New Allotment...",
        });
        router.push("/dashboard/examinations");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Login Error",
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
        <CardTitle className="text-2xl font-headline font-bold text-slate-900 dark:text-white">Welcome to DutyFlow</CardTitle>
        <CardDescription className="text-xs text-slate-500">Enter your institutional credentials to log in.</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="grid gap-3.5 px-6">
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
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
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
                SIGNING IN...
              </span>
            ) : (
              "SIGN IN"
            )}
          </Button>
          <p className="text-xs text-center text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold underline text-[#6342e8] hover:text-[#5232d6]">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
