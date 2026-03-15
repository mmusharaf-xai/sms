import { getDb } from '../../db/connection';
import { users, User } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface UserResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

export interface ChangePasswordResult {
  success: boolean;
  error?: string;
}

/**
 * Get user by ID
 */
export const getUserById = async (userId: number): Promise<UserResult> => {
  try {
    const db = getDb();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user: result[0] };
  } catch (error) {
    console.error('Get user error:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: number,
  data: {
    fullName?: string;
    avatar?: string | null;
    timezone?: string;
    language?: string;
    notifications?: boolean;
  }
): Promise<UpdateProfileResult> => {
  try {
    const db = getDb();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.fullName !== undefined) {
      if (!data.fullName.trim()) {
        return { success: false, error: 'Full name is required' };
      }
      updateData.fullName = data.fullName.trim();
    }

    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }

    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone;
    }

    if (data.language !== undefined) {
      updateData.language = data.language;
    }

    if (data.notifications !== undefined) {
      updateData.notifications = data.notifications ? 1 : 0;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: 'Failed to update profile' };
  }
};

/**
 * Change password
 */
export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> => {
  try {
    const db = getDb();

    // Get current user
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: 'User not found' };
    }

    const user = result[0];

    // Verify current password
    if (user.password !== currentPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' };
    }

    // Update password
    await db
      .update(users)
      .set({
        password: newPassword,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Failed to change password' };
  }
};

/**
 * Get timezone options
 */
export const getTimezoneOptions = () => [
  { label: 'UTC (Coordinated Universal Time)', value: 'UTC' },
  { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
  { label: 'Europe/Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Asia/Shanghai (CST)', value: 'Asia/Shanghai' },
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Australia/Sydney (AEST)', value: 'Australia/Sydney' },
];

/**
 * Get language options
 */
export const getLanguageOptions = () => [
  { label: 'English (US)', value: 'en' },
  { label: 'English (UK)', value: 'en-gb' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Chinese (Simplified)', value: 'zh-cn' },
];
