import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen, SignupScreen, HomeScreen, AccountSettingsScreen, RegisterSchoolScreen, QuickAccessScreen, SchoolSettingsScreen, OrganizationConfigScreen } from '../screens';
import { initDb } from '../../db/connection';
import { AuthProvider, useAuth } from '../context/AuthContext';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  AccountSettings: undefined;
  RegisterSchool: undefined;
  QuickAccess: { schoolId: number; schoolName: string };
  SchoolSettings: { schoolId: number; schoolName: string };
  OrganizationConfig: { schoolId: number; schoolName: string };
  CreateNewRole: { schoolId: number; schoolName: string };
  RoleConfig: { schoolId: number; schoolName: string; roleId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigatorContent: React.FC = () => {
  const [dbInitialized, setDbInitialized] = useState(false);
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDb();
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbInitialized(true);
      }
    };

    initialize();
  }, []);

  if (!dbInitialized || isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName={currentUser ? 'Home' : 'Login'}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="RegisterSchool" component={RegisterSchoolScreen} />
        <Stack.Screen name="QuickAccess" component={QuickAccessScreen} />
        <Stack.Screen name="SchoolSettings" component={SchoolSettingsScreen} />
        <Stack.Screen name="OrganizationConfig" component={OrganizationConfigScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AppNavigator: React.FC = () => {
  return (
    <AuthProvider>
      <AppNavigatorContent />
    </AuthProvider>
  );
};

export default AppNavigator;
