import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ModulePermission } from '../services/roleService';
import { fetchModuleByKey } from '../services/moduleService';

type Props = NativeStackScreenProps<RootStackParamList, 'ModulePermissions'>;

type PermissionCategory = 'read' | 'update' | 'delete' | 'add';

interface AccordionConfig {
  key: PermissionCategory;
  label: string;
  icon: string;
}

const ACCORDION_SECTIONS: AccordionConfig[] = [
  { key: 'read', label: 'Read', icon: 'eye-outline' },
  { key: 'update', label: 'Update', icon: 'create-outline' },
  { key: 'delete', label: 'Delete', icon: 'trash-outline' },
  { key: 'add', label: 'Add', icon: 'add-circle-outline' },
];

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

// ── Loading skeleton for the whole screen ─────────────────────────────

const PermissionsSkeleton: React.FC = () => (
  <SafeAreaView style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <Skeleton width={180} height={24} borderRadius={12} />
      <Skeleton width={70} height={40} borderRadius={12} />
    </View>

    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Module label */}
      <View style={{ marginBottom: 8 }}>
        <Skeleton width={140} height={13} borderRadius={6} />
      </View>
      <View style={{ marginBottom: 24 }}>
        <Skeleton width={200} height={28} borderRadius={8} />
      </View>

      {/* Full access card */}
      <View style={styles.fullAccessCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Skeleton width={44} height={44} borderRadius={12} />
          <View style={{ marginLeft: 14 }}>
            <Skeleton width={100} height={18} borderRadius={6} />
            <View style={{ marginTop: 6 }}>
              <Skeleton width={190} height={13} borderRadius={6} />
            </View>
          </View>
        </View>
        <Skeleton width={48} height={28} borderRadius={14} />
      </View>

      {/* Section header */}
      <View style={{ marginTop: 28, marginBottom: 16 }}>
        <Skeleton width={180} height={14} borderRadius={6} />
      </View>

      {/* Accordion skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.accordionHeader, { marginBottom: 12 }]}>
          <Skeleton width={28} height={28} borderRadius={8} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Skeleton width={80} height={20} borderRadius={6} />
          </View>
          <Skeleton width={24} height={24} borderRadius={12} />
        </View>
      ))}

      {/* Bottom button */}
      <View style={{ marginTop: 24 }}>
        <Skeleton width="100%" height={56} borderRadius={14} />
      </View>
    </ScrollView>
  </SafeAreaView>
);

// ── Checkbox component ───────────────────────────────────────────────

