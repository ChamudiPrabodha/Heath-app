// src/components/caregiver/AssignMedicationModal.js - Assign & Manage Patient Medications
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  assignMedicationToPatient,
  deleteMedicationFromPatient,
} from '../../services/patientManagementService';
import DailyMedicationCalendar from './DailyMedicationCalendar';

export default function AssignMedicationModal({
  visible,
  patient,
  onMedicationsUpdated,
  onClose,
}) {
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00 AM');
  const [period, setPeriod] = useState('Morning with breakfast');

  if (!patient) return null;

  const handleAddMedication = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter the medication name.');
      return;
    }
    if (!dosage.trim()) {
      Alert.alert('Error', 'Please specify the dosage.');
      return;
    }

    try {
      const updatedPatient = await assignMedicationToPatient(patient.id, {
        name: name.trim(),
        dosage: dosage.trim(),
        time,
        period,
      });

      Alert.alert('Medication Assigned', `${name} was added to ${patient.name}'s daily medication plan.`);
      setName('');
      setDosage('');
      setShowAddForm(false);
      if (onMedicationsUpdated) onMedicationsUpdated(updatedPatient);
    } catch (_err) {
      Alert.alert('Error', 'Failed to assign medication.');
    }
  };

  const handleDeleteMedication = async (medId, medName) => {
    Alert.alert(
      'Remove Medication',
      `Are you sure you want to remove "${medName}" from ${patient.name}'s plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteMedicationFromPatient(patient.id, medId);
            if (onMedicationsUpdated) onMedicationsUpdated(updated);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="pill" size={24} color="#6D28D9" />
              </View>
              <View>
                <Text style={styles.title}>Medication Plan</Text>
                <Text style={styles.subtitle}>
                  Daily calendar & prescriptions for <Text style={{ fontWeight: '700' }}>{patient.name}</Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* View Mode Segmented Switcher */}
          <View style={styles.viewModeTabs}>
            <TouchableOpacity
              style={[styles.viewModeTab, viewMode === 'calendar' && styles.viewModeTabActive]}
              onPress={() => setViewMode('calendar')}
            >
              <Ionicons
                name="calendar"
                size={15}
                color={viewMode === 'calendar' ? '#6D28D9' : '#64748B'}
              />
              <Text style={[styles.viewModeTabText, viewMode === 'calendar' && styles.viewModeTabTextActive]}>
                📅 Day Calendar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModeTab, viewMode === 'list' && styles.viewModeTabActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list"
                size={15}
                color={viewMode === 'list' ? '#6D28D9' : '#64748B'}
              />
              <Text style={[styles.viewModeTabText, viewMode === 'list' && styles.viewModeTabTextActive]}>
                📋 Prescriptions ({patient.medications?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {viewMode === 'calendar' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <DailyMedicationCalendar patient={patient} />
            </ScrollView>
          ) : (
            <>
              {/* Add Medication Toggle Header */}
              <View style={styles.topActionsRow}>
                <Text style={styles.medCountText}>
                  Current Prescriptions ({patient.medications?.length || 0}):
                </Text>
                <TouchableOpacity
                  style={styles.addMedBtn}
                  onPress={() => setShowAddForm(!showAddForm)}
                >
                  <Ionicons
                    name={showAddForm ? 'close' : 'add'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.addMedBtnText}>
                    {showAddForm ? 'Cancel' : '+ New Med'}
                  </Text>
                </TouchableOpacity>
              </View>

          {/* Form to Assign New Medication */}
          {showAddForm && (
            <View style={styles.addFormCard}>
              <Text style={styles.formTitle}>Assign New Prescription</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Medicine Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Donepezil (Aricept)"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.inputLabel}>Dosage *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={dosage}
                    onChangeText={setDosage}
                    placeholder="10 mg • 1 Tablet"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={time}
                    onChangeText={setTime}
                    placeholder="08:00 AM"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Instructions / Period</Text>
                <TextInput
                  style={styles.textInput}
                  value={period}
                  onChangeText={setPeriod}
                  placeholder="Morning with breakfast"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity style={styles.confirmAddBtn} onPress={handleAddMedication}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.confirmAddBtnText}>Save Medication</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Current Medications List */}
          <ScrollView style={styles.list}>
            {!patient.medications || patient.medications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="medical-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyText}>No medications assigned yet.</Text>
                <Text style={styles.emptySub}>Tap &quot;+ New Med&quot; above to assign prescriptions.</Text>
              </View>
            ) : (
              patient.medications.map((item) => (
                <View key={item.id} style={styles.medCard}>
                  <View style={styles.medIconBox}>
                    <MaterialCommunityIcons name="pill" size={20} color="#10B981" />
                  </View>

                  <View style={styles.medDetails}>
                    <View style={styles.medTopRow}>
                      <Text style={styles.medName}>{item.name}</Text>
                      <View style={styles.timeBadge}>
                        <Ionicons name="time-outline" size={12} color="#059669" />
                        <Text style={styles.timeText}>{item.time}</Text>
                      </View>
                    </View>
                    <Text style={styles.dosageText}>{item.dosage}</Text>
                    {item.period ? <Text style={styles.periodText}>{item.period}</Text> : null}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteMedication(item.id, item.name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
          </>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Window</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewModeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  viewModeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  viewModeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewModeTabTextActive: {
    color: '#6D28D9',
    fontWeight: '700',
  },
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    backgroundColor: '#ECFDF5',
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
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  medCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addMedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addFormCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: '#111827',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmAddBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  confirmAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  list: {
    maxHeight: 280,
    marginBottom: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  medIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medDetails: {
    flex: 1,
  },
  medTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  medName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dosageText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  periodText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  doneBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
