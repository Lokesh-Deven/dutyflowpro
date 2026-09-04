"use client";

import dynamic from "next/dynamic";

const SignatoryManagement = dynamic(
  () => import("@/components/dashboard/signatory-management").then((mod) => mod.SignatoryManagement),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-5xl mx-auto p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted-foreground font-medium">Loading Authorised Signatory...</p>
      </div>
    ),
  }
);

export default function SignatoryPage() {
  return <SignatoryManagement />;
}

