import { getDb } from '../../db/connection';
import { users, User, NewUser } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { validateEmail, validatePassword, validateFullName } from '../utils/validation';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface SignupResult {
  success: boolean;
  user?: User;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Login user with email and password
 */
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { success: false, error: emailValidation.error };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.error };
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUsers.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = existingUsers[0];

    // Verify password
    if (user.password !== password) {
      return { success: false, error: 'Invalid email or password' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
};

/**
 * Register new user with full name, email, and password
 */
export const signupUser = async (
  fullName: string,
  email: string,
  password: string
): Promise<SignupResult> => {
  try {
    // Validate inputs
    const fullNameValidation = validateFullName(fullName);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    const fieldErrors: Record<string, string> = {};
    if (!fullNameValidation.isValid && fullNameValidation.error) {
      fieldErrors.fullName = fullNameValidation.error;
    }
    if (!emailValidation.isValid && emailValidation.error) {
      fieldErrors.email = emailValidation.error;
    }
    if (!passwordValidation.isValid && passwordValidation.error) {
      fieldErrors.password = passwordValidation.error;
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, fieldErrors };
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedFullName = fullName.trim();

    // Check if email already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUsers.length > 0) {
      return {
        success: false,
        fieldErrors: { email: 'This email is already registered' },
      };
    }

    // Create new user
    const newUser: NewUser = {
      fullName: trimmedFullName,
      email: normalizedEmail,
      password: password,
    };

    const result = await db.insert(users).values(newUser).returning();

    if (result.length === 0) {
      return { success: false, error: 'Failed to create account' };
    }

    return { success: true, user: result[0] };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An error occurred during signup' };
  }
};

/**
 * Check if email is already registered
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();

    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    return existingUsers.length > 0;
  } catch (error) {
    console.error('Check email error:', error);
    return false;
  }
};
