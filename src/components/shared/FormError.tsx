import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';

interface FormErrorProps {
  message?: string;
}

const FormError: React.FC<FormErrorProps> = ({ message }) => {
  if (!message) return null;

  return <Text style={styles.error}>{message}</Text>;
};

const styles = StyleSheet.create({
  error: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});

export default FormError;
