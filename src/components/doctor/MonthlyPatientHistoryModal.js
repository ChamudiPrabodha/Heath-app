// src/components/doctor/MonthlyPatientHistoryModal.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getAvailableMonths,
  getPatientMonthlyHistory,
  downloadPatientMonthlyReport,
} from '../../services/patientReportService';

export default function MonthlyPatientHistoryModal({
  visible,
  onClose,
  patients = [],
  initialPatient = null,
}) {
  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const [selectedPatientId, setSelectedPatientId] = useState(
    initialPatient?.id || (patients && patients.length > 0 ? patients[0].id : null)
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState(availableMonths[0].key);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'meds' | 'bookings'
  const [toastMessage, setToastMessage] = useState(null);

  // Derive selected patient without triggering cascading renders in an effect
  const selectedPatient = useMemo(() => {
    if (selectedPatientId && patients && patients.length > 0) {
      const match = patients.find((p) => p.id === selectedPatientId);
      if (match) return match;
    }
    return initialPatient || (patients && patients.length > 0 ? patients[0] : null);
  }, [selectedPatientId, patients, initialPatient]);

  // Load history data whenever patient or month changes
  useEffect(() => {
    let mounted = true;
    const fetchHistory = async () => {
      if (!selectedPatient) return;
      setLoading(true);
      try {
        const data = await getPatientMonthlyHistory(selectedPatient, selectedMonthKey);
        if (mounted) {
          setReportData(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching monthly history:', err);
        if (mounted) setLoading(false);
      }
    };

    if (visible && selectedPatient) {
      fetchHistory();
    }

    return () => {
      mounted = false;
    };
  }, [visible, selectedPatient, selectedMonthKey]);

  const handleDownload = async () => {
    if (!reportData) return;
    setDownloading(true);
    try {
      const res = await downloadPatientMonthlyReport(reportData);
      setDownloading(false);
      if (res && res.success) {
        const msg = `Monthly history report for ${selectedPatient.name} downloaded successfully!`;
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        Alert.alert('Download Completed', `Report generated for ${selectedPatient.name}.`);
      }
    } catch (err) {
      setDownloading(false);
      Alert.alert('Download Error', err.message || 'Could not download report.');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.title}>Monthly Patient History & Report</Text>
              <Text style={styles.subtitle}>Generate and download patient-by-patient history</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Toast Banner */}
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={styles.toastText} numberOfLines={2}>
              {toastMessage}
            </Text>
          </View>
        )}

        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent}>
          {/* Patient Selector Strip (Patient by Patient) */}
          <Text style={styles.sectionHeaderLabel}>Select Patient</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.patientChipsScroll}
          >
            {patients && patients.length > 0 ? (
              patients.map((p) => {
                const isSelected = selectedPatient && selectedPatient.id === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.patientChip, isSelected && styles.patientChipSelected]}
                    onPress={() => setSelectedPatientId(p.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.patientChipAvatar,
                        isSelected && styles.patientChipAvatarSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.patientChipAvatarText,
                          isSelected && styles.patientChipAvatarTextSelected,
                        ]}
                      >
                        {(p.name || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.patientChipName,
                          isSelected && styles.patientChipNameSelected,
                        ]}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={[
                          styles.patientChipId,
                          isSelected && styles.patientChipIdSelected,
                        ]}
                      >
                        ID: {p.id}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.patientChip}>
                <Text style={styles.patientChipName}>No Connected Patients</Text>
              </View>
            )}
          </ScrollView>

          {/* Month Selector Strip */}
          <Text style={styles.sectionHeaderLabel}>Select Reporting Month</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthChipsScroll}
          >
            {availableMonths.map((m) => {
              const isSelected = selectedMonthKey === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.monthChip, isSelected && styles.monthChipSelected]}
                  onPress={() => setSelectedMonthKey(m.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={isSelected ? '#FFFFFF' : '#4B5563'}
                  />
                  <Text
                    style={[styles.monthChipText, isSelected && styles.monthChipTextSelected]}
                  >
                    {m.label}
                  </Text>
                  {m.isCurrent && (
                    <View
                      style={[
                        styles.currentMonthBadge,
                        isSelected && styles.currentMonthBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.currentMonthBadgeText,
                          isSelected && styles.currentMonthBadgeTextSelected,
                        ]}
                      >
                        Active
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading monthly patient records...</Text>
            </View>
          ) : reportData ? (
            <>
              {/* Executive Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryTop}>
                  <View style={styles.summaryPatientCol}>
                    <Text style={styles.summaryPatientName}>{selectedPatient?.name}</Text>
                    <Text style={styles.summaryPatientCondition}>
                      {selectedPatient?.condition || 'Dementia • Wander Risk'}
                    </Text>
                  </View>
                  <View style={styles.monthBadge}>
                    <Text style={styles.monthBadgeText}>{reportData.monthLabel}</Text>
                  </View>
                </View>

                {/* 4 Metric KPI Boxes */}
                <View style={styles.kpiGrid}>
                  <View style={styles.kpiCard}>
                    <Text style={[styles.kpiVal, { color: '#059669' }]}>
                      {reportData.metrics.adherenceRate}%
                    </Text>
                    <Text style={styles.kpiLbl}>Med Adherence</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={[styles.kpiVal, { color: '#E11D48' }]}>
                      {reportData.metrics.avgHr} bpm
                    </Text>
                    <Text style={styles.kpiLbl}>Avg Heart Rate</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={[styles.kpiVal, { color: '#0284C7' }]}>
                      {reportData.metrics.avgSpo2}%
                    </Text>
                    <Text style={styles.kpiLbl}>Mean SpO2</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={[styles.kpiVal, { color: '#7C3AED' }]}>
                      {reportData.metrics.bookingsCount}
                    </Text>
                    <Text style={styles.kpiLbl}>Consultations</Text>
                  </View>
                </View>
              </View>

              {/* Download Action Banner */}
              <View style={styles.downloadActionBanner}>
                <View style={styles.downloadBannerLeft}>
                  <Ionicons name="cloud-download-outline" size={24} color="#1E40AF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.downloadBannerTitle}>
                      Generate & Download Full Report
                    </Text>
                    <Text style={styles.downloadBannerSub}>
                      Includes monthly vitals log, adherence tables & physician notes
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.downloadReportBtn}
                  onPress={handleDownload}
                  disabled={downloading}
                  activeOpacity={0.8}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="download" size={16} color="#FFFFFF" />
                      <Text style={styles.downloadReportBtnText}>Download</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Tab Navigation */}
              <View style={styles.tabNavRow}>
                <TouchableOpacity
                  style={[styles.tabNavBtn, activeTab === 'vitals' && styles.tabNavBtnActive]}
                  onPress={() => setActiveTab('vitals')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="heart-pulse"
                    size={16}
                    color={activeTab === 'vitals' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tabNavBtnText,
                      activeTab === 'vitals' && styles.tabNavBtnTextActive,
                    ]}
                  >
                    Vitals History ({reportData.vitalsLog.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabNavBtn, activeTab === 'meds' && styles.tabNavBtnActive]}
                  onPress={() => setActiveTab('meds')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="pill"
                    size={16}
                    color={activeTab === 'meds' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tabNavBtnText,
                      activeTab === 'meds' && styles.tabNavBtnTextActive,
                    ]}
                  >
                    Medication Plan ({reportData.medicationPlan.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabNavBtn, activeTab === 'bookings' && styles.tabNavBtnActive]}
                  onPress={() => setActiveTab('bookings')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar"
                    size={16}
                    color={activeTab === 'bookings' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tabNavBtnText,
                      activeTab === 'bookings' && styles.tabNavBtnTextActive,
                    ]}
                  >
                    Consultations ({reportData.bookingsLog.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content 1: Vitals History */}
              {activeTab === 'vitals' && (
                <View style={styles.tabContentCard}>
                  {reportData.vitalsLog.length === 0 ? (
                    <Text style={styles.emptyTabText}>
                      No vitals records found for {reportData.monthLabel}.
                    </Text>
                  ) : (
                    reportData.vitalsLog.map((v, i) => {
                      const dStr = v.timestamp
                        ? new Date(v.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Reading #' + (i + 1);

                      return (
                        <View key={i} style={styles.vitalsRowItem}>
                          <View style={styles.vitalsRowLeft}>
                            <Text style={styles.vitalsRowTime}>{dStr}</Text>
                            <View style={styles.vitalsRowMetrics}>
                              <Text style={styles.vitalsMetricTag}>
                                HR: <Text style={{ fontWeight: '800' }}>{v.hr || '--'} bpm</Text>
                              </Text>
                              <Text style={styles.vitalsMetricTag}>
                                BP: <Text style={{ fontWeight: '800' }}>{v.bp || '--'}</Text>
                              </Text>
                              <Text style={styles.vitalsMetricTag}>
                                SpO2: <Text style={{ fontWeight: '800' }}>{v.spo2 ? v.spo2 + '%' : '--'}</Text>
                              </Text>
                            </View>
                          </View>
                          <View style={styles.vitalsStatusBadge}>
                            <Text style={styles.vitalsStatusBadgeText}>Stable</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* Tab Content 2: Medication Plan */}
              {activeTab === 'meds' && (
                <View style={styles.tabContentCard}>
                  {reportData.medicationPlan.length === 0 ? (
                    <Text style={styles.emptyTabText}>No medications prescribed for this patient.</Text>
                  ) : (
                    reportData.medicationPlan.map((m, i) => (
                      <View key={i} style={styles.medRowItem}>
                        <View style={styles.medIconBox}>
                          <MaterialCommunityIcons name="pill" size={18} color="#2563EB" />
                        </View>
                        <View style={styles.medDetailsCol}>
                          <Text style={styles.medName}>{m.name}</Text>
                          <Text style={styles.medSub}>
                            {m.dosage || 'Standard'} • {m.period || m.time || 'Daily'}
                          </Text>
                          {m.instructions ? (
                            <Text style={styles.medInstructions}>{m.instructions}</Text>
                          ) : null}
                        </View>
                        <View style={styles.adherencePill}>
                          <Text style={styles.adherencePillText}>Prescribed</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* Tab Content 3: Doctor Bookings */}
              {activeTab === 'bookings' && (
                <View style={styles.tabContentCard}>
                  {reportData.bookingsLog.length === 0 ? (
                    <Text style={styles.emptyTabText}>
                      No clinical consultations scheduled in {reportData.monthLabel}.
                    </Text>
                  ) : (
                    reportData.bookingsLog.map((b) => (
                      <View key={b.id} style={styles.bookingRowItem}>
                        <View style={styles.bookingRowTop}>
                          <View style={styles.bookingTimeBadge}>
                            <Ionicons name="time" size={12} color="#2563EB" />
                            <Text style={styles.bookingTimeBadgeText}>{b.date} • {b.time}</Text>
                          </View>
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>{b.status || 'Confirmed'}</Text>
                          </View>
                        </View>
                        <Text style={styles.bookingTypeTitle}>{b.type || 'Consultation'}</Text>
                        {b.notes ? <Text style={styles.bookingNotes}>{b.notes}</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  patientChipsScroll: {
    gap: 8,
    marginBottom: 14,
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  patientChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  patientChipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientChipAvatarSelected: {
    backgroundColor: '#1D4ED8',
  },
  patientChipAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  patientChipAvatarTextSelected: {
    color: '#FFFFFF',
  },
  patientChipName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  patientChipNameSelected: {
    color: '#FFFFFF',
  },
  patientChipId: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  patientChipIdSelected: {
    color: '#BFDBFE',
  },
  monthChipsScroll: {
    gap: 8,
    marginBottom: 16,
  },
  monthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  monthChipTextSelected: {
    color: '#FFFFFF',
  },
  currentMonthBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentMonthBadgeSelected: {
    backgroundColor: '#2563EB',
  },
  currentMonthBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  currentMonthBadgeTextSelected: {
    color: '#FFFFFF',
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  summaryPatientCol: {
    flex: 1,
  },
  summaryPatientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryPatientCondition: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  monthBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  downloadActionBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  downloadBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  downloadBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  downloadBannerSub: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 1,
    lineHeight: 14,
  },
  downloadReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadReportBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabNavRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    gap: 2,
  },
  tabNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabNavBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabNavBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabNavBtnTextActive: {
    color: '#2563EB',
  },
  tabContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyTabText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  vitalsRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  vitalsRowLeft: {
    flex: 1,
  },
  vitalsRowTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  vitalsRowMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  vitalsMetricTag: {
    fontSize: 10,
    color: '#475569',
  },
  vitalsStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vitalsStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  medRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  medIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medDetailsCol: {
    flex: 1,
  },
  medName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  medSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  medInstructions: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 2,
    fontStyle: 'italic',
  },
  adherencePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adherencePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  bookingRowItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bookingRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bookingTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingTimeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  bookingTypeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  bookingNotes: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
});
