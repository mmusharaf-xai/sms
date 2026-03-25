import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import { School } from '../../../db/schema';

interface SchoolCardProps {
  school: School;
  role?: string;
  onPress?: () => void;
}

const SchoolCard: React.FC<SchoolCardProps> = ({
  school,
  role = 'member',
  onPress,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.98}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{getInitials(school.name)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {school.name}
        </Text>
        {school.description && (
          <Text style={styles.description} numberOfLines={1}>
            {school.description}
          </Text>
        )}
        <View style={styles.metaContainer}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
          <Text style={styles.code}>Code: {school.code}</Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.schoolAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.schoolAccent,
    textTransform: 'capitalize',
  },
  code: {
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default SchoolCard;
