import { getDb } from '../../db/connection';
import { schools, userSchools, School, UserSchool } from '../../db/schema';
import { eq, like, and } from 'drizzle-orm';

export interface SchoolResult {
  success: boolean;
  school?: School;
  error?: string;
}

export interface RegisterSchoolData {
  name: string;
  address: string;
  ownerName: string;
  phone: string;
  email: string;
  logo?: string | null;
}

export interface SchoolsResult {
  success: boolean;
  schools?: School[];
  error?: string;
}

export interface UserSchoolsResult {
  success: boolean;
  userSchools?: (UserSchool & { school: School })[];
  error?: string;
}

export interface JoinSchoolResult {
  success: boolean;
  userSchool?: UserSchool;
  error?: string;
}

/**
 * Generate a unique school code
 */
const generateSchoolCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Create a new school
 */
export const createSchool = async (
  name: string,
  description: string | null,
  userId: number
): Promise<SchoolResult> => {
  try {
    if (!name || name.trim() === '') {
      return { success: false, error: 'School name is required' };
    }

    const db = getDb();
    const trimmedName = name.trim();
    const trimmedDescription = description?.trim() || null;

    // Generate a unique code
    let code = generateSchoolCode();
    let codeExists = true;
    let attempts = 0;
    
    while (codeExists && attempts < 10) {
      const existingSchools = await db
        .select()
        .from(schools)
        .where(eq(schools.code, code))
        .limit(1);
      
      if (existingSchools.length === 0) {
        codeExists = false;
      } else {
        code = generateSchoolCode();
        attempts++;
      }
    }

    if (codeExists) {
      return { success: false, error: 'Failed to generate unique school code' };
    }

    // Create the school
    const schoolData: Record<string, unknown> = {
      name: trimmedName,
      code,
      createdBy: userId,
    };
    
    if (trimmedDescription) {
      schoolData.description = trimmedDescription;
    }
    
    const result = await db.insert(schools).values(schoolData as any).returning();

    if (result.length === 0) {
      return { success: false, error: 'Failed to create school' };
    }

    const school = result[0];

    // Automatically add the creator as an owner
    await db.insert(userSchools).values({
      userId: userId,
      schoolId: school.id,
      role: 'owner',
    });

    return { success: true, school };
  } catch (error) {
    console.error('Create school error:', error);
    return { success: false, error: 'An error occurred while creating the school' };
  }
};

/**
 * Join a school using the school code
 */
export const joinSchool = async (
  code: string,
  userId: number
): Promise<JoinSchoolResult> => {
  try {
    if (!code || code.trim() === '') {
      return { success: false, error: 'School code is required' };
    }

    const db = getDb();
    const trimmedCode = code.trim().toUpperCase();

    // Find the school by code
    const existingSchools = await db
      .select()
      .from(schools)
      .where(eq(schools.code, trimmedCode))
      .limit(1);

    if (existingSchools.length === 0) {
      return { success: false, error: 'Invalid school code' };
    }

    const school = existingSchools[0];

    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(userSchools)
      .where(
        and(
          eq(userSchools.userId, userId),
          eq(userSchools.schoolId, school.id)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      return { success: false, error: 'You are already a member of this school' };
    }

    // Add user to school
    const result = await db.insert(userSchools).values({
      userId: userId,
      schoolId: school.id,
    }).returning();

    if (result.length === 0) {
      return { success: false, error: 'Failed to join school' };
    }

    return { success: true, userSchool: result[0] };
  } catch (error) {
    console.error('Join school error:', error);
    return { success: false, error: 'An error occurred while joining the school' };
  }
};

/**
 * Search schools by name
 */
export const searchSchools = async (query: string): Promise<SchoolsResult> => {
  try {
    const db = getDb();
    
    if (!query || query.trim() === '') {
      const allSchools = await db.select().from(schools);
      return { success: true, schools: allSchools };
    }

    const searchQuery = `%${query.trim()}%`;
    const result = await db
      .select()
      .from(schools)
      .where(like(schools.name, searchQuery));

    return { success: true, schools: result };
  } catch (error) {
    console.error('Search schools error:', error);
    return { success: false, error: 'An error occurred while searching schools' };
  }
};

/**
 * Get all schools a user has joined
 */
export const getUserSchools = async (userId: number): Promise<UserSchoolsResult> => {
  try {
    const db = getDb();

    const result = await db
      .select({
        userSchool: userSchools,
        school: schools,
      })
      .from(userSchools)
      .innerJoin(schools, eq(userSchools.schoolId, schools.id))
      .where(eq(userSchools.userId, userId));

    const formattedResult = result.map(item => ({
      ...item.userSchool,
      school: item.school,
    }));

    return { success: true, userSchools: formattedResult };
  } catch (error) {
    console.error('Get user schools error:', error);
    return { success: false, error: 'An error occurred while fetching your schools' };
  }
};

/**
 * Get a single school by ID
 */
export const getSchoolById = async (schoolId: number): Promise<SchoolResult> => {
  try {
    const db = getDb();

    const result = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: 'School not found' };
    }

    return { success: true, school: result[0] };
  } catch (error) {
    console.error('Get school error:', error);
    return { success: false, error: 'An error occurred while fetching the school' };
  }
};

