import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { SchoolSidebar } from '../components/sidebar';
import { getUserSchoolRole } from '../services/sidebarService';
import {
  fetchSettingsConfig,
  SettingsGroup,
  SettingsSection,
} from '../services/settingsConfigService';

type SchoolSettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'SchoolSettings'>;

// Skeleton component for loading state
const Skeleton: React.FC<{ width: number | string; height: number; borderRadius?: number }> = ({
  width: w,
  height,
  borderRadius = 8,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: w, height, borderRadius, opacity },
      ]}
    />
  );
};

// Settings Card Component
const SettingsCard: React.FC<{
  item: SettingsSection;
  onPress: () => void;
}> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.cardIconContainer, { backgroundColor: item.iconBgColor || colors.schoolNavy }]}>
        <Ionicons name={item.icon as any} size={24} color={colors.white} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Settings List Item Component
const SettingsListItem: React.FC<{
  item: SettingsSection;
  onPress: () => void;
}> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} />
      <Text style={styles.listItemTitle}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

// Settings Group Component
const SettingsGroupComponent: React.FC<{
  group: SettingsGroup;
  onItemPress: (item: SettingsSection) => void;
}> = ({ group, onItemPress }) => {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{group.title}</Text>
      <View style={styles.groupItems}>
        {group.items.map((item) =>
          item.type === 'card' ? (
            <SettingsCard
              key={item.id}
              item={item}
              onPress={() => onItemPress(item)}
            />
          ) : (
            <SettingsListItem
              key={item.id}
              item={item}
              onPress={() => onItemPress(item)}
            />
          )
        )}
      </View>
    </View>
  );
};

// Skeleton Screen
const SettingsSkeleton: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <Skeleton width={120} height={24} borderRadius={12} />
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search Skeleton */}
        <View style={styles.searchContainer}>
          <Skeleton width="100%" height={44} borderRadius={12} />
        </View>

        {/* Group 1 Skeleton */}
        <View style={styles.group}>
          <Skeleton width={180} height={14} borderRadius={6} />
          <View style={styles.groupItems}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.card}>
                <Skeleton width={48} height={48} borderRadius={12} />
                <View style={styles.cardContent}>
                  <Skeleton width={120} height={18} borderRadius={6} />
                  <View style={{ marginTop: 4 }}>
                    <Skeleton width={200} height={14} borderRadius={6} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Group 2 Skeleton */}
        <View style={styles.group}>
          <Skeleton width={150} height={14} borderRadius={6} />
          <View style={styles.groupItems}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.listItem}>
                <Skeleton width={22} height={22} borderRadius={11} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Skeleton width={150} height={16} borderRadius={6} />
                </View>
                <Skeleton width={20} height={20} borderRadius={10} />
              </View>
            ))}
          </View>
        </View>

        {/* Version Skeleton */}
        <View style={styles.versionContainer}>
          <Skeleton width={200} height={14} borderRadius={6} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const SchoolSettingsScreen: React.FC<SchoolSettingsScreenProps> = ({ route, navigation }) => {
  const { schoolId, schoolName } = route.params || {};
  const { currentUser, currentUserId } = useAuth();
  const [groups, setGroups] = useState<SettingsGroup[]>([]);
  const [version, setVersion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userRole, setUserRole] = useState<string>('owner');
  const [hasAccess, setHasAccess] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConfig = useCallback(async () => {
    if (!schoolId) {
      setError('School ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    const result = await fetchSettingsConfig(schoolId, userRole);

    if (result.success && result.config) {
      setGroups(result.config.groups);
      setVersion(result.config.version || '');
    } else {
      setError(result.error || 'Failed to load settings');
    }

    setLoading(false);
  }, [schoolId, userRole]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Check user access
  useEffect(() => {
    const checkAccess = async () => {
      if (!schoolId || !currentUserId) {
        setHasAccess(false);
        return;
      }

      const role = await getUserSchoolRole(schoolId, currentUserId);
      if (role) {
        setUserRole(role);
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [schoolId, currentUserId]);

  // Prevent swipe back gesture
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
    });
  }, [navigation]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleMenuPress = () => {
    setSidebarVisible(true);
  };

  const handleCloseSidebar = () => {
    setSidebarVisible(false);
  };

  const handleNavigate = (routeName: string, params?: any) => {
    if (routeName === 'SchoolSettings') {
      return;
    }
    // Navigate to other settings pages
    console.log('Navigate to:', routeName, params);
  };

  const handleBackToSchools = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleItemPress = (item: SettingsSection) => {
    console.log('Navigate to settings:', item.route);
    // TODO: Navigate to specific settings page when implemented
  };

  // Filter groups based on search
  const filteredGroups = searchQuery.trim()
    ? groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((group) => group.items.length > 0)
    : groups;

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
          <Text style={styles.noAccessTitle}>Access Denied</Text>
          <Text style={styles.noAccessText}>
            You don't have permission to access this school's settings.
          </Text>
          <TouchableOpacity
            style={styles.backToSchoolsButton}
            onPress={handleBackToSchools}
          >
            <Text style={styles.backToSchoolsButtonText}>Back to My Schools</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <>
        <SettingsSkeleton />
        <SchoolSidebar
          isVisible={sidebarVisible}
          onClose={handleCloseSidebar}
          schoolId={schoolId || 0}
          userRole={userRole}
          currentRoute="SchoolSettings"
          onNavigate={handleNavigate}
          onBackToSchools={handleBackToSchools}
        />
      </>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchConfig}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <SchoolSidebar
          isVisible={sidebarVisible}
          onClose={handleCloseSidebar}
          schoolId={schoolId || 0}
          userRole={userRole}
          currentRoute="SchoolSettings"
          onNavigate={handleNavigate}
          onBackToSchools={handleBackToSchools}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.headerButton}>
            <Ionicons name="menu" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search settings..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Settings Groups */}
        {filteredGroups.map((group) => (
          <SettingsGroupComponent
            key={group.id}
            group={group}
            onItemPress={handleItemPress}
          />
        ))}

        {/* Version Info */}
        {version && (
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>{version}</Text>
          </View>
        )}
      </ScrollView>

      <SchoolSidebar
        isVisible={sidebarVisible}
        onClose={handleCloseSidebar}
        schoolId={schoolId || 0}
        userRole={userRole}
        currentRoute="SchoolSettings"
        onNavigate={handleNavigate}
        onBackToSchools={handleBackToSchools}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 80,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 8,
    paddingVertical: 0,
  },
  group: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  groupItems: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    marginLeft: 16,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  // Error state
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
  // No access state
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
    marginTop: 8,
  },
  backToSchoolsButton: {
    backgroundColor: colors.schoolNavy,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  backToSchoolsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});

export default SchoolSettingsScreen;
