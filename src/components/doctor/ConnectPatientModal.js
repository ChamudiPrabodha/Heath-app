// src/components/doctor/ConnectPatientModal.js - Connect Patients (Before & After Signup)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { addCaregiverPatient } from '../../services/patientManagementService';

const generateDefaultRoomCode = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `CARE-${randomNum}`;
};

export default function ConnectPatientModal({ visible, onConnect, onClose }) {
  const [activeTab, setActiveTab] = useState('before_signup'); // 'before_signup' | 'existing'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Before Signup form fields
  const [patientName, setPatientName] = useState('');
  const [roomCode, setRoomCode] = useState(generateDefaultRoomCode);
  const [patientEmail, setPatientEmail] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [condition, setCondition] = useState('Dementia (Moderate) • High Wander Risk');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Existing Patient form field
  const [existingIdentifier, setExistingIdentifier] = useState('');

  const conditionPresets = [
    'Dementia (Moderate) • High Wander Risk',
    'Dementia (Early Stage)',
    'Alzheimer\'s Disease',
    'Mild Cognitive Impairment',
  ];

  const handleGenerateNewCode = () => {
    setRoomCode(generateDefaultRoomCode());
  };

  const getApiBaseUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:4000/api`;
    }
    try {
      const Constants = require('expo-constants').default;
      const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost;
      if (hostUri) {
        const ip = hostUri.split(':')[0];
        return `http://${ip}:4000/api`;
      }
    } catch (_e) {}
    if (Platform.OS === 'android') return 'http://10.0.2.2:4000/api';
    return 'http://172.18.150.21:4000/api';
  };

  // 1. Connect Patient Before Signup (Pre-Registration)
  const handleConnectBeforeSignup = async () => {
    setErrorMessage('');
    if (!patientName.trim()) {
      setErrorMessage('Please enter the patient\'s full name.');
      return;
    }
    if (!roomCode.trim()) {
      setErrorMessage('Please assign a patient tracking room code.');
      return;
    }

    setLoading(true);
    try {
      const { getCurrentUser } = require('../../services/authService');
      const currentUser = await getCurrentUser();

      const cleanCode = roomCode.trim().toUpperCase();
      const cleanName = patientName.trim();
      const cleanEmail = patientEmail.trim().toLowerCase();

      // Send to backend direct connection endpoint
      const res = await fetch(`${getApiBaseUrl()}/connections/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: currentUser?.name || 'Doctor',
          fromEmail: currentUser?.email || 'doctor@healthtrack.com',
          fromRole: 'doctor',
          toRoomCode: cleanCode,
          toEmail: cleanEmail,
          toName: cleanName,
          age: patientAge ? Number(patientAge) : null,
          condition: condition.trim(),
          emergencyPhone: emergencyPhone.trim(),
          safeZoneRadius: 500,
          isPreRegistered: true,
        }),
      });

      // Save locally to storage & memory
      let newPatient = null;
      try {
        newPatient = await addCaregiverPatient({
          id: cleanCode,
          name: cleanName,
          email: cleanEmail,
          age: patientAge ? Number(patientAge) : null,
          condition: condition.trim(),
          emergencyPhone: emergencyPhone.trim(),
          safeZoneRadius: 500,
          status: 'idle',
          batteryLevel: 85,
          isPreRegistered: true,
        });
      } catch (_localErr) {
        newPatient = {
          id: cleanCode,
          name: cleanName,
          email: cleanEmail,
          age: patientAge ? Number(patientAge) : null,
          condition: condition.trim(),
          emergencyPhone: emergencyPhone.trim(),
          safeZoneRadius: 500,
          status: 'idle',
          batteryLevel: 85,
          medications: [],
          activities: [],
          isPreRegistered: true,
        };
      }

      if (onConnect && newPatient) {
        onConnect(newPatient);
      }

      Alert.alert(
        '✅ Patient Enrolled & Connected',
        `${cleanName} has been connected under Room Code: ${cleanCode}.\n\nWhen the patient or family signs up with this email or room code, their medical account will link automatically.`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to connect patient: ' + (err.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  // 2. Connect Existing Patient (Already Signed Up)
  const handleConnectExisting = async () => {
    setErrorMessage('');
    const input = existingIdentifier.trim();
    if (!input) {
      setErrorMessage('Please enter the patient\'s room code or email.');
      return;
    }

    setLoading(true);
    try {
      const { getCurrentUser } = require('../../services/authService');
      const currentUser = await getCurrentUser();

      let targetCode = input.toUpperCase();
      let targetName = '';
      let targetEmail = '';

      // If user typed an email address, lookup their room code
      if (input.includes('@')) {
        const lookupRes = await fetch(`${getApiBaseUrl()}/users/lookup/${encodeURIComponent(input.toLowerCase())}`);
        if (!lookupRes.ok) {
          const errData = await lookupRes.json().catch(() => ({}));
          setErrorMessage(errData.error || 'No registered patient found with this email.');
          setLoading(false);
          return;
        }
        const lookupData = await lookupRes.json();
        targetCode = lookupData.pairingCode;
        targetName = lookupData.name || '';
        targetEmail = lookupData.email || '';
      }

      const res = await fetch(`${getApiBaseUrl()}/connections/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: currentUser?.name || 'Doctor',
          fromEmail: currentUser?.email || 'doctor@healthtrack.com',
          fromRole: 'doctor',
          toRoomCode: targetCode,
          toEmail: targetEmail,
          toName: targetName,
        }),
      });

      if (res.ok) {
        const newPatient = {
          id: targetCode,
          name: targetName || `Patient (${targetCode})`,
          email: targetEmail,
          condition: 'Dementia (Moderate)',
          status: 'idle',
          batteryLevel: 85,
          medications: [],
          activities: [],
        };
        try {
          await addCaregiverPatient(newPatient);
        } catch (_e) {}

        if (onConnect) onConnect(newPatient);

        Alert.alert('Connected', `Successfully linked with patient ${targetCode}.`);
        resetForm();
        onClose();
      } else {
        setErrorMessage('Failed to connect to this patient room. Please verify the code.');
      }
    } catch (_err) {
      setErrorMessage('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPatientName('');
    setPatientEmail('');
    setPatientAge('');
    setEmergencyPhone('');
    setExistingIdentifier('');
    setErrorMessage('');
    setRoomCode(generateDefaultRoomCode());
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="account-plus-outline" size={24} color="#9333EA" />
              </View>
              <View>
                <Text style={styles.title}>Connect Patient</Text>
                <Text style={styles.subtitle}>Doctor Patient Enrollment Center</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'before_signup' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('before_signup');
                setErrorMessage('');
              }}
            >
              <Ionicons
                name="person-add"
                size={16}
                color={activeTab === 'before_signup' ? '#9333EA' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'before_signup' && styles.tabBtnTextActive,
                ]}
              >
                Before Signup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'existing' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('existing');
                setErrorMessage('');
              }}
            >
              <Ionicons
                name="link"
                size={16}
                color={activeTab === 'existing' ? '#9333EA' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'existing' && styles.tabBtnTextActive,
                ]}
              >
                Existing Patient
              </Text>
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {activeTab === 'before_signup' ? (
            /* TAB 1: Pre-Register & Connect Patient Before Signup */
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle" size={18} color="#9333EA" />
                <Text style={styles.noticeText}>
                  Pre-register a patient before they create an account. When they sign up using this room code or email, their profile will be linked automatically.
                </Text>
              </View>

              {/* Patient Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Patient Full Name *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#9333EA" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={patientName}
                    onChangeText={setPatientName}
                    placeholder="e.g. Arthur Pendelton"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Assigned Tracking Room Code */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Assigned Tracking Room Code *</Text>
                  <TouchableOpacity
                    style={styles.generateBtn}
                    onPress={handleGenerateNewCode}
                  >
                    <Ionicons name="flash-outline" size={13} color="#9333EA" />
                    <Text style={styles.generateBtnText}>New Code</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="identifier" size={18} color="#9333EA" style={styles.icon} />
                  <TextInput
                    style={[styles.input, { fontWeight: '700', letterSpacing: 1 }]}
                    value={roomCode}
                    onChangeText={setRoomCode}
                    autoCapitalize="characters"
                    placeholder="e.g. CARE-4921"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Patient Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Patient Email (Optional / For auto-linking)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#9333EA" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={patientEmail}
                    onChangeText={setPatientEmail}
                    placeholder="e.g. arthur@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Patient Age */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Age (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="calendar-account" size={18} color="#9333EA" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={patientAge}
                    onChangeText={setPatientAge}
                    placeholder="e.g. 78"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Clinical Condition */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Clinical Condition / Diagnosis</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="clipboard-pulse-outline" size={18} color="#9333EA" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={condition}
                    onChangeText={setCondition}
                    placeholder="Diagnosis..."
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Condition Presets */}
                <View style={styles.presetChipsRow}>
                  {conditionPresets.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.presetChip,
                        condition === c && styles.presetChipSelected,
                      ]}
                      onPress={() => setCondition(c)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          condition === c && styles.presetChipTextSelected,
                        ]}
                      >
                        {c.split('•')[0].trim()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Emergency Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Emergency Contact Phone (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color="#9333EA" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={emergencyPhone}
                    onChangeText={setEmergencyPhone}
                    placeholder="e.g. +1 (555) 0192"
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.connectBtn, loading && styles.btnDisabled]}
                  onPress={handleConnectBeforeSignup}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={16} color="#FFF" />
                      <Text style={styles.connectBtnText}>Connect & Enroll</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* TAB 2: Connect Existing Signed-Up Patient */
            <View style={styles.existingBody}>
              <View style={styles.noticeBoxBlue}>
                <Ionicons name="information-circle" size={18} color="#2563EB" />
                <Text style={styles.noticeTextBlue}>
                  Enter the patient&apos;s existing assigned room code (e.g. CARE-1001) or their registered email address to link them immediately.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Patient Room Code or Email Address *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="search" size={18} color="#9333EA" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={existingIdentifier}
                    onChangeText={setExistingIdentifier}
                    placeholder="e.g. CARE-1001 or patient@example.com"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.connectBtn, loading && styles.btnDisabled]}
                  onPress={handleConnectExisting}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="link" size={16} color="#FFF" />
                      <Text style={styles.connectBtnText}>Connect Patient</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#9333EA',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  scrollBody: {
    maxHeight: 460,
  },
  existingBody: {
    paddingVertical: 6,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#7E22CE',
    lineHeight: 17,
  },
  noticeBoxBlue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeTextBlue: {
    flex: 1,
    fontSize: 12,
    color: '#1D4ED8',
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  generateBtnText: {
    fontSize: 11,
    color: '#9333EA',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#111827',
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#C084FC',
  },
  presetChipText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  presetChipTextSelected: {
    color: '#7E22CE',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  connectBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  connectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
