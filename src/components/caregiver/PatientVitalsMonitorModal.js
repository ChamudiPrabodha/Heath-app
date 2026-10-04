// src/components/caregiver/PatientVitalsMonitorModal.js - Comprehensive Patient Vital Signs Telemetry Monitor
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getPatientVitalsHistory,
  getLatestPatientVitals,
  analyzeVitalsStatus,
} from '../../services/vitalsService';
import { syncService } from '../../services/syncService';
import UpdateVitalsModal from './UpdateVitalsModal';

export default function PatientVitalsMonitorModal({
  visible,
  initialPatient,
  patients = [],
  caregiverName = 'Sarah Vance (Caregiver)',
  isReadOnly = false,
  initialTab = 'single',
  onClose,
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activeTabOverride, setActiveTabOverride] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [allPatientsVitalsMap, setAllPatientsVitalsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);

  const activePatientId = selectedPatientId || initialPatient?.id || patients[0]?.id || 'CARE-1001';
  const activeTab = activeTabOverride || initialTab || 'single';
  const setActiveTab = setActiveTabOverride;

  // Compute selected active patient
  const selectedPatient = useMemo(() => {
    return (
      (selectedPatientId && patients.find((p) => p.id === selectedPatientId)) ||
      initialPatient ||
      patients.find((p) => p.id === activePatientId) ||
      patients[0] ||
      { id: 'CARE-1001', name: 'Eleanor Vance' }
    );
  }, [patients, selectedPatientId, initialPatient, activePatientId]);

  // Load telemetry for selected patient
  const loadSelectedPatientVitals = useCallback(async (patientId) => {
    if (!patientId) return;
    setLoading(true);
    try {
      const history = await getPatientVitalsHistory(patientId);
      setVitalsHistory(history || []);
    } catch (_err) {
      console.warn('Failed to load vitals history');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load latest vitals for all patients (patient by patient comparison)
  const loadAllPatientsVitals = useCallback(async () => {
    if (!patients || patients.length === 0) return;
    try {
      const map = {};
      await Promise.all(
        patients.map(async (p) => {
          const latest = await getLatestPatientVitals(p.id);
          map[p.id] = latest;
        })
      );
      setAllPatientsVitalsMap(map);
    } catch (_err) {}
  }, [patients]);

  // Asynchronous telemetry fetch when modal is visible
  useEffect(() => {
    let isMounted = true;
    if (visible && selectedPatient?.id) {
      getPatientVitalsHistory(selectedPatient.id)
        .then((history) => {
          if (isMounted) setVitalsHistory(history || []);
        })
        .catch(() => {});

      if (patients && patients.length > 0) {
        Promise.all(
          patients.map(async (p) => {
            const latest = await getLatestPatientVitals(p.id);
            return { id: p.id, latest };
          })
        )
          .then((results) => {
            if (isMounted) {
              const map = {};
              results.forEach((r) => {
                map[r.id] = r.latest;
              });
              setAllPatientsVitalsMap(map);
            }
          })
          .catch(() => {});
      }
    }

    return () => {
      isMounted = false;
    };
  }, [visible, selectedPatient?.id, patients]);

  // Real-time listener for vitals updates
  useEffect(() => {
    const unsub = syncService.on('vitals_updated', (incoming) => {
      const incomingId = (incoming.patientId || '').toUpperCase();
      if (selectedPatient && (selectedPatient.id || '').toUpperCase() === incomingId) {
        loadSelectedPatientVitals(selectedPatient.id);
      }
      loadAllPatientsVitals();
    });

    return () => {
      unsub();
    };
  }, [selectedPatient, loadSelectedPatientVitals, loadAllPatientsVitals]);

  // Current latest reading for selected patient
  const latestVitals = useMemo(() => {
    return vitalsHistory[0] || null;
  }, [vitalsHistory]);

  const analysis = useMemo(() => {
    if (!latestVitals) return { status: 'Awaiting Vitals', statusColor: '#94A3B8' };
    return analyzeVitalsStatus(latestVitals);
  }, [latestVitals]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <MaterialCommunityIcons name="heart-pulse" size={24} color="#E11D48" />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isReadOnly ? 'Doctor Clinical Vitals Monitor' : 'Patient Vital Monitor'}
                </Text>
                <View style={styles.liveStreamBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveStreamText}>
                    {isReadOnly ? 'LIVE TELEMETRY • VIEW ONLY (UPDATED BY CAREGIVER)' : 'LIVE CLINICAL TELEMETRY'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setSelectedPatientId(null);
                setActiveTabOverride(null);
                onClose();
              }}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[styles.modeTab, activeTab === 'single' && styles.modeTabActive]}
              onPress={() => setActiveTab('single')}
            >
              <Ionicons name="person" size={15} color={activeTab === 'single' ? '#6D28D9' : '#64748B'} />
              <Text style={[styles.modeTabText, activeTab === 'single' && styles.modeTabTextActive]}>
                Patient Detail Monitor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, activeTab === 'all' && styles.modeTabActive]}
              onPress={() => setActiveTab('all')}
            >
              <MaterialCommunityIcons name="view-grid" size={16} color={activeTab === 'all' ? '#6D28D9' : '#64748B'} />
              <Text style={[styles.modeTabText, activeTab === 'all' && styles.modeTabTextActive]}>
                All Patients Compare ({patients.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Patient Selector Chip Carousel (patient-by-patient) */}
          {patients.length > 0 && (
            <View style={styles.patientSelectorContainer}>
              <Text style={styles.patientSelectorLabel}>SELECT PATIENT TO MONITOR:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientChipsScroll}>
                {patients.map((p) => {
                  const isSelected = selectedPatient?.id === p.id;
                  const ptVitals = allPatientsVitalsMap[p.id];
                  const statusDotColor = ptVitals?.statusColor || '#10B981';

                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.patientChip, isSelected && styles.patientChipActive]}
                      onPress={() => {
                        setSelectedPatientId(p.id);
                        setActiveTab('single');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.patientChipDot, { backgroundColor: statusDotColor }]} />
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

          {/* Body Content */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {activeTab === 'single' ? (
              <>
                {/* Patient Profile & Status Bar */}
                <View style={styles.patientHeroCard}>
                  <View style={styles.patientHeroTop}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {(selectedPatient?.name || 'P')[0].toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.patientHeroInfo}>
                      <Text style={styles.patientHeroName}>{selectedPatient?.name || 'Patient'}</Text>
                      <Text style={styles.patientHeroCondition}>
                        {selectedPatient?.condition || 'Dementia Care Monitoring'}
                      </Text>
                      <Text style={styles.patientHeroSub}>
                        Room / ID: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{selectedPatient?.id}</Text>
                        {selectedPatient?.age ? ` • ${selectedPatient.age} yrs` : ''}
                      </Text>
                    </View>

                    <View style={[styles.statusHeroBadge, { backgroundColor: (analysis.statusColor || '#10B981') + '18' }]}>
                      <View style={[styles.statusHeroDot, { backgroundColor: analysis.statusColor || '#10B981' }]} />
                      <Text style={[styles.statusHeroText, { color: analysis.statusColor || '#059669' }]}>
                        {analysis.status}
                      </Text>
                    </View>
                  </View>

                  {/* Timestamp & Recorded By Row */}
                  <View style={styles.heroFooterRow}>
                    <View style={styles.heroFooterLeft}>
                      <Ionicons name="time-outline" size={13} color="#64748B" />
                      <Text style={styles.heroFooterTimestamp}>
                        Last Check: {latestVitals?.timestamp ? new Date(latestVitals.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'No recent check'}
                      </Text>
                    </View>
                    <Text style={styles.heroFooterAuthor}>
                      By: {latestVitals?.recordedBy || 'Caregiver'}
                    </Text>
                  </View>
                </View>

                {/* Big Action Buttons */}
                <View style={styles.actionButtonsRow}>
                  {!isReadOnly ? (
                    <TouchableOpacity
                      style={styles.recordNewBtn}
                      onPress={() => setRecordModalVisible(true)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.recordNewBtnText}>Record Updated Vitals</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.readOnlyNoticeBox}>
                      <MaterialCommunityIcons name="shield-check" size={20} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.readOnlyNoticeTitle}>Doctor View-Only Mode</Text>
                        <Text style={styles.readOnlyNoticeSub}>
                          Telemetry is updated in real-time by the assigned caregiver.
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.refreshBtn, isReadOnly && styles.refreshBtnReadOnly]}
                    onPress={() => loadSelectedPatientVitals(selectedPatient?.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={16} color="#6D28D9" />
                    <Text style={styles.refreshBtnText}>Refresh</Text>
                  </TouchableOpacity>
                </View>

                {/* Biometric Tiles Grid */}
                <View style={styles.metricsGrid}>
                  {/* Heart Rate */}
                  <View style={[styles.metricCard, { borderLeftColor: '#E11D48' }]}>
                    <View style={styles.metricCardTop}>
                      <View style={[styles.metricIconWrap, { backgroundColor: '#FFE4E6' }]}>
                        <Ionicons name="heart" size={18} color="#E11D48" />
                      </View>
                      <Text style={styles.metricLabel}>Heart Rate</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricValueLarge}>{latestVitals?.hr || '--'}</Text>
                      <Text style={styles.metricUnit}>BPM</Text>
                    </View>
                    <Text style={styles.metricStatusHint}>
                      {latestVitals?.hr ? (latestVitals.hr > 100 ? '⚠️ Tachycardia' : latestVitals.hr < 55 ? '⚠️ Bradycardia' : '✓ Normal Resting (60-100)') : 'No Reading'}
                    </Text>
                  </View>

                  {/* Blood Pressure */}
                  <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                    <View style={styles.metricCardTop}>
                      <View style={[styles.metricIconWrap, { backgroundColor: '#DBEAFE' }]}>
                        <MaterialCommunityIcons name="gauge" size={18} color="#2563EB" />
                      </View>
                      <Text style={styles.metricLabel}>Blood Pressure</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricValueLarge}>{latestVitals?.bp || '--'}</Text>
                      <Text style={styles.metricUnit}>mmHg</Text>
                    </View>
                    <Text style={styles.metricStatusHint}>
                      {latestVitals?.bp ? (latestVitals.bp.includes('140') ? '⚠️ High Stage 1' : '✓ Normotensive (120/80)') : 'No Reading'}
                    </Text>
                  </View>

                  {/* Blood Oxygen (SpO2) */}
                  <View style={[styles.metricCard, { borderLeftColor: '#06B6D4' }]}>
                    <View style={styles.metricCardTop}>
                      <View style={[styles.metricIconWrap, { backgroundColor: '#CFFAFE' }]}>
                        <MaterialCommunityIcons name="water-percent" size={18} color="#0891B2" />
                      </View>
                      <Text style={styles.metricLabel}>Oxygen (SpO2)</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricValueLarge}>{latestVitals?.spo2 || '--'}</Text>
                      <Text style={styles.metricUnit}>%</Text>
                    </View>
                    <Text style={styles.metricStatusHint}>
                      {latestVitals?.spo2 ? (latestVitals.spo2 < 95 ? '⚠️ Low Oxygenation' : '✓ Optimal (≥ 95%)') : 'No Reading'}
                    </Text>
                  </View>

                  {/* Body Temperature */}
                  <View style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}>
                    <View style={styles.metricCardTop}>
                      <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="thermometer" size={18} color="#D97706" />
                      </View>
                      <Text style={styles.metricLabel}>Temperature</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricValueLarge}>{latestVitals?.temp || '--'}</Text>
                      <Text style={styles.metricUnit}>°C</Text>
                    </View>
                    <Text style={styles.metricStatusHint}>
                      {latestVitals?.temp ? (Number(latestVitals.temp) >= 37.5 ? '⚠️ Elevated / Fever' : '✓ Normal (36.5 - 37.2)') : 'No Reading'}
                    </Text>
                  </View>

                  {/* Blood Glucose */}
                  <View style={[styles.metricCard, { borderLeftColor: '#8B5CF6' }]}>
                    <View style={styles.metricCardTop}>
                      <View style={[styles.metricIconWrap, { backgroundColor: '#EDE9FE' }]}>
                        <MaterialCommunityIcons name="needle" size={18} color="#7C3AED" />
                      </View>
                      <Text style={styles.metricLabel}>Blood Glucose</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricValueLarge}>{latestVitals?.glucose || '--'}</Text>
                      <Text style={styles.metricUnit}>mg/dL</Text>
                    </View>
                    <Text style={styles.metricStatusHint}>
                      {latestVitals?.glucose ? (latestVitals.glucose > 140 ? '⚠️ High Sugar' : '✓ Normal Fasting (<100)') : 'No Reading'}
                    </Text>
                  </View>
                </View>

                {/* Latest Caregiver Observation Notes */}
                {latestVitals?.notes ? (
                  <View style={styles.notesBox}>
                    <View style={styles.notesBoxHeader}>
                      <Ionicons name="document-text" size={15} color="#475569" />
                      <Text style={styles.notesBoxTitle}>Caregiver Observation Notes</Text>
                    </View>
                    <Text style={styles.notesBoxBody}>&ldquo;{latestVitals.notes}&rdquo;</Text>
                  </View>
                ) : null}

                {/* Historical Audit Trail for Selected Patient */}
                <View style={styles.historySectionHeader}>
                  <View style={styles.historySectionTitleWrap}>
                    <MaterialCommunityIcons name="history" size={18} color="#6D28D9" />
                    <Text style={styles.historySectionTitle}>Telemetry Check History</Text>
                  </View>
                  <Text style={styles.historySectionCount}>{vitalsHistory.length} logs</Text>
                </View>

                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#7C3AED" />
                    <Text style={styles.loadingText}>Loading telemetry history...</Text>
                  </View>
                ) : vitalsHistory.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Vitals Logs Found</Text>
                    <Text style={styles.emptySub}>Tap &apos;Record Updated Vitals&apos; to log the first telemetry check.</Text>
                  </View>
                ) : (
                  vitalsHistory.map((item) => (
                    <View key={item.id} style={styles.logCard}>
                      <View style={styles.logCardHeader}>
                        <View style={styles.logCardLeft}>
                          <Text style={styles.logTimestamp}>
                            {item.timestamp ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent'}
                          </Text>
                          <Text style={styles.logAuthor}>Checked by {item.recordedBy || 'Caregiver'}</Text>
                        </View>
                        <View style={[styles.logStatusBadge, { backgroundColor: (item.statusColor || '#10B981') + '20' }]}>
                          <Text style={[styles.logStatusText, { color: item.statusColor || '#059669' }]}>
                            {item.status || 'Normal'}
                          </Text>
                        </View>
                      </View>

                      {/* Chips in Log */}
                      <View style={styles.logChipsRow}>
                        {item.hr ? <Text style={styles.logChip}>❤️ {item.hr} BPM</Text> : null}
                        {item.bp ? <Text style={styles.logChip}>🩺 {item.bp}</Text> : null}
                        {item.spo2 ? <Text style={styles.logChip}>🫁 {item.spo2}%</Text> : null}
                        {item.temp ? <Text style={styles.logChip}>🌡️ {item.temp}°C</Text> : null}
                        {item.glucose ? <Text style={styles.logChip}>🩸 {item.glucose} mg/dL</Text> : null}
                      </View>

                      {item.notes ? (
                        <Text style={styles.logNotesText} numberOfLines={2}>
                          💬 {item.notes}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </>
            ) : (
              /* All Patients Side-by-Side Comparison */
              <View style={styles.allPatientsContainer}>
                <Text style={styles.allPatientsHeader}>
                  Patient-by-Patient Telemetry Overview ({patients.length})
                </Text>
                <Text style={styles.allPatientsSub}>
                  Compare current biometric status across all dementia patients in your care.
                </Text>

                {patients.map((p) => {
                  const ptVitals = allPatientsVitalsMap[p.id];
                  const ptAnalysis = ptVitals ? analyzeVitalsStatus(ptVitals) : { status: 'No Record', statusColor: '#9CA3AF' };

                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.patientCompareCard}
                      onPress={() => {
                        setSelectedPatientId(p.id);
                        setActiveTab('single');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.compareCardTop}>
                        <View style={styles.compareAvatar}>
                          <Text style={styles.compareAvatarText}>{(p.name || 'P')[0]}</Text>
                        </View>
                        <View style={styles.compareInfo}>
                          <Text style={styles.compareName}>{p.name}</Text>
                          <Text style={styles.compareSub}>
                            {p.condition || 'Dementia Care'} • Room: {p.id}
                          </Text>
                        </View>
                        <View style={[styles.compareBadge, { backgroundColor: (ptAnalysis.statusColor || '#10B981') + '20' }]}>
                          <Text style={[styles.compareBadgeText, { color: ptAnalysis.statusColor || '#059669' }]}>
                            {ptAnalysis.status}
                          </Text>
                        </View>
                      </View>

                      {/* Metrics Row */}
                      <View style={styles.compareMetricsRow}>
                        <View style={styles.compareMetricItem}>
                          <Text style={styles.compareMetricLabel}>Heart Rate</Text>
                          <Text style={styles.compareMetricVal}>{ptVitals?.hr ? `${ptVitals.hr} BPM` : '--'}</Text>
                        </View>
                        <View style={styles.compareMetricItem}>
                          <Text style={styles.compareMetricLabel}>Blood Press.</Text>
                          <Text style={styles.compareMetricVal}>{ptVitals?.bp || '--'}</Text>
                        </View>
                        <View style={styles.compareMetricItem}>
                          <Text style={styles.compareMetricLabel}>SpO2</Text>
                          <Text style={styles.compareMetricVal}>{ptVitals?.spo2 ? `${ptVitals.spo2}%` : '--'}</Text>
                        </View>
                        <View style={styles.compareMetricItem}>
                          <Text style={styles.compareMetricLabel}>Temp</Text>
                          <Text style={styles.compareMetricVal}>{ptVitals?.temp ? `${ptVitals.temp}°C` : '--'}</Text>
                        </View>
                      </View>

                      <View style={styles.compareFooterRow}>
                        <Text style={styles.compareFooterTime}>
                          Checked: {ptVitals?.timestamp ? new Date(ptVitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </Text>
                        <View style={styles.compareOpenDetailWrap}>
                          <Text style={styles.compareOpenDetailText}>View Full Monitor</Text>
                          <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Record New Vitals Modal - only rendered if caregiver can edit */}
      {!isReadOnly && selectedPatient && (
        <UpdateVitalsModal
          visible={recordModalVisible}
          patient={selectedPatient}
          caregiverName={caregiverName}
          onVitalsUpdated={() => {
            loadSelectedPatientVitals(selectedPatient.id);
            loadAllPatientsVitals();
          }}
          onClose={() => setRecordModalVisible(false)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    height: '92%',
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  liveStreamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  liveStreamText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
  },

  // Mode Tabs
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 3,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#6D28D9',
    fontWeight: '800',
  },

  // Patient Selector
  patientSelectorContainer: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  patientSelectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  patientChipsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  patientChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  patientChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  patientChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
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

  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },

  // Patient Hero Card
  patientHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  patientHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  patientHeroInfo: {
    flex: 1,
  },
  patientHeroName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientHeroCondition: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 1,
  },
  patientHeroSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
  },
  statusHeroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusHeroText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  heroFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroFooterTimestamp: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  heroFooterAuthor: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },

  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  recordNewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  recordNewBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 4,
  },
  refreshBtnReadOnly: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
  },
  readOnlyNoticeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  readOnlyNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  readOnlyNoticeSub: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  metricStatusHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },

  // Notes Box
  notesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  notesBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notesBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  notesBoxBody: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // History Section
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  historySectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  historySectionCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logCardLeft: {
    flex: 1,
  },
  logTimestamp: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  logAuthor: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  logStatusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  logStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  logChip: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  logNotesText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 6,
    fontStyle: 'italic',
  },

  loadingBox: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },

  // All Patients Compare View
  allPatientsContainer: {
    gap: 10,
  },
  allPatientsHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  allPatientsSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  patientCompareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  compareCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  compareAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compareAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C3AED',
  },
  compareInfo: {
    flex: 1,
  },
  compareName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  compareSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  compareBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  compareBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  compareMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  compareMetricItem: {
    alignItems: 'center',
  },
  compareMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  compareMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  compareFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareFooterTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  compareOpenDetailWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compareOpenDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
});
