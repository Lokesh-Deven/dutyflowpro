"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Palette, Sparkles } from 'lucide-react';
import { useAllotment } from '@/lib/allotment-context';
import { ALL_PALETTES, PaletteId, PdfColorPalette } from '@/lib/pdf-palette';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ColorPaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColorPaletteDialog({ open, onOpenChange }: ColorPaletteDialogProps) {
  const { pdfPaletteId, setPdfPaletteId } = useAllotment();
  const { toast } = useToast();

  const handleSelect = (palette: PdfColorPalette) => {
    setPdfPaletteId(palette.id);
    toast({
      title: "Color Palette Updated",
      description: `"${palette.name}" will now be used for Individual Duty Summary PDFs.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#6342e8]/10 text-[#6342e8] dark:text-purple-400 shrink-0">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl sm:text-2xl font-bold font-headline text-slate-900 dark:text-white">
                  Individual Duty Summary Color Palettes
                </DialogTitle>
                <Badge variant="outline" className="text-[#6342e8] border-[#6342e8]/30 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                  5 Academic Schemes
                </Badge>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Customize the aesthetic of your generated <strong>Individual Duty Summary</strong> PDFs. Select any palette below to preview how it will appear.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Palettes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 py-4">
          {ALL_PALETTES.map((palette) => {
            const isSelected = pdfPaletteId === palette.id;

            return (
              <div
                key={palette.id}
                onClick={() => handleSelect(palette)}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl p-4 transition-all duration-200 cursor-pointer select-none border text-left group",
                  isSelected
                    ? "border-[#6342e8] bg-purple-50/30 dark:bg-purple-950/20 ring-2 ring-[#6342e8] shadow-md shadow-purple-900/10"
                    : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                )}
              >
                {/* Header Information */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {palette.name}
                      </span>
                      {palette.isDefault && (
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none text-[9px] font-semibold px-1.5 py-0">
                          Default
                        </Badge>
                      )}
                    </div>

                    {/* Radio / Selected Indicator */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-white transition-all shrink-0",
                        isSelected
                          ? "bg-[#6342e8] shadow-xs"
                          : "border-2 border-slate-300 dark:border-slate-700 group-hover:border-slate-400"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug mb-3">
                    {palette.tagline}
                  </p>

                  {/* Swatches Bar */}
                  <div className="flex items-center gap-1.5 mb-3.5">
                    <span
                      className="w-4 h-4 rounded-full shadow-xs border border-white/40"
                      style={{ backgroundColor: palette.hex.primary }}
                      title="Primary Header/Footer"
                    />
                    <span
                      className="w-4 h-4 rounded-full shadow-xs border border-white/40"
                      style={{ backgroundColor: palette.hex.secondary }}
                      title="Secondary / Table Head"
                    />
                    <span
                      className="w-4 h-4 rounded-full shadow-xs border border-white/40"
                      style={{ backgroundColor: palette.hex.accent }}
                      title="Accent / Avatar Badge"
                    />
                    <span
                      className="w-4 h-4 rounded-full shadow-xs border border-white/40"
                      style={{ backgroundColor: palette.hex.accentLight }}
                      title="Accent Light"
                    />
                    <span
                      className="w-4 h-4 rounded-full shadow-xs border border-white/40"
                      style={{ backgroundColor: palette.hex.stripe }}
                      title="Accent Stripe"
                    />
                  </div>

                  {/* High-Fidelity Miniature PDF Document Preview */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-950/40 shadow-inner">
                    <div className="bg-white rounded-lg p-2 border border-slate-200/80 shadow-2xs space-y-1.5 overflow-hidden text-[7px]">
                      {/* Mini Hero Header */}
                      <div
                        className="rounded p-1.5 text-center text-white relative overflow-hidden"
                        style={{ backgroundColor: palette.hex.primary }}
                      >
                        <div className="font-extrabold text-[7px] tracking-tight leading-none uppercase">
                          St. Joseph’s University
                        </div>
                        <div
                          className="inline-block mt-0.5 px-1 py-0.2 rounded text-[5.5px] font-bold"
                          style={{
                            backgroundColor: palette.hex.secondary,
                            color: palette.hex.badgeText,
                          }}
                        >
                          Semester Examinations
                        </div>
                        <div className="text-[6px] font-bold mt-0.5 tracking-wider uppercase opacity-95">
                          Invigilator’s Duty Summary
                        </div>
                        {/* Amber Accent Stripe */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-[2px]"
                          style={{ backgroundColor: palette.hex.stripe }}
                        />
                      </div>

                      {/* Mini Faculty Profile Card */}
                      <div
                        className="rounded p-1 border relative flex items-center justify-between overflow-hidden"
                        style={{
                          backgroundColor: palette.hex.cardBg,
                          borderColor: palette.hex.cardBorder,
                        }}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[2px]"
                          style={{ backgroundColor: palette.hex.accentLight }}
                        />
                        <div className="flex items-center gap-1 pl-1">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[7px] text-white shrink-0"
                            style={{ backgroundColor: palette.hex.accent }}
                          >
                            D
                          </div>
                          <div>
                            <div className="font-bold text-[6.5px] text-slate-800 leading-none">
                              Dr. S. Kumar
                            </div>
                            <div
                              className="text-[5.5px] font-semibold leading-none mt-0.5"
                              style={{ color: palette.hex.accent }}
                            >
                              Associate Professor
                            </div>
                          </div>
                        </div>

                        {/* Right Stat Box */}
                        <div
                          className="rounded px-1.5 py-0.5 text-center border shrink-0"
                          style={{
                            backgroundColor: palette.hex.statBoxBg,
                            borderColor: palette.hex.statBoxBorder,
                          }}
                        >
                          <div
                            className="text-[4.5px] font-bold uppercase leading-none"
                            style={{ color: palette.hex.accent }}
                          >
                            DUTIES
                          </div>
                          <div
                            className="text-[8px] font-black leading-none my-0.5"
                            style={{ color: palette.hex.statNumber }}
                          >
                            6
                          </div>
                          <div className="text-[4px] text-slate-400 leading-none">
                            Sessions
                          </div>
                        </div>
                      </div>

                      {/* Mini Schedule Table */}
                      <div className="rounded overflow-hidden border border-slate-100">
                        <div
                          className="text-white font-bold px-1 py-0.5 text-[5.5px] flex items-center justify-between"
                          style={{ backgroundColor: palette.hex.secondary }}
                        >
                          <span>Date</span>
                          <span>Subject</span>
                          <span>Timings</span>
                        </div>
                        <div className="flex items-center justify-between px-1 py-0.5 bg-white text-[5px] text-slate-600 border-b border-slate-100">
                          <span>12.10.2026</span>
                          <span className="font-semibold text-slate-800">Discrete Math</span>
                          <span
                            className="px-1 rounded text-[4.5px] font-bold"
                            style={{
                              backgroundColor: palette.hex.cardBg,
                              color: palette.hex.accent,
                            }}
                          >
                            09:30 AM
                          </span>
                        </div>
                        <div
                          className="flex items-center justify-between px-1 py-0.5 text-[5px] text-slate-600"
                          style={{ backgroundColor: palette.hex.cardBg }}
                        >
                          <span>14.10.2026</span>
                          <span className="font-semibold text-slate-800">Database Systems</span>
                          <span
                            className="px-1 rounded text-[4.5px] font-bold"
                            style={{
                              backgroundColor: palette.hex.cardBg,
                              color: palette.hex.accent,
                            }}
                          >
                            02:00 PM
                          </span>
                        </div>
                      </div>

                      {/* Mini Instructions Card */}
                      <div className="rounded overflow-hidden">
                        <div
                          className="text-white font-bold px-1 py-0.5 text-[5px] text-center"
                          style={{ backgroundColor: palette.hex.accentLight }}
                        >
                          Important Guidelines
                        </div>
                        <div className="bg-slate-50 p-1 border border-slate-100 text-[4.5px] text-slate-500 space-y-0.5">
                          <div className="flex items-center gap-0.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full text-white flex items-center justify-center font-bold text-[3.5px] shrink-0"
                              style={{ backgroundColor: palette.hex.accent }}
                            >
                              1
                            </span>
                            <span className="truncate">Report 15 minutes before the session starts.</span>
                          </div>
                        </div>
                      </div>

                      {/* Mini Footer Bar */}
                      <div
                        className="rounded p-0.5 text-right text-white relative overflow-hidden flex items-center justify-between"
                        style={{ backgroundColor: palette.hex.primary }}
                      >
                        <div
                          className="absolute top-0 left-0 right-0 h-[1px]"
                          style={{ backgroundColor: palette.hex.stripe }}
                        />
                        <span className="text-[4px] opacity-75">Controller of Exams</span>
                        <span className="text-[4px] opacity-75">Digitally Verified</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Selection Button */}
                <div className="mt-3 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "w-full text-xs font-semibold h-8 rounded-xl transition-all",
                      isSelected
                        ? "bg-[#6342e8] hover:bg-[#5232d6] text-white shadow-xs"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" /> Active Palette
                      </span>
                    ) : (
                      <span>Select Palette</span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6 h-9 rounded-xl"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
