"use client";

import React, { useState } from 'react';
import { useInvigilatorPortal } from '@/lib/invigilator-portal-context';
import { getInvigilatorInitial } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  CalendarCheck,
  Loader2,
} from 'lucide-react';

export function InvigilatorProfileView() {
  const { session, changePin, duties } = useInvigilatorPortal();
  const { toast } = useToast();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!session) return null;

  const initial = getInvigilatorInitial(session.name);
  const totalDuties = duties.length;
  const completedDuties = duties.filter((d) => d.attendanceSubmitted || d.isPast).length;

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPin.trim().length < 4) {
      setErrorMsg('New PIN must be at least 4 digits/characters.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('New PIN and Confirm PIN do not match.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await changePin(currentPin, newPin);
      if (res.success) {
        toast({
          title: 'PIN Updated Successfully',
          description: 'Your new security PIN is now active for future logins.',
        });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setErrorMsg(res.error || 'Failed to update PIN. Please verify your current PIN.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while changing PIN.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="font-headline font-black text-xl text-slate-900 tracking-tight">
          Invigilator Profile
        </h2>
        <p className="text-xs text-slate-500">
          Faculty details, examination duty summary, and security settings
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar Monogram Initial (Per Rule: >= 50% circle, centered) */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white font-black text-4xl flex items-center justify-center leading-none shadow-md ring-4 ring-indigo-50 shrink-0 select-none">
            {initial}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <h3 className="font-headline font-black text-2xl text-slate-900">
              {session.name}
            </h3>
            <p className="text-xs font-semibold text-indigo-700 flex items-center justify-center sm:justify-start gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              {session.designation || 'Faculty Member'}
            </p>
            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 pt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {session.institutionName || 'College Examination Cell'}
            </p>
          </div>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </div>
              <div className="font-semibold text-slate-800">
                {session.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Mobile Number
              </div>
              <div className="font-semibold text-slate-800">
                {session.mobile}
              </div>
            </div>
          </div>
        </div>

        {/* Duty Metrics */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center">
            <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
              Total Allotted Duties
            </div>
            <div className="font-headline font-black text-3xl text-indigo-950 mt-1">
              {totalDuties}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
            <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
              Completed Sessions
            </div>
            <div className="font-headline font-black text-3xl text-emerald-950 mt-1">
              {completedDuties}
            </div>
          </div>
        </div>
      </div>

      {/* Security: Change PIN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          <h3 className="font-headline font-bold text-base text-slate-800">
            Security &amp; Change PIN
          </h3>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleChangePinSubmit} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="curr-pin" className="text-xs font-semibold text-slate-700">
              Current PIN / Password:
            </Label>
            <Input
              id="curr-pin"
              type="password"
              placeholder="Enter current PIN"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="h-10 text-xs rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pin" className="text-xs font-semibold text-slate-700">
                New PIN:
              </Label>
              <Input
                id="new-pin"
                type="password"
                placeholder="At least 4 digits"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="h-10 text-xs rounded-lg"
                minLength={4}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-pin" className="text-xs font-semibold text-slate-700">
                Confirm New PIN:
              </Label>
              <Input
                id="confirm-pin"
                type="password"
                placeholder="Re-enter new PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="h-10 text-xs rounded-lg"
                minLength={4}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isUpdating}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs"
          >
            {isUpdating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating PIN...
              </span>
            ) : (
              'Update Security PIN'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
