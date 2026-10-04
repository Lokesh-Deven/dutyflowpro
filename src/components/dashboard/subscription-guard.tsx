"use client";

import React, { ReactNode } from 'react';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  // Subscription plans temporarily suspended — grant unrestricted access to all dashboard features
  return <>{children}</>;
}
