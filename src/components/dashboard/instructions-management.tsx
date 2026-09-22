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
  Printer,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  CheckCheck,
  ShieldCheck,
  ArrowUpDown
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
    moveInstruction,
    saveInstructions,
    resetInstructionsToDefault
  } = useAllotment();

  const { toast } = useToast();
  const [newInstructionText, setNewInstructionText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Persistence and dirty states
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const enabledCount = instructions.filter(i => i.enabled).length;

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Only clear if leaving container
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveInstruction(draggedIndex, targetIndex);
      setHasUnsavedChanges(true);
      toast({
        title: 'Instruction Moved',
        description: `Position updated to #${targetIndex + 1}. Click "Save Instructions" to lock in order.`
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Direct slide / move buttons
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      moveInstruction(index, index - 1);
      setHasUnsavedChanges(true);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < instructions.length - 1) {
      moveInstruction(index, index + 1);
      setHasUnsavedChanges(true);
    }
  };

  // Save instructions action
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await saveInstructions();
      if (success) {
        setHasUnsavedChanges(false);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(timeStr);
        toast({
          title: 'Instructions Saved & Retained',
          description: `All ${instructions.length} guidelines (order & selections) are saved for this session and future PDF duty summaries.`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: 'Could not write to local or cloud storage.'
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error Saving Instructions',
        description: 'An unexpected error occurred while saving.'
      });
    } finally {
      setIsSaving(false);
    }
  };

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
    setHasUnsavedChanges(true);
    toast({
      title: 'Instruction Updated',
      description: 'Changes will be reflected on future PDF duty summaries.'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleToggle = (id: string) => {
    toggleInstruction(id);
    setHasUnsavedChanges(true);
  };

  const handleDelete = (id: string) => {
    deleteInstruction(id);
    setHasUnsavedChanges(true);
    toast({
      title: 'Instruction Removed',
      description: 'Guideline removed from list.'
    });
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
    setHasUnsavedChanges(true);
    toast({
      title: 'Instruction Added',
      description: 'New custom instruction added at the end of the list.'
    });
  };

  const handleSelectAll = () => {
    instructions.forEach(i => {
      if (!i.enabled) toggleInstruction(i.id);
    });
    setHasUnsavedChanges(true);
    toast({
      title: 'All Instructions Selected',
      description: 'All guidelines will appear on the Invigilator Duty Summary PDF.'
    });
  };

  const handleDeselectAll = () => {
    instructions.forEach(i => {
      if (i.enabled) toggleInstruction(i.id);
    });
    setHasUnsavedChanges(true);
    toast({
      title: 'All Instructions Deselected',
      description: 'No general instructions will appear on the PDF.'
    });
  };

  const handleReset = () => {
    resetInstructionsToDefault();
    setEditingId(null);
    setHasUnsavedChanges(true);
    toast({
      title: 'Reset to Defaults',
      description: 'Restored the 10 standard examination invigilation instructions in default order.'
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Main Instructions Card - Glassmorphism translucent design */}
      <Card className="border border-white/60 dark:border-slate-850/80 shadow-xl shadow-purple-500/5 rounded-3xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        {/* Top Accent Gradient Stripe */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

        <CardHeader className="pb-4 pt-6 px-6 border-b border-slate-200/50 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-300 ring-1 ring-purple-500/20 shrink-0">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    General Instructions List
                  </CardTitle>
                  <Badge className="bg-purple-500/10 text-[#6342e8] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60 text-xs px-2.5 py-0.5 font-bold rounded-full backdrop-blur-sm shadow-2xs">
                    <Printer className="w-3 h-3 mr-1" />
                    {enabledCount} of {instructions.length} Active in PDF
                  </Badge>

                  {hasUnsavedChanges ? (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40 text-[11px] px-2.5 py-0.5 font-semibold rounded-full animate-pulse backdrop-blur-sm">
                      Unsaved Order / Changes
                    </Badge>
                  ) : lastSavedTime ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 text-[11px] px-2 py-0.5 font-semibold rounded-full backdrop-blur-sm hidden sm:inline-flex">
                      <CheckCheck className="w-3 h-3 mr-1" /> Saved at {lastSavedTime}
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800 text-[11px] px-2 py-0.5 font-medium rounded-full backdrop-blur-sm hidden sm:inline-flex">
                      <ShieldCheck className="w-3 h-3 mr-1 text-[#6342e8]" /> Session Retained
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3 h-3 text-[#6342e8] inline shrink-0" />
                  <span>
                    Drag rows or use arrow buttons to reorder points. Check boxes to include on printed slips.
                  </span>
                </CardDescription>
              </div>
            </div>

            {/* Top Action Controls including Save Instructions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary Save Instructions Button */}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "h-9 px-4 text-xs font-bold rounded-xl transition-all shadow-md gap-1.5",
                  hasUnsavedChanges
                    ? "bg-[#6342e8] hover:bg-[#5232d6] text-white shadow-[#6342e8]/25 ring-2 ring-[#6342e8]/40"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                )}
                title="Save instructions for this session and future duty summary slips"
              >
                {hasUnsavedChanges ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Instructions</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Instructions Saved</span>
                  </>
                )}
              </Button>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

              {/* Bulk Toggle Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs font-semibold rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 hover:text-[#6342e8] hover:bg-white dark:hover:bg-slate-800"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="h-8 text-xs font-semibold rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
              >
                <Square className="w-3.5 h-3.5 mr-1" />
                Deselect All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/30"
                title="Reset to 10 standard guidelines in original order"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {instructions.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-white/40 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 backdrop-blur-sm">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-[#6342e8] w-fit mx-auto">
                <ListChecks className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No instructions available</p>
              <Button
                size="sm"
                onClick={handleReset}
                className="bg-[#6342e8] hover:bg-[#5232d6] text-white text-xs rounded-xl shadow-sm"
              >
                Restore 10 Default Instructions
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {instructions.map((item, index) => {
                const isEditing = editingId === item.id;
                const isBeingDragged = draggedIndex === index;
                const isTargetOfDrag = dragOverIndex === index && draggedIndex !== index;

                return (
                  <div
                    key={item.id}
                    draggable={!isEditing}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "p-3 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative group",
                      "backdrop-blur-md",
                      // Dragging state styling
                      isBeingDragged && "opacity-40 scale-[0.98] border-dashed border-[#6342e8] bg-purple-100/40 dark:bg-purple-900/30",
                      // Drop target indicator styling
                      isTargetOfDrag && "ring-2 ring-[#6342e8] bg-purple-100/70 dark:bg-purple-900/40 scale-[1.01] shadow-lg",
                      // Normal enabled vs disabled styling with slight transparency
                      !isBeingDragged && !isTargetOfDrag && (
                        item.enabled
                          ? "bg-purple-50/40 dark:bg-purple-950/25 border-purple-200/70 dark:border-purple-800/40 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 hover:border-purple-300/80 shadow-xs hover:shadow-md"
                          : "bg-slate-50/40 dark:bg-slate-800/25 border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 opacity-75 hover:opacity-100"
                      )
                    )}
                  >
                    {/* Left: Drag Handle, Slide Arrows, Serial Number, Checkbox & Text */}
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* Drag Handle & Slide Buttons */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Drag Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-slate-400 hover:text-[#6342e8] hover:bg-purple-500/10 transition-colors"
                          title="Click and drag to reorder instruction"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Slide Up / Down Nudge Buttons */}
                        <div className="flex flex-col -space-y-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            title="Move instruction up"
                            className={cn(
                              "p-0.5 rounded text-slate-400 hover:text-[#6342e8] hover:bg-purple-500/10 transition-colors",
                              index === 0 && "opacity-25 pointer-events-none"
                            )}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === instructions.length - 1}
                            title="Move instruction down"
                            className={cn(
                              "p-0.5 rounded text-slate-400 hover:text-[#6342e8] hover:bg-purple-500/10 transition-colors",
                              index === instructions.length - 1 && "opacity-25 pointer-events-none"
                            )}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Serial Number Badge */}
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0 shadow-2xs transition-colors",
                        item.enabled
                          ? "bg-[#6342e8] text-white"
                          : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}>
                        {index + 1}
                      </div>

                      {/* Custom Checkbox */}
                      <Checkbox
                        id={`check-${item.id}`}
                        checked={item.enabled}
                        onCheckedChange={() => handleToggle(item.id)}
                        className="data-[state=checked]:bg-[#6342e8] data-[state=checked]:border-[#6342e8] rounded-md h-5 w-5 shrink-0 mt-0.5 sm:mt-0"
                      />

                      {/* Content or Edit Form */}
                      {isEditing ? (
                        <div className="flex-1 space-y-2 w-full">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-xs bg-white/90 dark:bg-slate-900/90 rounded-xl min-h-[64px] border-[#6342e8]/40 focus-visible:ring-[#6342e8] backdrop-blur-sm"
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
                              : "text-slate-500 dark:text-slate-400"
                          )}
                        >
                          {item.text}
                        </label>
                      )}
                    </div>

                    {/* Right: Status Badge & Actions */}
                    {!isEditing && (
                      <div className="flex items-center justify-end gap-1.5 shrink-0 pl-14 sm:pl-0">
                        {item.enabled ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 text-[10px] py-0 px-2 font-semibold hidden md:inline-flex rounded-full backdrop-blur-sm">
                            Included
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px] py-0 px-2 font-medium hidden md:inline-flex rounded-full border-slate-300/50 dark:border-slate-700/50">
                            Excluded
                          </Badge>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEdit(item.id, item.text)}
                          className="h-8 px-2.5 text-xs font-semibold rounded-lg bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:text-[#6342e8] hover:border-[#6342e8]/40"
                          title="Edit this instruction"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1 text-[#6342e8]" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50/70 dark:hover:bg-rose-950/40"
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
          <div className="pt-4 mt-6 border-t border-slate-200/50 dark:border-slate-800/60">
            <div className="bg-slate-50/50 dark:bg-slate-850/40 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
              <form onSubmit={handleAdd} className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-[#6342e8]" />
                  <span>Add Other Custom Instructions</span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <Input
                    value={newInstructionText}
                    onChange={(e) => setNewInstructionText(e.target.value)}
                    placeholder="Type any customized instruction here (e.g., Collect emergency contact numbers from control room)..."
                    className="h-10 text-xs rounded-xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 focus-visible:ring-[#6342e8] flex-1"
                  />

                  <Button
                    type="submit"
                    className="bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold text-xs h-10 px-5 rounded-xl shrink-0 shadow-sm gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Instruction</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-6 py-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-[#6342e8] shrink-0" />
            <span>
              Instructions are rendered in this exact serial order on every <strong>&quot;Invigilator&apos;s Duty Summary&quot;</strong> PDF slip.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className={cn(
                "h-8 px-4 text-xs font-bold rounded-xl shadow-xs gap-1.5 shrink-0",
                hasUnsavedChanges
                  ? "bg-[#6342e8] hover:bg-[#5232d6] text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{hasUnsavedChanges ? "Save Instructions" : "Instructions Saved"}</span>
            </Button>

            <Button asChild variant="outline" size="sm" className="h-8 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#6342e8] shrink-0">
              <Link href="/dashboard/allotment?tab=individual-dashboard">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-[#6342e8]" />
                View Individual Slips
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
