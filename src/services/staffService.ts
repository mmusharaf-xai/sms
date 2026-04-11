import { getDb } from '../../db/connection';
import { users, userSchools, User, UserSchool } from '../../db/schema';
import { eq, ne, and, like, or, count } from 'drizzle-orm';

export interface StaffMember {
  id: number;
  fullName: string;
  email: string;
  avatar?: string | null;
  role: string;
  staffId: string; // e.g. STF-202401
  status: 'active' | 'inactive' | 'pending';
}

export interface StaffListResult {
  success: boolean;
  staff?: StaffMember[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

/**
 * Generate a staff ID from user ID
 */
const generateStaffId = (userId: number): string => {
  const year = new Date().getFullYear();
  const paddedId = String(userId).padStart(4, '0');
  return `STF-${year}${paddedId}`;
};

/**
 * Get all staff members for a school with search and pagination
 */
export const getSchoolStaffs = async (
  schoolId: number,
  options: {
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<StaffListResult> => {
  try {
    const db = getDb();
    const { search = '', page = 1, pageSize = 10 } = options;
    const offset = (page - 1) * pageSize;

    // Build where conditions - exclude owners (they are not staff)
    const conditions = [eq(userSchools.schoolId, schoolId), ne(userSchools.role, 'owner')];

    // If search is provided, search by name or email
    if (search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          like(users.fullName, searchTerm),
          like(users.email, searchTerm)
        )!
      );
    }

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(userSchools)
      .innerJoin(users, eq(userSchools.userId, users.id))
      .where(and(...conditions));

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated staff
    const rows = await db
      .select({
        user: users,
        userSchool: userSchools,
      })
      .from(userSchools)
      .innerJoin(users, eq(userSchools.userId, users.id))
      .where(and(...conditions))
      .limit(pageSize)
      .offset(offset)
      .orderBy(users.fullName);

    const staff: StaffMember[] = rows.map((row) => ({
      id: row.user.id,
      fullName: row.user.fullName,
      email: row.user.email,
      avatar: row.user.avatar,
      role: row.userSchool.role.charAt(0).toUpperCase() + row.userSchool.role.slice(1),
      staffId: generateStaffId(row.user.id),
      status: 'active', // Default to active; could be extended later
    }));

    return {
      success: true,
      staff,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('Get school staffs error:', error);
    return {
      success: false,
      error: 'Failed to fetch staff members',
    };
  }
};

/**
 * Check if user has access to view staff listing for a school
 */
export const checkStaffAccess = async (
  schoolId: number,
  userId: number
): Promise<{ hasAccess: boolean; error?: string }> => {
  try {
    const db = getDb();

    // Check if user is a member of the school
    const membership = await db
      .select()
      .from(userSchools)
      .where(
        and(
          eq(userSchools.schoolId, schoolId),
          eq(userSchools.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return { hasAccess: false, error: 'You do not have access to this school' };
    }

    const role = membership[0].role;

    // Owner, admin, and staff can view staff listing
    if (['owner', 'admin', 'staff'].includes(role)) {
      return { hasAccess: true };
    }

    return { hasAccess: false, error: 'You do not have permission to view staff' };
  } catch (error) {
    console.error('Check staff access error:', error);
    return { hasAccess: false, error: 'Failed to check access' };
  }
};
