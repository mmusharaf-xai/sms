import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppLogo } from '../shared';
import { colors } from '../../utils/colors';
import { SCREEN_TITLES } from '../../utils/constants';

const LoginScreenHeader: React.FC = () => {
  return (
    <View style={styles.container}>
      <AppLogo size={64} />
      <Text style={styles.title}>{SCREEN_TITLES.login}</Text>
      <Text style={styles.subtitle}>{SCREEN_TITLES.loginSubtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LoginScreenHeader;
