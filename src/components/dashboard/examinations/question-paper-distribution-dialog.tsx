"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { QuestionPaperDistributionView } from './question-paper-distribution-view';

interface QuestionPaperDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionPaperDistributionDialog({
  open,
  onOpenChange,
}: QuestionPaperDistributionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl overflow-y-auto border-slate-200 dark:border-slate-800 shadow-2xl">
        <QuestionPaperDistributionView isDialog={true} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
