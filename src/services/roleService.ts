import { getDb } from '../../db/connection';
import { roles, userSchools } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { fetchSchoolModules, ModuleData } from './moduleService';

// ── Types ──────────────────────────────────────────────────────────────

export interface ModulePermission {
  read: string[];
  update: string[];
  delete: string[];
  add: string[];
  fullAccess: boolean;
}

export interface RolePermissions {
  [moduleKey: string]: ModulePermission;
}

export interface RoleData {
  id: number;
  schoolId: number;
  name: string;
  type: 'FULL ACCESS' | 'STANDARD';
  permissions: RolePermissions;
  createdAt: string;
  updatedAt: string;
}

export interface RoleResult {
  success: boolean;
  role?: RoleData;
  error?: string;
}

export interface RolesListResult {
  success: boolean;
  roles?: RoleData[];
  error?: string;
}

// ── Permission helpers (now work with dynamic module lists) ───────────

/** Build an empty permissions map from a list of module keys */
export const buildEmptyPermissions = (moduleKeys: string[]): RolePermissions => {
  const perms: RolePermissions = {};
  for (const key of moduleKeys) {
    perms[key] = { read: [], update: [], delete: [], add: [], fullAccess: false };
  }
  return perms;
};

/** Build empty permissions from ModuleData[] for convenience */
export const buildEmptyPermissionsFromModules = (mods: ModuleData[]): RolePermissions => {
  return buildEmptyPermissions(mods.map((m) => m.key));
};

// Helper: parse permissions JSON safely
const parsePermissions = (json: string | null): RolePermissions => {
  try {
    if (!json) return {};
    return JSON.parse(json);
  } catch {
    return {};
  }
};

// Helper: determine type from permissions and module keys
const computeRoleType = (
  perms: RolePermissions,
  moduleKeys: string[]
): 'FULL ACCESS' | 'STANDARD' => {
  if (moduleKeys.length === 0) return 'STANDARD';
  const allFull = moduleKeys.every((key) => perms[key]?.fullAccess === true);
  return allFull ? 'FULL ACCESS' : 'STANDARD';
};

// Helper: map DB row to RoleData
const toRoleData = (row: any): RoleData => {
  const perms = parsePermissions(row.permissions);
  return {
    id: row.id,
    schoolId: row.schoolId ?? row.school_id,
    name: row.name,
    type: (row.type as 'FULL ACCESS' | 'STANDARD') ?? 'STANDARD',
    permissions: perms,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  };
};

// ── Access check helper ────────────────────────────────────────────────

const verifyOwnerOrAdmin = async (
  schoolId: number,
  userId: number
): Promise<{ ok: boolean; error?: string }> => {
  const db = getDb();
  const membership = await db
    .select()
    .from(userSchools)
    .where(and(eq(userSchools.schoolId, schoolId), eq(userSchools.userId, userId)))
    .limit(1);

  if (membership.length === 0) {
    return { ok: false, error: 'You do not have access to this organization' };
  }
  const role = membership[0].role;
  if (role !== 'owner' && role !== 'admin') {
    return { ok: false, error: 'Only owners and admins can manage roles' };
  }
  return { ok: true };
};

// ── Fetch all roles for a school ───────────────────────────────────────

export const fetchSchoolRoles = async (
  schoolId: number,
  userId: number
): Promise<RolesListResult> => {
  try {
    const access = await verifyOwnerOrAdmin(schoolId, userId);
    if (!access.ok) return { success: false, error: access.error };

    const db = getDb();
    const rows = await db
      .select()
      .from(roles)
      .where(eq(roles.schoolId, schoolId));

    return { success: true, roles: rows.map(toRoleData) };
  } catch (error) {
    console.error('fetchSchoolRoles error:', error);
    return { success: false, error: 'Failed to fetch roles' };
  }
};

// ── Fetch single role ──────────────────────────────────────────────────

export const fetchRoleById = async (
  roleId: number,
  schoolId: number,
  userId: number
): Promise<RoleResult> => {
  try {
    const access = await verifyOwnerOrAdmin(schoolId, userId);
    if (!access.ok) return { success: false, error: access.error };

    const db = getDb();
    const rows = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.schoolId, schoolId)))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: 'Role not found' };
    }

    return { success: true, role: toRoleData(rows[0]) };
  } catch (error) {
    console.error('fetchRoleById error:', error);
    return { success: false, error: 'Failed to fetch role' };
  }
};

