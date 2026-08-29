
import Header from '@/components/dashboard/header';
import { AllotmentProvider } from '@/lib/allotment-context';
import { SubscriptionGuard } from '@/components/dashboard/subscription-guard';

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
          <div className="w-full">
            <SubscriptionGuard>
              {children}
            </SubscriptionGuard>
          </div>
        </main>
      </div>
    </AllotmentProvider>
  );
}
