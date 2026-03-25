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

interface CreateSchoolModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
  loading?: boolean;
}

const CreateSchoolModal: React.FC<CreateSchoolModalProps> = ({
  visible,
  onClose,
  onCreate,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setName('');
    setDescription('');
    setError(undefined);
    setFieldErrors({});
    onClose();
  };

  const handleCreate = async () => {
    setError(undefined);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'School name is required';
    } else if (name.trim().length < 3) {
      errors.name = 'School name must be at least 3 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      await onCreate(name.trim(), description.trim());
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create school');
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
              <Text style={styles.title}>Create New School</Text>
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
                Create a new school to manage students, teachers, and classes.
              </Text>

              <FormInput
                label="School Name"
                placeholder="Enter school name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                error={fieldErrors.name}
              />

              <FormInput
                label="Description (Optional)"
                placeholder="Enter school description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                containerStyle={styles.descriptionInput}
                textInputStyle={styles.descriptionTextInput}
              />

              <FormError message={error} />

              <View style={styles.buttonContainer}>
                <PrimaryButton
                  title="Create School"
                  onPress={handleCreate}
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
  descriptionInput: {
    marginTop: 16,
  },
  descriptionTextInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  buttonContainer: {
    marginTop: 24,
  },
});

export default CreateSchoolModal;
