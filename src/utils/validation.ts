import { VALIDATION_RULES } from './constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password || password === '') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < VALIDATION_RULES.passwordMinLength) {
    return {
      isValid: false,
      error: `Password must be at least ${VALIDATION_RULES.passwordMinLength} characters`,
    };
  }

  return { isValid: true };
};

export const validateFullName = (fullName: string): ValidationResult => {
  if (!fullName || fullName.trim() === '') {
    return { isValid: false, error: 'Full name is required' };
  }

  if (fullName.trim().length < VALIDATION_RULES.fullNameMinLength) {
    return {
      isValid: false,
      error: `Full name must be at least ${VALIDATION_RULES.fullNameMinLength} characters`,
    };
  }

  return { isValid: true };
};

export const validateLoginForm = (email: string, password: string): Record<string, string | undefined> => {
  const errors: Record<string, string | undefined> = {};

  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.isValid) {
    errors.password = passwordResult.error;
  }

  return errors;
};

export const validateSignupForm = (
  fullName: string,
  email: string,
  password: string
): Record<string, string | undefined> => {
  const errors: Record<string, string | undefined> = {};

  const fullNameResult = validateFullName(fullName);
  if (!fullNameResult.isValid) {
    errors.fullName = fullNameResult.error;
  }

  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.isValid) {
    errors.password = passwordResult.error;
  }

  return errors;
};