const Checkbox: React.FC<{
  checked: boolean;
  onPress: () => void;
  label: string;
  isSelectAll?: boolean;
}> = ({ checked, onPress, label, isSelectAll = false }) => (
  <TouchableOpacity
    style={styles.checkboxRow}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      style={[
        styles.checkboxBox,
        checked && styles.checkboxBoxChecked,
      ]}
    >
      {checked && (
        <Ionicons name="checkmark" size={16} color={colors.white} />
      )}
    </View>
    <Text
      style={[
        styles.checkboxLabel,
        isSelectAll && styles.checkboxLabelSelectAll,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ── Accordion section component ──────────────────────────────────────

const PermissionAccordion: React.FC<{
  config: AccordionConfig;
  fields: string[];
  selectedFields: string[];
  onToggleField: (field: string) => void;
  onToggleAll: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}> = ({
  config,
  fields,
  selectedFields,
  onToggleField,
  onToggleAll,
  expanded,
  onToggleExpand,
}) => {
  const allSelected = fields.length > 0 && fields.every((f) => selectedFields.includes(f));

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.accordionIconContainer}>
          <Ionicons name={config.icon as any} size={22} color={colors.textSecondary} />
        </View>
        <Text style={styles.accordionTitle}>{config.label}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accordionBody}>
          <Checkbox
            checked={allSelected}
            onPress={onToggleAll}
            label="Select All Fields"
            isSelectAll
          />
          {fields.map((field) => (
            <Checkbox
              key={field}
              checked={selectedFields.includes(field)}
              onPress={() => onToggleField(field)}
              label={field}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ── Main Screen ──────────────────────────────────────────────────────

const ModulePermissionsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { schoolId, moduleKey, currentPermission, returnScreen, roleId } = route.params;

  // Module data fetched from DB
  const [moduleName, setModuleName] = useState('');
  const [moduleFields, setModuleFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | undefined>();

  // Permission state (local copy we mutate)
  const [fullAccess, setFullAccess] = useState(currentPermission.fullAccess);
  const [readFields, setReadFields] = useState<string[]>([...currentPermission.read]);
  const [updateFields, setUpdateFields] = useState<string[]>([...currentPermission.update]);
  const [deleteFields, setDeleteFields] = useState<string[]>([...currentPermission.delete]);
  const [addFields, setAddFields] = useState<string[]>([...currentPermission.add]);

  // Accordion expand states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    read: true,
    update: false,
    delete: false,
    add: false,
  });

  const [saving, setSaving] = useState(false);

  // ── Fetch module data from DB ─────────────────────────────────────

  const loadModule = useCallback(async () => {
    setLoading(true);
    setFetchError(undefined);

    const result = await fetchModuleByKey(schoolId, moduleKey);

    if (result.success && result.module) {
      setModuleName(result.module.name);
      setModuleFields(result.module.fields);
    } else {
      setFetchError(result.error || 'Failed to load module');
    }

    setLoading(false);
  }, [schoolId, moduleKey]);

  useEffect(() => {
    loadModule();
  }, [loadModule]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  // ── Permission helpers ────────────────────────────────────────────

  const getFieldsForCategory = (category: PermissionCategory): string[] => {
    switch (category) {
      case 'read': return readFields;
      case 'update': return updateFields;
      case 'delete': return deleteFields;
      case 'add': return addFields;
    }
  };

  const setFieldsForCategory = (category: PermissionCategory, fields: string[]) => {
    switch (category) {
      case 'read': setReadFields(fields); break;
      case 'update': setUpdateFields(fields); break;
      case 'delete': setDeleteFields(fields); break;
      case 'add': setAddFields(fields); break;
    }
  };

  const handleToggleField = (category: PermissionCategory, field: string) => {
    const current = getFieldsForCategory(category);
    const updated = current.includes(field)
      ? current.filter((f) => f !== field)
      : [...current, field];
    setFieldsForCategory(category, updated);

    // If we toggled off a field, turn off fullAccess
    if (fullAccess && !updated.includes(field)) {
      setFullAccess(false);
    }
  };

  const handleToggleAll = (category: PermissionCategory) => {
    const current = getFieldsForCategory(category);
    const allSelected = moduleFields.every((f) => current.includes(f));
    if (allSelected) {
      setFieldsForCategory(category, []);
      if (fullAccess) setFullAccess(false);
    } else {
      setFieldsForCategory(category, [...moduleFields]);
    }
  };

  const handleToggleFullAccess = () => {
    const newValue = !fullAccess;
    setFullAccess(newValue);

    if (newValue) {
      // Grant all fields in all categories
      setReadFields([...moduleFields]);
      setUpdateFields([...moduleFields]);
      setDeleteFields([...moduleFields]);
      setAddFields([...moduleFields]);
    } else {
      // Clear all
      setReadFields([]);
      setUpdateFields([]);
      setDeleteFields([]);
      setAddFields([]);
    }
  };

  const handleToggleExpand = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Save / Confirm ────────────────────────────────────────────────

  const buildPermission = (): ModulePermission => ({
    read: readFields,
    update: updateFields,
    delete: deleteFields,
    add: addFields,
    fullAccess,
  });

  const handleSave = () => {
    setSaving(true);
    const updatedPermission = buildPermission();

    if (returnScreen === 'CreateNewRole') {
      navigation.navigate('CreateNewRole', {
        schoolId,
        schoolName: route.params.schoolName,
        updatedModule: { moduleKey, permission: updatedPermission },
      });
    } else {
      navigation.navigate('RoleConfig', {
        schoolId,
        schoolName: route.params.schoolName,
        roleId: roleId!,
        updatedModule: { moduleKey, permission: updatedPermission },
      });
    }
  };

  const handleConfirmAll = () => {
    handleSave();
  };

  // ── Loading ───────────────────────────────────────────────────────

  if (loading) return <PermissionsSkeleton />;

  // ── Error ─────────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.centeredText}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadModule}>
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Module Permissions</Text>
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Configuring module label */}
        <Text style={styles.configuringLabel}>CONFIGURING MODULE</Text>
        <Text style={styles.moduleNameTitle}>{moduleName}</Text>

        {/* Full Access toggle card */}
        <View style={styles.fullAccessCard}>
          <View style={styles.fullAccessLeft}>
            <View style={styles.fullAccessIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.textSecondary} />
            </View>
            <View style={styles.fullAccessTextContainer}>
              <Text style={styles.fullAccessTitle}>Full Access</Text>
              <Text style={styles.fullAccessSubtitle}>Grant all permissions at once</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleToggleFullAccess}
            activeOpacity={0.7}
          >
            <View style={[styles.toggleTrack, fullAccess && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, fullAccess && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Specific Permissions header */}
        <Text style={styles.specificPermissionsLabel}>SPECIFIC PERMISSIONS</Text>

        {/* Accordion sections */}
        {ACCORDION_SECTIONS.map((section) => (
          <PermissionAccordion
            key={section.key}
            config={section}
            fields={moduleFields}
            selectedFields={getFieldsForCategory(section.key)}
            onToggleField={(field) => handleToggleField(section.key, field)}
            onToggleAll={() => handleToggleAll(section.key)}
            expanded={!!expandedSections[section.key]}
            onToggleExpand={() => handleToggleExpand(section.key)}
          />
        ))}

        {/* Spacer for bottom button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
          onPress={handleConfirmAll}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm All Changes</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 20,
  },

  // Configuring module label
  configuringLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.schoolAccent,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  moduleNameTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 24,
  },

  // Full Access card
  fullAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
  },
  fullAccessLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fullAccessIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullAccessTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  fullAccessTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fullAccessSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Toggle switch
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: colors.schoolAccent,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // Specific Permissions header
  specificPermissionsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
  },

  // Accordion
  accordionContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  accordionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 14,
  },
  accordionBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.schoolNavy,
    borderColor: colors.schoolNavy,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: 14,
  },
  checkboxLabelSelectAll: {
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.schoolNavy,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
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

export default ModulePermissionsScreen;
