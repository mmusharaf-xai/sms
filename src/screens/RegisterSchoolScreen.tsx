import React, { useState } from 'react';
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
import { FormInput, PrimaryButton, FormError } from '../components/shared';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { registerSchool, RegisterSchoolData } from '../services/schoolService';
import { validateSchoolRegistrationForm } from '../utils/validation';
import { useAuth } from '../context/AuthContext';

type RegisterSchoolScreenProps = NativeStackScreenProps<RootStackParamList, 'RegisterSchool'>;

const RegisterSchoolScreen: React.FC<RegisterSchoolScreenProps> = ({ navigation }) => {
  const { currentUserId } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleBack = () => {
    navigation.goBack();
  };

  const validateForm = (): boolean => {
    const errors = validateSchoolRegistrationForm({
      name,
      address,
      ownerName,
      phone,
      email,
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!currentUserId) {
      setError('You must be logged in to register a school');
      return;
    }

    setError(undefined);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const schoolData: RegisterSchoolData = {
      name: name.trim(),
      address: address.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      logo: null,
    };

    const result = await registerSchool(schoolData, currentUserId);

    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Success',
        'School registered successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Home screen and refresh the list
              navigation.navigate('Home');
            },
          },
        ]
      );
    } else {
      setError(result.error || 'Failed to register school');
    }
  };

  const handleLogoUpload = () => {
    // TODO: Implement logo upload with expo-image-picker
    Alert.alert('Upload Logo', 'Logo upload functionality will be implemented soon');
  };

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
          <Text style={styles.headerTitle}>Register Your School</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Upload Section */}
          <View style={styles.logoSection}>
            <TouchableOpacity
              style={styles.logoUpload}
              onPress={handleLogoUpload}
              activeOpacity={0.7}
            >
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera" size={32} color={colors.textMuted} />
                <View style={styles.plusIcon}>
                  <Ionicons name="add-circle" size={16} color={colors.schoolAccent} />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.logoTitle}>Upload School Logo</Text>
            <Text style={styles.logoSubtitle}>PNG or JPG up to 2MB</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <FormInput
              label="School Name"
              placeholder="e.g. Greenwood Academy"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={fieldErrors.name}
            />

            <FormInput
              label="Address"
              placeholder="Street name, City, State, Zip"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textInputStyle={styles.addressInput}
              error={fieldErrors.address}
            />

            <FormInput
              label="Owner Name"
              placeholder="Full name of the administrator"
              value={ownerName}
              onChangeText={setOwnerName}
              autoCapitalize="words"
              error={fieldErrors.ownerName}
            />

            <FormInput
              label="Phone Number"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={fieldErrors.phone}
            />

            <FormInput
              label="Email Address"
              placeholder="school@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={fieldErrors.email}
            />

            <FormError message={error} />
          </View>

          {/* Submit Section */}
          <View style={styles.submitSection}>
            <PrimaryButton
              title="Submit Registration"
              onPress={handleSubmit}
              loading={loading}
            />
            <Text style={styles.termsText}>
              By clicking submit, you agree to our Terms of Service.
            </Text>
          </View>
        </ScrollView>
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
  logoSection: {
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoUpload: {
    marginBottom: 12,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  logoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  formSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 8,
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  submitSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  termsText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default RegisterSchoolScreen;
