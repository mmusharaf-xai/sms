// Color constants from design files
export const colors = {
  schoolNavy: '#1e293b',
  schoolBlue: '#334155',
  schoolAccent: '#2563eb',
  background: '#f8fafc',
  white: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  error: '#ef4444',
  success: '#22c55e',
} as const;

export type ColorKey = keyof typeof colors;
