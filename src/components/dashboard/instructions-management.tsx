"use client";

import React, { useState } from 'react';
import { useAllotment } from '@/lib/allotment-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  ListChecks,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  RotateCcw,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Info,
  Sparkles,
  Printer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function InstructionsManagement() {
  const {
    instructions,
    addInstruction,
    updateInstruction,
    toggleInstruction,
    deleteInstruction,
    resetInstructionsToDefault
  } = useAllotment();

  const { toast } = useToast();
  const [newInstructionText, setNewInstructionText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const enabledCount = instructions.filter(i => i.enabled).length;

  const handleStartEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Instruction cannot be empty',
        description: 'Please provide valid text or delete the instruction.'
      });
      return;
    }
    updateInstruction(id, editText);
    setEditingId(null);
    setEditText('');
    toast({
      title: 'Instruction Updated',
      description: 'Changes will be reflected on future PDF duty summaries.'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newInstructionText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty Instruction',
        description: 'Please enter instruction text before clicking Add.'
      });
      return;
    }
    addInstruction(newInstructionText);
    setNewInstructionText('');
    toast({
      title: 'Instruction Added',
      description: 'New custom instruction added and enabled for PDF summaries.'
    });
  };

  const handleSelectAll = () => {
    instructions.forEach(i => {
      if (!i.enabled) toggleInstruction(i.id);
    });
    toast({
      title: 'All Instructions Selected',
      description: 'All guidelines will appear on the Invigilator Duty Summary PDF.'
    });
  };

  const handleDeselectAll = () => {
    instructions.forEach(i => {
      if (i.enabled) toggleInstruction(i.id);
    });
    toast({
      title: 'All Instructions Deselected',
      description: 'No general instructions will appear on the PDF.'
    });
  };

  const handleReset = () => {
    resetInstructionsToDefault();
    setEditingId(null);
    toast({
      title: 'Reset to Defaults',
      description: 'Restored the 10 standard examination invigilation instructions.'
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-slate-900 dark:text-white">
            Add Instructions to Invigilators
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Checkmark and customize instructions to display under &quot;General Instructions&quot; on the Invigilator&apos;s Duty Summary PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-purple-50 text-[#6342e8] dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs px-3 py-1 font-bold rounded-full shadow-2xs">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            {enabledCount} of {instructions.length} Active in PDF
          </Badge>
        </div>
      </div>

      {/* Main Instructions Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Top Accent Gradient Stripe */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

        <CardHeader className="pb-4 pt-6 px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-300 shrink-0">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  General Instructions List
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select checkboxes to include items on the printable duty slip. Click edit to customize wording.
                </CardDescription>
              </div>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-800 hover:text-[#6342e8]"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="h-8 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-800 hover:text-slate-700"
              >
                <Square className="w-3.5 h-3.5 mr-1" />
                Deselect All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs text-slate-500 hover:text-rose-600 rounded-lg"
                title="Reset to 10 standard guidelines"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Defaults
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-3">
          {instructions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#6342e8] w-fit mx-auto">
                <ListChecks className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No instructions available</p>
              <Button
                size="sm"
                onClick={handleReset}
                className="bg-[#6342e8] hover:bg-[#5232d6] text-white text-xs rounded-xl"
              >
                Restore 10 Default Instructions
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {instructions.map((item, index) => {
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      item.enabled
                        ? "bg-purple-50/30 dark:bg-purple-950/20 border-purple-200/70 dark:border-purple-900/50"
                        : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/80 opacity-75 hover:opacity-100"
                    )}
                  >
                    {/* Left: Serial Number Badge & Checkbox & Text */}
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      {/* Serial Number */}
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0 shadow-2xs",
                        item.enabled
                          ? "bg-[#6342e8] text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}>
                        {index + 1}
                      </div>

                      {/* Custom Checkbox */}
                      <Checkbox
                        id={`check-${item.id}`}
                        checked={item.enabled}
                        onCheckedChange={() => toggleInstruction(item.id)}
                        className="data-[state=checked]:bg-[#6342e8] data-[state=checked]:border-[#6342e8] rounded-md h-5 w-5 shrink-0 mt-0.5 sm:mt-0"
                      />

                      {/* Content or Edit Form */}
                      {isEditing ? (
                        <div className="flex-1 space-y-2 w-full">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-xs bg-white dark:bg-slate-900 rounded-lg min-h-[64px] border-[#6342e8]/40 focus-visible:ring-[#6342e8]"
                            placeholder="Enter instruction details..."
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(item.id)}
                              className="bg-[#6342e8] hover:bg-[#5232d6] text-white text-xs h-7 px-3 rounded-lg shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="text-xs h-7 px-3 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor={`check-${item.id}`}
                          className={cn(
                            "text-xs leading-relaxed cursor-pointer select-none flex-1 font-medium transition-colors",
                            item.enabled
                              ? "text-slate-900 dark:text-slate-100 font-semibold"
                              : "text-slate-500 dark:text-slate-400 line-through/none"
                          )}
                        >
                          {item.text}
                        </label>
                      )}
                    </div>

                    {/* Right: Actions */}
                    {!isEditing && (
                      <div className="flex items-center justify-end gap-1.5 shrink-0 pl-9 sm:pl-0">
                        {item.enabled ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px] py-0 px-2 font-semibold hidden md:inline-flex rounded-full">
                            Included
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px] py-0 px-2 font-medium hidden md:inline-flex rounded-full">
                            Excluded
                          </Badge>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEdit(item.id, item.text)}
                          className="h-8 px-2.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#6342e8] hover:border-[#6342e8]/40"
                          title="Edit this instruction"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1 text-[#6342e8]" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInstruction(item.id)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete instruction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Custom Instruction Form */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <form onSubmit={handleAdd} className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-[#6342e8]" />
                <span>Add Other Custom Instructions</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <Input
                  value={newInstructionText}
                  onChange={(e) => setNewInstructionText(e.target.value)}
                  placeholder="Type any customized instruction here (e.g., Collect emergency contact numbers from control room)..."
                  className="h-10 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 focus-visible:ring-[#6342e8] flex-1"
                />

                <Button
                  type="submit"
                  className="bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold text-xs h-10 px-5 rounded-xl shrink-0 shadow-xs gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Instruction</span>
                </Button>
              </div>
            </form>
          </div>
        </CardContent>

        <CardFooter className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-[#6342e8] shrink-0" />
            <span>
              Selected instructions will automatically appear in serial numbers on every <strong>&quot;Invigilator&apos;s Duty Summary&quot;</strong> PDF slip.
            </span>
          </div>

          <Button asChild variant="outline" size="sm" className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#6342e8] shrink-0">
            <Link href="/dashboard/allotment">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-[#6342e8]" />
              View Individual Slips
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
