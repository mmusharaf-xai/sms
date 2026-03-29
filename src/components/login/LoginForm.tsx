import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { FormInput, PrimaryButton, FormError } from '../shared';
import { colors } from '../../utils/colors';
import { validateLoginForm } from '../../utils/validation';
import { loginUser } from '../../services/authService';
import { User } from '../../../db/schema';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
  onNavigateToSignup: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onNavigateToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [generalError, setGeneralError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});
    setGeneralError(undefined);

    // Validate form
    const formErrors = validateLoginForm(email, password);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);

    try {
      const result = await loginUser(email, password);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
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
        label="Email Address"
        placeholder="john@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
      />

      <View style={styles.passwordContainer}>
        <FormInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          error={errors.password}
          rightElement={
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot?</Text>
            </TouchableOpacity>
          }
        />
      </View>

      <View style={styles.submitContainer}>
        <PrimaryButton
          title="Login"
          onPress={handleLogin}
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
  passwordContainer: {
    marginTop: 20,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.schoolAccent,
  },
  submitContainer: {
    paddingTop: 16,
  },
});

export default LoginForm;
