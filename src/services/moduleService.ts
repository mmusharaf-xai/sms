import { getDb } from '../../db/connection';
import { modules } from '../../db/schema';
import { eq } from 'drizzle-orm';

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
    fields: ['Item Name', 'Description', 'Price', 'Stock Level'],
    displayOrder: 1,
  },
  {
    key: 'staffs',
    name: 'Staffs',
    icon: 'people',
    fields: ['Name', 'Email', 'Phone', 'Role', 'Department'],
    displayOrder: 2,
  },
  {
    key: 'students',
    name: 'Students',
    icon: 'school',
    fields: ['Name', 'Email', 'Class', 'Grade', 'Guardian'],
    displayOrder: 3,
  },
  {
    key: 'invoices',
    name: 'Invoices',
    icon: 'receipt',
    fields: ['Invoice No', 'Student', 'Amount', 'Due Date', 'Status'],
    displayOrder: 4,
  },
  {
    key: 'assets',
    name: 'Assets',
    icon: 'cube',
    fields: ['Asset Name', 'Category', 'Condition', 'Location'],
    displayOrder: 5,
  },
  {
    key: 'settings',
    name: 'Settings',
    icon: 'settings',
    fields: ['General', 'Notifications', 'Security', 'Billing'],
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

// ── Fetch all active modules for a school ─────────────────────────────

export const fetchSchoolModules = async (
  schoolId: number
): Promise<ModulesListResult> => {
  try {
    const db = getDb();

    // Ensure modules are seeded (lazy seed on first access)
    await seedDefaultModules(schoolId);

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
