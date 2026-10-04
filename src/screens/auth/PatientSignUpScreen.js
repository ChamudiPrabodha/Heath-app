import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { signUpPatient } from '../../services/authService';

export default function PatientSignUpScreen({ onSignUpSuccess, onNavigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !phone) {
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
      const user = await signUpPatient({ 
        name, 
        email, 
        password, 
        phone, 
        emergencyContact,
        pairingCode 
      });
      onSignUpSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePairingCode = () => {
    const code = 'CARE-' + Math.floor(1000 + Math.random() * 9000);
    setPairingCode(code);
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#ECFDF5', '#D1FAE5']} style={styles.container}>
<KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
  
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}>
        
        {/* Header navigation */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('unified_login')}>
            <Feather name="arrow-left" size={24} color="#065F46" />
          </TouchableOpacity>
        </View>

        

      {/* Modern Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <MaterialCommunityIcons name="brain" size={40} color="#059669" />
          <View style={styles.logoSparkle}>
            <Ionicons name="sparkles" size={16} color="#10B981" />
          </View>
        </View>
      </View>

      {/* Top Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="clipboard-pulse" size={16} color="#065F46" />
            <Text style={styles.badgeText}>PATIENT REGISTRATION</Text>
          </View>
        </View>

        <Text style={styles.title}>Register as Patient</Text>
        <Text style={styles.subtitle}>Create your account to share your real-time location, vitals, and receive assistance</Text>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          {/* Full Name */}
          <Text style={styles.inputLabel}>Patient Full Name *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={20} color="#10B981" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Eleanor Vance"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={20} color="#10B981" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="patient@example.com"
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
            <Feather name="phone" size={20} color="#10B981" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+1 555-0192"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Emergency Contact */}
          <Text style={styles.inputLabel}>Emergency Contact (Optional)</Text>
          <View style={styles.inputWrapper}>
            <Feather name="life-buoy" size={20} color="#10B981" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Sarah (+1 555-0144)"
              placeholderTextColor="#9CA3AF"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
            />
          </View>

          {/* Pairing Code */}
          <Text style={styles.inputLabel}>Generated Pairing Code</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="key-chain" size={20} color="#10B981" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { fontWeight: 'bold' }]}
              placeholder="Tap generate..."
              placeholderTextColor="#9CA3AF"
              value={pairingCode}
              onChangeText={setPairingCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity onPress={generatePairingCode} style={styles.eyeIcon}>
              <Feather name="refresh-cw" size={20} color="#059669" />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Share this code with your caregiver or doctor to link accounts.</Text>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password (Min. 6 chars) *</Text>
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={20} color="#10B981" style={styles.inputIcon} />
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
            <Feather name="check-circle" size={20} color="#10B981" style={styles.inputIcon} />
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
                <Text style={styles.submitBtnText}>Create Patient Account</Text>
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
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 80, alignItems: 'center' },
  header: { width: '100%', marginBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  badgeContainer: { alignItems: 'center', marginBottom: 16 },
  badge: { flexDirection: 'row', backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 6 },
  badgeText: { color: '#065F46', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: '#064E3B', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#4B5563', marginBottom: 24, textAlign: 'center', paddingHorizontal: 10, lineHeight: 22 },
  error: { color: '#EF4444', marginBottom: 16, textAlign: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, overflow: 'hidden', width: '100%' },
  card: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 20, backgroundColor: '#F9FAFB', height: 56 },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%' },
  eyeIcon: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },
  helperText: { fontSize: 12, color: '#6B7280', marginTop: -16, marginBottom: 20, marginLeft: 4 },
  submitBtn: { backgroundColor: '#10B981', height: 56, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnIcon: { marginRight: 8 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
