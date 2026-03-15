import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import CreateSchoolModal from './CreateSchoolModal';
import JoinSchoolModal from './JoinSchoolModal';
import { colors } from '../../utils/colors';
import { getUserSchools, createSchool, joinSchool } from '../../services/schoolService';
import { School, UserSchool } from '../../../db/schema';
import { RootStackParamList } from '../../navigation/AppNavigator';

interface UserSchoolWithSchool extends UserSchool {
  school: School;
}

interface HomeScreenContentProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

const HomeScreenContent: React.FC<HomeScreenContentProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<UserSchoolWithSchool[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<UserSchoolWithSchool[]>([]);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderSchoolItem = ({ item }: { item: UserSchoolWithSchool }) => (
    <TouchableOpacity
      style={styles.schoolItem}
      onPress={() => console.log('Selected school:', item.school.id)}
      activeOpacity={0.7}
    >
      <View style={styles.schoolAvatar}>
        <Text style={styles.schoolInitials}>{getInitials(item.school.name)}</Text>
      </View>
      <View style={styles.schoolInfo}>
        <Text style={styles.schoolName} numberOfLines={1}>
          {item.school.name}
        </Text>
        <Text style={styles.schoolMeta} numberOfLines={1}>
          {item.role.charAt(0).toUpperCase() + item.role.slice(1)} • Since 2024
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="school-outline" size={32} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyDescription}>
        Don't see your school? Try searching for the exact name or contact your school admin for a link.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>My Schools</Text>
        <TouchableOpacity 
          style={styles.accountButton}
          onPress={() => navigation.navigate('AccountSettings')}
        >
          <Ionicons name="person-circle" size={28} color={colors.schoolNavy} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Find your school"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.primaryButtonIcon}>
            <Ionicons name="add-circle" size={20} color={colors.white} />
          </View>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.primaryButtonTitle}>Create School</Text>
            <Text style={styles.primaryButtonSubtitle}>Register as an administrator</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setJoinModalVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.secondaryButtonIcon}>
            <Ionicons name="people" size={20} color={colors.schoolNavy} />
          </View>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.secondaryButtonTitle}>Join a School</Text>
            <Text style={styles.secondaryButtonSubtitle}>Request access with a code</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Your Schools Section */}
      <View style={styles.schoolsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Schools</Text>
          {filteredSchools.length > 0 && (
            <Text style={styles.viewAllText}>View All</Text>
          )}
        </View>

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

      {/* Modals */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.schoolNavy,
  },
  accountButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 0,
    marginLeft: 8,
  },
  actionContainer: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.schoolNavy,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
  },
  buttonTextContainer: {
    flex: 1,
  },
  primaryButtonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  primaryButtonSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryButtonIcon: {
    backgroundColor: 'rgba(30, 41, 59, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  secondaryButtonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.schoolNavy,
  },
  secondaryButtonSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  schoolsSection: {
    flex: 1,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.schoolNavy,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.schoolAccent,
  },
  listContent: {
    flexGrow: 1,
  },
  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  schoolAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  schoolInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.schoolAccent,
  },
  schoolInfo: {
    flex: 1,
    marginRight: 8,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  schoolMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default HomeScreenContent;
