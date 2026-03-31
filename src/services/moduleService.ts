import { getDb } from '../../db/connection';
import { modules } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────

export interface ModuleData {
  id: number;
  schoolId: number;
  key: string;
  name: string;
  icon: string;
  fields: string[];
  displayOrder: number;
  isActive: boolean;
}

export interface ModulesListResult {
  success: boolean;
  modules?: ModuleData[];
  error?: string;
}

// ── Default module definitions used to seed new schools ────────────────

interface DefaultModule {
  key: string;
  name: string;
  icon: string;
  fields: string[];
  displayOrder: number;
}

const DEFAULT_MODULES: DefaultModule[] = [
  {
    key: 'quick_access',
    name: 'Quick Access',
    icon: 'flash',
    fields: ['Widgets'],
    displayOrder: 1,
  },
  {
    key: 'staffs',
    name: 'Staffs',
    icon: 'people',
    fields: ['Name', 'DOB', 'Phone Number', 'Email Address'],
    displayOrder: 2,
  },
  {
    key: 'students',
    name: 'Students',
    icon: 'school',
    fields: ['Name', 'DOB', 'Guardian Name', 'Guardian Email Address', 'Email Address', 'Guardian Phone Number'],
    displayOrder: 3,
  },
  {
    key: 'invoices',
    name: 'Invoices',
    icon: 'receipt',
    fields: ['Invoice Number', 'Date', 'Line Items', 'Billing Address', 'Customer Name', 'Customer Mobile Number', 'Customer Email'],
    displayOrder: 4,
  },
  {
    key: 'assets',
    name: 'Assets',
    icon: 'cube',
    fields: ['Asset Name', 'Asset Code', 'Asset Type'],
    displayOrder: 5,
  },
  {
    key: 'settings',
    name: 'Settings',
    icon: 'settings',
    fields: ['Organization', 'Staffs', 'Students', 'Classes', 'Invoices', 'Assets', 'Notification Settings', 'Security & Privacy', 'Language & Region'],
    displayOrder: 6,
  },
];

// ── Helper: map DB row to ModuleData ──────────────────────────────────

const toModuleData = (row: any): ModuleData => {
  let parsedFields: string[] = [];
  try {
    parsedFields = JSON.parse(row.fields ?? '[]');
  } catch {
    parsedFields = [];
  }

  return {
    id: row.id,
    schoolId: row.schoolId ?? row.school_id,
    key: row.key,
    name: row.name,
    icon: row.icon,
    fields: parsedFields,
    displayOrder: row.displayOrder ?? row.display_order ?? 0,
    isActive: row.isActive ?? row.is_active ?? true,
  };
};

// ── Seed default modules for a school ──────────────────────────────────

export const seedDefaultModules = async (schoolId: number): Promise<void> => {
  try {
    const db = getDb();

    // Check if modules already exist for this school
    const existing = await db
      .select()
      .from(modules)
      .where(eq(modules.schoolId, schoolId))
      .limit(1);

    if (existing.length > 0) return; // Already seeded

    const now = new Date().toISOString();

    for (const mod of DEFAULT_MODULES) {
      await db.insert(modules).values({
        schoolId,
        key: mod.key,
        name: mod.name,
        icon: mod.icon,
        fields: JSON.stringify(mod.fields),
        displayOrder: mod.displayOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  } catch (error) {
    console.error('seedDefaultModules error:', error);
  }
};

// ── Re-seed / update existing modules with latest field definitions ──

export const reseedModuleFields = async (schoolId: number): Promise<void> => {
  try {
    const db = getDb();

    for (const mod of DEFAULT_MODULES) {
      const existing = await db
        .select()
        .from(modules)
        .where(and(eq(modules.schoolId, schoolId), eq(modules.key, mod.key)))
        .limit(1);

      if (existing.length > 0) {
        // Update fields to latest definition
        await db
          .update(modules)
          .set({
            fields: JSON.stringify(mod.fields),
            name: mod.name,
            icon: mod.icon,
            updatedAt: new Date().toISOString(),
          } as any)
          .where(eq(modules.id, existing[0].id));
      }
    }
  } catch (error) {
    console.error('reseedModuleFields error:', error);
  }
};

// ── Fetch all active modules for a school ─────────────────────────────

export const fetchSchoolModules = async (
  schoolId: number
): Promise<ModulesListResult> => {
  try {
    const db = getDb();

    // Ensure modules are seeded (lazy seed on first access)
    await seedDefaultModules(schoolId);
    // Update existing modules with latest field definitions
    await reseedModuleFields(schoolId);

    const rows = await db
      .select()
      .from(modules)
      .where(eq(modules.schoolId, schoolId));

    const moduleList = rows
      .map(toModuleData)
      .filter((m) => m.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return { success: true, modules: moduleList };
  } catch (error) {
    console.error('fetchSchoolModules error:', error);
    return { success: false, error: 'Failed to load modules' };
  }
};

// ── Fetch a single module by key for a school ─────────────────────────

export interface SingleModuleResult {
  success: boolean;
  module?: ModuleData;
  error?: string;
}

export const fetchModuleByKey = async (
  schoolId: number,
  moduleKey: string
): Promise<SingleModuleResult> => {
  try {
    const db = getDb();

    await seedDefaultModules(schoolId);
    await reseedModuleFields(schoolId);

    const rows = await db
      .select()
      .from(modules)
      .where(and(eq(modules.schoolId, schoolId), eq(modules.key, moduleKey)))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: 'Module not found' };
    }

    return { success: true, module: toModuleData(rows[0]) };
  } catch (error) {
    console.error('fetchModuleByKey error:', error);
    return { success: false, error: 'Failed to load module' };
  }
};
