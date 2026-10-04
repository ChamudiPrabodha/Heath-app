// src/components/caregiver/UpdateVitalsModal.js - Clinical Vitals Entry & History
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import {
  recordPatientVitals,
  getPatientVitalsHistory,
  deleteVitalsRecord,
  analyzeVitalsStatus,
} from '../../services/vitalsService';

export default function UpdateVitalsModal({
  visible,
  patient,
  caregiverName = 'Sarah Vance (Caregiver)',
  onVitalsUpdated,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('record'); // 'record' | 'history'
  const [hr, setHr] = useState('');
  const [bp, setBp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temp, setTemp] = useState('');
  const [glucose, setGlucose] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    if (!patient?.id) return;
    setLoadingHistory(true);
    try {
      const records = await getPatientVitalsHistory(patient.id);
      setHistory(records || []);
    } catch (_e) {
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load history whenever modal opens or patient changes
  useEffect(() => {
    let isMounted = true;
    if (visible && patient?.id) {
      Promise.resolve().then(() => {
        if (isMounted) loadHistory();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [visible, patient?.id]);

  const applyPreset = (presetType) => {
    if (presetType === 'normal') {
      setHr('72');
      setBp('120/80');
      setSpo2('98');
      setTemp('36.6');
      setGlucose('95');
      setNotes('Routine resting vitals check. Patient hydrated and calm.');
    } else if (presetType === 'post_activity') {
      setHr('84');
      setBp('126/82');
      setSpo2('97');
      setTemp('36.9');
      setGlucose('108');
      setNotes('Post-routine activity check. Heart rate recovered quickly.');
    } else if (presetType === 'elevated') {
      setHr('88');
      setBp('138/88');
      setSpo2('96');
      setTemp('37.2');
      setGlucose('118');
      setNotes('Slight elevation noted. Patient monitored for discomfort.');
    }
  };

  const handleSave = async () => {
    if (!hr && !bp && !spo2 && !temp && !glucose) {
      Alert.alert('Missing Data', 'Please enter at least one biometric vital sign to record.');
      return;
    }

    setSaving(true);
    try {
      const rawVitals = { hr, bp, spo2, temp, glucose, notes };
      const { newRecord, updatedHistory } = await recordPatientVitals(
        patient.id,
        rawVitals,
        caregiverName
      );

      setHistory(updatedHistory);
      if (onVitalsUpdated) {
        onVitalsUpdated(newRecord, patient.id);
      }

      Alert.alert(
        '✅ Vitals Recorded & Synced',
        `Vitals have been updated for ${patient.name || patient.id} and live-synced to the Patient Dashboard interface immediately.`,
        [
          {
            text: 'View History',
            onPress: () => setActiveTab('history'),
          },
          {
            text: 'Done',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );

      resetForm();
    } catch (err) {
      Alert.alert('Error', 'Failed to save vitals: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = (recordId) => {
    Alert.alert(
      'Delete Vitals Entry',
      'Are you sure you want to permanently remove this vitals record from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteVitalsRecord(patient.id, recordId);
            setHistory(updated);
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setHr('');
    setBp('');
    setSpo2('');
    setTemp('');
    setGlucose('');
    setNotes('');
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Today at ${timeStr}`;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch (_e) {
      return 'Recent';
    }
  };

  if (!visible || !patient) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <MaterialCommunityIcons name="heart-pulse" size={24} color="#E11D48" />
              </View>
              <View>
                <Text style={styles.title}>Patient Vitals</Text>
                <Text style={styles.subtitle}>
                  {patient.name || 'Patient'} • ID: {patient.id}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'record' && styles.tabBtnActive]}
              onPress={() => setActiveTab('record')}
            >
              <Ionicons
                name="add-circle"
                size={18}
                color={activeTab === 'record' ? '#E11D48' : '#64748B'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'record' && styles.tabBtnTextActive]}
              >
                Record Vitals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
              onPress={() => setActiveTab('history')}
            >
              <Ionicons
                name="time"
                size={18}
                color={activeTab === 'history' ? '#2563EB' : '#64748B'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextHistoryActive]}
              >
                History ({history.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'record' ? (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Clinical Presets */}
              <View style={styles.presetsCard}>
                <Text style={styles.presetTitle}>⚡ Quick Clinical Presets</Text>
                <View style={styles.presetButtonsRow}>
                  <TouchableOpacity
                    style={[styles.presetChip, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}
                    onPress={() => applyPreset('normal')}
                  >
                    <Text style={[styles.presetChipText, { color: '#065F46' }]}>Normal Resting</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChip, { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]}
                    onPress={() => applyPreset('post_activity')}
                  >
                    <Text style={[styles.presetChipText, { color: '#1E40AF' }]}>Post Activity</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChip, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}
                    onPress={() => applyPreset('elevated')}
                  >
                    <Text style={[styles.presetChipText, { color: '#92400E' }]}>Mild Elevation</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Grid */}
              <View style={styles.inputGrid}>
                {/* Heart Rate */}
                <View style={styles.inputCol}>
                  <View style={styles.labelRow}>
                    <Ionicons name="heart" size={15} color="#E11D48" />
                    <Text style={styles.label}>Heart Rate</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 72"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={hr}
                      onChangeText={setHr}
                    />
                    <Text style={styles.inputSuffix}>BPM</Text>
                  </View>
                </View>

                {/* Blood Pressure */}
                <View style={styles.inputCol}>
                  <View style={styles.labelRow}>
                    <MaterialCommunityIcons name="gauge" size={15} color="#3B82F6" />
                    <Text style={styles.label}>Blood Pressure</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 120/80"
                      placeholderTextColor="#94A3B8"
                      value={bp}
                      onChangeText={setBp}
                    />
                    <Text style={styles.inputSuffix}>mmHg</Text>
                  </View>
                </View>

                {/* SpO2 */}
                <View style={styles.inputCol}>
                  <View style={styles.labelRow}>
                    <MaterialCommunityIcons name="water-percent" size={15} color="#06B6D4" />
                    <Text style={styles.label}>Blood Oxygen</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 98"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={spo2}
                      onChangeText={setSpo2}
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                  </View>
                </View>

                {/* Body Temperature */}
                <View style={styles.inputCol}>
                  <View style={styles.labelRow}>
                    <Ionicons name="thermometer" size={15} color="#F59E0B" />
                    <Text style={styles.label}>Temperature</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 36.6"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      value={temp}
                      onChangeText={setTemp}
                    />
                    <Text style={styles.inputSuffix}>°C</Text>
                  </View>
                </View>

                {/* Blood Glucose */}
                <View style={styles.inputColFull}>
                  <View style={styles.labelRow}>
                    <MaterialCommunityIcons name="needle" size={15} color="#8B5CF6" />
                    <Text style={styles.label}>Blood Glucose (Optional)</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 95 (Fasting) or 115"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={glucose}
                      onChangeText={setGlucose}
                    />
                    <Text style={styles.inputSuffix}>mg/dL</Text>
                  </View>
                </View>

                {/* Caregiver Clinical Notes */}
                <View style={styles.inputColFull}>
                  <View style={styles.labelRow}>
                    <Ionicons name="document-text-outline" size={15} color="#475569" />
                    <Text style={styles.label}>Clinical Notes / Symptoms</Text>
                  </View>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Enter observations, symptoms, physical state, hydration..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </View>

              {/* Live Status Analysis Preview */}
              {(hr || bp || spo2 || temp || glucose) && (
                <View style={styles.previewBox}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="shield-checkmark" size={16} color="#059669" />
                    <Text style={styles.previewTitle}>Automatic Analysis Status Preview</Text>
                  </View>
                  {(() => {
                    const analysis = analyzeVitalsStatus({ hr, bp, spo2, temp, glucose });
                    return (
                      <View style={[styles.statusBadge, { backgroundColor: analysis.statusColor + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: analysis.statusColor }]} />
                        <Text style={[styles.statusBadgeText, { color: analysis.statusColor }]}>
                          {analysis.status}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={18} color="#FFF" />
                      <Text style={styles.saveBtnText}>Update & Sync Vitals</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* History Tab */
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {loadingHistory ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.loadingText}>Loading vitals history...</Text>
                </View>
              ) : history.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="clipboard-text-clock-outline" size={54} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>No Vitals Recorded Yet</Text>
                  <Text style={styles.emptySub}>
                    Switch to the Record Vitals tab above to log the patient&apos;s first biometric update.
                  </Text>
                  <TouchableOpacity
                    style={styles.switchTabBtn}
                    onPress={() => setActiveTab('record')}
                  >
                    <Ionicons name="add" size={18} color="#FFF" />
                    <Text style={styles.switchTabBtnText}>Record First Vital</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.historyList}>
                  <View style={styles.historyHeaderRow}>
                    <Text style={styles.historySectionTitle}>Chronological Audit Log</Text>
                    <TouchableOpacity onPress={loadHistory} style={styles.refreshBtn}>
                      <Ionicons name="refresh" size={14} color="#2563EB" />
                      <Text style={styles.refreshBtnText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>

                  {history.map((item) => (
                    <View key={item.id} style={styles.historyCard}>
                      <View style={styles.historyCardTop}>
                        <View style={styles.timestampRow}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
                        </View>

                        <View style={styles.historyTopRight}>
                          <View
                            style={[
                              styles.statusBadgeSmall,
                              { backgroundColor: (item.statusColor || '#10B981') + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeSmallText,
                                { color: item.statusColor || '#059669' },
                              ]}
                            >
                              {item.status || 'Normal'}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleDeleteRecord(item.id)}
                            style={styles.deleteMiniBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Vital Metrics Chips */}
                      <View style={styles.chipsGrid}>
                        {item.hr ? (
                          <View style={styles.vitalChip}>
                            <Ionicons name="heart" size={13} color="#E11D48" />
                            <Text style={styles.vitalChipLabel}>HR:</Text>
                            <Text style={styles.vitalChipVal}>{item.hr} BPM</Text>
                          </View>
                        ) : null}

                        {item.bp ? (
                          <View style={styles.vitalChip}>
                            <MaterialCommunityIcons name="gauge" size={13} color="#3B82F6" />
                            <Text style={styles.vitalChipLabel}>BP:</Text>
                            <Text style={styles.vitalChipVal}>{item.bp} mmHg</Text>
                          </View>
                        ) : null}

                        {item.spo2 ? (
                          <View style={styles.vitalChip}>
                            <MaterialCommunityIcons name="water-percent" size={13} color="#06B6D4" />
                            <Text style={styles.vitalChipLabel}>SpO2:</Text>
                            <Text style={styles.vitalChipVal}>{item.spo2}%</Text>
                          </View>
                        ) : null}

                        {item.temp ? (
                          <View style={styles.vitalChip}>
                            <Ionicons name="thermometer" size={13} color="#F59E0B" />
                            <Text style={styles.vitalChipLabel}>Temp:</Text>
                            <Text style={styles.vitalChipVal}>{item.temp}°C</Text>
                          </View>
                        ) : null}

                        {item.glucose ? (
                          <View style={styles.vitalChip}>
                            <MaterialCommunityIcons name="needle" size={13} color="#8B5CF6" />
                            <Text style={styles.vitalChipLabel}>Glucose:</Text>
                            <Text style={styles.vitalChipVal}>{item.glucose} mg/dL</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Clinical Notes & Recorded By */}
                      {item.notes ? (
                        <View style={styles.historyNotesBox}>
                          <Text style={styles.historyNotesText}>&ldquo;{item.notes}&rdquo;</Text>
                        </View>
                      ) : null}

                      <View style={styles.historyFooter}>
                        <FontAwesome5 name="user-nurse" size={12} color="#94A3B8" />
                        <Text style={styles.historyRecorderText}>
                          Logged by: {item.recordedBy || 'Caregiver'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
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
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#E11D48',
    fontWeight: '700',
  },
  tabBtnTextHistoryActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  body: {
    maxHeight: 520,
  },
  presetsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  inputCol: {
    width: '48%',
  },
  inputColFull: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  inputSuffix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 4,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 68,
    textAlignVertical: 'top',
  },
  previewBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // History Styles
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  switchTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
  },
  switchTabBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historyList: {
    paddingBottom: 20,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  historyTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: '800',
  },
  deleteMiniBtn: {
    padding: 4,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  vitalChipLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  vitalChipVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  historyNotesBox: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    marginBottom: 8,
  },
  historyNotesText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyRecorderText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
