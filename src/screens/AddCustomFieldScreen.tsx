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
  { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
];

const TIME_FORMAT_OPTIONS = [
  { label: '12 Hour (hh:mm AM/PM)', value: '12h' },
  { label: '24 Hour (HH:mm)', value: '24h' },
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

  // Text constraints
  const [minChars, setMinChars] = useState('');
  const [maxChars, setMaxChars] = useState('');
  const [textRegex, setTextRegex] = useState('');
  const [textErrorMessage, setTextErrorMessage] = useState('');

  // Number constraints
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [numberRegex, setNumberRegex] = useState('');
  const [numberErrorMessage, setNumberErrorMessage] = useState('');
  const [restrictDecimals, setRestrictDecimals] = useState(false);

  // Date settings
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [showTime, setShowTime] = useState(false);
  const [timeFormat, setTimeFormat] = useState('12h');

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
      if (f.fieldType === 'Text') {
        setMinChars(cfg.minChars?.toString() ?? '');
        setMaxChars(cfg.maxChars?.toString() ?? '');
        setTextRegex(cfg.regex ?? '');
        setTextErrorMessage(cfg.errorMessage ?? '');
      } else if (f.fieldType === 'Number') {
        setMinValue(cfg.minValue?.toString() ?? '');
        setMaxValue(cfg.maxValue?.toString() ?? '');
        setNumberRegex(cfg.regex ?? '');
        setNumberErrorMessage(cfg.errorMessage ?? '');
        setRestrictDecimals(!!cfg.restrictDecimals);
      } else if (f.fieldType === 'Date') {
        setDateFormat(cfg.dateFormat ?? 'DD/MM/YYYY');
        setShowTime(!!cfg.showTime);
        setTimeFormat(cfg.timeFormat ?? '12h');
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
      case 'Text':
        return {
          minChars: minChars ? Number(minChars) : undefined,
          maxChars: maxChars ? Number(maxChars) : undefined,
          regex: textRegex || undefined,
          errorMessage: textErrorMessage || undefined,
        };
      case 'Number':
        return {
          minValue: minValue ? Number(minValue) : undefined,
          maxValue: maxValue ? Number(maxValue) : undefined,
          regex: numberRegex || undefined,
          errorMessage: numberErrorMessage || undefined,
          restrictDecimals,
        };
      case 'Date':
        return {
          dateFormat,
          showTime,
          timeFormat: showTime ? timeFormat : undefined,
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

  // ── Validation helpers ─────────────────────────────────────────────

  const isValidRegex = (pattern: string): boolean => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  };

  const isValidNonNegativeInt = (value: string): boolean => {
    if (!value.trim()) return true;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0;
  };

  const isValidNumeric = (value: string): boolean => {
    if (!value.trim()) return true;
    return !isNaN(Number(value));
  };

  // ── Save handler ───────────────────────────────────────────────────

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!fieldName.trim()) {
      newErrors.fieldName = 'Field name is required';
    }

    // Text-specific validation
    if (fieldType === 'Text') {
      if (minChars && !isValidNonNegativeInt(minChars)) {
        newErrors.minChars = 'Must be a non-negative whole number';
      }
      if (maxChars && !isValidNonNegativeInt(maxChars)) {
        newErrors.maxChars = 'Must be a non-negative whole number';
      }
      if (
        minChars && maxChars &&
        isValidNonNegativeInt(minChars) && isValidNonNegativeInt(maxChars) &&
        Number(minChars) > Number(maxChars)
      ) {
        newErrors.minChars = 'Min cannot be greater than Max';
      }
      if (textRegex && !isValidRegex(textRegex)) {
        newErrors.textRegex = 'Invalid regex pattern';
      }
    }

    // Number-specific validation
    if (fieldType === 'Number') {
      if (minValue && !isValidNumeric(minValue)) {
        newErrors.minValue = 'Must be a valid number';
      }
      if (maxValue && !isValidNumeric(maxValue)) {
        newErrors.maxValue = 'Must be a valid number';
      }
      if (
        minValue && maxValue &&
        isValidNumeric(minValue) && isValidNumeric(maxValue) &&
        Number(minValue) > Number(maxValue)
      ) {
        newErrors.minValue = 'Min cannot be greater than Max';
      }
      if (numberRegex && !isValidRegex(numberRegex)) {
        newErrors.numberRegex = 'Invalid regex pattern';
      }
    }

    // Select-specific validation
    if (fieldType === 'Select') {
      const validOptions = selectOptions.filter((o) => o.label.trim());
      if (validOptions.length < 1) {
        newErrors.options = 'At least one option is required';
      } else {
        // Empty labels or values
        if (selectOptions.some((o) => !o.label.trim())) {
          newErrors.options = 'All options must have a label';
        } else if (selectOptions.some((o) => !o.value.trim())) {
          newErrors.options = 'All options must have a value';
        }
        // Duplicate labels (case-insensitive)
        if (!newErrors.options) {
          const labels = selectOptions.map((o) => o.label.trim().toLowerCase());
          if (new Set(labels).size !== labels.length) {
            newErrors.options = 'Option labels must be unique';
          }
        }
        // Duplicate values (case-insensitive)
        if (!newErrors.options) {
          const values = selectOptions.map((o) => o.value.trim().toLowerCase());
          if (new Set(values).size !== values.length) {
            newErrors.options = 'Option values must be unique';
          }
        }
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

  const clearOptionErrors = () => {
    if (errors.options) setErrors((p) => ({ ...p, options: '' }));
  };

  const handleAddOption = () => {
    const nextIndex = selectOptions.length + 1;
    setSelectOptions((prev) => [
      ...prev,
      { label: `Option ${nextIndex}`, value: `opt_${nextIndex}` },
    ]);
    clearOptionErrors();
  };

  const handleRemoveOption = (index: number) => {
    setSelectOptions((prev) => prev.filter((_, i) => i !== index));
    clearOptionErrors();
  };

  const handleOptionLabelChange = (index: number, label: string) => {
    setSelectOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, label } : opt))
    );
    clearOptionErrors();
  };

  const handleOptionValueChange = (index: number, value: string) => {
    setSelectOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, value } : opt))
    );
    clearOptionErrors();
  };

  // ── Option error helpers (only active after save attempt) ─────────

  const isOptionLabelInvalid = (index: number): boolean => {
    if (!errors.options) return false;
    const opt = selectOptions[index];
    if (!opt.label.trim()) return true;
    return selectOptions.some(
      (o, i) => i !== index && o.label.trim().toLowerCase() === opt.label.trim().toLowerCase()
    );
  };

  const isOptionValueInvalid = (index: number): boolean => {
    if (!errors.options) return false;
    const opt = selectOptions[index];
    if (!opt.value.trim()) return true;
    return selectOptions.some(
      (o, i) => i !== index && o.value.trim().toLowerCase() === opt.value.trim().toLowerCase()
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

            {isEditing ? (
              <View style={styles.fieldGap}>
                <Text style={styles.inputLabel}>Field Type</Text>
                <View style={styles.lockedDropdown}>
                  <Text style={styles.lockedDropdownText}>{fieldType}</Text>
                  <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                </View>
                <Text style={styles.lockedHint}>
                  Field type cannot be changed after creation
                </Text>
              </View>
            ) : (
              <FormDropdown
                label="Field Type"
                value={fieldType}
                options={FIELD_TYPE_OPTIONS}
                onChange={setFieldType}
                containerStyle={styles.fieldGap}
              />
            )}

            {/* Date-specific settings */}
            {fieldType === 'Date' && (
              <>
                <FormDropdown
                  label="Date Format"
                  value={dateFormat}
                  options={DATE_FORMAT_OPTIONS}
                  onChange={setDateFormat}
                  containerStyle={styles.fieldGap}
                />
                <View style={[styles.fieldGap, styles.showTimeRow]}>
                  <View style={styles.toggleRowContent}>
                    <Text style={styles.toggleRowTitle}>Show Time</Text>
                    <Text style={styles.toggleRowSubtitle}>
                      Include time selection with date
                    </Text>
                  </View>
                  <FormToggle
                    label=""
                    value={showTime}
                    onChange={setShowTime}
                    containerStyle={styles.toggleContainer}
                  />
                </View>
                {showTime && (
                  <FormDropdown
                    label="Time Format"
                    value={timeFormat}
                    options={TIME_FORMAT_OPTIONS}
                    onChange={setTimeFormat}
                    containerStyle={styles.fieldGap}
                  />
                )}
              </>
            )}
          </View>

          {/* ── CONSTRAINTS (hidden for Date) ─────────────────────── */}
          {fieldType !== 'Date' && (
            <Text style={styles.sectionLabel}>CONSTRAINTS</Text>
          )}

          {/* Number Constraints */}
          {fieldType === 'Number' && (
            <View style={styles.sectionCard}>
              <FormInput
                label="Minimum Value"
                value={minValue}
                onChangeText={(v) => {
                  setMinValue(v);
                  if (errors.minValue) setErrors((p) => ({ ...p, minValue: '' }));
                }}
                placeholder="0"
                keyboardType="numeric"
                error={errors.minValue}
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Maximum Value"
                value={maxValue}
                onChangeText={(v) => {
                  setMaxValue(v);
                  if (errors.maxValue) setErrors((p) => ({ ...p, maxValue: '' }));
                }}
                placeholder="999"
                keyboardType="numeric"
                error={errors.maxValue}
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Regex Validation"
                value={numberRegex}
                onChangeText={(v) => {
                  setNumberRegex(v);
                  if (v && !isValidRegex(v)) {
                    setErrors((p) => ({ ...p, numberRegex: 'Invalid regex pattern' }));
                  } else if (errors.numberRegex) {
                    setErrors((p) => ({ ...p, numberRegex: '' }));
                  }
                }}
                placeholder="^[0-9]*$"
                autoCapitalize="none"
                error={errors.numberRegex}
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Error Message"
                value={numberErrorMessage}
                onChangeText={setNumberErrorMessage}
                placeholder="Please enter a valid number"
              />
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
                    style={[
                      styles.optionInput,
                      isOptionLabelInvalid(index) && styles.optionInputError,
                    ]}
                    value={option.label}
                    onChangeText={(v) => handleOptionLabelChange(index, v)}
                    placeholder="Label"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[
                      styles.optionInput,
                      isOptionValueInvalid(index) && styles.optionInputError,
                    ]}
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
              <FormInput
                label="Minimum Characters"
                value={minChars}
                onChangeText={(v) => {
                  setMinChars(v);
                  if (errors.minChars) setErrors((p) => ({ ...p, minChars: '' }));
                }}
                placeholder="0"
                keyboardType="numeric"
                error={errors.minChars}
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Maximum Characters"
                value={maxChars}
                onChangeText={(v) => {
                  setMaxChars(v);
                  if (errors.maxChars) setErrors((p) => ({ ...p, maxChars: '' }));
                }}
                placeholder="255"
                keyboardType="numeric"
                error={errors.maxChars}
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Regex Validation"
                value={textRegex}
                onChangeText={(v) => {
                  setTextRegex(v);
                  if (v && !isValidRegex(v)) {
                    setErrors((p) => ({ ...p, textRegex: 'Invalid regex pattern' }));
                  } else if (errors.textRegex) {
                    setErrors((p) => ({ ...p, textRegex: '' }));
                  }
                }}
                placeholder="^[a-zA-Z ]*$"
                autoCapitalize="none"
                error={errors.textRegex}
                containerStyle={styles.fieldGap}
              />
              <FormInput
                label="Error Message"
                value={textErrorMessage}
                onChangeText={setTextErrorMessage}
                placeholder="Please enter valid text"
              />
            </View>
          )}

          {/* ── ADVANCED SETTINGS ───────────────────────────────────── */}
          <Text style={styles.sectionLabel}>ADVANCED SETTINGS</Text>
          <View style={styles.sectionCard}>
            {fieldType === 'Number' && (
              <View style={[styles.toggleRow, styles.toggleRowBorder]}>
                <View style={styles.toggleRowContent}>
                  <Text style={styles.toggleRowTitle}>Restrict Decimals</Text>
                  <Text style={styles.toggleRowSubtitle}>
                    Only allow whole numbers
                  </Text>
                </View>
                <FormToggle
                  label=""
                  value={restrictDecimals}
                  onChange={setRestrictDecimals}
                  containerStyle={styles.toggleContainer}
                />
              </View>
            )}
            <View style={styles.toggleRow}>
              <View style={styles.toggleRowContent}>
                <Text style={styles.toggleRowTitle}>Mark as Required</Text>
                <Text style={styles.toggleRowSubtitle}>
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
              <Text style={styles.saveButtonText}>Save</Text>
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

  // Show Time row inside Field Config card
  showTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
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
  optionInputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: 8,
    marginLeft: 4,
  },
  // Locked field type (edit mode)
  lockedDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  lockedDropdownText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  lockedHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },

  // Advanced settings toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginBottom: 8,
    paddingBottom: 16,
  },
  toggleRowContent: {
    flex: 1,
  },
  toggleRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toggleRowSubtitle: {
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