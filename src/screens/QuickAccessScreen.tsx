import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { SchoolSidebar } from '../components/sidebar';
import {
  fetchUIConfig,
  UIComponent,
  StatsItem,
  QuickActionItem,
  BannerConfig,
} from '../services/uiConfigService';
import { getUserSchoolRole } from '../services/sidebarService';

type QuickAccessScreenProps = NativeStackScreenProps<RootStackParamList, 'QuickAccess'>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

// Skeleton component for loading state using React Native's built-in Animated
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

// Skeleton loader for the entire screen
const QuickAccessSkeleton: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <Skeleton width={180} height={24} borderRadius={12} />
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title Section Skeleton */}
        <View style={styles.titleSection}>
          <Skeleton width={140} height={32} borderRadius={8} />
          <View style={{ marginTop: 8 }}>
            <Skeleton width={280} height={16} borderRadius={8} />
          </View>
        </View>

        {/* Stats Grid Skeleton */}
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.statsCard}>
              <Skeleton width={48} height={48} borderRadius={12} />
              <View style={{ marginTop: 12 }}>
                <Skeleton width={60} height={28} borderRadius={6} />
              </View>
              <View style={{ marginTop: 4 }}>
                <Skeleton width={80} height={14} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions Skeleton */}
        <View style={styles.quickActionsSection}>
          <Skeleton width={120} height={16} borderRadius={6} />
          <View style={styles.actionList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.actionCard}>
                <Skeleton width={48} height={48} borderRadius={12} />
                <View style={styles.actionTextContainer}>
                  <Skeleton width={160} height={18} borderRadius={6} />
                  <View style={{ marginTop: 4 }}>
                    <Skeleton width={220} height={14} borderRadius={6} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Banner Skeleton */}
        <View style={styles.bannerContainer}>
          <Skeleton width="100%" height={140} borderRadius={16} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Stats Grid Component
const StatsGrid: React.FC<{ config: { title: string; subtitle: string; items: StatsItem[] } }> = ({
  config,
}) => {
  return (
    <View>
      <View style={styles.titleSection}>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>
      </View>

      <View style={styles.statsGrid}>
        {config.items.map((item) => (
          <View key={item.id} style={styles.statsCard}>
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={styles.statsValue}>{item.value}</Text>
            <Text style={styles.statsLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Quick Actions Component
const QuickActions: React.FC<{
  config: { title: string; items: QuickActionItem[] };
  onActionPress: (route?: string) => void;
}> = ({ config, onActionPress }) => {
  return (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>{config.title}</Text>
      <View style={styles.actionList}>
        {config.items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.actionCard,
              item.variant === 'primary' && styles.actionCardPrimary,
            ]}
            onPress={() => onActionPress(item.route)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: item.iconBgColor },
                item.variant === 'primary' && styles.actionIconContainerPrimary,
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={24}
                color={item.variant === 'primary' ? '#fff' : '#3b82f6'}
              />
            </View>
            <View style={styles.actionTextContainer}>
              <Text
                style={[
                  styles.actionTitle,
                  item.variant === 'primary' && styles.actionTitlePrimary,
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.actionSubtitle,
                  item.variant === 'primary' && styles.actionSubtitlePrimary,
                ]}
              >
                {item.subtitle}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={item.variant === 'primary' ? 'rgba(255,255,255,0.6)' : '#94a3b8'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Banner Component
const Banner: React.FC<{ config: BannerConfig; onButtonPress: (route?: string) => void }> = ({
  config,
  onButtonPress,
}) => {
  return (
    <View style={styles.bannerContainer}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Text style={styles.bannerTitle}>{config.title}</Text>
        <Text style={styles.bannerSubtitle}>{config.subtitle}</Text>
        <TouchableOpacity
          style={styles.bannerButton}
          onPress={() => onButtonPress(config.buttonRoute)}
          activeOpacity={0.9}
        >
          <Text style={styles.bannerButtonText}>{config.buttonText}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const QuickAccessScreen: React.FC<QuickAccessScreenProps> = ({ route, navigation }) => {
  const { schoolId, schoolName } = route.params || {};
  const { currentUser, currentUserId } = useAuth();
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userRole, setUserRole] = useState<string>('owner');
  const [hasAccess, setHasAccess] = useState<boolean>(true);

  const fetchConfig = useCallback(async () => {
    if (!schoolId) {
      setError('School ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    const result = await fetchUIConfig('quick_access', schoolId);

    if (result.success && result.components) {
      // Sort components by order
      const sorted = result.components.sort((a, b) => a.order - b.order);
      setComponents(sorted);
    } else {
      setError(result.error || 'Failed to load page');
    }

    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Check user access to this school
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

  const handleMenuPress = () => {
    setSidebarVisible(true);
  };

  const handleCloseSidebar = () => {
    setSidebarVisible(false);
  };

  const handleNavigate = (route: string, params?: any) => {
    if (route === 'QuickAccess') {
      // Already on this page
      return;
    }
    if (route === 'SchoolSettings') {
      navigation.navigate('SchoolSettings', params);
      return;
    }
    if (route === 'Staffs') {
      navigation.navigate('Staffs', params);
      return;
    }
    // For now, just log - these routes will be implemented later
    console.log('Navigate to:', route, params);
  };

  const handleBackToSchools = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleProfilePress = () => {
    navigation.navigate('AccountSettings');
  };

  const handleActionPress = (route?: string) => {
    if (route) {
      // TODO: Navigate to specific route when implemented
      console.log('Navigate to:', route);
    }
  };

  const renderComponent = (component: UIComponent) => {
    switch (component.type) {
      case 'stats_grid':
        return <StatsGrid config={component.config as any} />;
      case 'quick_actions':
        return <QuickActions config={component.config as any} onActionPress={handleActionPress} />;
      case 'banner':
        return <Banner config={component.config as any} onButtonPress={handleActionPress} />;
      default:
        return null;
    }
  };

  // Show placeholder if user doesn't have access
  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
          <Text style={styles.noAccessTitle}>Access Denied</Text>
          <Text style={styles.noAccessText}>
            You don't have permission to access this school. Please contact the school administrator.
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
        <QuickAccessSkeleton />
        <SchoolSidebar
          isVisible={sidebarVisible}
          onClose={handleCloseSidebar}
          schoolId={schoolId || 0}
          userRole={userRole}
          currentRoute="QuickAccess"
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
          currentRoute="QuickAccess"
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {schoolName || 'School'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleProfilePress}>
            {currentUser?.avatar ? (
              <Image
                source={{ uri: currentUser.avatar }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitials}>
                  {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {components.map((component) => (
          <View key={component.id}>{renderComponent(component)}</View>
        ))}
      </ScrollView>

      <SchoolSidebar
        isVisible={sidebarVisible}
        onClose={handleCloseSidebar}
        schoolId={schoolId || 0}
        userRole={userRole}
        currentRoute="QuickAccess"
        onNavigate={handleNavigate}
        onBackToSchools={handleBackToSchools}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profilePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.schoolNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Skeleton styles
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  // Title Section
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statsCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  actionList: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  actionCardPrimary: {
    backgroundColor: colors.schoolNavy,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconContainerPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  actionTitlePrimary: {
    color: colors.white,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  actionSubtitlePrimary: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Banner
  bannerContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  banner: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 8,
  },
  bannerButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
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

export default QuickAccessScreen;
