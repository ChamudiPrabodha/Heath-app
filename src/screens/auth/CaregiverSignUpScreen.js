import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { signUpCaregiver } from '../../services/authService';

export default function CaregiverSignUpScreen({ onSignUpSuccess, onNavigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family Member / Child');
  const [patientCode, setPatientCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const relationships = ['Family Member / Child', 'Spouse / Partner', 'Professional Nurse', 'Guardian / Friend'];

  const handleSignUp = async () => {
    if (!name || !email || !password || !patientCode || !phone) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const user = await signUpCaregiver({ 
        name, 
        email, 
        password, 
        phone, 
        relationship,
        patientPairingCode: patientCode 
      });
      onSignUpSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#EFF6FF', '#DBEAFE']} style={styles.container}>
<KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
  
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}>
        
        {/* Header navigation */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('unified_login')}>
            <Feather name="arrow-left" size={24} color="#1E3A8A" />
          </TouchableOpacity>
        </View>

        

      {/* Modern Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <MaterialCommunityIcons name="brain" size={40} color="#1D4ED8" />
          <View style={styles.logoSparkle}>
            <Ionicons name="sparkles" size={16} color="#3B82F6" />
          </View>
        </View>
      </View>

      {/* Top Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="account-heart" size={16} color="#1E3A8A" />
            <Text style={styles.badgeText}>CAREGIVER REGISTRATION</Text>
          </View>
        </View>

        <Text style={styles.title}>Register as Caregiver</Text>
        <Text style={styles.subtitle}>Create your account to monitor patient location, configure geofences, and receive distress alerts</Text>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          {/* Full Name */}
          <Text style={styles.inputLabel}>Caregiver Full Name *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={20} color="#3B82F6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Sarah Vance"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={20} color="#3B82F6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="caregiver@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Phone */}
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Feather name="phone" size={20} color="#3B82F6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+1 555-0144"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Relationship Pills */}
          <Text style={styles.inputLabel}>Relationship to Patient</Text>
          <View style={styles.pillsContainer}>
            {relationships.map(rel => (
              <TouchableOpacity
                key={rel}
                style={[styles.pill, relationship === rel && styles.pillActive]}
                onPress={() => setRelationship(rel)}
              >
                <Text style={[styles.pillText, relationship === rel && styles.pillTextActive]}>{rel}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pairing Code */}
          <Text style={styles.inputLabel}>Patient&apos;s Pairing Code</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="key-chain" size={20} color="#3B82F6" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { fontWeight: 'bold' }]}
              placeholder="CARE-1001"
              placeholderTextColor="#9CA3AF"
              value={patientCode}
              onChangeText={setPatientCode}
              autoCapitalize="characters"
            />
          </View>
          <Text style={styles.helperText}>Enter the code shown on the patient&apos;s device screen.</Text>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password (Min. 6 chars) *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={20} color="#3B82F6" style={styles.inputIcon} />
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
            <Feather name="check-circle" size={20} color="#3B82F6" style={styles.inputIcon} />
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
                <Text style={styles.submitBtnText}>Create Caregiver Account</Text>
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
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EFF6FF',
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
  badge: { flexDirection: 'row', backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 6 },
  badgeText: { color: '#1E3A8A', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: '#1E3A8A', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#4B5563', marginBottom: 24, textAlign: 'center', paddingHorizontal: 10, lineHeight: 22 },
  error: { color: '#EF4444', marginBottom: 16, textAlign: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, overflow: 'hidden', width: '100%' },
  card: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 20, backgroundColor: '#F9FAFB', height: 56 },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%' },
  eyeIcon: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },
  helperText: { fontSize: 12, color: '#6B7280', marginTop: -16, marginBottom: 20, marginLeft: 4 },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  pill: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pillActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  pillText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  pillTextActive: { color: '#1D4ED8' },
  submitBtn: { backgroundColor: '#2563EB', height: 56, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnIcon: { marginRight: 8 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
