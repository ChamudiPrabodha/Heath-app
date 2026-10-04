import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { signUpAdmin } from '../../services/authService';

export default function AdminSignUpScreen({ onSignUpSuccess, onNavigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const user = await signUpAdmin({ name, email, password });
      onSignUpSuccess(user);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FEF2F2', '#FEE2E2']} style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={Platform.OS === 'web'}>
          {/* Header navigation */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('unified_login')}>
              <Feather name="arrow-left" size={24} color="#991B1B" />
            </TouchableOpacity>
          </View>

          {/* Modern Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="brain" size={40} color="#DC2626" />
              <View style={styles.logoSparkle}>
                <Ionicons name="sparkles" size={16} color="#EF4444" />
              </View>
            </View>
          </View>

          {/* Top Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="shield-crown" size={16} color="#991B1B" />
              <Text style={styles.badgeText}>ADMIN REGISTRATION</Text>
            </View>
          </View>

          <Text style={styles.title}>Register as Admin</Text>
          <Text style={styles.subtitle}>Create an administrator account to monitor system health, oversee medical staff, and configure services</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.card}>
            {/* Full Name */}
            <Text style={styles.inputLabel}>Admin Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={20} color="#DC2626" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. System Administrator"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <Text style={styles.inputLabel}>Email Address *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={20} color="#DC2626" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="admin@healthtrack.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
            <Text style={styles.inputLabel}>Password (Min. 6 chars) *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={20} color="#DC2626" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <Text style={styles.inputLabel}>Confirm Password *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={20} color="#DC2626" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Re-type password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSignUp} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="shield" size={20} color="#FFFFFF" style={styles.btnIcon} />
                  <Text style={styles.submitBtnText}>Create Admin Account</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Back to Login link */}
            <TouchableOpacity style={styles.loginLink} onPress={() => onNavigate('unified_login')}>
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
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
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoSparkle: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  badgeContainer: {
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#B91C1C',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  error: {
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#FFF5F5',
    height: 52,
  },
  inputIcon: {
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    height: '100%',
  },
  eyeIcon: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnIcon: {
    marginRight: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  loginLink: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLinkBold: {
    color: '#DC2626',
    fontWeight: '700',
  },
});
