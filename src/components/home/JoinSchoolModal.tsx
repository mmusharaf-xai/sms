import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormInput, PrimaryButton, FormError } from '../shared';
import { colors } from '../../utils/colors';

interface JoinSchoolModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
  loading?: boolean;
}

const JoinSchoolModal: React.FC<JoinSchoolModalProps> = ({
  visible,
  onClose,
  onJoin,
  loading = false,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [fieldError, setFieldError] = useState<string | undefined>();

  const handleClose = () => {
    setCode('');
    setError(undefined);
    setFieldError(undefined);
    onClose();
  };

  const handleJoin = async () => {
    setError(undefined);
    setFieldError(undefined);

    if (!code.trim()) {
      setFieldError('School code is required');
      return;
    }

    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 4) {
      setFieldError('Please enter a valid school code');
      return;
    }

    try {
      await onJoin(trimmedCode);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join school');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Join School</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.description}>
                Enter the school code provided by your school administrator to join.
              </Text>

              <FormInput
                label="School Code"
                placeholder="Enter 8-character code"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                error={fieldError}
              />

              <View style={styles.hintContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.hintText}>
                  The code should be 8 characters long with letters and numbers
                </Text>
              </View>

              <FormError message={error} />

              <View style={styles.buttonContainer}>
                <PrimaryButton
                  title="Join School"
                  onPress={handleJoin}
                  loading={loading}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 24,
  },
});

export default JoinSchoolModal;
