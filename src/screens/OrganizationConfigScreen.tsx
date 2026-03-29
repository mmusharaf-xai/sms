import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { FormInput } from '../components/shared';
import {
  validateOrganizationForm,
  validateOrganizationName,
  validateOrganizationAddress,
  validateEmail,
  validatePhoneNumber,
} from '../utils/validation';
import {
  fetchOrganizationConfig,
  updateOrganizationDetails,
  OrganizationDetails,
  OrganizationRole,
} from '../services/organizationConfigService';

type Props = NativeStackScreenProps<RootStackParamList, 'OrganizationConfig'>;

// ── Skeleton placeholder ───────────────────────────────────────────────

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

// ── Loading skeleton for the whole screen ──────────────────────────────

const ConfigSkeleton: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <Skeleton width={180} height={24} borderRadius={12} />
      <View style={{ width: 40 }} />
    </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.sectionCard}>
        <Skeleton width={48} height={48} borderRadius={12} />
        <View style={{ marginTop: 16 }}>
          <Skeleton width={180} height={22} borderRadius={6} />
        </View>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ marginTop: 20 }}>
            <Skeleton width={120} height={14} borderRadius={6} />
            <View style={{ marginTop: 8 }}>
              <Skeleton width="100%" height={48} borderRadius={12} />
            </View>
          </View>
        ))}
        <View style={{ marginTop: 24, alignItems: 'flex-end' }}>
          <Skeleton width={140} height={48} borderRadius={12} />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={48} height={48} borderRadius={12} />
          <View style={{ marginLeft: 12 }}>
            <Skeleton width={120} height={20} borderRadius={6} />
            <View style={{ marginTop: 6 }}>
              <Skeleton width={220} height={14} borderRadius={6} />
            </View>
          </View>
        </View>
        <View style={{ marginTop: 20 }}>
          <Skeleton width="100%" height={50} borderRadius={12} />
        </View>
        {[1, 2].map((i) => (
          <View key={i} style={{ marginTop: 12 }}>
            <Skeleton width="100%" height={56} borderRadius={12} />
          </View>
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);

// ── Role row component ─────────────────────────────────────────────────

const RoleRow: React.FC<{
  role: OrganizationRole;
  onSettingsPress: () => void;
}> = ({ role, onSettingsPress }) => (
  <View style={styles.roleRow}>
    <Text style={styles.roleName}>{role.name}</Text>
    <View
      style={[
        styles.roleBadge,
        role.type === 'FULL ACCESS' ? styles.roleBadgeFull : styles.roleBadgeStandard,
      ]}
    >
      <Text
        style={[
          styles.roleBadgeText,
          role.type === 'FULL ACCESS'
            ? styles.roleBadgeTextFull
            : styles.roleBadgeTextStandard,
        ]}
      >
        {role.type}
      </Text>
    </View>
    <TouchableOpacity
      onPress={onSettingsPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.roleSettingsBtn}
    >
      <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
    </TouchableOpacity>
  </View>
);

// ── Main screen ────────────────────────────────────────────────────────

const OrganizationConfigScreen: React.FC<Props> = ({ route, navigation }) => {
  const { schoolId, schoolName } = route.params;
  const { currentUserId } = useAuth();

  // Data state
  const [details, setDetails] = useState<OrganizationDetails | null>(null);
  const [roles, setRoles] = useState<OrganizationRole[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | undefined>();
  const [hasAccess, setHasAccess] = useState(true);

  // ── Fetch config ───────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    if (!currentUserId) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(undefined);

    const result = await fetchOrganizationConfig(schoolId, currentUserId);

    if (result.success && result.data) {
      const d = result.data.details;
      setDetails(d);
      setName(d.name);
      setEmail(d.email);
      setAddress(d.address);
      setPhone(d.phone);
      setRoles(result.data.roles);
      setHasAccess(true);
    } else {
      if (
        result.error?.includes('access') ||
        result.error?.includes('owners and admins')
      ) {
        setHasAccess(false);
      } else {
        setFetchError(result.error || 'Failed to load configuration');
      }
    }

    setLoading(false);
  }, [schoolId, currentUserId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Disable swipe back
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  // ── Field-level validation on change ───────────────────────────────

  const handleNameChange = (value: string) => {
    setName(value);
    if (errors.name) {
      const result = validateOrganizationName(value);
      setErrors((prev) => ({ ...prev, name: result.isValid ? undefined : result.error }));
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      const result = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: result.isValid ? undefined : result.error }));
    }
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (errors.address) {
      const result = validateOrganizationAddress(value);
      setErrors((prev) => ({ ...prev, address: result.isValid ? undefined : result.error }));
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (errors.phone) {
      const result = validatePhoneNumber(value);
      setErrors((prev) => ({ ...prev, phone: result.isValid ? undefined : result.error }));
    }
  };

  // ── Save handler ──────────────────────────────────────────────────

  const handleSave = async () => {
    const formErrors = validateOrganizationForm({ name, email, address, phone });
    setErrors(formErrors);

    if (Object.values(formErrors).some(Boolean)) return;

    if (!currentUserId) return;

    setSaving(true);
    const result = await updateOrganizationDetails(schoolId, currentUserId, {
      name,
      email,
      address,
      phone,
    });
    setSaving(false);

    if (result.success) {
      Alert.alert('Success', 'Organization details updated successfully.');
    } else {
      // Surface uniqueness errors on the correct field
      if (result.error?.toLowerCase().includes('name')) {
        setErrors((prev) => ({ ...prev, name: result.error }));
      } else if (result.error?.toLowerCase().includes('address')) {
        setErrors((prev) => ({ ...prev, address: result.error }));
      } else {
        Alert.alert('Error', result.error || 'Failed to save changes.');
      }
    }
  };

  // ── Navigation helpers ────────────────────────────────────────────

  const handleBack = () => navigation.goBack();

  const handleNewRole = () =>
    navigation.navigate('CreateNewRole', { schoolId, schoolName });

  const handleRoleSettings = (roleId: number) =>
    navigation.navigate('RoleConfig', { schoolId, schoolName, roleId });

  // ── Access denied ─────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
          <Text style={styles.centeredTitle}>Access Denied</Text>
          <Text style={styles.centeredText}>
            You don't have permission to manage this organization's settings.
          </Text>
          <TouchableOpacity style={styles.centeredButton} onPress={handleBack}>
            <Text style={styles.centeredButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────

  if (loading) return <ConfigSkeleton />;

  // ── Error ─────────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.centeredText}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadConfig}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Section 1: Organization Details ──────────────────── */}
          <View style={styles.sectionCard}>
            {/* Section icon */}
            <View style={styles.sectionIcon}>
              <Ionicons name="business-outline" size={24} color={colors.schoolNavy} />
            </View>

            <Text style={styles.sectionTitle}>Organization Details</Text>

            <FormInput
              label="Organization Name"
              value={name}
              onChangeText={handleNameChange}
              placeholder="e.g. Greenfield Academy"
              error={errors.name}
              autoCapitalize="words"
              containerStyle={styles.fieldGap}
            />

            <FormInput
              label="Email Address"
              value={email}
              onChangeText={handleEmailChange}
              placeholder="contact@school.com"
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.fieldGap}
            />

            <FormInput
              label="Address"
              value={address}
              onChangeText={handleAddressChange}
              placeholder="123 Education Way, Academic District"
              error={errors.address}
              autoCapitalize="sentences"
              containerStyle={styles.fieldGap}
            />

            <FormInput
              label="Phone Number"
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="+1 (555) 000-0000"
              error={errors.phone}
              keyboardType="phone-pad"
              containerStyle={styles.fieldGap}
            />

            {/* Divider */}
            <View style={styles.divider} />

            {/* Save button – right-aligned */}
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Section 2: Roles ─────────────────────────────────── */}
          <View style={styles.sectionCard}>
            {/* Header row with icon + text */}
            <View style={styles.rolesHeader}>
              <View style={styles.rolesIconContainer}>
                <Ionicons name="people-outline" size={24} color={colors.textSecondary} />
              </View>
              <View style={styles.rolesHeaderText}>
                <Text style={styles.rolesTitle}>Create Roles</Text>
                <Text style={styles.rolesSubtitle}>
                  Define access levels for staff and administrators
                </Text>
              </View>
            </View>

            {/* New Role button */}
            <TouchableOpacity
              style={styles.newRoleButton}
              onPress={handleNewRole}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color={colors.white} />
              <Text style={styles.newRoleButtonText}>New Role</Text>
            </TouchableOpacity>

            {/* Existing roles list */}
            {roles.map((role) => (
              <RoleRow
                key={role.id}
                role={role}
                onSettingsPress={() => handleRoleSettings(role.id)}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
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

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },

  // Section cards
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },

  fieldGap: {
    marginBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
    marginBottom: 20,
  },

  saveRow: {
    alignItems: 'flex-end',
  },

  saveButton: {
    backgroundColor: colors.schoolNavy,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },

  // Roles section
  rolesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  rolesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rolesHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  rolesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  rolesSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  newRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.schoolNavy,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 6,
  },

  newRoleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },

  // Role row
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  roleName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  roleBadge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },

  roleBadgeFull: {
    backgroundColor: colors.schoolNavy,
  },

  roleBadgeStandard: {
    backgroundColor: colors.border,
  },

  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  roleBadgeTextFull: {
    color: colors.white,
  },

  roleBadgeTextStandard: {
    color: colors.textSecondary,
  },

  roleSettingsBtn: {
    marginLeft: 'auto',
    padding: 4,
  },

  // Centered states (access denied / error)
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },

  centeredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
  },

  centeredText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },

  centeredButton: {
    backgroundColor: colors.schoolNavy,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },

  centeredButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
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
});

export default OrganizationConfigScreen;
