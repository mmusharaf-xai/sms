import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FormInput, FormDropdown, FormToggle, ProfileImagePicker, PrimaryButton } from '../components/shared';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserById, updateUserProfile, changePassword, getTimezoneOptions, getLanguageOptions } from '../services/userService';
import { User } from '../../db/schema';
import ChangePasswordModal from '../components/settings/ChangePasswordModal';

type AccountSettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'AccountSettings'>;

const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  // TODO: Get actual user ID from auth context/state
  const currentUserId = 1;

  const fetchUser = useCallback(async () => {
    const result = await getUserById(currentUserId);
    if (result.success && result.user) {
      setUser(result.user);
      setFullName(result.user.fullName);
      setTimezone(result.user.timezone || 'UTC');
      setLanguage(result.user.language || 'en');
      setNotifications(result.user.notifications !== false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleImagePress = () => {
    // TODO: Implement actual image picker with expo-image-picker
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => console.log('Take photo') },
        { text: 'Choose from Library', onPress: () => console.log('Choose from library') },
        ...(user?.avatar ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: handleRemovePhoto }] : []),
      ]
    );
  };

  const handleRemovePhoto = async () => {
    if (user) {
      await updateUserProfile(currentUserId, { avatar: null });
      setUser({ ...user, avatar: null });
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    const result = await updateUserProfile(currentUserId, {
      fullName,
      timezone,
      language,
      notifications,
    });
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Profile updated successfully');
      fetchUser();
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            // TODO: Clear auth state and navigate to Login
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const handlePasswordChange = async (current: string, newPass: string) => {
    const result = await changePassword(currentUserId, current, newPass);
    if (!result.success) {
      throw new Error(result.error || 'Failed to change password');
    }
  };

  const getMemberSince = () => {
    if (user?.createdAt) {
      const date = new Date(user.createdAt);
      return `Member since ${date.getFullYear()}`;
    }
    return 'Member since 2024';
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <ProfileImagePicker
              imageUri={user.avatar}
              name={user.fullName}
              onPress={handleImagePress}
              size={112}
            />
            <Text style={styles.profileName}>{user.fullName}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <Text style={styles.memberSince}>{getMemberSince()}</Text>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <FormInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
            <FormInput
              label="Email Address"
              value={user.email}
              onChangeText={() => {}}
              placeholder="Email"
              containerStyle={styles.emailInput}
            />
            <Text style={styles.emailHint}>Email cannot be changed. Contact support for help.</Text>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.preferencesCard}>
              <TouchableOpacity
                style={styles.preferenceRow}
                onPress={() => setChangePasswordModalVisible(true)}
              >
                <View style={styles.preferenceLeft}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.preferenceLabel}>Change Password</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <FormToggle
                label="Notifications"
                value={notifications}
                onChange={setNotifications}
                icon={<Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />}
              />

              <FormDropdown
                label="Language"
                value={language}
                options={getLanguageOptions()}
                onChange={setLanguage}
              />

              <FormDropdown
                label="Timezone"
                value={timezone}
                options={getTimezoneOptions()}
                onChange={setTimezone}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <PrimaryButton
              title="Save Changes"
              onPress={handleSaveChanges}
              loading={loading}
            />
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>© 2024 School Management System. All rights reserved.</Text>
        </ScrollView>

        <ChangePasswordModal
          visible={changePasswordModalVisible}
          onClose={() => setChangePasswordModalVisible(false)}
          onChangePassword={handlePasswordChange}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
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
  backButton: {
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
    marginRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 12,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  memberSince: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emailInput: {
    marginTop: 16,
  },
  emailHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginLeft: 8,
  },
  preferencesCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  actionsSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 32,
    paddingHorizontal: 16,
  },
});

export default AccountSettingsScreen;
