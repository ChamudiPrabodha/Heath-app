import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { syncService } from '../../services/syncService';
import {
  getAiAssessment,
  getPatientMedicationPlan,
  saveOrUpdatePatientMedication,
  deleteMedicationFromPatient,
} from '../../services/patientManagementService';
import DailyMedicationCalendar from '../../components/caregiver/DailyMedicationCalendar';
import PatientVitalsMonitorModal from '../../components/caregiver/PatientVitalsMonitorModal';
import MonthlyPatientHistoryModal from '../../components/doctor/MonthlyPatientHistoryModal';
import { getLatestPatientVitals } from '../../services/vitalsService';

const COMMON_DEMENTIA_MEDS = [
  { name: 'Donepezil (Aricept)', dosage: '10 mg • 1 Tablet', period: 'Morning with breakfast', time: '08:00 AM' },
  { name: 'Memantine HCl', dosage: '10 mg • 1 Tablet', period: 'Morning with breakfast', time: '09:00 AM' },
  { name: 'Rivastigmine Patch', dosage: '9.5 mg / 24h', period: 'Morning patch', time: '08:00 AM' },
  { name: 'Amlodipine (Blood Pressure)', dosage: '5 mg • 1 Tablet', period: 'Evening with dinner', time: '08:00 PM' },
  { name: 'Vitamin B-Complex & D3', dosage: '1 Capsule', period: 'Afternoon with lunch', time: '01:00 PM' },
  { name: 'Omega-3 Fish Oil', dosage: '1000 mg • 1 Softgel', period: 'Bedtime', time: '09:30 PM' },
];

