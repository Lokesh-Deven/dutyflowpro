"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { generateTimeIntervals } from '@/lib/examination-timetable-service';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Clock } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TimePickerInputProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
}

const TIME_OPTIONS = generateTimeIntervals();

export function TimePickerInput({
  value,
  onChange,
  placeholder = "10:00 AM",
  isInvalid = false,
  errorMessage,
  disabled = false,
  className,
}: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll to selected time when dropdown opens
  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen]);

  const isHyphen = value === '-' || value === '—';

  return (
    <div className="relative group w-full">
      <div className="relative flex items-center">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          title={isInvalid ? errorMessage : "Type or click arrow to select time or hyphen (-)"}
          className={cn(
            "h-8 text-xs font-mono font-semibold pl-2 pr-7 rounded-md transition-colors",
            isHyphen && "text-slate-700 font-bold text-center text-sm",
            isInvalid
              ? "border-rose-400 bg-rose-50/50 text-rose-900 focus-visible:ring-rose-400"
              : "border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500",
            disabled && "bg-slate-100 text-slate-400 cursor-not-allowed",
            className
          )}
        />

        <Popover open={isOpen} onOpenChange={(open) => !disabled && setIsOpen(open)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded-r-md transition-colors cursor-pointer",
                disabled && "opacity-40 cursor-not-allowed hover:text-slate-400"
              )}
              title="Click to select time or '-' (No Exam)"
            >
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-150",
                  isOpen && "rotate-180 text-indigo-600"
                )}
              />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-48 p-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 text-xs"
            align="end"
          >
            {/* Header */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="font-headline font-bold text-[11px] text-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-600" />
                Select Time
              </span>
              <span className="text-[10px] text-slate-400 font-medium">15 min intervals</span>
            </div>

            {/* Hyphen (-) Option for "No Exam" */}
            <div className="p-1 border-b border-slate-100 bg-slate-50/40">
              <button
                type="button"
                onClick={() => {
                  onChange('-');
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded font-mono text-xs transition-colors flex items-center justify-between cursor-pointer",
                  isHyphen
                    ? "bg-[#1E2A5E] text-white font-bold shadow-2xs"
                    : "hover:bg-slate-100 text-slate-800 font-semibold"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base leading-none">-</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      isHyphen ? "text-slate-200" : "text-slate-500 font-normal"
                    )}
                  >
                    (No Exam)
                  </span>
                </div>
                {isHyphen && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>
            </div>

            {/* Scrollable 15-Minute Interval Times */}
            <div className="max-h-52 overflow-y-auto p-1 space-y-0.5">
              {TIME_OPTIONS.map((time) => {
                const isSelected = !isHyphen && value?.trim().toLowerCase() === time.toLowerCase();
                return (
                  <button
                    key={time}
                    ref={isSelected ? activeItemRef : undefined}
                    type="button"
                    onClick={() => {
                      onChange(time);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded font-mono text-xs transition-colors flex items-center justify-between cursor-pointer",
                      isSelected
                        ? "bg-[#1E2A5E] text-white font-bold shadow-2xs"
                        : "hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-950 font-medium"
                    )}
                  >
                    <span>{time}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isInvalid && errorMessage && (
        <span className="text-[10px] text-rose-600 font-semibold block mt-0.5 leading-none">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
