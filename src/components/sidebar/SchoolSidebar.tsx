import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import {
  fetchSidebarConfig,
  SidebarMenuItem,
  SidebarConfig,
} from '../../services/sidebarService';

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

// Sidebar Skeleton Component
const SidebarSkeleton: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Skeleton */}
      <View style={styles.schoolHeader}>
        <Skeleton width={48} height={48} borderRadius={12} />
        <View style={styles.schoolInfo}>
          <Skeleton width={120} height={18} borderRadius={6} />
          <View style={{ marginTop: 6 }}>
            <Skeleton width={100} height={14} borderRadius={6} />
          </View>
        </View>
      </View>

      {/* Menu Items Skeleton */}
      <ScrollView
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <View key={i} style={styles.menuItem}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Skeleton width={100} height={16} borderRadius={6} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Button Skeleton */}
      <View style={styles.bottomContainer}>
        <Skeleton width="100%" height={50} borderRadius={12} />
      </View>
    </SafeAreaView>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

interface SchoolSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  schoolId: number;
  userRole: string;
  currentRoute: string;
  onNavigate: (route: string, params?: any) => void;
  onBackToSchools: () => void;
}

const SchoolSidebar: React.FC<SchoolSidebarProps> = ({
  isVisible,
  onClose,
  schoolId,
  userRole,
  currentRoute,
  onNavigate,
  onBackToSchools,
}) => {
  const [config, setConfig] = useState<SidebarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Fetch sidebar config
  const loadConfig = useCallback(async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
    const result = await fetchSidebarConfig(schoolId, userRole);
    
    if (result.success && result.config) {
      setConfig(result.config);
    } else {
      setError(result.error || 'Failed to load sidebar');
    }
    
    setLoading(false);
  }, [isVisible, schoolId, userRole]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Handle open/close animations
  useEffect(() => {
    if (isVisible) {
      // Open animation
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animation
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // Pan responder for swipe to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes from left edge or within sidebar
        return gestureState.dx < -10 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow swiping left (negative dx)
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(-SIDEBAR_WIDTH, gestureState.dx));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Close if swiped more than 30% of sidebar width
        if (gestureState.dx < -SIDEBAR_WIDTH * 0.3 || gestureState.vx < -0.5) {
          onClose();
        } else {
          // Spring back to open
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleMenuItemPress = (item: SidebarMenuItem) => {
    onClose();
    // Small delay to let close animation start
    setTimeout(() => {
      if (item.route === 'SchoolSettings') {
        onNavigate(item.route, { schoolId, schoolName: config?.schoolName });
      } else {
        onNavigate(item.route, { schoolId, schoolName: config?.schoolName });
      }
    }, 150);
  };

  const handleBackToSchools = () => {
    onClose();
    setTimeout(() => {
      onBackToSchools();
    }, 150);
  };

  const renderMenuItem = (item: SidebarMenuItem) => {
    const isActive = currentRoute === item.route;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={() => handleMenuItemPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          <Ionicons
            name={item.icon as any}
            size={22}
            color={isActive ? colors.white : colors.textSecondary}
          />
        </View>
        <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!isVisible && !config) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Overlay */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <Pressable style={styles.overlayPressable} onPress={onClose} />
        </Animated.View>

        {/* Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            { transform: [{ translateX }] },
          ]}
          {...panResponder.panHandlers}
        >
          {loading ? (
            <SidebarSkeleton />
          ) : error ? (
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </SafeAreaView>
          ) : (
            <SafeAreaView style={styles.safeArea}>
              {/* School Header */}
              <View style={styles.schoolHeader}>
                <View style={styles.logoContainer}>
                  <Ionicons name="school" size={24} color={colors.white} />
                </View>
                <View style={styles.schoolInfo}>
                  <Text style={styles.appName}>EduManager</Text>
                  <Text style={styles.schoolName}>
                    {config?.schoolName || 'Loading...'}
                  </Text>
                </View>
              </View>

              <ScrollView
                style={styles.menuContainer}
                showsVerticalScrollIndicator={false}
              >
                {config?.items.map(renderMenuItem)}
              </ScrollView>

              {/* Bottom Button */}
              <View style={styles.bottomContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToSchools}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                  <Text style={styles.backButtonText}>Back to My Schools</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayPressable: {
    flex: 1,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: colors.white,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  safeArea: {
    flex: 1,
  },
  schoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.schoolNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolInfo: {
    marginLeft: 12,
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  schoolName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: colors.schoolNavy,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  menuLabelActive: {
    color: colors.white,
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default SchoolSidebar;