// ── Create role ────────────────────────────────────────────────────────

export const createRole = async (
  schoolId: number,
  userId: number,
  data: { name: string; permissions: RolePermissions }
): Promise<RoleResult> => {
  try {
    const access = await verifyOwnerOrAdmin(schoolId, userId);
    if (!access.ok) return { success: false, error: access.error };

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Role name is required' };
    }
    if (trimmedName.length < 2) {
      return { success: false, error: 'Role name must be at least 2 characters' };
    }

    // Check duplicate name within school
    const db = getDb();
    const existing = await db
      .select()
      .from(roles)
      .where(and(eq(roles.schoolId, schoolId), eq(roles.name, trimmedName)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'A role with this name already exists in this organization' };
    }

    // Fetch module keys to compute role type
    const modulesResult = await fetchSchoolModules(schoolId);
    const moduleKeys = (modulesResult.modules ?? []).map((m) => m.key);
    const roleType = computeRoleType(data.permissions, moduleKeys);
    const now = new Date().toISOString();

    const result = await db
      .insert(roles)
      .values({
        schoolId,
        name: trimmedName,
        type: roleType,
        permissions: JSON.stringify(data.permissions),
        createdAt: now,
        updatedAt: now,
      } as any)
      .returning();

    if (result.length === 0) {
      return { success: false, error: 'Failed to create role' };
    }

    return { success: true, role: toRoleData(result[0]) };
  } catch (error) {
    console.error('createRole error:', error);
    return { success: false, error: 'Failed to create role' };
  }
};

// ── Update role ────────────────────────────────────────────────────────

export const updateRole = async (
  roleId: number,
  schoolId: number,
  userId: number,
  data: { name: string; permissions: RolePermissions }
): Promise<RoleResult> => {
  try {
    const access = await verifyOwnerOrAdmin(schoolId, userId);
    if (!access.ok) return { success: false, error: access.error };

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Role name is required' };
    }
    if (trimmedName.length < 2) {
      return { success: false, error: 'Role name must be at least 2 characters' };
    }

    const db = getDb();

    // Verify role exists
    const existing = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.schoolId, schoolId)))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: 'Role not found' };
    }

    // Check duplicate name (excluding self)
    const duplicate = await db
      .select()
      .from(roles)
      .where(and(eq(roles.schoolId, schoolId), eq(roles.name, trimmedName)))
      .limit(1);

    if (duplicate.length > 0 && duplicate[0].id !== roleId) {
      return { success: false, error: 'A role with this name already exists in this organization' };
    }

    // Fetch module keys to compute role type
    const modulesResult = await fetchSchoolModules(schoolId);
    const moduleKeys = (modulesResult.modules ?? []).map((m) => m.key);
    const roleType = computeRoleType(data.permissions, moduleKeys);
    const now = new Date().toISOString();

    await db
      .update(roles)
      .set({
        name: trimmedName,
        type: roleType,
        permissions: JSON.stringify(data.permissions),
        updatedAt: now,
      } as any)
      .where(eq(roles.id, roleId));

    // Fetch updated row
    const updated = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    return { success: true, role: toRoleData(updated[0]) };
  } catch (error) {
    console.error('updateRole error:', error);
    return { success: false, error: 'Failed to update role' };
  }
};

// ── Delete role ────────────────────────────────────────────────────────

export const deleteRole = async (
  roleId: number,
  schoolId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const access = await verifyOwnerOrAdmin(schoolId, userId);
    if (!access.ok) return { success: false, error: access.error };

    const db = getDb();
    await db.delete(roles).where(and(eq(roles.id, roleId), eq(roles.schoolId, schoolId)));
    return { success: true };
  } catch (error) {
    console.error('deleteRole error:', error);
    return { success: false, error: 'Failed to delete role' };
  }
};

// ── Get permission summary string for a module ─────────────────────────

export const getModulePermissionSummary = (perm: ModulePermission | undefined): string => {
  if (!perm) return 'No access';
  if (perm.fullAccess) return 'Full Access';

  const parts: string[] = [];
  if (perm.read.length > 0) parts.push('Read');
  if (perm.update.length > 0) parts.push('Update');
  if (perm.add.length > 0) parts.push('Add');
  if (perm.delete.length > 0) parts.push('Delete');

  return parts.length > 0 ? parts.join(', ') : 'No access';
};
