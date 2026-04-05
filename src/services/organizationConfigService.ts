import { getDb } from '../../db/connection';
import { schools, userSchools, roles } from '../../db/schema';
import { eq, and, ne } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────

export interface OrganizationDetails {
  id: number;
  name: string;
  email: string;
  address: string;
  phone: string;
}

export interface OrganizationRole {
  id: number;
  name: string;
  type: 'FULL ACCESS' | 'STANDARD';
}

export interface OrganizationConfigData {
  details: OrganizationDetails;
  roles: OrganizationRole[];
}

export interface OrganizationConfigResult {
  success: boolean;
  data?: OrganizationConfigData;
  error?: string;
}

export interface UpdateOrganizationResult {
  success: boolean;
  error?: string;
}

export interface UniqueCheckResult {
  isUnique: boolean;
  error?: string;
}

// ── Fetch organisation config (details + roles) ────────────────────────

export const fetchOrganizationConfig = async (
  schoolId: number,
  userId: number
): Promise<OrganizationConfigResult> => {
  try {
    const db = getDb();

    // Verify user has access (owner or admin)
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
      return { success: false, error: 'You do not have access to this organization' };
    }

    const userRole = membership[0].role;
    if (userRole !== 'owner' && userRole !== 'admin') {
      return { success: false, error: 'Only owners and admins can manage organization settings' };
    }

    // Fetch school details
    const schoolRows = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (schoolRows.length === 0) {
      return { success: false, error: 'Organization not found' };
    }

    const school = schoolRows[0];

    const details: OrganizationDetails = {
      id: school.id,
      name: school.name ?? '',
      email: school.email ?? '',
      address: school.address ?? '',
      phone: school.phone ?? '',
    };

    // Fetch roles from the roles table
    const roleRows = await db
      .select()
      .from(roles)
      .where(eq(roles.schoolId, schoolId));

    const orgRoles: OrganizationRole[] = roleRows.map((r) => ({
      id: r.id,
      name: r.name,
      type: (r.type as 'FULL ACCESS' | 'STANDARD') ?? 'STANDARD',
    }));

    return {
      success: true,
      data: { details, roles: orgRoles },
    };
  } catch (error) {
    console.error('fetchOrganizationConfig error:', error);
    return { success: false, error: 'Failed to load organization configuration' };
  }
};

// ── Check unique name ──────────────────────────────────────────────────

export const checkOrganizationNameUnique = async (
  name: string,
  currentSchoolId: number
): Promise<UniqueCheckResult> => {
  try {
    const db = getDb();
    const trimmed = name.trim();

    const existing = await db
      .select()
      .from(schools)
      .where(and(eq(schools.name, trimmed), ne(schools.id, currentSchoolId)))
      .limit(1);

    if (existing.length > 0) {
      return { isUnique: false, error: 'An organization with this name already exists' };
    }
    return { isUnique: true };
  } catch (error) {
    console.error('checkOrganizationNameUnique error:', error);
    return { isUnique: false, error: 'Unable to verify name uniqueness' };
  }
};

// ── Check unique address ───────────────────────────────────────────────

export const checkOrganizationAddressUnique = async (
  address: string,
  currentSchoolId: number
): Promise<UniqueCheckResult> => {
  try {
    const db = getDb();
    const trimmed = address.trim();

    const existing = await db
      .select()
      .from(schools)
      .where(and(eq(schools.address, trimmed), ne(schools.id, currentSchoolId)))
      .limit(1);

    if (existing.length > 0) {
      return { isUnique: false, error: 'An organization with this address already exists' };
    }
    return { isUnique: true };
  } catch (error) {
    console.error('checkOrganizationAddressUnique error:', error);
    return { isUnique: false, error: 'Unable to verify address uniqueness' };
  }
};

// ── Update organisation details ────────────────────────────────────────

export const updateOrganizationDetails = async (
  schoolId: number,
  userId: number,
  data: {
    name: string;
    email: string;
    address: string;
    phone: string;
  }
): Promise<UpdateOrganizationResult> => {
  try {
    const db = getDb();

    // Verify ownership / admin
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
      return { success: false, error: 'You do not have access to this organization' };
    }

    const userRole = membership[0].role;
    if (userRole !== 'owner' && userRole !== 'admin') {
      return { success: false, error: 'Only owners and admins can update organization details' };
    }

    const trimmedName = data.name.trim();
    const trimmedEmail = data.email.trim();
    const trimmedAddress = data.address.trim();
    const trimmedPhone = data.phone.trim();

    // Uniqueness: name
    const nameCheck = await checkOrganizationNameUnique(trimmedName, schoolId);
    if (!nameCheck.isUnique) {
      return { success: false, error: nameCheck.error };
    }

    // Uniqueness: address
    const addressCheck = await checkOrganizationAddressUnique(trimmedAddress, schoolId);
    if (!addressCheck.isUnique) {
      return { success: false, error: addressCheck.error };
    }

    // Perform update
    await db
      .update(schools)
      .set({
        name: trimmedName,
        email: trimmedEmail,
        address: trimmedAddress,
        phone: trimmedPhone,
        updatedAt: new Date().toISOString(),
      } as any)
      .where(eq(schools.id, schoolId));

    return { success: true };
  } catch (error) {
    console.error('updateOrganizationDetails error:', error);
    return { success: false, error: 'Failed to update organization details' };
  }
};
