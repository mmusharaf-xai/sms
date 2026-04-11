import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../utils/colors';
import { fetchFieldGroups, fetchGroupFields, FieldGroupData, FieldConfigData } from '../../services/fieldGroupService';
import FormInput from './FormInput';
import FormDropdown from './FormDropdown';

export interface FormFieldValue {
  value: string;
  error?: string;
}

export interface FormBuilderProps {
  schoolId: number;
  moduleKey: string;
  title?: string;
  onSave: (formData: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
  saveButtonText?: string;
}

interface GroupWithFields extends FieldGroupData {
  fields: FieldConfigData[];
}

// ── DateField sub-component (encapsulates its own hooks) ──────────────────

interface DateFieldProps {
  field: FieldConfigData;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const DateField: React.FC<DateFieldProps> = ({ field, value, error, onChange }) => {
  // Check config for time support
  let showTime = false;
  try {
    const cfg = field.config as any;
    showTime = !!cfg?.showTime;
  } catch {}

  // Parse existing value or use current date
  let initialDate = new Date();
  if (value) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      initialDate = parsed;
    }
  }

  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(initialDate);

  const formatDate = (d: Date) => {
    if (showTime) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return d.toISOString().slice(0, 10);
  };

  const onPick = (event: any, selectedDate?: Date) => {
    // On Android, hide picker after selection; on iOS, keep open until user taps elsewhere
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setPickerDate(selectedDate);
      onChange(formatDate(selectedDate));
    }
  };

  const displayValue = value || (showTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD');

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{field.name}</Text>
      <TouchableOpacity
        style={[styles.datePickerButton, error && styles.datePickerButtonError]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.datePickerText, !value && styles.datePickerPlaceholder]}>
          {value || displayValue}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      {error && <Text style={styles.fieldErrorText}>{error}</Text>}

      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode={showTime ? 'datetime' : 'date'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={onPick}
        />
      )}
    </View>
  );
};

// ── Main FormBuilder ──────────────────────────────────────────────────────

const FormBuilder: React.FC<FormBuilderProps> = ({
  schoolId,
  moduleKey,
  title = 'Add Record',
  onSave,
  onCancel,
  saveButtonText = 'Save',
}) => {
  const [groups, setGroups] = useState<GroupWithFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [fetchError, setFetchError] = useState<string | undefined>();

  const loadFormConfig = useCallback(async () => {
    setLoading(true);
    setFetchError(undefined);

    const groupsResult = await fetchFieldGroups(schoolId, moduleKey);
    if (!groupsResult.success || !groupsResult.groups) {
      setFetchError(groupsResult.error || 'Failed to load form configuration');
      setLoading(false);
      return;
    }

    const groupsWithFields: GroupWithFields[] = [];
    for (const group of groupsResult.groups) {
      const fieldsResult = await fetchGroupFields(group.id);
      groupsWithFields.push({
        ...group,
        fields: fieldsResult.success && fieldsResult.fields ? fieldsResult.fields : [],
      });
    }

    // Sort groups and fields by displayOrder
    groupsWithFields.sort((a, b) => a.displayOrder - b.displayOrder);
    groupsWithFields.forEach((g) => {
      g.fields.sort((a, b) => a.displayOrder - b.displayOrder);
    });

    setGroups(groupsWithFields);
    setLoading(false);
  }, [schoolId, moduleKey]);

  useEffect(() => {
    loadFormConfig();
  }, [loadFormConfig]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
    if (formErrors[fieldName]) {
      setFormErrors((prev) => {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    groups.forEach((group) => {
      group.fields.forEach((field) => {
        const value = formValues[field.name] || '';
        if (field.isRequired && !value.trim()) {
          errors[field.name] = `${field.name} is required`;
        } else if (field.fieldType === 'Number' && value && isNaN(Number(value))) {
          errors[field.name] = `${field.name} must be a number`;
        }
      });
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    setSaving(true);
    const result = await onSave(formValues);
    setSaving(false);

    if (!result.success) {
      Alert.alert('Save Failed', result.error || 'Could not save. Please try again.');
    }
  };

  const renderField = (field: FieldConfigData) => {
    const value = formValues[field.name] || '';
    const error = formErrors[field.name];

    if (field.fieldType === 'Select') {
      let options: { label: string; value: string }[] = [];
      try {
        const cfg = field.config as any;
        if (cfg?.options && Array.isArray(cfg.options)) {
          options = cfg.options.map((opt: any) => ({
            label: String(opt.label ?? opt),
            value: String(opt.value ?? opt),
          }));
        }
      } catch {}
      return (
        <FormDropdown
          key={field.id}
          label={field.name}
          value={value}
          options={options}
          onChange={(v) => handleFieldChange(field.name, v)}
          placeholder={field.description || 'Select...'}
          error={error}
          containerStyle={styles.fieldContainer}
        />
      );
    }

    if (field.fieldType === 'Number') {
      return (
        <FormInput
          key={field.id}
          label={field.name}
          value={value}
          onChangeText={(v) => handleFieldChange(field.name, v)}
          placeholder={field.description || ''}
          keyboardType="numeric"
          error={error}
          containerStyle={styles.fieldContainer}
        />
      );
    }

    if (field.fieldType === 'Date') {
      // Delegate to DateField component to avoid conditional hooks
      return (
        <DateField
          key={field.id}
          field={field}
          value={value}
          error={error}
          onChange={(v) => handleFieldChange(field.name, v)}
        />
      );
    }

    // Text and others
    return (
      <FormInput
        key={field.id}
        label={field.name}
        value={value}
        onChangeText={(v) => handleFieldChange(field.name, v)}
        placeholder={field.description || ''}
        error={error}
        containerStyle={styles.fieldContainer}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.schoolNavy} />
          <Text style={styles.loadingText}>Loading form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFormConfig}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header with Save button */}
        <View style={styles.header}>
          {onCancel && (
            <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>{saveButtonText}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No fields configured for this module.</Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Ionicons name={(group.icon as any) || 'folder-open'} size={20} color={colors.schoolNavy} />
                  <Text style={styles.groupTitle}>{group.name}</Text>
                </View>
                {group.fields.length === 0 ? (
                  <Text style={styles.noFieldsText}>No fields in this group.</Text>
                ) : (
                  group.fields.map(renderField)
                )}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginHorizontal: 8 },
  saveButton: {
    backgroundColor: colors.schoolNavy,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  groupTitle: { marginLeft: 8, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  fieldContainer: { marginBottom: 12 },
  noFieldsText: { color: colors.textMuted, fontStyle: 'italic', fontSize: 13 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  retryButton: { backgroundColor: colors.schoolAccent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: colors.white, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginLeft: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerButtonError: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  datePickerText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  datePickerPlaceholder: {
    color: colors.textMuted,
  },
  fieldErrorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default FormBuilder;
