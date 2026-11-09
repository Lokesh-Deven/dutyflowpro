/**
 * Shared Super Admin Types & Constants
 * Safe to import in both Client and Server components
 */

export const SUPERADMIN_EMAIL = 'lokeshconnects@gmail.com';
export const SUPERADMIN_RECOVERY_EMAIL = 'lokeshdeven@gmail.com';
export const SUPERADMIN_COOKIE_NAME = 'dutyflow_superadmin_session';

export interface SuperAdminStats {
  total_institutions: number;
  pending_approvals: number;
  approved_institutions: number;
  suspended_institutions: number;
}

export interface InstitutionRegistrationRecord {
  id: string;
  institution_id: string;
  institution_code?: string | null;
  institution_name: string;
  email: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
  subscription_status?: string;
}

export interface SuperAdminSessionPayload {
  email: string;
  role: 'super_admin';
  exp: number;
}

