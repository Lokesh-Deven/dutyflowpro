"use client";

import { DownloadCategory } from '@/lib/auth-context';

export interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: DownloadCategory;
  customTitle?: string;
  customMessage?: string;
}

export function SubscriptionDialog(_props: SubscriptionDialogProps) {
  // Subscription plans temporarily suspended — dialog does not display
  return null;
}
