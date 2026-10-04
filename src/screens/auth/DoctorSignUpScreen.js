import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { signUpDoctor } from '../../services/authService';

export default function DoctorSignUpScreen({ onSignUpSuccess, onNavigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hospital, setHospital] = useState('');
  const [specialization, setSpecialization] = useState('General Physician');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const specializations = ['General Physician', 'Neurologist', 'Cardiologist', 'Psychiatrist', 'Other'];

  const handleSignUp = async () => {
    if (!name || !email || !password || !phone || !hospital) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      // authService signUpDoctor might not take specialization, but we capture it anyway for future use
      const user = await signUpDoctor({ 
        name, 
        email, 
        password, 
        phone, 
        hospital 
      });
      onSignUpSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FAF5FF', '#F3E8FF']} style={styles.container}>
<KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
  
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}>
        
        {/* Header navigation */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('unified_login')}>
            <Feather name="arrow-left" size={24} color="#4C1D95" />
          </TouchableOpacity>
        </View>

        

      {/* Modern Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <MaterialCommunityIcons name="brain" size={40} color="#7E22CE" />
          <View style={styles.logoSparkle}>
            <Ionicons name="sparkles" size={16} color="#A855F7" />
          </View>
        </View>
      </View>

      {/* Top Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="stethoscope" size={16} color="#4C1D95" />
            <Text style={styles.badgeText}>DOCTOR REGISTRATION</Text>
          </View>
        </View>

        <Text style={styles.title}>Register as Doctor</Text>
        <Text style={styles.subtitle}>Create your account to monitor patient vitals, manage prescriptions, and review alerts</Text>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          {/* Full Name */}
          <Text style={styles.inputLabel}>Doctor Full Name *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={20} color="#7C3AED" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr. John Smith"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={20} color="#7C3AED" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="doctor@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Phone */}
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="phone" size={20} color="#7C3AED" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+1 555-0199"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Hospital/Clinic */}
          <Text style={styles.inputLabel}>Hospital / Clinic *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="briefcase" size={20} color="#7C3AED" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. General Hospital"
              placeholderTextColor="#9CA3AF"
              value={hospital}
              onChangeText={setHospital}
            />
          </View>

          {/* Specialization Pills */}
          <Text style={styles.inputLabel}>Specialization</Text>
          <View style={styles.pillsContainer}>
            {specializations.map(spec => (
              <TouchableOpacity
                key={spec}
                style={[styles.pill, specialization === spec && styles.pillActive]}
                onPress={() => setSpecialization(spec)}
              >
                <Text style={[styles.pillText, specialization === spec && styles.pillTextActive]}>{spec}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password (Min. 6 chars) *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={20} color="#7C3AED" style={styles.inputIcon} />
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
            <Feather name="check-circle" size={20} color="#7C3AED" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
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
                <Feather name="user-plus" size={20} color="#FFFFFF" style={styles.btnIcon} />
                <Text style={styles.submitBtnText}>Create Doctor Account</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({

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
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#FAF5FF',
  },
  logoSparkle: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 80, alignItems: 'center' },
  header: { width: '100%', marginBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  badgeContainer: { alignItems: 'center', marginBottom: 16 },
  badge: { flexDirection: 'row', backgroundColor: '#EDE9FE', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 6 },
  badgeText: { color: '#4C1D95', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: '#4C1D95', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#4B5563', marginBottom: 24, textAlign: 'center', paddingHorizontal: 10, lineHeight: 22 },
  error: { color: '#EF4444', marginBottom: 16, textAlign: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, overflow: 'hidden', width: '100%' },
  card: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 20, backgroundColor: '#F9FAFB', height: 56 },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%' },
  eyeIcon: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  pill: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pillActive: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  pillText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  pillTextActive: { color: '#6D28D9' },
  submitBtn: { backgroundColor: '#7C3AED', height: 56, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnIcon: { marginRight: 8 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
