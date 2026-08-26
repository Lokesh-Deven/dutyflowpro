"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Building2,
  Mail,
  Calendar,
  Download,
  CreditCard,
  Phone,
  MessageCircle,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Edit2,
  Save,
  HelpCircle,
  ExternalLink,
  Layers
} from 'lucide-react';

export function ProfileView() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(profile?.institution_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const institutionName = profile?.institution_name || (user?.user_metadata?.institution_name as string) || "Institution Name";
  const email = user?.email || profile?.email || "admin@institution.edu";
  
  // Strictly single letter initial (first letter of institution name)
  const singleInitial = (institutionName.trim().charAt(0) || email.trim().charAt(0) || "D").toUpperCase();

  const subscriptionStatus = profile?.subscription_status || "Free Access";
  
  const startDateFormatted = profile?.subscription_start_date
    ? format(new Date(profile.subscription_start_date), "dd MMM yyyy")
    : format(new Date(), "dd MMM yyyy");

  const endDateFormatted = profile?.subscription_end_date
    ? format(new Date(profile.subscription_end_date), "dd MMM yyyy")
    : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "dd MMM yyyy");

  const downloadCount = profile?.download_count ?? 0;

  // Support Contacts (placeholders to be updated later as requested)
  const supportEmail = "support@dutyflow.com";
  const whatsappNumber = "+91 98765 43210";
  const whatsappLink = `https://wa.me/919876543210?text=Hi%20DutyFlow%20Support,%20I%20would%20like%20to%20inquire%20about%20subscription%20and%20assistance.`;

  const handleSaveInstitution = async () => {
    if (!editedName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Institution Name Required',
        description: 'Please enter a valid institution name.',
      });
      return;
    }

    setIsSaving(true);
    const { error } = await updateProfile({ institution_name: editedName.trim() });
    setIsSaving(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update institution name.',
      });
    } else {
      setIsEditing(false);
      toast({
        title: 'Profile Updated',
        description: 'Your institution name has been updated successfully.',
      });
    }
  };

  const handleLogout = async () => {
    toast({
      title: "Logging Out",
      description: "You have been signed out successfully.",
    });
    await signOut();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. HERO PROFILE CARD */}
      {/* ========================================================================= */}
      <Card className="border border-border/80 shadow-sm rounded-2xl overflow-hidden bg-card relative">
        {/* Top Accent Strip */}
        <div className="h-2.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#4338CA] to-[#0891B2]" />

        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
            {/* Single Letter Avatar */}
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#312E81] text-white flex items-center justify-center font-extrabold text-3xl sm:text-4xl shadow-md ring-4 ring-indigo-50 dark:ring-indigo-950 shrink-0 select-none">
              {singleInitial}
            </div>

            {/* Title, Badge & Email Header */}
            <div className="flex-1 w-full min-w-0 space-y-2 text-center sm:text-left">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5]">Institution Profile</span>
                    <Badge className="bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 text-[10px] font-bold py-0 px-2">
                      <ShieldCheck className="mr-1 h-3 w-3 text-[#0891B2]" />
                      Verified
                    </Badge>
                  </div>
                  
                  <h1 className="text-2xl sm:text-3xl font-headline font-extrabold text-foreground tracking-tight break-words">
                    {institutionName}
                  </h1>

                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5 text-[#4F46E5]" />
                    <span>{email}</span>
                  </p>
                </div>

                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedName(institutionName);
                      setIsEditing(true);
                    }}
                    className="text-xs font-semibold self-center sm:self-auto rounded-lg border-indigo-200 text-[#4F46E5] hover:bg-indigo-50/70 shrink-0 h-8"
                  >
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                    Edit Institution
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Edit Form if active */}
          {isEditing && (
            <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-end gap-3 animate-in fade-in">
              <div className="w-full space-y-1.5">
                <Label htmlFor="edit-inst" className="text-xs font-semibold">
                  Update Institution Name
                </Label>
                <Input
                  id="edit-inst"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter full institution name"
                  className="bg-background h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={handleSaveInstitution}
                  disabled={isSaving}
                  className="bg-[#4F46E5] hover:bg-[#4338ca] text-white text-xs font-semibold h-9 px-4"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 2. PROFILE DETAILS & SUBSCRIPTION METRICS (Cards & Stacks) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card A: Account & Institution Details */}
        <Card className="border border-border/80 rounded-2xl shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-[#4F46E5]">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                <Building2 className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-headline font-bold">Institution Details</CardTitle>
            </div>
            <CardDescription className="text-xs">Your registered examination center credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Institution Name</span>
              <p className="text-sm font-bold text-foreground">{institutionName}</p>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Account Email ID</span>
              <p className="text-sm font-bold text-foreground">{email}</p>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">User Profile ID</span>
              <p className="text-xs font-mono text-muted-foreground truncate">{user?.id || profile?.id || 'dutyflow-user-session'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card B: Subscription & Downloads Stack */}
        <Card className="border border-border/80 rounded-2xl shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0891B2]">
                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/50">
                  <CreditCard className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-headline font-bold">Subscription & Access</CardTitle>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 font-bold text-xs">
                {subscriptionStatus}
              </Badge>
            </div>
            <CardDescription className="text-xs">Current plan tier and allocation usage statistics</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3 pt-1">
            {/* Start & End Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#4F46E5]" />
                  Start Date
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground">{startDateFormatted}</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#0891B2]" />
                  End Date
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground">{endDateFormatted}</p>
              </div>
            </div>

            {/* Total Downloads Count */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/70 to-cyan-50/70 dark:from-indigo-950/30 dark:to-cyan-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-[#4F46E5]" />
                  Number of Downloads Till Date
                </span>
                <p className="text-[11px] text-muted-foreground">Generated PDF sheets & duty slips</p>
              </div>
              <div className="text-2xl font-black font-headline text-[#4F46E5]">
                {downloadCount}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTACT TO SUBSCRIBE OR HELP CARD */}
      {/* ========================================================================= */}
      <Card className="border border-indigo-100 dark:border-indigo-900/50 rounded-2xl shadow-xs overflow-hidden bg-gradient-to-br from-card to-indigo-50/30 dark:to-indigo-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-[#4F46E5]">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
              <HelpCircle className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-headline font-bold">Contact to Subscribe or Help</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Have questions about institutional subscriptions, annual licensing, or need technical help? Reach out directly.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Email Contact Card */}
            <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Mail className="h-4 w-4 text-[#4F46E5]" />
                <span>Support Email</span>
              </div>
              <p className="text-sm font-bold text-foreground select-all">{supportEmail}</p>
              <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold h-8 border-indigo-200 text-[#4F46E5] hover:bg-indigo-50/50">
                <a href={`mailto:${supportEmail}?subject=DutyFlow%20Subscription%20Inquiry%20-%20${encodeURIComponent(institutionName)}`}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Send Email
                </a>
              </Button>
            </div>

            {/* WhatsApp Contact Card */}
            <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>WhatsApp Phone Support</span>
              </div>
              <p className="text-sm font-bold text-foreground select-all">{whatsappNumber}</p>
              <Button asChild size="sm" className="w-full text-xs font-semibold h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Chat on WhatsApp
                </a>
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. LOGOUT ACTION BUTTON */}
      {/* ========================================================================= */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          Signed in as <strong className="text-foreground">{email}</strong>
        </p>

        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full sm:w-auto font-bold text-xs tracking-wider px-6 h-10 shadow-xs"
        >
          <LogOut className="mr-2 h-4 w-4" />
          LOG OUT FROM DUTYFLOW
        </Button>
      </div>

    </div>
  );
}
