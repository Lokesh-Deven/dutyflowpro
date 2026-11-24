"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  Check,
  Plus,
  Edit3,
  ListFilter,
  X,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_COURSE_OPTIONS } from '@/lib/examination-timetable-service';

interface CourseSelectorPopoverProps {
  value: string;
  onChange: (course: string) => void;
  disabled?: boolean;
  availableCourses?: string[];
  onAddCustomCourse?: (course: string) => void;
}

export function CourseSelectorPopover({
  value = '',
  onChange,
  disabled = false,
  availableCourses = [],
  onAddCustomCourse,
}: CourseSelectorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customCourseInput, setCustomCourseInput] = useState('');
  const [isInlineTyping, setIsInlineTyping] = useState(false);
  const [inlineValue, setInlineValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inlineValue when value changes externally
  useEffect(() => {
    setInlineValue(value);
  }, [value]);

  // Combined course pool: default options + custom courses
  const allCourses = useMemo(() => {
    const set = new Set<string>([...DEFAULT_COURSE_OPTIONS, ...availableCourses]);
    if (value && !set.has(value)) {
      set.add(value);
    }
    return Array.from(set);
  }, [availableCourses, value]);

  // Select a preset or previously added course
  const handleSelectCourse = (course: string) => {
    if (disabled) return;
    onChange(course);
    setIsOpen(false);
  };

  // Select blank / clear option
  const handleSelectBlank = () => {
    if (disabled) return;
    onChange('');
    setIsOpen(false);
  };

  // Add custom course from popover input
  const handleAddCustomCourse = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customCourseInput.trim();
    if (!trimmed) return;

    onChange(trimmed);
    if (onAddCustomCourse) {
      onAddCustomCourse(trimmed);
    }
    setCustomCourseInput('');
    setIsOpen(false);
  };

  // Save when typing inline in the cell
  const handleSaveInline = () => {
    const trimmed = inlineValue.trim();
    onChange(trimmed);
    if (trimmed && onAddCustomCourse) {
      onAddCustomCourse(trimmed);
    }
    setIsInlineTyping(false);
  };

  // If currently in inline typing mode inside the cell
  if (isInlineTyping && !disabled) {
    return (
      <div className="flex items-center gap-1 min-w-[150px]">
        <Input
          ref={inputRef}
          value={inlineValue}
          onChange={(e) => setInlineValue(e.target.value)}
          placeholder="Type course..."
          className="h-8 text-xs font-semibold bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white border-indigo-300 focus-visible:ring-1 focus-visible:ring-indigo-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveInline();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setIsInlineTyping(false);
            }
          }}
          autoFocus
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSaveInline}
          className="h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-xs"
        >
          Add
        </Button>
        <button
          type="button"
          onClick={() => setIsInlineTyping(false)}
          title="Switch to dropdown select"
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
        >
          <ListFilter className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const hasValue = Boolean(value && value.trim().length > 0);
  const courseLower = value.toLowerCase().trim();
  const is1PUC = courseLower === '1 puc';
  const is2PUC = courseLower === '2 puc';

  return (
    <Popover open={isOpen} onOpenChange={(open) => !disabled && setIsOpen(open)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between text-left px-2.5 py-2 text-xs rounded-lg border transition-all duration-150 min-h-[36px]",
            disabled
              ? "bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              : is1PUC
                ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 text-indigo-900 dark:text-indigo-200 font-bold"
                : is2PUC
                  ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold"
                  : hasValue
                    ? "bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 text-slate-900 dark:text-white font-bold"
                    : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-400 dark:text-slate-500"
          )}
        >
          <span className="truncate pr-1">
            {hasValue ? (
              <span className={cn(
                "font-bold tracking-tight",
                is1PUC ? "text-indigo-800 dark:text-indigo-200" : is2PUC ? "text-emerald-800 dark:text-emerald-200" : "text-indigo-950 dark:text-indigo-200"
              )}>
                {value}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Select Course...</span>
            )}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 transition-transform", isOpen && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl rounded-xl z-50 text-xs"
        align="start"
      >
        {/* Header */}
        <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
          <div className="flex items-center gap-1.5 font-headline font-bold text-slate-800 dark:text-slate-200 text-xs">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Select Course</span>
          </div>
          {hasValue && (
            <button
              type="button"
              onClick={handleSelectBlank}
              className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dropdown Options List */}
        <div className="p-1.5 space-y-0.5 max-h-52 overflow-y-auto">
          {/* Preset Standard Options */}
          {DEFAULT_COURSE_OPTIONS.map((opt) => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectCourse(opt)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors",
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800"
                )}
              >
                <span>{opt}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
            );
          })}

          {/* Any Custom Added Courses */}
          {allCourses
            .filter((c) => !DEFAULT_COURSE_OPTIONS.includes(c))
            .map((opt) => {
              const isSelected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectCourse(opt)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors",
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800"
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              );
            })}

          {/* Blank Option */}
          <button
            type="button"
            onClick={handleSelectBlank}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors",
              !hasValue
                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                : "text-slate-500 dark:text-slate-400 italic hover:bg-slate-100/80 dark:hover:bg-slate-800"
            )}
          >
            <span>— Blank (No Course) —</span>
            {!hasValue && <Check className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />}
          </button>
        </div>

        {/* Divider & Type Custom Course Section */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 rounded-b-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Type Custom Course
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsInlineTyping(true);
              }}
              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 hover:underline"
            >
              <Edit3 className="w-3 h-3" />
              Type in Cell
            </button>
          </div>

          <form onSubmit={handleAddCustomCourse} className="flex items-center gap-1.5">
            <Input
              value={customCourseInput}
              onChange={(e) => setCustomCourseInput(e.target.value)}
              placeholder="e.g. B.Com, Diploma..."
              className="h-7 text-xs bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-400"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!customCourseInput.trim()}
              className="h-7 px-2.5 bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs shrink-0 shadow-2xs disabled:opacity-40"
            >
              <Plus className="w-3 h-3 mr-0.5" />
              Add
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}

