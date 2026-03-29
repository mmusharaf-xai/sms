import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FormInput, PrimaryButton, FormError } from '../shared';
import { validateSignupForm } from '../../utils/validation';
import { signupUser } from '../../services/authService';
import { User } from '../../../db/schema';

interface SignupFormProps {
  onSignupSuccess: (user: User) => void;
  onNavigateToLogin: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess, onNavigateToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [generalError, setGeneralError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // Clear previous errors
    setErrors({});
    setGeneralError(undefined);

    // Validate form
    const formErrors = validateSignupForm(fullName, email, password);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);

    try {
      const result = await signupUser(fullName, email, password);

      if (result.success && result.user) {
        onSignupSuccess(result.user);
      } else if (result.fieldErrors) {
        setErrors(result.fieldErrors);
      } else {
        setGeneralError(result.error);
      }
    } catch (error) {
      setGeneralError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FormInput
        label="Full Name"
        placeholder="John Doe"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        error={errors.fullName}
      />

      <FormInput
        label="Email Address"
        placeholder="john@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        containerStyle={styles.inputSpacing}
      />

      <FormInput
        label="Password"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password-new"
        error={errors.password}
        containerStyle={styles.inputSpacing}
      />

      <View style={styles.submitContainer}>
        <PrimaryButton
          title="Sign Up"
          onPress={handleSignup}
          loading={loading}
        />
      </View>

      <FormError message={generalError} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputSpacing: {
    marginTop: 16,
  },
  submitContainer: {
    paddingTop: 16,
  },
});

export default SignupForm;
