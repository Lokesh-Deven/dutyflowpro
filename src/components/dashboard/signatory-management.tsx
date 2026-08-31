"use client";

import React, { useState, useEffect } from 'react';
import { useAllotment } from '@/lib/allotment-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Signature,
  Save,
  RotateCcw,
  ChevronDown,
  UserCheck,
  Briefcase,
  Sparkles,
  FileText,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export const DESIGNATION_PRESETS = [
  "Principal",
  "Head Master",
  "Head Teacher",
  "Head Mistress",
  "Director",
  "Dean",
  "Principal & Chief Superintendent",
  "Head Master & Chief Superintendent",
  "Head Mistress & Chief Superintendent"
] as const;

export function SignatoryManagement() {
  const { signatory, updateSignatory, resetSignatory, examinations, activeAllotment } = useAllotment();
  const { profile } = useAuth();
  const { toast } = useToast();

  const collegeName = profile?.institution_name || examinations[0]?.college || activeAllotment?.examinations[0]?.college || '';

  const [name, setName] = useState(signatory?.name || '');
  const [designation, setDesignation] = useState(signatory?.designation || '');

  // Keep in sync with context when loaded
  useEffect(() => {
    setName(signatory?.name || '');
    setDesignation(signatory?.designation || '');
  }, [signatory]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    updateSignatory({
      name: name.trim(),
      designation: designation.trim()
    });

    toast({
      title: "Signatory Details Saved",
      description: "Updated signatory will appear in the footer of all Invigilator Duty Summary PDFs.",
    });
  };

  const handleReset = () => {
    resetSignatory();
    setName('');
    setDesignation('');
    toast({
      title: "Signatory Cleared",
      description: "Reset signatory information to default settings.",
    });
  };

  const handleSelectDesignation = (preset: string) => {
    setDesignation(preset);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#151241] via-[#241d5e] to-[#4323c9] p-6 sm:p-8 text-white shadow-xl border border-purple-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs ring-1 ring-white/20 shadow-md">
              <Signature className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline text-white">
                Authorised Signatory
              </h1>
            </div>
          </div>

          <Link
            href="/dashboard/schedule"
            className="shrink-0 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 flex items-center gap-2 border border-white/10"
          >
            <FileText className="w-4 h-4" />
            <span>View Duty Summaries</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-2xl border-border/80 shadow-md bg-card">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    Signatory Information
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-synced
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                {/* Field 1: Name of the Authorised Signatory */}
                <div className="space-y-2">
                  <Label htmlFor="signatory-name" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Name of the Authorised Signatory
                  </Label>
                  <div className="relative">
                    <Input
                      id="signatory-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Jane Doe"
                      className="h-11 px-3.5 text-sm rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank if you prefer a generic &quot;Authorised Signatory&quot; title without a specific name.
                  </p>
                </div>

                {/* Field 2: Designation with both Type In and Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="signatory-designation" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Designation
                  </Label>

                  {/* Dual Type-in & Dropdown Picker Container */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="signatory-designation"
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Select or type designation"
                        className="h-11 px-3.5 text-sm rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-transparent transition-all"
                      />
                    </div>

                    {/* Dropdown Menu Button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 px-3.5 rounded-xl border-border font-semibold text-xs flex items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-300 transition-all shrink-0"
                        >
                          <span>{designation ? "Change" : "Select"}</span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-72 rounded-xl p-1.5 shadow-xl border-border bg-popover text-popover-foreground">
                        <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5">
                          Standard Designations
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {DESIGNATION_PRESETS.map((preset) => {
                          const isSelected = designation.trim().toLowerCase() === preset.toLowerCase();
                          return (
                            <DropdownMenuItem
                              key={preset}
                              onClick={() => handleSelectDesignation(preset)}
                              className={cn(
                                "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                                isSelected ? "bg-purple-600 text-white font-semibold" : "hover:bg-accent"
                              )}
                            >
                              <span>{preset}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Reset to Default
                  </Button>

                  <Button
                    type="submit"
                    className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#6342e8] to-[#4323c9] hover:from-[#5434d8] hover:to-[#3519b5] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all duration-200"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Signatory Details
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live PDF Footer Visual Preview */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-2xl border-border/80 shadow-md bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Live Preview
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  A4 Page Footer
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Simulated Paper Background */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner space-y-4">
                {/* Signatory details above footer - 2 Lines Aligned Right */}
                <div className="flex justify-end pt-1">
                  <div className="text-right space-y-0.5">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      {name.trim() ? (
                        <>
                          <span className="text-[#0891B2] dark:text-cyan-400 font-semibold mr-1.5">Issued by</span>
                          {name.trim()}
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-xs font-normal">Authorised Signatory</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {[designation.trim(), collegeName].filter(Boolean).join(', ') || (collegeName ? collegeName : 'Institution / Department')}
                    </div>
                  </div>
                </div>

                {/* The Styled Single-Line PDF Footer Banner with Right Alignment */}
                <div className="relative overflow-hidden rounded-lg bg-[#3730A3] py-2 px-3.5 text-white shadow-md border-t-2 border-amber-500 flex justify-end text-xs">
                  <span className="text-[9.5px] font-medium text-indigo-200 tracking-tight">
                    Digitally Generated Document - Signature Not Required
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
