import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { FormInput, FormDropdown, FormToggle } from '../components/shared';
import {
  createField,
  updateField,
  fetchFieldById,
  FieldConfigData,
} from '../services/fieldGroupService';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomField'>;

// ── Field type options ─────────────────────────────────────────────────

const FIELD_TYPE_OPTIONS = [
  { label: 'Text', value: 'Text' },
  { label: 'Number', value: 'Number' },
  { label: 'Date', value: 'Date' },
  { label: 'Select', value: 'Select' },
];

const DATE_FORMAT_OPTIONS = [
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
];

// ── Select option type ─────────────────────────────────────────────────

interface SelectOption {
  label: string;
  value: string;
}

// ── Main Screen ────────────────────────────────────────────────────────

const AddCustomFieldScreen: React.FC<Props> = ({ route, navigation }) => {
  const { schoolId, moduleKey, groupId, groupName, fieldId } = route.params;

  const isEditing = !!fieldId;

  // Core field state
  const [fieldName, setFieldName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldType, setFieldType] = useState('Text');
  const [isRequired, setIsRequired] = useState(false);

  // Number constraints
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [regex, setRegex] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Date constraints
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');

  // Select constraints
  const [selectionMode, setSelectionMode] = useState<'single' | 'multi'>('single');
  const [selectOptions, setSelectOptions] = useState<SelectOption[]>([
    { label: 'Option 1', value: 'opt_1' },
    { label: 'Option 2', value: 'opt_2' },
  ]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load existing field for editing ────────────────────────────────

  const loadField = useCallback(async () => {
    if (!fieldId) return;

    setLoading(true);
    const result = await fetchFieldById(fieldId);

    if (result.success && result.field) {
      const f = result.field;
      setFieldName(f.name);
      setDescription(f.description || '');
      setFieldType(f.fieldType);
      setIsRequired(f.isRequired);

      // Load type-specific config
      const cfg = f.config || {};
      if (f.fieldType === 'Number') {
        setMinValue(cfg.minValue?.toString() ?? '');
        setMaxValue(cfg.maxValue?.toString() ?? '');
        setRegex(cfg.regex ?? '');
        setErrorMessage(cfg.errorMessage ?? '');
      } else if (f.fieldType === 'Date') {
        setDateFormat(cfg.dateFormat ?? 'DD/MM/YYYY');
      } else if (f.fieldType === 'Select') {
        setSelectionMode(cfg.selectionMode ?? 'single');
        if (Array.isArray(cfg.options) && cfg.options.length > 0) {
          setSelectOptions(cfg.options);
        }
      }
    }

    setLoading(false);
  }, [fieldId]);

  useEffect(() => {
    loadField();
  }, [loadField]);

  // ── Build config from state ────────────────────────────────────────

  const buildConfig = (): Record<string, any> => {
    switch (fieldType) {
      case 'Number':
        return {
          minValue: minValue ? Number(minValue) : undefined,
          maxValue: maxValue ? Number(maxValue) : undefined,
          regex: regex || undefined,
          errorMessage: errorMessage || undefined,
        };
      case 'Date':
        return {
          dateFormat,
        };
      case 'Select':
        return {
          selectionMode,
          options: selectOptions.filter((o) => o.label.trim()),
        };
      default:
        return {};
    }
  };

  // ── Save handler ───────────────────────────────────────────────────

  const handleSave = async () => {
    // Validate
    const newErrors: Record<string, string> = {};
    if (!fieldName.trim()) {
      newErrors.fieldName = 'Field name is required';
    }
    if (fieldType === 'Select') {
      const validOptions = selectOptions.filter((o) => o.label.trim());
      if (validOptions.length < 1) {
        newErrors.options = 'At least one option is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    const config = buildConfig();

    let result;
    if (isEditing && fieldId) {
      result = await updateField(fieldId, {
        name: fieldName.trim(),
        fieldType,
        description,
        config,
        isRequired,
      });
    } else {
      result = await createField(schoolId, moduleKey, groupId, {
        name: fieldName.trim(),
        fieldType,
        description,
        config,
        isRequired,
      });
    }

    setSaving(false);

    if (result.success) {
      navigation.goBack();
    } else {
      if (result.error?.includes('already exists')) {
        setErrors({ fieldName: result.error });
      } else {
        Alert.alert('Error', result.error || 'Failed to save field');
      }
    }
  };

  // ── Select option handlers ─────────────────────────────────────────

  const handleAddOption = () => {
    const nextIndex = selectOptions.length + 1;
    setSelectOptions((prev) => [
      ...prev,
      { label: `Option ${nextIndex}`, value: `opt_${nextIndex}` },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setSelectOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionLabelChange = (index: number, label: string) => {
    setSelectOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, label } : opt))
    );
  };

  const handleOptionValueChange = (index: number, value: string) => {
    setSelectOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, value } : opt))
    );
  };

  // ── Navigation ─────────────────────────────────────────────────────

  const handleBack = () => navigation.goBack();

  const handleCancel = () => navigation.goBack();

  // ── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.schoolNavy} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Custom Field' : 'Add Custom Field'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── FIELD CONFIGURATION ──────────────────────────────────── */}
          <Text style={styles.sectionLabel}>FIELD CONFIGURATION</Text>
          <View style={styles.sectionCard}>
            <FormInput
              label="Field Name"
              value={fieldName}
              onChangeText={(v) => {
                setFieldName(v);
                if (errors.fieldName) setErrors((p) => ({ ...p, fieldName: '' }));
              }}
              placeholder="e.g. Quantity"
              error={errors.fieldName}
              autoCapitalize="words"
              containerStyle={styles.fieldGap}
            />

            <View style={styles.fieldGap}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Briefly describe what this field is for..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <FormDropdown
              label="Field Type"
              value={fieldType}
              options={FIELD_TYPE_OPTIONS}
              onChange={setFieldType}
              containerStyle={styles.fieldGap}
            />

            {/* Date-specific: Date Format */}
            {fieldType === 'Date' && (
              <FormDropdown
                label="Date Format"
                value={dateFormat}
                options={DATE_FORMAT_OPTIONS}
                onChange={setDateFormat}
                containerStyle={styles.fieldGap}
              />
            )}
          </View>

          {/* ── CONSTRAINTS ─────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>CONSTRAINTS</Text>

          {/* Number Constraints */}
          {fieldType === 'Number' && (
            <View style={styles.sectionCard}>
              <FormInput
                label="Minimum Value"
                value={minValue}
                onChangeText={setMinValue}
                placeholder="0"
                keyboardType="numeric"
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Maximum Value"
                value={maxValue}
                onChangeText={setMaxValue}
                placeholder="999"
                keyboardType="numeric"
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Regex Validation"
                value={regex}
                onChangeText={setRegex}
                placeholder="^[0-9]*$"
                autoCapitalize="none"
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Error Message"
                value={errorMessage}
                onChangeText={setErrorMessage}
                placeholder="Please enter a valid number"
                containerStyle={styles.fieldGap}
              />
            </View>
          )}

          {/* Date Constraints */}
          {fieldType === 'Date' && (
            <View style={styles.sectionCard}>
              <View style={styles.dateConstraintRow}>
                <View style={styles.dateConstraintIcon}>
                  <Ionicons name="calendar-outline" size={22} color={colors.schoolBlue} />
                </View>
                <View style={styles.dateConstraintContent}>
                  <Text style={styles.dateConstraintTitle}>Min Date</Text>
                  <Text style={styles.dateConstraintSubtitle}>Earliest selectable date</Text>
                </View>
                <TouchableOpacity style={styles.selectButton}>
                  <Text style={styles.selectButtonText}>Select</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateConstraintRow}>
                <View style={styles.dateConstraintIcon}>
                  <Ionicons name="calendar-outline" size={22} color={colors.schoolBlue} />
                </View>
                <View style={styles.dateConstraintContent}>
                  <Text style={styles.dateConstraintTitle}>Max Date</Text>
                  <Text style={styles.dateConstraintSubtitle}>Latest selectable date</Text>
                </View>
                <TouchableOpacity style={styles.selectButton}>
                  <Text style={styles.selectButtonText}>Select</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Select Constraints */}
          {fieldType === 'Select' && (
            <View style={styles.sectionCard}>
              {/* Selection Mode */}
              <Text style={styles.inputLabel}>Selection Mode</Text>
              <View style={styles.selectionModeRow}>
                <TouchableOpacity
                  style={[
                    styles.selectionModeButton,
                    selectionMode === 'single' && styles.selectionModeButtonActive,
                  ]}
                  onPress={() => setSelectionMode('single')}
                >
                  <Text
                    style={[
                      styles.selectionModeText,
                      selectionMode === 'single' && styles.selectionModeTextActive,
                    ]}
                  >
                    Single Select
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.selectionModeButton,
                    selectionMode === 'multi' && styles.selectionModeButtonActive,
                  ]}
                  onPress={() => setSelectionMode('multi')}
                >
                  <Text
                    style={[
                      styles.selectionModeText,
                      selectionMode === 'multi' && styles.selectionModeTextActive,
                    ]}
                  >
                    Multi-Select
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsHeader}>
                <Text style={styles.inputLabel}>Options List</Text>
                <TouchableOpacity onPress={handleAddOption} style={styles.addOptionButton}>
                  <Ionicons name="add" size={16} color={colors.schoolAccent} />
                  <Text style={styles.addOptionText}>Add Option</Text>
                </TouchableOpacity>
              </View>

              {errors.options && (
                <Text style={styles.errorText}>{errors.options}</Text>
              )}

              {selectOptions.map((option, index) => (
                <View key={index} style={styles.optionRow}>
                  <Ionicons name="reorder-three" size={22} color={colors.textMuted} />
                  <TextInput
                    style={styles.optionInput}
                    value={option.label}
                    onChangeText={(v) => handleOptionLabelChange(index, v)}
                    placeholder="Label"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={styles.optionInput}
                    value={option.value}
                    onChangeText={(v) => handleOptionValueChange(index, v)}
                    placeholder="Value"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => handleRemoveOption(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Text Constraints (empty — placeholder for future) */}
          {fieldType === 'Text' && (
            <View style={styles.sectionCard}>
              <Text style={styles.placeholderText}>
                No additional constraints for text fields.
              </Text>
            </View>
          )}

          {/* ── ADVANCED SETTINGS ───────────────────────────────────── */}
          <Text style={styles.sectionLabel}>ADVANCED SETTINGS</Text>
          <View style={styles.sectionCard}>
            <View style={styles.requiredRow}>
              <View style={styles.requiredContent}>
                <Text style={styles.requiredTitle}>Mark as Required</Text>
                <Text style={styles.requiredSubtitle}>
                  Users must fill this field to save
                </Text>
              </View>
              <FormToggle
                label=""
                value={isRequired}
                onChange={setIsRequired}
                containerStyle={styles.toggleContainer}
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Save' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginHorizontal: 8,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },

  // Section
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.schoolAccent,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 20,
  },

  fieldGap: {
    marginBottom: 12,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginLeft: 4,
  },
  textArea: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Date constraints
  dateConstraintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  dateConstraintIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateConstraintContent: {
    flex: 1,
    marginLeft: 14,
  },
  dateConstraintTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dateConstraintSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Select constraints
  selectionModeRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 0,
  },
  selectionModeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  selectionModeButtonActive: {
    backgroundColor: colors.background,
    borderColor: colors.textSecondary,
  },
  selectionModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  selectionModeTextActive: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.schoolAccent,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  optionInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    fontSize: 14,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: 8,
    marginLeft: 4,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Advanced settings
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requiredContent: {
    flex: 1,
  },
  requiredTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  requiredSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleContainer: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  // Bottom Buttons
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.schoolNavy,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

export default AddCustomFieldScreen;