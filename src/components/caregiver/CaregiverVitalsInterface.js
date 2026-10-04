// src/components/caregiver/CaregiverVitalsInterface.js - Interactive Embedded Vitals Interface for Caregiver Dashboard
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getPatientVitalsHistory,
  recordPatientVitals,
  analyzeVitalsStatus,
} from '../../services/vitalsService';
import { syncService } from '../../services/syncService';

export default function CaregiverVitalsInterface({
  patients = [],
  initialPatient,
  caregiverName = 'Sarah Vance (Caregiver)',
  onOpenFullMonitor,
  onVitalsUpdated,
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(
    () => initialPatient?.id || patients[0]?.id || 'CARE-1001'
  );
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fast Record Form State
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [formHr, setFormHr] = useState('');
  const [formBp, setFormBp] = useState('');
  const [formSpo2, setFormSpo2] = useState('');
  const [formTemp, setFormTemp] = useState('');
  const [formGlucose, setFormGlucose] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Compute active patient
  const activePatient = useMemo(() => {
    return (
      patients.find((p) => p.id === selectedPatientId) ||
      initialPatient ||
      patients[0] ||
      { id: 'CARE-1001', name: 'Eleanor Vance' }
    );
  }, [patients, selectedPatientId, initialPatient]);

  // Load telemetry for active patient
  const loadVitals = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const history = await getPatientVitalsHistory(patientId);
      setVitalsHistory(history || []);
    } catch (_err) {
      console.warn('Failed to load vitals history');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (activePatient?.id) {
      Promise.resolve().then(() => {
        if (!isMounted) return;
        setLoading(true);
        getPatientVitalsHistory(activePatient.id)
          .then((history) => {
            if (isMounted) setVitalsHistory(history || []);
          })
          .catch(() => {})
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      });
    }

    return () => {
      isMounted = false;
    };
  }, [activePatient?.id]);

  // Listen to real-time vitals updates
  useEffect(() => {
    const unsub = syncService.on('vitals_updated', (incoming) => {
      const incomingId = (incoming.patientId || '').toUpperCase();
      if ((activePatient?.id || '').toUpperCase() === incomingId) {
        loadVitals(activePatient.id);
      }
    });

    return () => {
      unsub();
    };
  }, [activePatient?.id, loadVitals]);

  // Current latest reading for active patient
  const latestVitals = useMemo(() => {
    return vitalsHistory[0] || null;
  }, [vitalsHistory]);

  const analysis = useMemo(() => {
    if (!latestVitals) return { status: 'Awaiting Vitals', statusColor: '#94A3B8' };
    return analyzeVitalsStatus(latestVitals);
  }, [latestVitals]);

  // Presets for quick recording
  const handleApplyPreset = (type) => {
    if (type === 'normal') {
      setFormHr('72');
      setFormBp('120/80');
      setFormSpo2('98');
      setFormTemp('36.6');
      setFormGlucose('95');
      setFormNotes('Routine resting vitals check. Patient calm and responsive.');
    } else if (type === 'active') {
      setFormHr('84');
      setFormBp('126/82');
      setFormSpo2('97');
      setFormTemp('36.9');
      setFormGlucose('108');
      setFormNotes('Post-routine walk telemetry check. Good recovery.');
    } else if (type === 'elevated') {
      setFormHr('92');
      setFormBp('140/90');
      setFormSpo2('95');
      setFormTemp('37.5');
      setFormGlucose('128');
      setFormNotes('Mild elevation noted. Monitored for cognitive distress.');
    }
  };

  const handleSaveVitals = async () => {
    if (!formHr && !formBp && !formSpo2 && !formTemp && !formGlucose) {
      Alert.alert('Missing Data', 'Please enter at least one biometric value (e.g. Heart Rate or Blood Pressure).');
      return;
    }

    setSaving(true);
    try {
      const raw = {
        hr: formHr,
        bp: formBp,
        spo2: formSpo2,
        temp: formTemp,
        glucose: formGlucose,
        notes: formNotes,
      };

      const { newRecord, updatedHistory } = await recordPatientVitals(
        activePatient.id,
        raw,
        caregiverName
      );

      setVitalsHistory(updatedHistory);
      setShowRecordForm(false);
      setFormHr('');
      setFormBp('');
      setFormSpo2('');
      setFormTemp('');
      setFormGlucose('');
      setFormNotes('');

      if (onVitalsUpdated) {
        onVitalsUpdated(newRecord, activePatient.id);
      }

      Alert.alert(
        'Vitals Broadcasted',
        `Successfully logged ${newRecord.status} telemetry for ${activePatient.name}. Synced to patient device & doctor dashboard.`
      );
    } catch (_err) {
      Alert.alert('Error', 'Failed to save vitals telemetry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.containerCard}>
      {/* 1. Header with live status badge & Full Monitor link */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconDisc}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#E11D48" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Patient Vital Monitor</Text>
            <View style={styles.liveStreamBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveStreamText}>LIVE CLINICAL TELEMETRY</Text>
            </View>
          </View>
        </View>

        {onOpenFullMonitor && (
          <TouchableOpacity
            style={styles.fullMonitorBtn}
            onPress={() => onOpenFullMonitor(activePatient)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="monitor-dashboard" size={14} color="#7C3AED" />
            <Text style={styles.fullMonitorBtnText}>Full Screen</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Patient-by-Patient Switcher Bar */}
      {patients.length > 0 && (
        <View style={styles.patientSelectorRow}>
          <Text style={styles.patientSelectorTitle}>MONITOR PATIENT BY PATIENT:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.patientChipsScroll}
          >
            {patients.map((p) => {
              const isSelected = p.id === activePatient.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientChip, isSelected && styles.patientChipActive]}
                  onPress={() => setSelectedPatientId(p.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.patientChipDot, isSelected && styles.patientChipDotActive]} />
                  <Text style={[styles.patientChipName, isSelected && styles.patientChipNameActive]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.patientChipId, isSelected && styles.patientChipIdActive]}>
                    ({p.id})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 3. Active Patient Summary Banner */}
      <View style={styles.activePatientBanner}>
        <View style={styles.apbLeft}>
          <Text style={styles.apbName}>{activePatient.name}</Text>
          <Text style={styles.apbCondition}>
            {activePatient.condition || 'Dementia Care'} • {activePatient.id}
          </Text>
        </View>
        <View style={[styles.apbBadge, { backgroundColor: (analysis.statusColor || '#10B981') + '18' }]}>
          <View style={[styles.apbDot, { backgroundColor: analysis.statusColor || '#10B981' }]} />
          <Text style={[styles.apbBadgeText, { color: analysis.statusColor || '#059669' }]}>
            {analysis.status}
          </Text>
        </View>
      </View>

      {/* 4. Live Biometric Tiles Grid */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading biometric telemetry...</Text>
        </View>
      ) : (
        <View style={styles.metricsGrid}>
          {/* Heart Rate */}
          <View style={[styles.metricTile, { borderLeftColor: '#E11D48' }]}>
            <View style={styles.metricTileTop}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#FFE4E6' }]}>
                <Ionicons name="heart" size={16} color="#E11D48" />
              </View>
              <Text style={styles.metricLabel}>Heart Rate</Text>
            </View>
            <View style={styles.metricTileValRow}>
              <Text style={styles.metricBigVal}>{latestVitals?.hr || '--'}</Text>
              <Text style={styles.metricUnit}>BPM</Text>
            </View>
            <Text style={styles.metricSubtitle}>
              {latestVitals?.hr ? (latestVitals.hr > 100 ? '⚠️ High' : latestVitals.hr < 55 ? '⚠️ Low' : '✓ Normal Resting') : 'No check'}
            </Text>
          </View>

          {/* Blood Pressure */}
          <View style={[styles.metricTile, { borderLeftColor: '#3B82F6' }]}>
            <View style={styles.metricTileTop}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <MaterialCommunityIcons name="gauge" size={16} color="#2563EB" />
              </View>
              <Text style={styles.metricLabel}>Blood Pressure</Text>
            </View>
            <View style={styles.metricTileValRow}>
              <Text style={styles.metricBigVal}>{latestVitals?.bp || '--'}</Text>
              <Text style={styles.metricUnit}>mmHg</Text>
            </View>
            <Text style={styles.metricSubtitle}>
              {latestVitals?.bp ? (latestVitals.bp.includes('140') ? '⚠️ Stage 1 High' : '✓ Normotensive') : 'No check'}
            </Text>
          </View>

          {/* Blood Oxygen */}
          <View style={[styles.metricTile, { borderLeftColor: '#06B6D4' }]}>
            <View style={styles.metricTileTop}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#CFFAFE' }]}>
                <MaterialCommunityIcons name="water-percent" size={16} color="#0891B2" />
              </View>
              <Text style={styles.metricLabel}>SpO2 Oxygen</Text>
            </View>
            <View style={styles.metricTileValRow}>
              <Text style={styles.metricBigVal}>{latestVitals?.spo2 || '--'}</Text>
              <Text style={styles.metricUnit}>%</Text>
            </View>
            <Text style={styles.metricSubtitle}>
              {latestVitals?.spo2 ? (latestVitals.spo2 < 95 ? '⚠️ Low Oxygen' : '✓ Optimal (≥95%)') : 'No check'}
            </Text>
          </View>

          {/* Temperature */}
          <View style={[styles.metricTile, { borderLeftColor: '#F59E0B' }]}>
            <View style={styles.metricTileTop}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="thermometer" size={16} color="#D97706" />
              </View>
              <Text style={styles.metricLabel}>Temperature</Text>
            </View>
            <View style={styles.metricTileValRow}>
              <Text style={styles.metricBigVal}>{latestVitals?.temp || '--'}</Text>
              <Text style={styles.metricUnit}>°C</Text>
            </View>
            <Text style={styles.metricSubtitle}>
              {latestVitals?.temp ? (Number(latestVitals.temp) >= 37.5 ? '⚠️ Elevated' : '✓ Normal') : 'No check'}
            </Text>
          </View>

          {/* Blood Glucose */}
          <View style={[styles.metricTile, { borderLeftColor: '#8B5CF6' }]}>
            <View style={styles.metricTileTop}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#EDE9FE' }]}>
                <MaterialCommunityIcons name="needle" size={16} color="#7C3AED" />
              </View>
              <Text style={styles.metricLabel}>Blood Glucose</Text>
            </View>
            <View style={styles.metricTileValRow}>
              <Text style={styles.metricBigVal}>{latestVitals?.glucose || '--'}</Text>
              <Text style={styles.metricUnit}>mg/dL</Text>
            </View>
            <Text style={styles.metricSubtitle}>
              {latestVitals?.glucose ? (latestVitals.glucose > 140 ? '⚠️ High' : '✓ Normal (<100)') : 'No check'}
            </Text>
          </View>
        </View>
      )}

      {/* Observation Note if present */}
      {latestVitals?.notes ? (
        <View style={styles.observationBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color="#475569" style={{ marginTop: 2 }} />
          <Text style={styles.observationText} numberOfLines={2}>
            &ldquo;{latestVitals.notes}&rdquo; — <Text style={{ fontStyle: 'normal', color: '#64748B' }}>{latestVitals.recordedBy || 'Caregiver'}</Text>
          </Text>
        </View>
      ) : null}

      {/* 5. Action Buttons (Toggle Record Form & Toggle History) */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, showRecordForm && styles.primaryActionBtnCancel]}
          onPress={() => setShowRecordForm(!showRecordForm)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={showRecordForm ? 'close-circle' : 'add-circle'}
            size={16}
            color={showRecordForm ? '#475569' : '#FFFFFF'}
          />
          <Text style={[styles.primaryActionBtnText, showRecordForm && styles.primaryActionBtnTextCancel]}>
            {showRecordForm ? 'Cancel Entry' : '+ Record Vitals for ' + activePatient.name.split(' ')[0]}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryActionBtn, showHistory && styles.secondaryActionBtnActive]}
          onPress={() => setShowHistory(!showHistory)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="history"
            size={16}
            color={showHistory ? '#6D28D9' : '#475569'}
          />
          <Text style={[styles.secondaryActionBtnText, showHistory && styles.secondaryActionBtnTextActive]}>
            {showHistory ? 'Hide Logs' : `History (${vitalsHistory.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 6. Inline Fast-Record Vitals Drawer */}
      {showRecordForm && (
        <View style={styles.recordFormContainer}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formTitle}>Record Clinical Telemetry</Text>
            <Text style={styles.formSub}>Patient: {activePatient.name} ({activePatient.id})</Text>
          </View>

          {/* Quick-Fill Presets */}
          <Text style={styles.presetsLabel}>QUICK-FILL BIOMETRIC PRESETS:</Text>
          <View style={styles.presetsRow}>
            <TouchableOpacity style={styles.presetChip} onPress={() => handleApplyPreset('normal')}>
              <Text style={styles.presetChipText}>🟢 Normal Resting</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetChip} onPress={() => handleApplyPreset('active')}>
              <Text style={styles.presetChipText}>🟡 Post-Walk</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetChip} onPress={() => handleApplyPreset('elevated')}>
              <Text style={styles.presetChipText}>🔴 Warning Check</Text>
            </TouchableOpacity>
          </View>

          {/* Numeric Fields */}
          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Heart Rate (BPM)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="72"
                keyboardType="numeric"
                value={formHr}
                onChangeText={setFormHr}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Blood Pressure</Text>
              <TextInput
                style={styles.inputField}
                placeholder="120/80"
                value={formBp}
                onChangeText={setFormBp}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>SpO2 Oxygen (%)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="98"
                keyboardType="numeric"
                value={formSpo2}
                onChangeText={setFormSpo2}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Temperature (°C)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="36.6"
                keyboardType="decimal-pad"
                value={formTemp}
                onChangeText={setFormTemp}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Glucose (mg/dL)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="98"
                keyboardType="numeric"
                value={formGlucose}
                onChangeText={setFormGlucose}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.inputFull}>
            <Text style={styles.inputLabel}>Caregiver Clinical Notes</Text>
            <TextInput
              style={[styles.inputField, styles.notesInput]}
              placeholder="e.g. Patient calm, completed morning hydration."
              value={formNotes}
              onChangeText={setFormNotes}
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitVitalsBtn}
            onPress={handleSaveVitals}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitVitalsBtnText}>Save & Broadcast Telemetry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 7. Historical Audit Logs List (Collapsible) */}
      {showHistory && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Telemetry Audit Trail for {activePatient.name}</Text>
          {vitalsHistory.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No past readings recorded yet.</Text>
          ) : (
            vitalsHistory.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.historyItemCard}>
                <View style={styles.hicTop}>
                  <Text style={styles.hicTime}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                  </Text>
                  <View style={[styles.hicBadge, { backgroundColor: (log.statusColor || '#10B981') + '20' }]}>
                    <Text style={[styles.hicBadgeText, { color: log.statusColor || '#059669' }]}>
                      {log.status || 'Normal'}
                    </Text>
                  </View>
                </View>
                <View style={styles.hicMetricsRow}>
                  {log.hr ? <Text style={styles.hicMetricChip}>❤️ {log.hr} BPM</Text> : null}
                  {log.bp ? <Text style={styles.hicMetricChip}>🩺 {log.bp}</Text> : null}
                  {log.spo2 ? <Text style={styles.hicMetricChip}>🫁 {log.spo2}%</Text> : null}
                  {log.temp ? <Text style={styles.hicMetricChip}>🌡️ {log.temp}°C</Text> : null}
                  {log.glucose ? <Text style={styles.hicMetricChip}>🩸 {log.glucose} mg/dL</Text> : null}
                </View>
                {log.notes ? <Text style={styles.hicNotes} numberOfLines={1}>&ldquo;{log.notes}&rdquo;</Text> : null}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  containerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  liveStreamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveStreamText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  fullMonitorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: 4,
  },
  fullMonitorBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },

  // Patient Selector
  patientSelectorRow: {
    marginBottom: 10,
  },
  patientSelectorTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  patientChipsScroll: {
    gap: 8,
    paddingBottom: 2,
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  patientChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  patientChipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#94A3B8',
    marginRight: 6,
  },
  patientChipDotActive: {
    backgroundColor: '#7C3AED',
  },
  patientChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  patientChipNameActive: {
    color: '#6D28D9',
  },
  patientChipId: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 4,
  },
  patientChipIdActive: {
    color: '#7C3AED',
  },

  // Active Patient Summary Banner
  activePatientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  apbLeft: {
    flex: 1,
  },
  apbName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  apbCondition: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  apbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
    gap: 5,
  },
  apbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  apbBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricTile: {
    width: '48.5%',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 3.5,
  },
  metricTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  metricTileValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  metricBigVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  metricSubtitle: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },

  // Observation Box
  observationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 9,
    borderRadius: 10,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  observationText: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Actions Bar
  actionsBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 5,
  },
  primaryActionBtnCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryActionBtnTextCancel: {
    color: '#475569',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 4,
  },
  secondaryActionBtnActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  secondaryActionBtnTextActive: {
    color: '#6D28D9',
  },

  // Inline Fast-Record Form
  recordFormContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeaderRow: {
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  presetsLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  inputCol: {
    flex: 1,
  },
  inputFull: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0F172A',
  },
  notesInput: {
    height: 48,
    textAlignVertical: 'top',
  },
  submitVitalsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitVitalsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Historical Logs
  historyContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  historyItemCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hicTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hicTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  hicBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  hicBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  hicMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  hicMetricChip: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#FFFFFF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hicNotes: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },

  loadingBox: {
    padding: 18,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
});
