import { ProfileView } from '@/components/dashboard/profile-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Account | DutyFlow',
  description: 'Manage your institution profile, subscription plan, usage, and contact support.',
};

export default function ProfilePage() {
  return <ProfileView />;
}
