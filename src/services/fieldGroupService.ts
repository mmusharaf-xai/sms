import { getDb } from '../../db/connection';
import { fieldGroups, fieldConfigs } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { fetchModuleByKey } from './moduleService';

// ── Types ──────────────────────────────────────────────────────────────

export interface FieldGroupData {
  id: number;
  schoolId: number;
  moduleKey: string;
  name: string;
  icon: string;
  isDefault: boolean;
  displayOrder: number;
  fieldCount: number;
}

export interface FieldConfigData {
  id: number;
  schoolId: number;
  moduleKey: string;
  groupId: number;
  name: string;
  fieldType: string;
  description: string;
  config: Record<string, any>;
  isRequired: boolean;
  displayOrder: number;
}

export interface FieldGroupsResult {
  success: boolean;
  groups?: FieldGroupData[];
  error?: string;
}

export interface FieldGroupResult {
  success: boolean;
  group?: FieldGroupData;
  error?: string;
}

export interface FieldConfigsResult {
  success: boolean;
  fields?: FieldConfigData[];
  error?: string;
}

export interface FieldConfigResult {
  success: boolean;
  field?: FieldConfigData;
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

const toFieldGroupData = (row: any, fieldCount: number): FieldGroupData => ({
  id: row.id,
  schoolId: row.schoolId ?? row.school_id,
  moduleKey: row.moduleKey ?? row.module_key,
  name: row.name,
  icon: row.icon,
  isDefault: !!(row.isDefault ?? row.is_default),
  displayOrder: row.displayOrder ?? row.display_order ?? 0,
  fieldCount,
});

const toFieldConfigData = (row: any): FieldConfigData => {
  let parsedConfig: Record<string, any> = {};
  try {
    parsedConfig = JSON.parse(row.config ?? '{}');
  } catch {
    parsedConfig = {};
  }

  return {
    id: row.id,
    schoolId: row.schoolId ?? row.school_id,
    moduleKey: row.moduleKey ?? row.module_key,
    groupId: row.groupId ?? row.group_id,
    name: row.name,
    fieldType: row.fieldType ?? row.field_type ?? 'Text',
    description: row.description ?? '',
    config: parsedConfig,
    isRequired: !!(row.isRequired ?? row.is_required),
    displayOrder: row.displayOrder ?? row.display_order ?? 0,
  };
};

const GROUP_ICONS = [
  'albums-outline',
  'briefcase-outline',
  'people-outline',
  'ribbon-outline',
  'medkit-outline',
  'document-text-outline',
  'wallet-outline',
  'star-outline',
];

const pickGroupIcon = (index: number): string => {
  return GROUP_ICONS[index % GROUP_ICONS.length];
};

// ── Seed default group for a module ────────────────────────────────────

export const seedDefaultFieldGroup = async (
  schoolId: number,
  moduleKey: string
): Promise<void> => {
  try {
    const db = getDb();

    // Check if any groups already exist for this module+school
    const existing = await db
      .select()
      .from(fieldGroups)
      .where(and(eq(fieldGroups.schoolId, schoolId), eq(fieldGroups.moduleKey, moduleKey)))
      .limit(1);

    if (existing.length > 0) return;

    // Fetch the module to get its default fields
    const moduleResult = await fetchModuleByKey(schoolId, moduleKey);
    const moduleFields = moduleResult.module?.fields ?? [];

    const now = new Date().toISOString();

    // Create the default group
    const groupResult = await db
      .insert(fieldGroups)
      .values({
        schoolId,
        moduleKey,
        name: 'Standard Information',
        icon: 'shield-checkmark',
        isDefault: true,
        displayOrder: 0,
        createdAt: now,
        updatedAt: now,
      } as any)
      .returning();

    if (groupResult.length === 0) return;

    const groupId = groupResult[0].id;

    // Insert the module's default fields into this group
    for (let i = 0; i < moduleFields.length; i++) {
      const fieldName = moduleFields[i];
      const fieldType = inferFieldType(fieldName);

      await db.insert(fieldConfigs).values({
        schoolId,
        moduleKey,
        groupId,
        name: fieldName,
        fieldType,
        description: '',
        config: JSON.stringify({}),
        isRequired: false,
        displayOrder: i,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  } catch (error) {
    console.error('seedDefaultFieldGroup error:', error);
  }
};

/** Infer a field type from its name */
const inferFieldType = (fieldName: string): string => {
  const lower = fieldName.toLowerCase();
  if (lower.includes('dob') || lower.includes('date') || lower.includes('birthday')) return 'Date';
  if (lower.includes('email')) return 'Text';
  if (lower.includes('phone') || lower.includes('mobile')) return 'Text';
  return 'Text';
};

// ── Fetch all field groups for a module ────────────────────────────────

export const fetchFieldGroups = async (
  schoolId: number,
  moduleKey: string
): Promise<FieldGroupsResult> => {
  try {
    const db = getDb();

    // Ensure default group exists
    await seedDefaultFieldGroup(schoolId, moduleKey);

    const rows = await db
      .select()
      .from(fieldGroups)
      .where(and(eq(fieldGroups.schoolId, schoolId), eq(fieldGroups.moduleKey, moduleKey)));

    // Get field counts for each group
    const groups: FieldGroupData[] = [];
    for (const row of rows) {
      const fields = await db
        .select()
        .from(fieldConfigs)
        .where(eq(fieldConfigs.groupId, row.id));

      groups.push(toFieldGroupData(row, fields.length));
    }

    groups.sort((a, b) => a.displayOrder - b.displayOrder);

    return { success: true, groups };
  } catch (error) {
    console.error('fetchFieldGroups error:', error);
    return { success: false, error: 'Failed to load field groups' };
  }
};

// ── Create a new field group ───────────────────────────────────────────

export const createFieldGroup = async (
  schoolId: number,
  moduleKey: string,
  name: string
): Promise<FieldGroupResult> => {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Group name is required' };
    }
    if (trimmedName.length < 2) {
      return { success: false, error: 'Group name must be at least 2 characters' };
    }

    const db = getDb();

    // Check uniqueness within module+school
    const existing = await db
      .select()
      .from(fieldGroups)
      .where(
        and(
          eq(fieldGroups.schoolId, schoolId),
          eq(fieldGroups.moduleKey, moduleKey),
          eq(fieldGroups.name, trimmedName)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'A group with this name already exists' };
    }

    // Get next display order
    const allGroups = await db
      .select()
      .from(fieldGroups)
      .where(and(eq(fieldGroups.schoolId, schoolId), eq(fieldGroups.moduleKey, moduleKey)));

    const nextOrder = allGroups.length;
    const icon = pickGroupIcon(nextOrder);
    const now = new Date().toISOString();

    const result = await db
      .insert(fieldGroups)
      .values({
        schoolId,
        moduleKey,
        name: trimmedName,
        icon,
        isDefault: false,
        displayOrder: nextOrder,
        createdAt: now,
        updatedAt: now,
      } as any)
      .returning();

    if (result.length === 0) {
      return { success: false, error: 'Failed to create group' };
    }

    return { success: true, group: toFieldGroupData(result[0], 0) };
  } catch (error) {
    console.error('createFieldGroup error:', error);
    return { success: false, error: 'Failed to create group' };
  }
};

// ── Delete a field group ───────────────────────────────────────────────

export const deleteFieldGroup = async (
  groupId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const db = getDb();

    // Check that it's not a default group
    const group = await db
      .select()
      .from(fieldGroups)
      .where(eq(fieldGroups.id, groupId))
      .limit(1);

    if (group.length === 0) {
      return { success: false, error: 'Group not found' };
    }

    if (group[0].isDefault) {
      return { success: false, error: 'Cannot delete the default group' };
    }

    // Delete all fields in the group first
    await db.delete(fieldConfigs).where(eq(fieldConfigs.groupId, groupId));

    // Delete the group
    await db.delete(fieldGroups).where(eq(fieldGroups.id, groupId));

    return { success: true };
  } catch (error) {
    console.error('deleteFieldGroup error:', error);
    return { success: false, error: 'Failed to delete group' };
  }
};

// ── Fetch fields for a group ───────────────────────────────────────────

export const fetchGroupFields = async (
  groupId: number
): Promise<FieldConfigsResult> => {
  try {
    const db = getDb();

    const rows = await db
      .select()
      .from(fieldConfigs)
      .where(eq(fieldConfigs.groupId, groupId));

    const fields = rows
      .map(toFieldConfigData)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return { success: true, fields };
  } catch (error) {
    console.error('fetchGroupFields error:', error);
    return { success: false, error: 'Failed to load fields' };
  }
};

// ── Create a field ─────────────────────────────────────────────────────

export const createField = async (
  schoolId: number,
  moduleKey: string,
  groupId: number,
  data: {
    name: string;
    fieldType: string;
    description?: string;
    config?: Record<string, any>;
    isRequired?: boolean;
  }
): Promise<FieldConfigResult> => {
  try {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Field name is required' };
    }

    const db = getDb();

    // Check uniqueness within the group
    const existing = await db
      .select()
      .from(fieldConfigs)
      .where(and(eq(fieldConfigs.groupId, groupId), eq(fieldConfigs.name, trimmedName)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'A field with this name already exists in this group' };
    }

    // Get next display order
    const allFields = await db
      .select()
      .from(fieldConfigs)
      .where(eq(fieldConfigs.groupId, groupId));

    const nextOrder = allFields.length;
    const now = new Date().toISOString();

    const result = await db
      .insert(fieldConfigs)
      .values({
        schoolId,
        moduleKey,
        groupId,
        name: trimmedName,
        fieldType: data.fieldType || 'Text',
        description: data.description || '',
        config: JSON.stringify(data.config || {}),
        isRequired: data.isRequired ?? false,
        displayOrder: nextOrder,
        createdAt: now,
        updatedAt: now,
      } as any)
      .returning();

    if (result.length === 0) {
      return { success: false, error: 'Failed to create field' };
    }

    return { success: true, field: toFieldConfigData(result[0]) };
  } catch (error) {
    console.error('createField error:', error);
    return { success: false, error: 'Failed to create field' };
  }
};

