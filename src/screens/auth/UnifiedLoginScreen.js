import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { loginUnified } from '../../services/authService';

export default function UnifiedLoginScreen({ onLoginSuccess, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const user = await loginUnified(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#ECFDF5', '#D1FAE5']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}>
          {/* Modern Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="brain" size={40} color="#059669" />
              <View style={styles.logoSparkle}>
                <Ionicons name="sparkles" size={16} color="#10B981" />
              </View>
            </View>
          </View>

          <Text style={styles.title}>Dementia Care 360</Text>
          <Text style={styles.signInTitle}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your email to access your personalized dashboard</Text>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          {/* Email Input */}
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={20} color="#10B981" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="user@healthtrack.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={20} color="#10B981" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity style={styles.signInBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="log-in" size={20} color="#FFFFFF" style={styles.btnIcon} />
                <Text style={styles.signInBtnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Quick Demo Fill Buttons */}
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionLabel}>QUICK DEMO ACCOUNTS</Text>
            <View style={styles.demoChipsRow}>
              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => {
                  setEmail('caregiver@healthtrack.com');
                  setPassword('caregiver123');
                  setError('');
                }}
              >
                <MaterialCommunityIcons name="heart-pulse" size={13} color="#059669" />
                <Text style={styles.demoChipText}>Caregiver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => {
                  setEmail('doctor@healthtrack.com');
                  setPassword('doctor123');
                  setError('');
                }}
              >
                <MaterialCommunityIcons name="doctor" size={13} color="#2563EB" />
                <Text style={styles.demoChipText}>Doctor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => {
                  setEmail('patient@healthtrack.com');
                  setPassword('patient123');
                  setError('');
                }}
              >
                <MaterialCommunityIcons name="account-heart" size={13} color="#7C3AED" />
                <Text style={styles.demoChipText}>Patient</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => {
                  setEmail('admin@healthtrack.com');
                  setPassword('admin123');
                  setError('');
                }}
              >
                <MaterialCommunityIcons name="shield-account" size={13} color="#D97706" />
                <Text style={styles.demoChipText}>Admin</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CREATE AN ACCOUNT</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register Buttons */}
          <TouchableOpacity 
            style={[styles.registerBtn, styles.registerPatientBtn]} 
            onPress={() => onNavigate('patient_signup')}
          >
            <Text style={[styles.registerBtnText, styles.registerPatientText]}>Register as Patient</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.registerBtn, styles.registerCaregiverBtn]} 
            onPress={() => onNavigate('caregiver_signup')}
          >
            <Text style={[styles.registerBtnText, styles.registerCaregiverText]}>Register as Caregiver</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.registerBtn, styles.registerDoctorBtn]} 
            onPress={() => onNavigate('doctor_signup')}
          >
            <Text style={[styles.registerBtnText, styles.registerDoctorText]}>Register as Doctor</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity 
              style={[styles.registerBtn, styles.registerAdminBtn]} 
              onPress={() => onNavigate('admin_signup')}
            >
              <Text style={[styles.registerBtnText, styles.registerAdminText]}>Register as Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    paddingBottom: 80,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ECFDF5',
  },
  logoSparkle: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#064E3B',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  signInTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: { 
    fontSize: 15, 
    color: '#4B5563', 
    marginBottom: 32, 
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  error: { 
    color: '#EF4444', 
    marginBottom: 16, 
    textAlign: 'center', 
    backgroundColor: '#FEE2E2', 
    padding: 12, 
    borderRadius: 8, 
    overflow: 'hidden',
    width: '100%'
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    height: 56,
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: { 
    flex: 1,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },
  eyeIcon: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
  },
  signInBtn: { 
    backgroundColor: '#10B981', 
    height: 56,
    borderRadius: 12, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 8, 
    marginBottom: 24,
  },
  btnIcon: {
    marginRight: 8,
  },
  signInBtnText: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    fontSize: 16 
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  registerBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  registerPatientBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  registerPatientText: {
    color: '#059669',
  },
  registerCaregiverBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  registerCaregiverText: {
    color: '#1D4ED8',
  },
  registerDoctorBtn: {
    backgroundColor: '#FAF5FF',
    borderColor: '#F3E8FF',
  },
  registerDoctorText: {
    color: '#7E22CE',
  },
  registerAdminBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  registerAdminText: {
    color: '#DC2626',
  },
  demoSection: {
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
});
