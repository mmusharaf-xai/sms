import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  fetchFieldGroups,
  createFieldGroup,
  deleteFieldGroup,
  FieldGroupData,
} from '../services/fieldGroupService';
import CreateFieldGroupModal from '../components/settings/CreateFieldGroupModal';

type Props = NativeStackScreenProps<RootStackParamList, 'ModuleFieldConfig'>;

// ── Skeleton ───────────────────────────────────────────────────────────

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

const ConfigSkeleton: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerButton}>
        <Skeleton width={24} height={24} borderRadius={12} />
      </TouchableOpacity>
      <Skeleton width={160} height={24} borderRadius={12} />
      <View style={{ width: 40 }} />
    </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.searchContainer}>
        <Skeleton width="100%" height={48} borderRadius={12} />
      </View>
      <View style={styles.sectionContainer}>
        <Skeleton width={130} height={14} borderRadius={6} />
        <View style={{ marginTop: 12 }}>
          <Skeleton width="100%" height={72} borderRadius={16} />
        </View>
      </View>
      <View style={styles.sectionContainer}>
        <Skeleton width={140} height={14} borderRadius={6} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ marginTop: 12 }}>
            <Skeleton width="100%" height={72} borderRadius={16} />
          </View>
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);

// ── Group Card ─────────────────────────────────────────────────────────

const GroupCard: React.FC<{
  group: FieldGroupData;
  onPress: () => void;
  onDelete?: () => void;
}> = ({ group, onPress, onDelete }) => (
  <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.groupIconContainer}>
      <Ionicons
        name={(group.icon || 'folder-open') as any}
        size={22}
        color={colors.schoolBlue}
      />
    </View>
    <View style={styles.groupCardContent}>
      <Text style={styles.groupCardName} numberOfLines={1}>
        {group.name}
      </Text>
      <Text style={styles.groupCardSubtitle}>
        {group.isDefault
          ? `${group.fieldCount} Default Fields \u00B7 System Protected`
          : `${group.fieldCount} Fields`}
      </Text>
    </View>
    {!group.isDefault && onDelete && (
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    )}
    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ marginLeft: 8 }} />
  </TouchableOpacity>
);

// ── Singular module name helper ────────────────────────────────────────

const getSingularName = (name: string): string => {
  if (name.toLowerCase().endsWith('s') && name.length > 1) {
    return name.slice(0, -1);
  }
  return name;
};

// ── Main Screen ────────────────────────────────────────────────────────

const ModuleFieldConfigScreen: React.FC<Props> = ({ route, navigation }) => {
  const { schoolId, schoolName, moduleKey, moduleName } = route.params;
  const isFocused = useIsFocused();

  const [groups, setGroups] = useState<FieldGroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const singularName = getSingularName(moduleName);

  // ── Load groups ────────────────────────────────────────────────────

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    const result = await fetchFieldGroups(schoolId, moduleKey);

    if (result.success && result.groups) {
      setGroups(result.groups);
    } else {
      setError(result.error || 'Failed to load field groups');
    }

    setLoading(false);
  }, [schoolId, moduleKey]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Re-fetch when screen regains focus
  const initialFocusRef = useRef(true);
  useEffect(() => {
    if (isFocused && !initialFocusRef.current) {
      loadGroups();
    }
    initialFocusRef.current = false;
  }, [isFocused]);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleBack = () => navigation.goBack();

  const handleGroupPress = (group: FieldGroupData) => {
    navigation.navigate('GroupFieldList', {
      schoolId,
      schoolName,
      moduleKey,
      moduleName,
      groupId: group.id,
      groupName: group.name,
      isDefault: group.isDefault,
    });
  };

  const handleDeleteGroup = (group: FieldGroupData) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? This will also delete all fields in this group.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteFieldGroup(group.id);
            if (result.success) {
              setGroups((prev) => prev.filter((g) => g.id !== group.id));
            } else {
              Alert.alert('Error', result.error || 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const handleCreateGroup = async (
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await createFieldGroup(schoolId, moduleKey, name);
    if (result.success && result.group) {
      setGroups((prev) => [...prev, result.group!]);
      setModalVisible(false);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  // ── Filtering ──────────────────────────────────────────────────────

  const defaultGroups = groups.filter((g) => g.isDefault);
  const createdGroups = groups.filter((g) => !g.isDefault);

  const filterGroups = (list: FieldGroupData[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((g) => g.name.toLowerCase().includes(q));
  };

  const filteredDefault = filterGroups(defaultGroups);
  const filteredCreated = filterGroups(createdGroups);
  const hasResults = filteredDefault.length > 0 || filteredCreated.length > 0;

  // ── Loading state ──────────────────────────────────────────────────

  if (loading) return <ConfigSkeleton />;

  // ── Error state ────────────────────────────────────────────────────

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.centeredText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadGroups}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{singularName} Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for field groups..."
              placeholderTextColor={colors.textMuted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Groups listing card */}
        {hasResults ? (
          <View style={styles.groupsWrapper}>
            {/* Default Group */}
            {filteredDefault.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>DEFAULT GROUP</Text>
                {filteredDefault.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onPress={() => handleGroupPress(group)}
                  />
                ))}
              </View>
            )}

            {/* Created Groups */}
            {filteredCreated.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>CREATED GROUPS</Text>
                {filteredCreated.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onPress={() => handleGroupPress(group)}
                    onDelete={() => handleDeleteGroup(group)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No groups found</Text>
          </View>
        )}

        {/* Footer info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            {`Changes made here will reflect in the 'Add New ${singularName}' and '${singularName} Profile' forms across the school management system.`}
          </Text>
        </View>
      </ScrollView>

      {/* Create Group Button */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.createGroupButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={22} color={colors.white} />
          <Text style={styles.createGroupButtonText}>Create Field Group</Text>
        </TouchableOpacity>
      </View>

      {/* Create Group Modal */}
      <CreateFieldGroupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreateGroup}
      />
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
    paddingBottom: 100,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 10,
    paddingVertical: 0,
  },

  // Groups wrapper
  groupsWrapper: {
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  // Section
  sectionContainer: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },

  // Group Card
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  groupIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCardContent: {
    flex: 1,
    marginLeft: 14,
  },
  groupCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  groupCardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
  },

  // Footer info
  footerInfo: {
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Bottom button
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.schoolNavy,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  createGroupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
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
});

export default ModuleFieldConfigScreen;