// ── Update a field ─────────────────────────────────────────────────────

export const updateField = async (
  fieldId: number,
  data: {
    name?: string;
    fieldType?: string;
    description?: string;
    config?: Record<string, any>;
    isRequired?: boolean;
  }
): Promise<FieldConfigResult> => {
  try {
    const db = getDb();

    const existing = await db
      .select()
      .from(fieldConfigs)
      .where(eq(fieldConfigs.id, fieldId))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: 'Field not found' };
    }

    const updates: any = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.fieldType !== undefined) updates.fieldType = data.fieldType;
    if (data.description !== undefined) updates.description = data.description;
    if (data.config !== undefined) updates.config = JSON.stringify(data.config);
    if (data.isRequired !== undefined) updates.isRequired = data.isRequired;

    // Check duplicate name within same group (excluding self)
    if (updates.name) {
      const duplicate = await db
        .select()
        .from(fieldConfigs)
        .where(
          and(
            eq(fieldConfigs.groupId, existing[0].groupId),
            eq(fieldConfigs.name, updates.name)
          )
        )
        .limit(1);

      if (duplicate.length > 0 && duplicate[0].id !== fieldId) {
        return { success: false, error: 'A field with this name already exists in this group' };
      }
    }

    await db
      .update(fieldConfigs)
      .set(updates)
      .where(eq(fieldConfigs.id, fieldId));

    const updated = await db
      .select()
      .from(fieldConfigs)
      .where(eq(fieldConfigs.id, fieldId))
      .limit(1);

    return { success: true, field: toFieldConfigData(updated[0]) };
  } catch (error) {
    console.error('updateField error:', error);
    return { success: false, error: 'Failed to update field' };
  }
};

// ── Delete a field ─────────────────────────────────────────────────────

export const deleteField = async (
  fieldId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const db = getDb();
    await db.delete(fieldConfigs).where(eq(fieldConfigs.id, fieldId));
    return { success: true };
  } catch (error) {
    console.error('deleteField error:', error);
    return { success: false, error: 'Failed to delete field' };
  }
};

// ── Fetch a single field by ID ─────────────────────────────────────────

export const fetchFieldById = async (
  fieldId: number
): Promise<FieldConfigResult> => {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(fieldConfigs)
      .where(eq(fieldConfigs.id, fieldId))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: 'Field not found' };
    }

    return { success: true, field: toFieldConfigData(rows[0]) };
  } catch (error) {
    console.error('fetchFieldById error:', error);
    return { success: false, error: 'Failed to load field' };
  }
};