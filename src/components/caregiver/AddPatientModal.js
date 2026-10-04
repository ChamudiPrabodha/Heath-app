// src/components/caregiver/AddPatientModal.js - Add New Patient with Unique ID
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { addCaregiverPatient } from '../../services/patientManagementService';

export default function AddPatientModal({ visible, onPatientAdded, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [condition, setCondition] = useState('Dementia (Moderate) • High Wander Risk');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [safeZoneRadius, setSafeZoneRadius] = useState('500');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setErrorMessage('');
    if (!name.trim()) {
      setErrorMessage('Please enter the patient\'s full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter the patient\'s email address.');
      return;
    }

    try {
      const { getCurrentUser } = require('../../services/authService');
      const currentUser = await getCurrentUser();
      
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

      const cleanEmail = email.trim().toLowerCase();
      let cleanId = '';
      
      // Look up patient's tracking room code by email
      const lookupRes = await fetch(`${getApiBaseUrl()}/users/lookup/${encodeURIComponent(cleanEmail)}`);
      
      if (!lookupRes.ok) {
        const errorData = await lookupRes.json();
        setErrorMessage(errorData.error || 'Failed to find a patient with this email.');
        return;
      }
      
      const lookupData = await lookupRes.json();
      cleanId = lookupData.pairingCode;
      
      if (!cleanId) {
        setErrorMessage('Patient found, but no tracking room code is assigned to them.');
        return;
      }

      const cleanName = name.trim();

      await fetch(`${getApiBaseUrl()}/connections/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: currentUser?.name || 'Caregiver',
          fromEmail: currentUser?.email || currentUser?.id || 'caregiver@test.com',
          fromRole: currentUser?.role || 'caregiver',
          toRoomCode: cleanId,
          toEmail: cleanEmail,
          toName: cleanName,
          age: age ? Number(age) : null,
          condition: condition.trim(),
          emergencyPhone: emergencyPhone.trim(),
          safeZoneRadius: safeZoneRadius ? Number(safeZoneRadius) : 500,
        })
      }).catch(e => console.log('Direct connection network notice:', e.message));

      // Save locally to storage & memory
      let newPatient = null;
      try {
        newPatient = await addCaregiverPatient({
          name: cleanName,
          id: cleanId,
          age: age ? Number(age) : null,
          condition: condition.trim(),
          emergencyPhone: emergencyPhone.trim(),
          safeZoneRadius: safeZoneRadius ? Number(safeZoneRadius) : 500,
        });
      } catch (localErr) {
        // If already exists locally, still construct patient object
        newPatient = {
          id: cleanId,
          name: cleanName,
          age: age ? Number(age) : null,
          condition: condition.trim(),
          emergencyPhone: emergencyPhone.trim(),
          safeZoneRadius: safeZoneRadius ? Number(safeZoneRadius) : 500,
          status: 'idle',
          batteryLevel: 85,
          medications: [],
          activities: [],
        };
      }

      if (onPatientAdded && newPatient) {
        onPatientAdded(newPatient);
      }

      Alert.alert('Connected & Added', `Successfully added ${cleanName} (${cleanId}) to your monitored patient list.`);
      resetForm();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save patient.');
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setAge('');
    setCondition('Dementia (Moderate) • High Wander Risk');
    setEmergencyPhone('');
    setSafeZoneRadius('500');
    setErrorMessage('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-add" size={22} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.title}>Connect Patient</Text>
                <Text style={styles.subtitle}>Enter the patient&apos;s email address to connect</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Patient Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Patient Full Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#2563EB" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Arthur Pendelton"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Patient Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Patient Email Address *</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#2563EB" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="e.g. patient@example.com"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <Text style={styles.helperText}>
                Enter the email address the patient used to sign up. The tracking code will be automatically linked.
              </Text>
            </View>

            {/* Age & Emergency Phone */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Age</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    placeholder="75"
                    keyboardType="number-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <Text style={styles.label}>Emergency Phone</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color="#2563EB" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={emergencyPhone}
                    onChangeText={setEmergencyPhone}
                    placeholder="+1 555-0192"
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {/* Condition / Care Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medical Diagnosis / Care Notes</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="medical-outline" size={18} color="#2563EB" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={condition}
                  onChangeText={setCondition}
                  placeholder="e.g. Alzheimer's Stage 2 • Wandering Risk"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Safe Zone Radius */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Safe Zone Radius (Meters)</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="shield-outline" size={18} color="#2563EB" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={safeZoneRadius}
                  onChangeText={setSafeZoneRadius}
                  placeholder="500"
                  keyboardType="number-pad"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.unitText}>meters</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="link" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Connect Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
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
  scrollBody: {
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  genLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: '#111827',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
