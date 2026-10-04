import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import UnifiedLoginScreen from './UnifiedLoginScreen';
import PatientSignUpScreen from './PatientSignUpScreen';
import CaregiverSignUpScreen from './CaregiverSignUpScreen';
import DoctorSignUpScreen from './DoctorSignUpScreen';
import AdminSignUpScreen from './AdminSignUpScreen';

export default function AuthGatewayScreen({ onLoginSuccess }) {
  const [currentScreen, setCurrentScreen] = useState('unified_login');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenContainer}>
        {currentScreen === 'unified_login' && (
          <UnifiedLoginScreen
            onLoginSuccess={onLoginSuccess}
            onNavigate={setCurrentScreen}
          />
        )}
        
        {currentScreen === 'patient_signup' && (
          <PatientSignUpScreen
            onSignUpSuccess={onLoginSuccess}
            onNavigate={setCurrentScreen}
          />
        )}
        
        {currentScreen === 'caregiver_signup' && (
          <CaregiverSignUpScreen
            onSignUpSuccess={onLoginSuccess}
            onNavigate={setCurrentScreen}
          />
        )}
        
        {currentScreen === 'doctor_signup' && (
          <DoctorSignUpScreen
            onSignUpSuccess={onLoginSuccess}
            onNavigate={setCurrentScreen}
          />
        )}
        
        {currentScreen === 'admin_signup' && (
          <AdminSignUpScreen
            onSignUpSuccess={onLoginSuccess}
            onNavigate={setCurrentScreen}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  screenContainer: { flex: 1 },
});
