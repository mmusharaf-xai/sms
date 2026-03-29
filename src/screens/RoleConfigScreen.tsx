import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import {
  fetchRoleById,
  updateRole,
  deleteRole,
  RolePermissions,
  getModulePermissionSummary,
} from '../services/roleService';
import { fetchSchoolModules, ModuleData } from '../services/moduleService';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleConfig'>;

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

const RoleConfigSkeleton: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <Skeleton width={160} height={24} borderRadius={12} />
      <Skeleton width={70} height={40} borderRadius={12} />
    </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Skeleton width={100} height={16} borderRadius={6} />
        <View style={{ marginTop: 12 }}>
          <Skeleton width="100%" height={48} borderRadius={12} />
        </View>
      </View>

      <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
        <Skeleton width={140} height={22} borderRadius={6} />
        <View style={{ marginTop: 6 }}>
          <Skeleton width={280} height={14} borderRadius={6} />
        </View>
      </View>

      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={[styles.moduleRow, { marginTop: 12 }]}>
          <Skeleton width={48} height={48} borderRadius={12} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Skeleton width={120} height={18} borderRadius={6} />
            <View style={{ marginTop: 6 }}>
              <Skeleton width={80} height={13} borderRadius={6} />
            </View>
          </View>
          <Skeleton width={20} height={20} borderRadius={10} />
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>
);

// ── Module row component ─────────────────────────────────────────────────

