import { ProfileView } from '@/components/dashboard/profile-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Settings | DutyFlow',
  description: 'Manage your institution profile, usage, download activity, and contact support.',
};

export default function ProfilePage() {
  return <ProfileView />;
}
