import { getDb } from '../../db/connection';

export interface SettingsSection {
  id: string;
  type: 'card' | 'list_item';
  title: string;
  subtitle?: string;
  icon: string;
  iconBgColor?: string;
  route: string;
  requiredRole: ('owner' | 'admin' | 'staff')[];
}

export interface SettingsGroup {
  id: string;
  title: string;
  order: number;
  items: SettingsSection[];
}

export interface SettingsConfig {
  groups: SettingsGroup[];
  version?: string;
}

export interface SettingsConfigResult {
  success: boolean;
  config?: SettingsConfig;
  error?: string;
}

// Default settings configuration
// This simulates what would come from a backend API
const DEFAULT_SETTINGS_CONFIG: SettingsGroup[] = [
  {
    id: 'general_configuration',
    title: 'GENERAL CONFIGURATION',
    order: 1,
    items: [
      {
        id: 'organization',
        type: 'card',
        title: 'Organization',
        subtitle: 'School profile, branding, and contact details',
        icon: 'business',
        iconBgColor: '#1e293b',
        route: 'OrganizationSettings',
        requiredRole: ['owner', 'admin'],
      },
      {
        id: 'staffs',
        type: 'card',
        title: 'Staffs',
        subtitle: 'Manage teachers, admins, and permissions',
        icon: 'id-card',
        iconBgColor: '#1e293b',
        route: 'StaffsSettings',
        requiredRole: ['owner', 'admin'],
      },
      {
        id: 'students',
        type: 'card',
        title: 'Students',
        subtitle: 'Enrollment settings and student records',
        icon: 'school',
        iconBgColor: '#1e293b',
        route: 'StudentsSettings',
        requiredRole: ['owner', 'admin'],
      },
      {
        id: 'classes',
        type: 'card',
        title: 'Classes',
        subtitle: 'Curriculum, subjects, and schedules',
        icon: 'book',
        iconBgColor: '#1e293b',
        route: 'ClassesSettings',
        requiredRole: ['owner', 'admin'],
      },
      {
        id: 'invoices',
        type: 'card',
        title: 'Invoices',
        subtitle: 'Fee structures, billing, and payments',
        icon: 'document-text',
        iconBgColor: '#1e293b',
        route: 'InvoicesSettings',
        requiredRole: ['owner', 'admin'],
      },
      {
        id: 'assets',
        type: 'card',
        title: 'Assets',
        subtitle: 'Equipment, facility management, and stock',
        icon: 'archive',
        iconBgColor: '#1e293b',
        route: 'AssetsSettings',
        requiredRole: ['owner', 'admin'],
      },
    ],
  },
  {
    id: 'system_security',
    title: 'SYSTEM & SECURITY',
    order: 2,
    items: [
      {
        id: 'security_privacy',
        type: 'list_item',
        title: 'Security & Privacy',
        icon: 'lock-closed',
        route: 'SecurityPrivacySettings',
        requiredRole: ['owner', 'admin'],
      },
      {
        id: 'notifications',
        type: 'list_item',
        title: 'Notification Settings',
        icon: 'notifications',
        route: 'NotificationSettings',
        requiredRole: ['owner', 'admin', 'staff'],
      },
      {
        id: 'language_region',
        type: 'list_item',
        title: 'Language & Region',
        icon: 'globe',
        route: 'LanguageRegionSettings',
        requiredRole: ['owner', 'admin', 'staff'],
      },
    ],
  },
];

/**
 * Fetch settings configuration based on user role
 * This simulates a server API call - replace with actual API when backend is ready
 */
export const fetchSettingsConfig = async (
  schoolId: number,
  userRole: string
): Promise<SettingsConfigResult> => {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Filter items based on user role
    const filteredGroups = DEFAULT_SETTINGS_CONFIG
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.requiredRole.includes(userRole as any)
        ),
      }))
      .filter((group) => group.items.length > 0);

    if (filteredGroups.length === 0) {
      return {
        success: false,
        error: 'You do not have access to any settings',
      };
    }

    return {
      success: true,
      config: {
        groups: filteredGroups.sort((a, b) => a.order - b.order),
        version: 'EduManage Pro • Version 2.4.0',
      },
    };
  } catch (error) {
    console.error('Fetch settings config error:', error);
    return {
      success: false,
      error: 'Failed to load settings configuration',
    };
  }
};
