import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SearchBar, ActionButton, SchoolCard } from '../shared';
import CreateSchoolModal from './CreateSchoolModal';
import JoinSchoolModal from './JoinSchoolModal';
import { colors } from '../../utils/colors';
import { getUserSchools, createSchool, joinSchool } from '../../services/schoolService';
import { School, UserSchool } from '../../../db/schema';

interface UserSchoolWithSchool extends UserSchool {
  school: School;
}

const HomeScreenContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<UserSchoolWithSchool[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<UserSchoolWithSchool[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // TODO: Get actual user ID from auth context/state
  const currentUserId = 1;

  const fetchSchools = useCallback(async () => {
    const result = await getUserSchools(currentUserId);
    if (result.success && result.userSchools) {
      setSchools(result.userSchools as UserSchoolWithSchool[]);
      setFilteredSchools(result.userSchools as UserSchoolWithSchool[]);
    } else {
      Alert.alert('Error', result.error || 'Failed to fetch schools');
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSchools(schools);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = schools.filter(
        (item) =>
          item.school.name.toLowerCase().includes(query) ||
          (item.school.description &&
            item.school.description.toLowerCase().includes(query))
      );
      setFilteredSchools(filtered);
    }
  }, [searchQuery, schools]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSchools();
    setRefreshing(false);
  };

  const handleCreateSchool = async (name: string, description: string) => {
    setActionLoading(true);
    const result = await createSchool(name, description || null, currentUserId);
    setActionLoading(false);

    if (result.success) {
      await fetchSchools();
    } else {
      throw new Error(result.error || 'Failed to create school');
    }
  };

  const handleJoinSchool = async (code: string) => {
    setActionLoading(true);
    const result = await joinSchool(code, currentUserId);
    setActionLoading(false);

    if (result.success) {
      await fetchSchools();
    } else {
      throw new Error(result.error || 'Failed to join school');
    }
  };

  const renderSchoolItem = ({ item }: { item: UserSchoolWithSchool }) => (
    <SchoolCard
      school={item.school}
      role={item.role}
      onPress={() => {
        // TODO: Navigate to school detail screen
        console.log('Selected school:', item.school.id);
      }}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Schools Yet</Text>
      <Text style={styles.emptyDescription}>
        Create a new school or join an existing one using a school code.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headerTitle}>My Schools</Text>

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search schools..."
          onClear={() => setSearchQuery('')}
        />

        <View style={styles.actionButtonsContainer}>
          <ActionButton
            title="Create School"
            icon="add-circle-outline"
            onPress={() => setCreateModalVisible(true)}
            variant="primary"
          />
          <View style={styles.buttonSpacer} />
          <ActionButton
            title="Join School"
            icon="enter-outline"
            onPress={() => setJoinModalVisible(true)}
            variant="secondary"
          />
        </View>

        <Text style={styles.sectionTitle}>
          {filteredSchools.length > 0
            ? `Your Schools (${filteredSchools.length})`
            : 'Your Schools'}
        </Text>

        <FlatList
          data={filteredSchools}
          renderItem={renderSchoolItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.schoolAccent}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      </View>

      <CreateSchoolModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateSchool}
        loading={actionLoading}
      />

      <JoinSchoolModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onJoin={handleJoinSchool}
        loading={actionLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 24,
  },
  buttonSpacer: {
    width: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});

export default HomeScreenContent;