/**
 * Leave a school
 */
export const leaveSchool = async (
  userId: number,
  schoolId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const db = getDb();

    await db
      .delete(userSchools)
      .where(
        and(
          eq(userSchools.userId, userId),
          eq(userSchools.schoolId, schoolId)
        )
      );

    return { success: true };
  } catch (error) {
    console.error('Leave school error:', error);
    return { success: false, error: 'An error occurred while leaving the school' };
  }
};

/**
 * Register a new school with full details
 * Validates unique name and address
 */
export const registerSchool = async (
  data: RegisterSchoolData,
  userId: number
): Promise<SchoolResult> => {
  try {
    const db = getDb();
    const { name, address, ownerName, phone, email, logo } = data;

    // Validate required fields
    if (!name || name.trim() === '') {
      return { success: false, error: 'School name is required' };
    }
    if (!address || address.trim() === '') {
      return { success: false, error: 'Address is required' };
    }
    if (!ownerName || ownerName.trim() === '') {
      return { success: false, error: 'Owner name is required' };
    }
    if (!phone || phone.trim() === '') {
      return { success: false, error: 'Phone number is required' };
    }
    if (!email || email.trim() === '') {
      return { success: false, error: 'Email address is required' };
    }

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedOwnerName = ownerName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    // Check if school name already exists
    const existingName = await db
      .select()
      .from(schools)
      .where(eq(schools.name, trimmedName))
      .limit(1);

    if (existingName.length > 0) {
      return { success: false, error: 'A school with this name already exists' };
    }

    // Check if address already exists
    const existingAddress = await db
      .select()
      .from(schools)
      .where(eq(schools.address, trimmedAddress))
      .limit(1);

    if (existingAddress.length > 0) {
      return { success: false, error: 'A school with this address already exists' };
    }

    // Generate a unique code
    let code = generateSchoolCode();
    let codeExists = true;
    let attempts = 0;

    while (codeExists && attempts < 10) {
      const existingSchools = await db
        .select()
        .from(schools)
        .where(eq(schools.code, code))
        .limit(1);

      if (existingSchools.length === 0) {
        codeExists = false;
      } else {
        code = generateSchoolCode();
        attempts++;
      }
    }

    if (codeExists) {
      return { success: false, error: 'Failed to generate unique school code' };
    }

    // Create the school with full details
    const schoolData = {
      name: trimmedName,
      code,
      address: trimmedAddress,
      ownerName: trimmedOwnerName,
      phone: trimmedPhone,
      email: trimmedEmail,
      logo: logo || null,
      createdBy: userId,
    };

    const result = await db.insert(schools).values(schoolData as any).returning();

    if (result.length === 0) {
      return { success: false, error: 'Failed to create school' };
    }

    const school = result[0];

    // Automatically add the creator as an owner
    await db.insert(userSchools).values({
      userId: userId,
      schoolId: school.id,
      role: 'owner',
    });

    return { success: true, school };
  } catch (error) {
    console.error('Register school error:', error);
    return { success: false, error: 'An error occurred while registering the school' };
  }
};
