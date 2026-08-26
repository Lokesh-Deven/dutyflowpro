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
    <Card className="w-full max-w-sm rounded-2xl shadow-sm border-slate-300">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">
          <div className="h-10 w-10 rounded-xl bg-[#1E2A5E] text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <CardTitle className="text-2xl font-headline font-bold text-slate-800">Welcome to DutyFlow</CardTitle>
        <CardDescription className="text-xs">Enter your institutional credentials to log in.</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="grid gap-3.5">
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
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
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
                SIGNING IN...
              </span>
            ) : (
              "SIGN IN"
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold underline text-[#1E2A5E]">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
