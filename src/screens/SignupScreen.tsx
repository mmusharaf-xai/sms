import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SignupScreenHeader, SignupForm } from '../components/signup';
import { FormLink } from '../components/shared';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { User } from '../../db/schema';

type SignupScreenProps = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { setCurrentUser } = useAuth();
  const onNavigateToLogin = () => navigation.navigate('Login');
  const onSignupSuccess = async (user: User) => {
    await setCurrentUser(user);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <SignupScreenHeader />
            <SignupForm
              onSignupSuccess={onSignupSuccess}
              onNavigateToLogin={onNavigateToLogin}
            />
            <FormLink
              text="Already have an account?"
              linkText="Login"
              onPress={onNavigateToLogin}
            />
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
});

export default SignupScreen;
