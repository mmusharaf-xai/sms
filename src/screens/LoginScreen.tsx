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
import { LoginScreenHeader, LoginForm } from '../components/login';
import { FormLink } from '../components/shared';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const onNavigateToSignup = () => navigation.navigate('Signup');
  const onLoginSuccess = () => navigation.replace('Home');
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
            <LoginScreenHeader />
            <LoginForm
              onLoginSuccess={onLoginSuccess}
              onNavigateToSignup={onNavigateToSignup}
            />
            <FormLink
              text="Don't have an account?"
              linkText="Sign Up"
              onPress={onNavigateToSignup}
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

export default LoginScreen;
