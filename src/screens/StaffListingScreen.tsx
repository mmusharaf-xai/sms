import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { SchoolSidebar } from '../components/sidebar';
import SearchBar from '../components/shared/SearchBar';
import {
  getSchoolStaffs,
  checkStaffAccess,
  StaffMember,
} from '../services/staffService';
import { getUserSchoolRole } from '../services/sidebarService';

type Props = NativeStackScreenProps<RootStackParamList, 'Staffs'>;

const { width } = Dimensions.get('window');

// ── Skeleton ─────────────────────────────────────────────────────────────

const Skeleton: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
}> = ({ width: w, height, borderRadius = 8 }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.skeleton, { width: w as any, height, borderRadius, opacity }]}
    />
  );
};

const StaffCardSkeleton: React.FC = () => (
  <View style={styles.staffCard}>
    <View style={styles.avatarContainer}>
      <Skeleton width={52} height={52} borderRadius={26} />
      <View style={styles.statusDot} />
    </View>
    <View style={styles.staffInfo}>
      <Skeleton width={140} height={18} borderRadius={4} />
      <View style={{ marginTop: 6 }}>
        <Skeleton width={180} height={14} borderRadius={4} />
      </View>
      <View style={{ marginTop: 6 }}>
        <Skeleton width={100} height={12} borderRadius={4} />
      </View>
    </View>
    <Skeleton width={28} height={28} borderRadius={14} />
  </View>
);

// ── Staff Card ───────────────────────────────────────────────────────────

interface StaffCardProps {
  staff: StaffMember;
  onPress: (staff: StaffMember) => void;
  onEditPress: (staff: StaffMember) => void;
}

