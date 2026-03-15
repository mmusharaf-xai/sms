import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';

interface FormLinkProps {
  text: string;
  linkText: string;
  onPress: () => void;
}

const FormLink: React.FC<FormLinkProps> = ({ text, linkText, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Text style={styles.text}>
        {text}{' '}
        <Text style={styles.link}>{linkText}</Text>
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  link: {
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});

export default FormLink;
