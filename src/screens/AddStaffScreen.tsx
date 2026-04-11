import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import FormBuilder from '../components/shared/FormBuilder';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../../db/connection';
import { users, userSchools, NewUser } from '../../db/schema';
import { eq } from 'drizzle-orm';

type Props = NativeStackScreenProps<RootStackParamList, 'AddStaff'>;

const AddStaffScreen: React.FC<Props> = ({ route, navigation }) => {
  const { schoolId, schoolName } = route.params;
  const { currentUserId } = useAuth();

  const handleSave = async (formData: Record<string, string>) => {
    try {
      const db = getDb();

      // Extract key fields from formData
      const fullName = formData['Name'] || formData['name'] || 'New Staff';
      const email = formData['Email Address'] || formData['email'] || formData['Email'] || '';

      if (!email) {
        return { success: false, error: 'Email Address is required' };
      }

      // Check if email already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        return { success: false, error: 'A user with this email already exists' };
      }

      // Create a new user with a temporary password
      // In real app, this would send an invite or set a proper password
      const tempPassword = 'TempPass123!';

      const newUser: NewUser = {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password: tempPassword,
      };

      const userResult = await db.insert(users).values(newUser).returning();

      if (userResult.length === 0) {
        return { success: false, error: 'Failed to create user' };
      }

      const newUserId = userResult[0].id;

      // Link to school with role 'staff'
      await db.insert(userSchools).values({
        userId: newUserId,
        schoolId: schoolId,
        role: 'staff',
      } as any);

      // TODO: Persist remaining formData (DOB, Phone Number, etc.) to a staff_data table
      // For now, we just return success

      return { success: true };
    } catch (e: any) {
      console.error('Add staff error:', e);
      return { success: false, error: e?.message || 'Failed to save staff' };
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSaveSuccess = () => {
    navigation.goBack();
  };

  const wrappedOnSave = async (formData: Record<string, string>) => {
    const result = await handleSave(formData);
    if (result.success) {
      handleSaveSuccess();
    }
    return result;
  };

  return (
    <FormBuilder
      schoolId={schoolId}
      moduleKey="staffs"
      title="Add Staff"
      onSave={wrappedOnSave}
      onCancel={handleCancel}
      saveButtonText="Save"
    />
  );
};

export default AddStaffScreen;
