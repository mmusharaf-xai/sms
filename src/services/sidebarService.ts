export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  requiredRole: ('owner' | 'admin' | 'staff' | 'teacher')[];
}

export interface SidebarConfig {
  schoolName: string;
  schoolLogo?: string;
  items: SidebarMenuItem[];
}

export interface SidebarResult {
  success: boolean;
  config?: SidebarConfig;
  error?: string;
}

export interface AccessCheckResult {
  hasAccess: boolean;
  requiredRole?: string;
  currentRole?: string;
}

// Default sidebar menu items for school
const DEFAULT_MENU_ITEMS: SidebarMenuItem[] = [
  {
    id: 'quick_access',
    label: 'Quick Access',
    icon: 'grid',
    route: 'QuickAccess',
    requiredRole: ['owner', 'admin', 'staff', 'teacher'],
  },
  {
    id: 'staffs',
    label: 'Staffs',
    icon: 'briefcase',
    route: 'Staffs',
    requiredRole: ['owner', 'admin', 'staff'],
  },
  {
    id: 'students',
    label: 'Students',
    icon: 'people',
    route: 'Students',
    requiredRole: ['owner', 'admin', 'staff', 'teacher'],
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: 'cube',
    route: 'Assets',
    requiredRole: ['owner', 'admin', 'staff'],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: 'document-text',
    route: 'Invoices',
    requiredRole: ['owner', 'admin', 'staff'],
  },
  {
    id: 'classes',
    label: 'Classes',
    icon: 'bookmark',
    route: 'Classes',
    requiredRole: ['owner', 'admin', 'staff', 'teacher'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    route: 'SchoolSettings',
    requiredRole: ['owner', 'admin'],
  },
];

/**
 * Fetch sidebar configuration for a school
 * This simulates a server API call - replace with actual API when backend is ready
 */
export const fetchSidebarConfig = async (
  schoolId: number,
  userRole: string
): Promise<SidebarResult> => {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // TODO: Replace with actual API call
    // const response = await fetch(`/api/sidebar/${schoolId}?role=${userRole}`);
    // const data = await response.json();

    // Filter items based on user role
    const accessibleItems = DEFAULT_MENU_ITEMS.filter((item) =>
      item.requiredRole.includes(userRole as any)
    );

    // If user has no access to any items, return error
    if (accessibleItems.length === 0) {
      return {
        success: false,
        error: 'You do not have access to this school',
      };
    }

    return {
      success: true,
      config: {
        schoolName: 'Central Academy', // TODO: Fetch from school data
        items: accessibleItems,
      },
    };
  } catch (error) {
    console.error('Fetch sidebar config error:', error);
    return {
      success: false,
      error: 'Failed to load sidebar configuration',
    };
  }
};

/**
 * Check if user has access to a specific page
 */
export const checkPageAccess = async (
  schoolId: number,
  userId: number,
  pageRoute: string
): Promise<AccessCheckResult> => {
  try {
    // TODO: Replace with actual API call to check permissions
    // For now, assume all authenticated users have access
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Find the menu item for this route
    const menuItem = DEFAULT_MENU_ITEMS.find((item) => item.route === pageRoute);
    
    if (!menuItem) {
      return { hasAccess: true }; // Unknown pages allow access by default
    }

    // TODO: Get actual user role from auth context or API
    const userRole = 'owner'; // Mock - should come from auth

    const hasAccess = menuItem.requiredRole.includes(userRole as any);

    return {
      hasAccess,
      requiredRole: menuItem.requiredRole.join(' or '),
      currentRole: userRole,
    };
  } catch (error) {
    console.error('Check page access error:', error);
    return { hasAccess: false };
  }
};

/**
 * Get user's role in a specific school
 */
export const getUserSchoolRole = async (
  schoolId: number,
  userId: number
): Promise<string | null> => {
  try {
    // TODO: Replace with actual database query
    // const result = await db
    //   .select({ role: userSchools.role })
    //   .from(userSchools)
    //   .where(and(eq(userSchools.schoolId, schoolId), eq(userSchools.userId, userId)))
    //   .limit(1);
    
    // return result[0]?.role || null;
    
    // Mock return
    return 'owner';
  } catch (error) {
    console.error('Get user school role error:', error);
    return null;
  }
};
