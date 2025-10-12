
import Header from '@/components/dashboard/header';
import { Toaster } from '@/components/ui/toaster';
import { AllotmentProvider } from '@/lib/allotment-context';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AllotmentProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <Toaster />
      </div>
    </AllotmentProvider>
  );
}