const ModuleRow: React.FC<{
  icon: string;
  name: string;
  summary: string;
  onPress: () => void;
}> = ({ icon, name, summary, onPress }) => (
  <TouchableOpacity style={styles.moduleRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.moduleIcon}>
      <Ionicons name={icon as any} size={22} color={colors.textSecondary} />
    </View>
    <View style={styles.moduleText}>
      <Text style={styles.moduleName}>{name}</Text>
      <Text style={styles.moduleSummary}>{summary}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

// ── Main Screen ──────────────────────────────────────────────────────────

const RoleConfigScreen: React.FC<Props> = ({ route, navigation }) => {
  const { schoolId, schoolName, roleId } = route.params;
  const { currentUserId } = useAuth();

  const [roleName, setRoleName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | undefined>();

  // Modules fetched from DB
  const [schoolModules, setSchoolModules] = useState<ModuleData[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  // Ref keeps the latest updatedModule param so the async loadRole
  // callback can read it even after remount (survives the closure).
  const updatedModuleRef = useRef(route.params?.updatedModule);
  updatedModuleRef.current = route.params?.updatedModule;

  const loadRole = useCallback(async () => {
    if (!currentUserId) {
      setFetchError('Not authenticated');
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(undefined);

    const result = await fetchRoleById(roleId, schoolId, currentUserId);

    if (result.success && result.role) {
      setRoleName(result.role.name);

      // Start from DB permissions, then apply any pending update that was
      // passed back from the ModulePermissions screen via route params.
      const perms = { ...result.role.permissions };
      const pending = updatedModuleRef.current;
      if (pending) {
        perms[pending.moduleKey] = pending.permission;
        updatedModuleRef.current = undefined;
        navigation.setParams({ updatedModule: undefined } as any);
      }
      setPermissions(perms);
    } else {
      setFetchError(result.error || 'Failed to load role');
    }

    setLoading(false);
  }, [roleId, schoolId, currentUserId]);

  const loadModules = useCallback(async () => {
    setModulesLoading(true);
    const result = await fetchSchoolModules(schoolId);
    if (result.success && result.modules) {
      setSchoolModules(result.modules);
    }
    setModulesLoading(false);
  }, [schoolId]);

  useEffect(() => {
    loadRole();
    loadModules();
  }, [loadRole, loadModules]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  const handleNameChange = (value: string) => {
    setRoleName(value);
    if (nameError) {
      if (value.trim().length >= 2) setNameError(undefined);
    }
  };

  const handleSave = async () => {
    const trimmed = roleName.trim();
    if (!trimmed) {
      setNameError('Role name is required');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('Role name must be at least 2 characters');
      return;
    }
    setNameError(undefined);

    if (!currentUserId) return;

    setSaving(true);
    const result = await updateRole(roleId, schoolId, currentUserId, {
      name: trimmed,
      permissions,
    });
    setSaving(false);

    if (result.success) {
      Alert.alert('Success', 'Role updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      if (result.error?.toLowerCase().includes('name')) {
        setNameError(result.error);
      } else {
        Alert.alert('Error', result.error || 'Failed to update role.');
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete "${roleName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentUserId) return;
            const result = await deleteRole(roleId, schoolId, currentUserId);
            if (result.success) {
              Alert.alert('Deleted', 'Role has been deleted.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to delete role.');
            }
          },
        },
      ]
    );
  };

  // ── Listen for returned permission data from ModulePermissions ──────
  // This effect handles the case where the screen was NOT remounted
  // (i.e. role already loaded, just params updated).
  // The remount case is handled inside loadRole via the ref.
  useEffect(() => {
    const updatedModule = route.params?.updatedModule;
    if (updatedModule && !loading) {
      setPermissions((prev) => ({
        ...prev,
        [updatedModule.moduleKey]: updatedModule.permission,
      }));
      updatedModuleRef.current = undefined;
      navigation.setParams({ updatedModule: undefined } as any);
    }
  }, [route.params?.updatedModule, loading]);

  const handleModulePress = (moduleKey: string) => {
    const currentPerm = permissions[moduleKey] || {
      read: [],
      update: [],
      delete: [],
      add: [],
      fullAccess: false,
    };
    navigation.navigate('ModulePermissions', {
      schoolId,
      schoolName,
      moduleKey,
      currentPermission: currentPerm,
      returnScreen: 'RoleConfig',
      roleId,
    });
  };

  if (loading) return <RoleConfigSkeleton />;

  if (fetchError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.centeredText}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRole}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Role</Text>
        <TouchableOpacity
          style={[styles.saveHeaderButton, saving && styles.saveHeaderButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveHeaderButtonText}>Save</Text>
          )}
        </TouchableOpacity>
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
          {/* Role name card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Role Name</Text>
            <TextInput
              style={[styles.cardInput, nameError && styles.cardInputError]}
              value={roleName}
              onChangeText={handleNameChange}
              placeholder="e.g. Senior Teacher, Department Head"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            {nameError && <Text style={styles.errorText}>{nameError}</Text>}
          </View>

          {/* Permissions header */}
          <View style={styles.permissionsHeader}>
            <Text style={styles.permissionsTitle}>Permissions</Text>
            <Text style={styles.permissionsSubtitle}>
              Select a module to manage its detailed access levels
            </Text>
          </View>

          {/* Module list */}
          {modulesLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={[styles.moduleRow, { marginTop: i === 1 ? 0 : 2 }]}>
                  <View style={styles.moduleIcon}>
                    <Skeleton width={24} height={24} borderRadius={6} />
                  </View>
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Skeleton width={120} height={18} borderRadius={6} />
                    <View style={{ marginTop: 6 }}>
                      <Skeleton width={80} height={13} borderRadius={6} />
                    </View>
                  </View>
                  <Skeleton width={20} height={20} borderRadius={10} />
                </View>
              ))}
            </>
          ) : (
            schoolModules.map((mod) => (
              <ModuleRow
                key={mod.key}
                icon={mod.icon}
                name={mod.name}
                summary={getModulePermissionSummary(permissions[mod.key])}
                onPress={() => handleModulePress(mod.key)}
              />
            ))
          )}

          {/* Delete button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={styles.deleteButtonText}>Delete Role</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────

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
  saveHeaderButton: {
    backgroundColor: colors.schoolNavy,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderButtonDisabled: {
    opacity: 0.7,
  },
  saveHeaderButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Role name card
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  cardInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 16,
    color: colors.textPrimary,
  },
  cardInputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
    marginLeft: 4,
  },

  // Permissions
  permissionsHeader: {
    marginTop: 28,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  permissionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  permissionsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },

  // Module rows
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleText: {
    flex: 1,
    marginLeft: 14,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  moduleSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Delete button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },

  // Centered states
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  centeredText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
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

export default RoleConfigScreen;
