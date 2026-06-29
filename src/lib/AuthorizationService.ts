import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  email?: string;
  ward_ids: number[];
  role: 'worker' | 'admin';
}

export class AuthorizationService {
  /**
   * Fetch the current user's role and profile.
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('worker_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.warn('Could not fetch user profile for RBAC', error);
      return null;
    }

    return data as UserProfile;
  }

  /**
   * Check if the current user is an Admin.
   */
  static async isAdmin(): Promise<boolean> {
    const profile = await this.getCurrentUserProfile();
    return profile?.role === 'admin';
  }

  /**
   * Check if the current user can manage a specific ward.
   * Admins can manage all wards.
   * Workers can manage only their assigned wards.
   */
  static async canManageWard(wardId: number): Promise<boolean> {
    const profile = await this.getCurrentUserProfile();
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    return profile.ward_ids.includes(wardId);
  }

  /**
   * Write an admin audit log entry.
   * Should only be called by admin operations.
   */
  static async logAdminAction(adminId: string, action: string, targetId?: string, details?: any) {
    const { error } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: adminId,
        action,
        target_id: targetId,
        details: details || {}
      });

    if (error) {
      console.error('Failed to write admin audit log:', error);
    }
  }
}