const StaffCard: React.FC<StaffCardProps> = ({ staff, onPress, onEditPress }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22c55e';
      case 'inactive':
        return '#9ca3af';
      case 'pending':
        return '#f59e0b';
      default:
        return '#22c55e';
    }
  };

  return (
    <TouchableOpacity
      style={styles.staffCard}
      onPress={() => onPress(staff)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {staff.avatar ? (
          <Image source={{ uri: staff.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>
              {staff.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
        )}
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(staff.status) }]} />
      </View>

      <View style={styles.staffInfo}>
        <Text style={styles.staffName} numberOfLines={1}>
          {staff.fullName}
        </Text>
        <Text style={styles.staffRole} numberOfLines={1}>
          {staff.role}
        </Text>
        <Text style={styles.staffId}>{staff.staffId}</Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => onEditPress(staff)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="pencil" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ── Main Screen ──────────────────────────────────────────────────────────

const StaffListingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { schoolId, schoolName } = route.params;
  const { currentUserId } = useAuth();
  const isFocused = useIsFocused();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userRole, setUserRole] = useState<string>('owner');
  const [hasAccess, setHasAccess] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const pageSize = 10;
  const initialFocusRef = useRef(true);

  // Check access
  useEffect(() => {
    const checkAccess = async () => {
      if (!currentUserId) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const role = await getUserSchoolRole(schoolId, currentUserId);
      if (role) {
        setUserRole(role);
      }

      const access = await checkStaffAccess(schoolId, currentUserId);
      setHasAccess(access.hasAccess);
      if (!access.hasAccess) {
        setLoading(false);
      }
    };

    checkAccess();
  }, [schoolId, currentUserId]);

  // Fetch staff
  const fetchStaff = useCallback(
    async (page: number, search: string, isRefresh = false) => {
      if (!hasAccess) return;

      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 1) {
        setLoading(true);
      }
      setError(undefined);

      const result = await getSchoolStaffs(schoolId, {
        search,
        page,
        pageSize,
      });

      if (result.success && result.staff) {
        setStaff(result.staff);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.total || 0);
        setCurrentPage(page);
      } else {
        setError(result.error || 'Failed to load staff');
      }

      setLoading(false);
      setRefreshing(false);
    },
    [schoolId, hasAccess, pageSize]
  );

  // Initial fetch
  useEffect(() => {
    if (hasAccess) {
      fetchStaff(1, searchQuery);
    }
  }, [hasAccess, fetchStaff, searchQuery]);

  // Prevent swipe back gesture
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  // Re-fetch when screen regains focus (e.g. returning from AddStaff)
  useEffect(() => {
    if (isFocused && !initialFocusRef.current && hasAccess) {
      fetchStaff(1, searchQuery);
    }
    initialFocusRef.current = false;
  }, [isFocused, hasAccess, searchQuery, fetchStaff]);

  const handleMenuPress = () => setSidebarVisible(true);
  const handleCloseSidebar = () => setSidebarVisible(false);

  const handleNavigate = (routeName: string, params?: any) => {
    if (routeName === 'Staffs') return;
    if (routeName === 'SchoolSettings') {
      navigation.navigate('SchoolSettings', params);
      return;
    }
    console.log('Navigate to:', routeName, params);
  };

  const handleBackToSchools = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleProfilePress = () => {
    navigation.navigate('AccountSettings');
  };

  const handleStaffPress = (staffMember: StaffMember) => {
    // TODO: Navigate to staff details screen when implemented
    Alert.alert('Staff Details', `Viewing details for ${staffMember.fullName}`);
  };

  const handleEditPress = (staffMember: StaffMember) => {
    // TODO: Navigate to staff edit screen when implemented
    Alert.alert('Edit Staff', `Editing ${staffMember.fullName}`);
  };

  const handleAddStaff = () => {
    navigation.navigate('AddStaff', { schoolId, schoolName });
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchStaff(page, searchQuery);
    }
  };

  const renderStaffItem = ({ item }: { item: StaffMember }) => (
    <StaffCard staff={item} onPress={handleStaffPress} onEditPress={handleEditPress} />
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? colors.textMuted : colors.textPrimary} />
        </TouchableOpacity>

        {pages.map((p, idx) =>
          typeof p === 'number' ? (
            <TouchableOpacity
              key={idx}
              style={[styles.pageNumber, p === currentPage && styles.pageNumberActive]}
              onPress={() => handlePageChange(p)}
            >
              <Text style={[styles.pageNumberText, p === currentPage && styles.pageNumberTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text key={idx} style={styles.pageEllipsis}>...</Text>
          )
        )}

        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? colors.textMuted : colors.textPrimary} />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Access Denied ──────────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
          <Text style={styles.noAccessTitle}>Access Denied</Text>
          <Text style={styles.noAccessText}>
            You don't have permission to view staff for this school.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToSchools}>
            <Text style={styles.backButtonText}>Back to My Schools</Text>
          </TouchableOpacity>
        </View>
        <SchoolSidebar
          isVisible={sidebarVisible}
          onClose={handleCloseSidebar}
          schoolId={schoolId}
          userRole={userRole}
          currentRoute="Staffs"
          onNavigate={handleNavigate}
          onBackToSchools={handleBackToSchools}
        />
      </SafeAreaView>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.headerButton}>
            <Ionicons name="menu" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Skeleton width="100%" height={40} borderRadius={12} />
          </View>
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={40} height={40} borderRadius={12} />
        </View>

        <View style={styles.listContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <StaffCardSkeleton key={i} />
          ))}
        </View>

        <SchoolSidebar
          isVisible={sidebarVisible}
          onClose={handleCloseSidebar}
          schoolId={schoolId}
          userRole={userRole}
          currentRoute="Staffs"
          onNavigate={handleNavigate}
          onBackToSchools={handleBackToSchools}
        />
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────

  if (error && staff.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.headerButton}>
            <Ionicons name="menu" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Skeleton width="100%" height={40} borderRadius={12} />
          </View>
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={40} height={40} borderRadius={12} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchStaff(1, searchQuery)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>

        <SchoolSidebar
          isVisible={sidebarVisible}
          onClose={handleCloseSidebar}
          schoolId={schoolId}
          userRole={userRole}
          currentRoute="Staffs"
          onNavigate={handleNavigate}
          onBackToSchools={handleBackToSchools}
        />
      </SafeAreaView>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with search, filter, add */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleMenuPress} style={styles.headerButton}>
          <Ionicons name="menu" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search staff..."
          />
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={() => Alert.alert('Filter', 'Filter coming soon')}>
          <Ionicons name="filter" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButtonPrimary} onPress={handleAddStaff}>
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Staff List */}
      <FlatList
        data={staff}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStaffItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No staff found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search term' : 'Add your first staff member'}
            </Text>
          </View>
        }
        onRefresh={() => fetchStaff(currentPage, searchQuery, true)}
        refreshing={refreshing}
      />

      {/* Footer count */}
      {staff.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            SHOWING {staff.length} OF {totalCount} STAFF MEMBERS
          </Text>
        </View>
      )}

      {/* Pagination */}
      {renderPagination()}

      <SchoolSidebar
        isVisible={sidebarVisible}
        onClose={handleCloseSidebar}
        schoolId={schoolId}
        userRole={userRole}
        currentRoute="Staffs"
        onNavigate={handleNavigate}
        onBackToSchools={handleBackToSchools}
      />
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  searchContainer: {
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPrimary: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.schoolNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: colors.schoolNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
  },
  staffInfo: {
    flex: 1,
    minWidth: 0,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  staffRole: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  staffId: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  editButton: {
    padding: 6,
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
    gap: 6,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageNumber: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pageNumberActive: {
    backgroundColor: colors.schoolNavy,
    borderColor: colors.schoolNavy,
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pageNumberTextActive: {
    color: colors.white,
  },
  pageEllipsis: {
    width: 36,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  noAccessContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  noAccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
  },
  noAccessText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: colors.schoolNavy,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.schoolAccent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StaffListingScreen;
