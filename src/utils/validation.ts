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

// School Registration Validation
export const validateSchoolName = (name: string): ValidationResult => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'School name is required' };
  }

  if (name.trim().length < 3) {
    return { isValid: false, error: 'School name must be at least 3 characters' };
  }

  return { isValid: true };
};

export const validateSchoolAddress = (address: string): ValidationResult => {
  if (!address || address.trim() === '') {
    return { isValid: false, error: 'Address is required' };
  }

  if (address.trim().length < 10) {
    return { isValid: false, error: 'Please enter a complete address' };
  }

  return { isValid: true };
};

export const validateOwnerName = (ownerName: string): ValidationResult => {
  if (!ownerName || ownerName.trim() === '') {
    return { isValid: false, error: 'Owner name is required' };
  }

  if (ownerName.trim().length < 3) {
    return { isValid: false, error: 'Owner name must be at least 3 characters' };
  }

  return { isValid: true };
};

export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Basic phone validation - allows various formats
  const phoneRegex = /^[\d\s\-\+\(\)\.]{10,}$/;
  if (!phoneRegex.test(phone.trim())) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  return { isValid: true };
};

export interface SchoolRegistrationFormData {
  name: string;
  address: string;
  ownerName: string;
  phone: string;
  email: string;
}

export const validateSchoolRegistrationForm = (
  data: SchoolRegistrationFormData
): Record<string, string | undefined> => {
  const errors: Record<string, string | undefined> = {};

  const nameResult = validateSchoolName(data.name);
  if (!nameResult.isValid) {
    errors.name = nameResult.error;
  }

  const addressResult = validateSchoolAddress(data.address);
  if (!addressResult.isValid) {
    errors.address = addressResult.error;
  }

  const ownerResult = validateOwnerName(data.ownerName);
  if (!ownerResult.isValid) {
    errors.ownerName = ownerResult.error;
  }

  const phoneResult = validatePhoneNumber(data.phone);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.error;
  }

  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  return errors;
};

// ── Organisation Config Form Validation ────────────────────────────────

export const validateOrganizationName = (name: string): ValidationResult => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Organization name is required' };
  }
  if (name.trim().length < 3) {
    return { isValid: false, error: 'Organization name must be at least 3 characters' };
  }
  if (name.trim().length > 100) {
    return { isValid: false, error: 'Organization name must be at most 100 characters' };
  }
  return { isValid: true };
};

export const validateOrganizationAddress = (address: string): ValidationResult => {
  if (!address || address.trim() === '') {
    return { isValid: false, error: 'Address is required' };
  }
  if (address.trim().length < 10) {
    return { isValid: false, error: 'Please enter a complete address (at least 10 characters)' };
  }
  return { isValid: true };
};

export interface OrganizationFormData {
  name: string;
  email: string;
  address: string;
  phone: string;
}

export const validateOrganizationForm = (
  data: OrganizationFormData
): Record<string, string | undefined> => {
  const errors: Record<string, string | undefined> = {};

  const nameResult = validateOrganizationName(data.name);
  if (!nameResult.isValid) {
    errors.name = nameResult.error;
  }

  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  const addressResult = validateOrganizationAddress(data.address);
  if (!addressResult.isValid) {
    errors.address = addressResult.error;
  }

  const phoneResult = validatePhoneNumber(data.phone);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.error;
  }

  return errors;
};