export default function DoctorPatientDetailScreen({ patient, currentUser, onBack }) {
  const [medications, setMedications] = useState([]);
  const [aiAssessment, setAiAssessment] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [planViewMode, setPlanViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [patientVitals, setPatientVitals] = useState(patient?.vitals || null);
  const [vitalsModalVisible, setVitalsModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // 1-Month Plan Form State
  const [showForm, setShowForm] = useState(false);
  const [editingMedId, setEditingMedId] = useState(null);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medTime, setMedTime] = useState('08:00 AM');
  const [medPeriod, setMedPeriod] = useState('Morning with breakfast');
  const [medDurationDays, setMedDurationDays] = useState(30); // Default 1-Month Plan (30 Days)
  const [medInstructions, setMedInstructions] = useState('');

  const handleContact = (type, target) => {
    const phone = target === 'Caregiver' ? (patient?.caregiverPhone || '+15550000') : (patient?.patientPhone || patient?.emergencyPhone || '+15550000');
    if (type === 'call') {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    } else {
      Linking.openURL(`sms:${phone}`).catch(() => {});
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (patient) {
      getAiAssessment(patient.id)
        .then((res) => {
          if (isMounted && res?.success) setAiAssessment(res.mlAssessment);
        })
        .finally(() => {
          if (isMounted) setAiLoading(false);
        });

      getPatientMedicationPlan(patient.id).then((plan) => {
        if (isMounted) setMedications(plan || []);
      });

      getLatestPatientVitals(patient.id).then((v) => {
        if (isMounted && v) setPatientVitals(v);
      });
    }

    const unsubVitals = syncService.on('vitals_updated', (incoming) => {
      const incId = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      const myId = (patient?.id || '').toUpperCase().trim();
      if (incId && incId === myId) {
        const updated = incoming.vitals || incoming.data;
        if (updated) {
          setPatientVitals(updated);
        }
      }
    });

    const unsubMedStatus = syncService.on('medication_status_update', (incoming) => {
      const incId = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      const myId = (patient?.id || '').toUpperCase().trim();
      if (incId && incId === myId) {
        const medNameTarget = incoming.data?.medicineName;
        const status = incoming.data?.status;
        const todayStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        setMedications((prev) =>
          prev.map((m) => {
            if (m.name?.toLowerCase() === (medNameTarget || '').toLowerCase() || m.id === incoming.data?.medicationId) {
              const capStatus = status === 'taken' ? 'Taken' : status === 'missed' ? 'Missed' : 'Skipped';
              return {
                ...m,
                status: capStatus,
                lastTakenTime: timeStr,
                dayStatuses: { ...(m.dayStatuses || {}), [todayStr]: capStatus },
              };
            }
            return m;
          })
        );

        if (status === 'taken') {
          Alert.alert(
            '💊 Medicine Taken Confirmed',
            `${patient.name} confirmed taking ${medNameTarget} at ${timeStr}.`
          );
        }
      }
    });

    const unsubMedRecorded = syncService.on('medication_status_recorded', (incoming) => {
      const incId = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      const myId = (patient?.id || '').toUpperCase().trim();
      if (incId && incId === myId) {
        const medNameTarget = incoming.log?.medicineName || incoming.medicineName;
        const status = incoming.status || incoming.log?.status;
        const todayStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setMedications((prev) =>
          prev.map((m) => {
            if (m.name?.toLowerCase() === (medNameTarget || '').toLowerCase() || m.id === (incoming.log?.medicationId || incoming.medicationId)) {
              const capStatus = status === 'taken' ? 'Taken' : status === 'missed' ? 'Missed' : 'Skipped';
              return {
                ...m,
                status: capStatus,
                lastTakenTime: timeStr,
                dayStatuses: { ...(m.dayStatuses || {}), [todayStr]: capStatus },
              };
            }
            return m;
          })
        );
      }
    });

    const unsubDayStatus = syncService.on('medication_day_status_updated', (incoming) => {
      const incId = (incoming.patientId || '').toUpperCase().trim();
      const myId = (patient?.id || '').toUpperCase().trim();
      if (incId && incId === myId) {
        const todayStr = new Date().toISOString().split('T')[0];
        setMedications((prev) =>
          prev.map((m) => {
            if (m.id === incoming.medicationId) {
              return {
                ...m,
                status: incoming.date === todayStr ? incoming.status : m.status,
                dayStatuses: { ...(m.dayStatuses || {}), [incoming.date]: incoming.status },
              };
            }
            return m;
          })
        );
      }
    });

    return () => {
      isMounted = false;
      unsubVitals();
      unsubMedStatus();
      unsubMedRecorded();
      unsubDayStatus();
    };
  }, [patient]);

  const handleOpenAdd = () => {
    setEditingMedId(null);
    setMedName('');
    setMedDosage('');
    setMedTime('08:00 AM');
    setMedPeriod('Morning with breakfast');
    setMedDurationDays(30);
    setMedInstructions('');
    setShowForm(true);
  };

  const handleOpenEdit = (med) => {
    setEditingMedId(med.id);
    setMedName(med.name || '');
    setMedDosage(med.dosage || '');
    setMedTime(med.time || '08:00 AM');
    setMedPeriod(med.period || 'Morning with breakfast');
    setMedDurationDays(med.durationDays || 30);
    setMedInstructions(med.instructions || '');
    setShowForm(true);
  };

  const handleApplyPreset = (preset) => {
    setMedName(preset.name);
    setMedDosage(preset.dosage);
    setMedPeriod(preset.period);
    setMedTime(preset.time);
  };

  const handleSaveMedication = async () => {
    if (!medName.trim()) {
      Alert.alert('Required Field', 'Please enter or select a medicine name.');
      return;
    }
    if (!medDosage.trim()) {
      Alert.alert('Required Field', 'Please specify the dosage (e.g. 10 mg • 1 Tablet).');
      return;
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(Date.now() + (Number(medDurationDays) || 30) * 86400000).toISOString().split('T')[0];

    const medPayload = {
      ...(editingMedId ? { id: editingMedId } : {}),
      name: medName.trim(),
      dosage: medDosage.trim(),
      time: medTime.trim(),
      period: medPeriod.trim(),
      durationDays: Number(medDurationDays) || 30,
      startDate,
      endDate,
      instructions: medInstructions.trim(),
      doctorName: currentUser?.name || 'Dr. Specialist',
      status: 'Pending',
      isActive: true,
    };

    try {
      await saveOrUpdatePatientMedication(patient.id, medPayload);
      const refreshed = await getPatientMedicationPlan(patient.id);
      setMedications(refreshed);

      // Broadcast real-time update
      syncService.sendNewPrescription(
        patient.id,
        patient.name,
        `${medPayload.name} (${medPayload.dosage}) - ${medPayload.durationDays}-Day Plan`,
        currentUser?.name || 'Your Doctor',
        editingMedId ? 'updated an existing medication plan' : 'prescribed a new 1-month medication'
      );

      Alert.alert(
        editingMedId ? 'Plan Updated' : '1-Month Plan Prescribed',
        `Successfully saved 1-month plan for ${medPayload.name} (${medPayload.durationDays} Days).\n\nPatient dashboard will automatically display today's doses, and reminders will trigger automatically at ${medPayload.time}.`
      );

      setShowForm(false);
      setEditingMedId(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to save medication plan: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteMed = (medId, medTitle) => {
    Alert.alert(
      'Discontinue Medication',
      `Are you sure you want to remove "${medTitle}" from ${patient.name}'s active 1-month medication plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discontinue',
          style: 'destructive',
          onPress: async () => {
            await deleteMedicationFromPatient(patient.id, medId);
            const refreshed = await getPatientMedicationPlan(patient.id);
            setMedications(refreshed);
          },
        },
      ]
    );
  };

  const handleTestReminder = (med) => {
    syncService.triggerMedicationReminder(patient.id, med.id);
    Alert.alert(
      '⏰ Reminder Dispatched',
      `Test reminder triggered for ${med.name}!\n\nPatient device will receive voice instructions, continuous alarm, and a 45s safety countdown.`
    );
  };

  if (!patient) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <TouchableOpacity
          style={styles.headerReportBtn}
          onPress={() => setHistoryModalVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="file-download-outline" size={16} color="#2563EB" />
          <Text style={styles.headerReportBtnText}>Monthly Report</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Patient Info Card */}
        <View style={styles.card}>
          <View style={styles.patientProfile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{patient.name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientId}>ID: {patient.id} • Age: {patient.age}</Text>
              <Text style={styles.patientCondition}>{patient.condition}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#F3E8FF', flex: 1 }]}
              onPress={() => handleContact('call', 'Patient')}
            >
              <Ionicons name="call" size={16} color="#9333EA" />
              <Text style={[styles.actionText, { color: '#9333EA' }]}>Call Patient</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#EFF6FF', flex: 1.3 }]}
              onPress={() => setHistoryModalVisible(true)}
            >
              <MaterialCommunityIcons name="file-document-outline" size={16} color="#2563EB" />
              <Text style={[styles.actionText, { color: '#2563EB' }]}>Monthly History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Caregiver Identity Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shield-account" size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Assigned Caregiver</Text>
          </View>
          <View style={styles.caregiverInfo}>
            <Text style={styles.caregiverName}>{patient.caregiver}</Text>
            <Text style={styles.caregiverPhone}>{patient.caregiverPhone}</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#EFF6FF', flex: 1 }]}
              onPress={() => handleContact('call', 'Caregiver')}
            >
              <Ionicons name="call" size={16} color="#2563EB" />
              <Text style={[styles.actionText, { color: '#2563EB' }]}>Call Caregiver</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#EFF6FF', flex: 1 }]}
              onPress={() => handleContact('message', 'Caregiver')}
            >
              <Ionicons name="chatbubble" size={16} color="#2563EB" />
              <Text style={[styles.actionText, { color: '#2563EB' }]}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real-time Patient Vitals Telemetry Card (Doctor View-Only) */}
        <View style={[styles.card, styles.vitalsDetailCard]}>
          <View style={styles.vitalsSectionHeaderRow}>
            <View style={styles.vitalsSectionHeaderLeft}>
              <View style={styles.vitalsIconCircleDetail}>
                <MaterialCommunityIcons name="heart-pulse" size={22} color="#E11D48" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Patient Vitals (Live Telemetry)</Text>
                <View style={styles.liveStreamBadgeRow}>
                  <View style={styles.livePulseDotGreen} />
                  <Text style={styles.liveStreamBadgeText}>REAL-TIME CAREGIVER SYNC</Text>
                </View>
              </View>
            </View>

            <View style={[styles.statusHeroPill, { backgroundColor: (patientVitals?.statusColor || '#10B981') + '1A' }]}>
              <Text style={[styles.statusHeroPillText, { color: patientVitals?.statusColor || '#059669' }]}>
                {patientVitals?.status || 'Normal'}
              </Text>
            </View>
          </View>

          {/* Biometrics 4-Box Grid */}
          <View style={styles.docVitalsGrid}>
            <View style={[styles.docVitalBox, { borderLeftColor: '#E11D48' }]}>
              <Text style={styles.docVitalBoxLabel}>Heart Rate</Text>
              <View style={styles.docVitalValRow}>
                <Text style={styles.docVitalBoxValue}>{patientVitals?.hr || '--'}</Text>
                <Text style={styles.docVitalBoxUnit}>BPM</Text>
              </View>
              <Text style={styles.docVitalBoxHint}>
                {patientVitals?.hr ? (patientVitals.hr > 100 ? '⚠️ High' : patientVitals.hr < 55 ? '⚠️ Low' : '✓ Normal') : 'No Check'}
              </Text>
            </View>

            <View style={[styles.docVitalBox, { borderLeftColor: '#3B82F6' }]}>
              <Text style={styles.docVitalBoxLabel}>Blood Pressure</Text>
              <View style={styles.docVitalValRow}>
                <Text style={styles.docVitalBoxValue}>{patientVitals?.bp || '--'}</Text>
                <Text style={styles.docVitalBoxUnit}>mmHg</Text>
              </View>
              <Text style={styles.docVitalBoxHint}>
                {patientVitals?.bp ? (patientVitals.bp.includes('140') ? '⚠️ High' : '✓ Normotensive') : 'No Check'}
              </Text>
            </View>

            <View style={[styles.docVitalBox, { borderLeftColor: '#10B981' }]}>
              <Text style={styles.docVitalBoxLabel}>Blood Oxygen</Text>
              <View style={styles.docVitalValRow}>
                <Text style={styles.docVitalBoxValue}>{patientVitals?.spo2 || '--'}</Text>
                <Text style={styles.docVitalBoxUnit}>%</Text>
              </View>
              <Text style={styles.docVitalBoxHint}>
                {patientVitals?.spo2 ? (patientVitals.spo2 < 95 ? '⚠️ Low SpO2' : '✓ Good Oxygenation') : 'No Check'}
              </Text>
            </View>

            <View style={[styles.docVitalBox, { borderLeftColor: '#F59E0B' }]}>
              <Text style={styles.docVitalBoxLabel}>Temperature</Text>
              <View style={styles.docVitalValRow}>
                <Text style={styles.docVitalBoxValue}>{patientVitals?.temp || '--'}</Text>
                <Text style={styles.docVitalBoxUnit}>°C</Text>
              </View>
              <Text style={styles.docVitalBoxHint}>
                {patientVitals?.temp ? (Number(patientVitals.temp) >= 38 ? '⚠️ Fever' : '✓ Normal Temp') : 'No Check'}
              </Text>
            </View>
          </View>

          {/* Caregiver Recorded Notes & Attribution */}
          <View style={styles.vitalsAttributionRow}>
            <Ionicons name="information-circle-outline" size={14} color="#64748B" />
            <Text style={styles.vitalsAttributionText}>
              Recorded by: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{patientVitals?.recordedBy || patient.caregiver || 'Caregiver'}</Text>
              {patientVitals?.timestamp ? ` • ${new Date(patientVitals.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : ''}
            </Text>
          </View>

          {patientVitals?.notes ? (
            <View style={styles.vitalsNotesCard}>
              <Text style={styles.vitalsNotesLabel}>CAREGIVER CLINICAL NOTE:</Text>
              <Text style={styles.vitalsNotesText}>&ldquo;{patientVitals.notes}&rdquo;</Text>
            </View>
          ) : null}

          {/* View Only Telemetry Notice + Open Full Vitals Page Button */}
          <View style={styles.vitalsActionRowDetail}>
            <View style={styles.vitalsViewOnlyChip}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#2563EB" />
              <Text style={styles.vitalsViewOnlyChipText}>View-Only • Caregiver Updated</Text>
            </View>

            <TouchableOpacity
              style={styles.openVitalsModalBtnDetail}
              onPress={() => setVitalsModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="monitor-dashboard" size={16} color="#FFFFFF" />
              <Text style={styles.openVitalsModalBtnDetailText}>Open Full Vitals Page →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Assessment Card */}
        <View style={[styles.card, { borderColor: '#8B5CF6', borderWidth: 1 }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="brain" size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Scikit-Learn AI Prediction</Text>
          </View>
          {aiLoading ? (
            <ActivityIndicator size="small" color="#8B5CF6" style={{ padding: 20 }} />
          ) : aiAssessment ? (
            <View>
              <View style={styles.aiResultBox}>
                <Text style={styles.aiResultLabel}>Prediction:</Text>
                <Text style={styles.aiResultValue}>{aiAssessment.prediction}</Text>
              </View>
              <Text style={styles.aiProbTitle}>Probabilities:</Text>
              {Object.entries(aiAssessment.probabilities).map(([key, val]) => (
                <View key={key} style={styles.aiProbRow}>
                  <Text style={styles.aiProbKey}>{key}</Text>
                  <Text style={styles.aiProbVal}>{(val * 100).toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.aiErrorText}>AI Assessment could not be loaded.</Text>
          )}
        </View>

        {/* 1-Month Medication Plan & Care Plan Card */}
        <View style={[styles.card, planViewMode === 'calendar' && styles.calendarSectionCard]}>
          <View style={styles.planSectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.planIconCircle}>
                <MaterialCommunityIcons name="pill" size={22} color="#059669" />
              </View>
              <View style={styles.sectionHeaderTitleCol}>
                <Text style={styles.sectionTitle}>1-Month Medication Plan</Text>
                <Text style={styles.sectionSubTitle}>
                  {medications.length} Active Prescriptions • Daily Auto-Sync
                </Text>
              </View>
            </View>
            <View style={styles.activePlanBadge}>
              <Text style={styles.activePlanBadgeText}>30d Plan</Text>
            </View>
          </View>

          {/* System Auto-Sync Explanation Banner */}
          <View style={styles.autoSyncBanner}>
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text style={styles.autoSyncBannerText}>
              Doctor sets a 1-month prescription plan and can update it anytime. The system automatically computes and displays ONLY today&apos;s medication plan on the Patient Dashboard, and triggers automated voice reminders at scheduled times.
            </Text>
          </View>

          {/* View Mode Switcher */}
          <View style={styles.docPlanTabsRow}>
            <TouchableOpacity
              style={[styles.docPlanTab, planViewMode === 'calendar' && styles.docPlanTabActive]}
              onPress={() => setPlanViewMode('calendar')}
            >
              <Ionicons
                name="calendar"
                size={16}
                color={planViewMode === 'calendar' ? '#6D28D9' : '#64748B'}
              />
              <Text style={[styles.docPlanTabText, planViewMode === 'calendar' && styles.docPlanTabTextActive]}>
                📅 Day Calendar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.docPlanTab, planViewMode === 'list' && styles.docPlanTabActive]}
              onPress={() => setPlanViewMode('list')}
            >
              <Ionicons
                name="list"
                size={16}
                color={planViewMode === 'list' ? '#6D28D9' : '#64748B'}
              />
              <Text style={[styles.docPlanTabText, planViewMode === 'list' && styles.docPlanTabTextActive]}>
                📋 Prescriptions ({medications.length})
              </Text>
            </TouchableOpacity>
          </View>

          {planViewMode === 'calendar' ? (
            <DailyMedicationCalendar
              patient={patient}
              currentUser={currentUser}
              isDoctorView={true}
            />
          ) : (
            <>
              {/* Dedicated, Prominently Placed Prescribe Action Button */}
              <TouchableOpacity
                style={[styles.prescribePrimaryBtn, showForm && styles.prescribePrimaryBtnCancel]}
                onPress={showForm ? () => setShowForm(false) : handleOpenAdd}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={showForm ? 'close-circle' : 'add-circle'}
              size={20}
              color={showForm ? '#4B5563' : '#FFFFFF'}
            />
            <Text style={[styles.prescribePrimaryBtnText, showForm && styles.prescribePrimaryBtnTextCancel]}>
              {showForm ? 'Cancel / Close Form' : '+ Prescribe New 1-Month Medication'}
            </Text>
          </TouchableOpacity>

          {/* Prescribe / Edit Form */}
          {showForm && (
            <View style={styles.formContainer}>
              <View style={styles.formHeaderRow}>
                <Text style={styles.formHeaderTitle}>
                  {editingMedId ? '✏️ Update Medication Plan' : '📋 Prescribe New 1-Month Medicine'}
                </Text>
                <Text style={styles.formHeaderSub}>
                  {editingMedId ? 'Modify dosage, times or instructions' : 'Default 30-day duration with automatic daily dispatch'}
                </Text>
              </View>

              {/* Quick Preset Medicines */}
              {!editingMedId && (
                <View style={styles.presetSection}>
                  <Text style={styles.fieldLabelSmall}>QUICK PRESETS (DEMENTIA CARE):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
                    {COMMON_DEMENTIA_MEDS.map((preset, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.presetChip, medName === preset.name && styles.presetChipActive]}
                        onPress={() => handleApplyPreset(preset)}
                      >
                        <Text style={[styles.presetChipText, medName === preset.name && styles.presetChipTextActive]}>
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Medicine Name & Dosage Inputs */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Medicine Name *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. Donepezil (Aricept)"
                  value={medName}
                  onChangeText={setMedName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.inputLabel}>Dosage *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 10 mg • 1 Tablet"
                    value={medDosage}
                    onChangeText={setMedDosage}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Scheduled Time *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="08:00 AM"
                    value={medTime}
                    onChangeText={setMedTime}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Quick Time Selection Chips */}
              <View style={styles.timeChipsRow}>
                {['08:00 AM', '01:00 PM', '06:00 PM', '08:00 PM', '09:30 PM'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, medTime === t && styles.timeChipActive]}
                    onPress={() => setMedTime(t)}
                  >
                    <Text style={[styles.timeChipText, medTime === t && styles.timeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Meal / Routine Period */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Routine Period</Text>
                <View style={styles.periodChipsRow}>
                  {[
                    'Morning with breakfast',
                    'Afternoon with lunch',
                    'Evening with dinner',
                    'Bedtime',
                  ].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.periodChip, medPeriod === p && styles.periodChipActive]}
                      onPress={() => setMedPeriod(p)}
                    >
                      <Text style={[styles.periodChipText, medPeriod === p && styles.periodChipTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Plan Duration Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Plan Duration (Editable Anytime)</Text>
                <View style={styles.durationRow}>
                  {[
                    { days: 30, label: '1 Month (30 Days)' },
                    { days: 60, label: '2 Months (60 Days)' },
                    { days: 14, label: '2 Weeks (14 Days)' },
                  ].map((dur) => (
                    <TouchableOpacity
                      key={dur.days}
                      style={[styles.durationChip, medDurationDays === dur.days && styles.durationChipActive]}
                      onPress={() => setMedDurationDays(dur.days)}
                    >
                      <Text style={[styles.durationChipText, medDurationDays === dur.days && styles.durationChipTextActive]}>
                        {dur.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Clinical Instructions */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Clinical Instructions / Notes</Text>
                <TextInput
                  style={[styles.inputField, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="e.g. Take with a full glass of water after food. Check blood pressure."
                  value={medInstructions}
                  onChangeText={setMedInstructions}
                  multiline
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Form Action Buttons */}
              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={styles.cancelFormBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveFormBtn}
                  onPress={handleSaveMedication}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveFormBtnText}>
                    {editingMedId ? 'Save Changes' : 'Confirm 1-Month Plan'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Active Medication Plan List */}
          <View style={styles.planListContainer}>
            {medications.length === 0 ? (
              <View style={styles.emptyPlanBox}>
                <Ionicons name="medkit-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyPlanTitle}>No Active Medications</Text>
                <Text style={styles.emptyPlanSub}>
                  Tap &quot;+ Prescribe&quot; above to set up a 1-month prescription plan for {patient.name}.
                </Text>
              </View>
            ) : (
              medications.map((med) => {
                const duration = med.durationDays || 30;
                const dateLabel = med.startDate && med.endDate
                  ? `${med.startDate} → ${med.endDate}`
                  : `Active (${duration} Days)`;

                return (
                  <View key={med.id} style={styles.medCard}>
                    <View style={styles.medCardHeader}>
                      <View style={styles.medCardTitleCol}>
                        <Text style={styles.medCardName}>{med.name}</Text>
                        <Text style={styles.medCardDosage}>{med.dosage}</Text>
                      </View>
                      <View style={styles.planDurationBadge}>
                        <MaterialCommunityIcons name="calendar-clock" size={13} color="#059669" />
                        <Text style={styles.planDurationBadgeText}>{duration}d Plan</Text>
                      </View>
                    </View>

                    {/* Time & Routine Row */}
                    <View style={styles.medMetaRow}>
                      <View style={styles.medTimeTag}>
                        <Ionicons name="time-outline" size={13} color="#2563EB" />
                        <Text style={styles.medTimeTagText}>{med.time || '08:00 AM'}</Text>
                      </View>
                      <Text style={styles.medPeriodText}>• {med.period || 'Scheduled Dose'}</Text>
                    </View>

                    {/* Date validity */}
                    <View style={styles.dateValidityRow}>
                      <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                      <Text style={styles.dateValidityText}>{dateLabel}</Text>
                    </View>

                    {med.instructions ? (
                      <View style={styles.instructionsBox}>
                        <Text style={styles.instructionsText}>&quot;{med.instructions}&quot;</Text>
                      </View>
                    ) : null}

                    {/* Today's Live Intake Status Pill */}
                    {(() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const raw = ((med.dayStatuses && med.dayStatuses[todayStr]) || med.status || '').toLowerCase();
                      const isTakenToday = raw === 'taken';
                      const isMissedToday = raw === 'missed';

                      return (
                        <View style={[
                          styles.todayIntakeBadge,
                          isTakenToday && styles.todayIntakeTaken,
                          isMissedToday && styles.todayIntakeMissed,
                          !isTakenToday && !isMissedToday && styles.todayIntakePending,
                        ]}>
                          <Ionicons
                            name={isTakenToday ? 'checkmark-circle' : isMissedToday ? 'close-circle' : 'time-outline'}
                            size={14}
                            color={isTakenToday ? '#059669' : isMissedToday ? '#DC2626' : '#D97706'}
                          />
                          <Text style={[
                            styles.todayIntakeText,
                            isTakenToday && styles.todayIntakeTextTaken,
                            isMissedToday && styles.todayIntakeTextMissed,
                            !isTakenToday && !isMissedToday && styles.todayIntakeTextPending,
                          ]}>
                            {isTakenToday
                              ? `Today's Dose: TAKEN ✓${med.lastTakenTime ? ` at ${med.lastTakenTime}` : ''}`
                              : isMissedToday
                              ? "Today's Dose: MISSED ✕ (Patient marked missed)"
                              : "Today's Dose: PENDING (Awaiting Patient)"}
                          </Text>
                        </View>
                      );
                    })()}

                    {/* Action Buttons: Edit, Test Reminder, Discontinue */}
                    <View style={styles.medCardActionsRow}>
                      <TouchableOpacity
                        style={styles.testReminderBtn}
                        onPress={() => handleTestReminder(med)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="notifications-outline" size={14} color="#D97706" />
                        <Text style={styles.testReminderBtnText}>Test Reminder</Text>
                      </TouchableOpacity>

                      <View style={styles.rightActionBtns}>
                        <TouchableOpacity
                          style={styles.editMedBtn}
                          onPress={() => handleOpenEdit(med)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={15} color="#2563EB" />
                          <Text style={styles.editMedBtnText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteMedBtn}
                          onPress={() => handleDeleteMed(med.id, med.name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={15} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
          </>
          )}
        </View>

      </ScrollView>

      {/* Comprehensive Patient Vitals Telemetry Page Modal (Doctor View-Only) */}
      <PatientVitalsMonitorModal
        visible={vitalsModalVisible}
        initialPatient={patient}
        patients={[patient]}
        isReadOnly={true}
        onClose={() => setVitalsModalVisible(false)}
      />

      {/* Monthly Patient History & Downloadable Report Modal */}
      <MonthlyPatientHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        patients={[patient]}
        initialPatient={patient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  docPlanTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  docPlanTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  docPlanTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  docPlanTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  docPlanTabTextActive: {
    color: '#6D28D9',
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    gap: 4,
  },
  headerReportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarSectionCard: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  patientProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  patientName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  patientId: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  patientCondition: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  caregiverInfo: {
    marginBottom: 16,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  caregiverPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  prescriptionList: {
    marginBottom: 16,
    gap: 8,
  },
  prescriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  prescriptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  addPrescriptionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: '#059669',
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  aiResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  aiResultLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5B21B6',
    marginRight: 8,
  },
  aiResultValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4C1D95',
  },
  aiProbTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  aiProbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  aiProbKey: {
    fontSize: 13,
    color: '#6B7280',
  },
  aiProbVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  aiErrorText: {
    fontSize: 14,
    color: '#DC2626',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  // 1-Month Medication Plan Styles
  planSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  sectionHeaderTitleCol: {
    flex: 1,
  },
  planIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSubTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activePlanBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activePlanBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  autoSyncBanner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  autoSyncBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
    flex: 1,
  },
  prescribePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  prescribePrimaryBtnCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  prescribePrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  prescribePrimaryBtnTextCancel: {
    color: '#4B5563',
  },
  formContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  formHeaderRow: {
    marginBottom: 10,
  },
  formHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  formHeaderSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  presetSection: {
    marginBottom: 12,
  },
  fieldLabelSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  presetScroll: {
    gap: 6,
    paddingBottom: 4,
  },
  presetChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  presetChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
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
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: '#111827',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  timeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  timeChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  timeChipText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  periodChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  periodChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  periodChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  periodChipText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  periodChipTextActive: {
    color: '#FFFFFF',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  durationChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  durationChipTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelFormBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  cancelFormBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveFormBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  saveFormBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planListContainer: {
    marginTop: 14,
    gap: 10,
  },
  emptyPlanBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyPlanTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  emptyPlanSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  medCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medCardTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  medCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  medCardDosage: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  planDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planDurationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  medMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  medTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  medTimeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  medPeriodText: {
    fontSize: 12,
    color: '#4B5563',
  },
  dateValidityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  dateValidityText: {
    fontSize: 11,
    color: '#6B7280',
  },
  instructionsBox: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  instructionsText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#4B5563',
  },
  medCardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  testReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  testReminderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  rightActionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  editMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editMedBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  deleteMedBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsDetailCard: {
    borderColor: '#FECDD3',
    borderWidth: 1,
  },
  vitalsSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vitalsSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vitalsIconCircleDetail: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveStreamBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  livePulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveStreamBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  statusHeroPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusHeroPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  docVitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  docVitalBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: 10,
  },
  docVitalBoxLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  docVitalValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  docVitalBoxValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  docVitalBoxUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  docVitalBoxHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  vitalsAttributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  vitalsAttributionText: {
    fontSize: 11,
    color: '#64748B',
  },
  vitalsNotesCard: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  vitalsNotesLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#854D0E',
    marginBottom: 2,
  },
  vitalsNotesText: {
    fontSize: 12,
    color: '#713F12',
    fontStyle: 'italic',
  },
  vitalsActionRowDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  vitalsViewOnlyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  vitalsViewOnlyChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  openVitalsModalBtnDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  openVitalsModalBtnDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  todayIntakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  todayIntakeTaken: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  todayIntakePending: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  todayIntakeMissed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  todayIntakeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  todayIntakeTextTaken: {
    color: '#065F46',
  },
  todayIntakeTextPending: {
    color: '#B45309',
  },
  todayIntakeTextMissed: {
    color: '#991B1B',
  },
});
