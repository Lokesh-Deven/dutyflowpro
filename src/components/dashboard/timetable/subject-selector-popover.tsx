"use client";

import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_SUBJECT_OPTIONS } from '@/lib/examination-timetable-service';

interface SubjectSelectorPopoverProps {
  selectedSubjects: string[];
  onChange: (subjects: string[]) => void;
  disabled?: boolean;
  allAvailableSubjects?: string[];
  onAddCustomSubject?: (subject: string) => void;
}

export function SubjectSelectorPopover({
  selectedSubjects = [],
  onChange,
  disabled = false,
  allAvailableSubjects = DEFAULT_SUBJECT_OPTIONS,
  onAddCustomSubject,
}: SubjectSelectorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Combined subject pool: available subjects + any already selected custom subjects
  const subjectPool = useMemo(() => {
    const set = new Set<string>([...allAvailableSubjects, ...selectedSubjects]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAvailableSubjects, selectedSubjects]);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subjectPool;
    return subjectPool.filter((s) => s.toLowerCase().includes(q));
  }, [subjectPool, searchQuery]);

  const handleToggleSubject = (subject: string) => {
    if (disabled) return;
    if (selectedSubjects.includes(subject)) {
      onChange(selectedSubjects.filter((s) => s !== subject));
    } else {
      onChange([...selectedSubjects, subject]);
    }
  };

  const handleAddNewSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;

    if (!selectedSubjects.includes(trimmed)) {
      onChange([...selectedSubjects, trimmed]);
    }
    if (onAddCustomSubject) {
      onAddCustomSubject(trimmed);
    }
    setCustomSubjectInput('');
  };

  const displayText = selectedSubjects.length > 0
    ? selectedSubjects.join(' / ')
    : 'Select Examination Subject(s)...';

  return (
    <Popover open={isOpen} onOpenChange={(open) => !disabled && setIsOpen(open)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between text-left px-3 py-2 text-xs rounded-lg border transition-all duration-150 min-h-[36px]",
            disabled
              ? "bg-slate-100/70 border-slate-200 text-slate-500 cursor-not-allowed"
              : selectedSubjects.length > 0
                ? "bg-indigo-50/40 border-indigo-200 hover:border-indigo-400 text-slate-900 font-semibold"
                : "bg-white border-slate-200 hover:border-slate-300 text-slate-400"
          )}
        >
          <span className="truncate pr-2 font-medium">
            {selectedSubjects.length > 0 ? (
              <span className="text-slate-900 font-bold">
                {displayText}
              </span>
            ) : (
              <span className="text-slate-400 italic">Select Subject(s)...</span>
            )}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedSubjects.length > 1 && (
              <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 h-4 font-bold rounded-full">
                {selectedSubjects.length}
              </Badge>
            )}
            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 text-xs" align="start">
        {/* Header Search */}
        <div className="p-2.5 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-headline font-bold text-xs text-slate-800">
              Select Examination Subject(s)
            </span>
            <div className="flex items-center gap-1">
              {selectedSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[10px] text-slate-500 hover:text-rose-600 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                >
                  Clear ({selectedSubjects.length})
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-slate-50 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Subjects Checkbox List */}
        <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-50">
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((subj) => {
              const isChecked = selectedSubjects.includes(subj);
              return (
                <div
                  key={subj}
                  onClick={() => handleToggleSubject(subj)}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs select-none",
                    isChecked
                      ? "bg-indigo-50/80 text-indigo-950 font-bold"
                      : "hover:bg-slate-50 text-slate-700 font-medium"
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => {}}
                    className="data-[state=checked]:bg-[#1E2A5E] shrink-0"
                  />
                  <span className="truncate flex-1">{subj}</span>
                  {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </div>
              );
            })
          ) : (
            <div className="py-4 text-center text-slate-400 text-xs">
              No subjects found for &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Add Custom Subject Form */}
        <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
          <form onSubmit={handleAddNewSubject} className="flex items-center gap-1.5">
            <Input
              placeholder="Type custom subject name..."
              value={customSubjectInput}
              onChange={(e) => setCustomSubjectInput(e.target.value)}
              className="h-7 text-xs bg-white flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!customSubjectInput.trim()}
              className="h-7 px-2.5 text-xs bg-[#1E2A5E] hover:bg-[#151D42] text-white shrink-0 font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
