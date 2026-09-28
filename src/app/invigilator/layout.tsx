import React from 'react';
import { Metadata } from 'next';
import { InvigilatorPortalProvider } from '@/lib/invigilator-portal-context';

export const metadata: Metadata = {
  title: 'Invigilator Portal | DutyFlow',
  description: 'DutyFlow Invigilator Dashboard & Hall Attendance Management',
};

export default function InvigilatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InvigilatorPortalProvider>
      {children}
    </InvigilatorPortalProvider>
  );
}
