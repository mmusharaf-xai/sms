import { getDb } from '../../db/connection';

export interface UIComponent {
  id: string;
  type: 'stats_grid' | 'quick_actions' | 'banner' | 'header';
  config: Record<string, unknown>;
  order: number;
}

export interface UIConfigResult {
  success: boolean;
  components?: UIComponent[];
  error?: string;
}

export interface StatsItem {
  id: string;
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

export interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconBgColor: string;
  variant: 'primary' | 'default';
  route?: string;
}

export interface BannerConfig {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonRoute?: string;
  progress?: number;
}

// Mock server-driven UI config for quick access page
// This simulates what would come from a backend API
const MOCK_QUICK_ACCESS_CONFIG: UIComponent[] = [
  {
    id: 'header',
    type: 'header',
    order: 0,
    config: {
      showBackButton: false,
      showMenu: true,
      showProfile: true,
    },
  },
  {
    id: 'stats_grid',
    type: 'stats_grid',
    order: 1,
    config: {
      title: 'Quick Access',
      subtitle: "Welcome back! Here's an overview of your school.",
      items: [
        { id: 'students', label: 'STUDENTS', value: 124, icon: 'people', color: '#3b82f6' },
        { id: 'staffs', label: 'STAFFS', value: 12, icon: 'briefcase', color: '#f59e0b' },
        { id: 'revenue', label: 'REVENUE', value: '$0.00', icon: 'cash', color: '#10b981' },
        { id: 'classes', label: 'CLASSES', value: 8, icon: 'book', color: '#8b5cf6' },
      ] as StatsItem[],
    },
  },
  {
    id: 'quick_actions',
    type: 'quick_actions',
    order: 2,
    config: {
      title: 'QUICK ACTIONS',
      items: [
        {
          id: 'enroll_student',
          title: 'Enroll New Student',
          subtitle: 'Quick registration for new admissions',
          icon: 'person-add',
          iconBgColor: '#334155',
          variant: 'primary',
          route: 'EnrollStudent',
        },
        {
          id: 'generate_invoice',
          title: 'Generate Fee Invoice',
          subtitle: 'Create billing for any class or student',
          icon: 'document-text',
          iconBgColor: '#dbeafe',
          variant: 'default',
          route: 'GenerateInvoice',
        },
        {
          id: 'class_timetable',
          title: 'Class Timetable',
          subtitle: 'Manage daily schedules and periods',
          icon: 'calendar',
          iconBgColor: '#dbeafe',
          variant: 'default',
          route: 'ClassTimetable',
        },
      ] as QuickActionItem[],
    },
  },
  {
    id: 'setup_banner',
    type: 'banner',
    order: 3,
    config: {
      title: 'Complete Setup',
      subtitle: "You're 60% through setting up your school profile. Add your first staff member to continue.",
      buttonText: 'Add Staff',
      buttonRoute: 'AddStaff',
      progress: 60,
    } as BannerConfig,
  },
];

/**
 * Fetch UI configuration for a specific page
 * This simulates a server API call - replace with actual API when backend is ready
 */
export const fetchUIConfig = async (
  page: string,
  schoolId: number
): Promise<UIConfigResult> => {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // TODO: Replace with actual API call
    // const response = await fetch(`/api/ui-config/${page}?schoolId=${schoolId}`);
    // const data = await response.json();

    if (page === 'quick_access') {
      // In a real implementation, fetch actual stats from database
      const db = getDb();
      
      // Get student count (mock - will be replaced with actual query)
      // const studentCount = await db.select({ count: sql`count(*)` }).from(students).where(eq(students.schoolId, schoolId));
      
      // For now, return mock config with potentially dynamic values
      return {
        success: true,
        components: MOCK_QUICK_ACCESS_CONFIG,
      };
    }

    return {
      success: false,
      error: 'Page configuration not found',
    };
  } catch (error) {
    console.error('Fetch UI config error:', error);
    return {
      success: false,
      error: 'Failed to load page configuration',
    };
  }
};

/**
 * Get school stats for dynamic updates
 */
export const getSchoolStats = async (schoolId: number) => {
  try {
    const db = getDb();
    
    // TODO: Implement actual stats queries when tables are available
    // These are placeholder implementations
    
    return {
      success: true,
      stats: {
        students: 124,
        staffs: 12,
        revenue: '$0.00',
        classes: 8,
      },
    };
  } catch (error) {
    console.error('Get school stats error:', error);
    return {
      success: false,
      error: 'Failed to fetch school stats',
    };
  }
};
