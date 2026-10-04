// src/components/caregiver/PatientCardVitalsSection.js - Interactive Vitals Telemetry Section on Patient Card
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { analyzeVitalsStatus } from '../../services/vitalsService';

export default function PatientCardVitalsSection({
  patient,
  vitals,
  onRecordVitals,
  onOpenMonitor,
}) {
  const analysis = useMemo(() => {
    if (!vitals) return null;
    return analyzeVitalsStatus({
      hr: vitals.hr,
      bp: vitals.bp,
      spo2: vitals.spo2,
      temp: vitals.temp,
      glucose: vitals.glucose,
    });
  }, [vitals]);

  const statusLabel = useMemo(() => {
    if (!vitals) return 'Awaiting Check';
    if (vitals.status) return vitals.status;
    if (analysis) return analysis.summary;
    return 'Normal';
  }, [vitals, analysis]);

  const statusColor = useMemo(() => {
    if (!vitals) return '#94A3B8';
    if (vitals.statusColor) return vitals.statusColor;
    if (analysis) return analysis.statusColor;
    return '#10B981';
  }, [vitals, analysis]);

  const formattedTime = useMemo(() => {
    if (!vitals?.timestamp) return null;
    try {
      const d = new Date(vitals.timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_e) {
      return null;
    }
  }, [vitals]);

  // When no vitals recorded yet for this patient
  if (!vitals) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={[styles.iconDisc, { backgroundColor: '#F1F5F9' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={15} color="#64748B" />
            </View>
            <Text style={styles.sectionTitle}>Patient Vitals</Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Pending</Text>
          </View>
        </View>

        <View style={styles.emptyContent}>
          <Text style={styles.emptySubText}>
            No vitals logged yet for {patient?.name || 'this patient'}.
          </Text>
          <TouchableOpacity
            style={styles.emptyRecordBtn}
            onPress={() => onRecordVitals && onRecordVitals(patient)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyRecordBtnText}>Record First Vitals</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Individual biometric status flags
  const hrAbnormal = vitals.hr && (Number(vitals.hr) > 100 || Number(vitals.hr) < 55);
  const bpAbnormal = vitals.bp && (
    (typeof vitals.bp === 'string' && Number(vitals.bp.split('/')[0]) >= 130) ||
    (typeof vitals.bp === 'string' && Number(vitals.bp.split('/')[1]) >= 85)
  );
  const spo2Abnormal = vitals.spo2 && Number(vitals.spo2) < 95;
  const tempAbnormal = vitals.temp && Number(vitals.temp) >= 37.5;
  const glucoseAbnormal = vitals.glucose && (Number(vitals.glucose) > 140 || Number(vitals.glucose) < 70);

  return (
    <View style={styles.container}>
      {/* 1. Header Bar: Title, Live Status & Checked Time */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconDisc, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="heart-pulse" size={15} color="#E11D48" />
          </View>
          <View>
            <View style={styles.titleFlexRow}>
              <Text style={styles.sectionTitle}>Patient Vitals</Text>
              <View style={styles.livePulseDot} />
            </View>
            {formattedTime && (
              <Text style={styles.timestampText}>Checked at {formattedTime}</Text>
            )}
          </View>
        </View>

        {/* Status Pill Badge */}
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}
          onPress={() => onOpenMonitor && onOpenMonitor(patient)}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Biometrics Grid: 5 metric tiles */}
      <View style={styles.biometricsGrid}>
        {/* Heart Rate */}
        <View style={[styles.vitalCard, hrAbnormal && styles.vitalCardAlert]}>
          <View style={styles.vitalCardTop}>
            <Ionicons name="heart" size={13} color={hrAbnormal ? '#EF4444' : '#E11D48'} />
            <Text style={styles.vitalCardLabel}>Heart Rate</Text>
          </View>
          <View style={styles.vitalValueRow}>
            <Text style={[styles.vitalValueText, hrAbnormal && { color: '#DC2626' }]}>
              {vitals.hr || '--'}
            </Text>
            <Text style={styles.vitalUnitText}>BPM</Text>
          </View>
          <Text style={styles.vitalRangeText}>60-100</Text>
        </View>

        {/* Blood Pressure */}
        <View style={[styles.vitalCard, bpAbnormal && styles.vitalCardAlert]}>
          <View style={styles.vitalCardTop}>
            <MaterialCommunityIcons name="gauge" size={13} color={bpAbnormal ? '#EF4444' : '#2563EB'} />
            <Text style={styles.vitalCardLabel}>Blood Press.</Text>
          </View>
          <View style={styles.vitalValueRow}>
            <Text style={[styles.vitalValueText, bpAbnormal && { color: '#DC2626' }]}>
              {vitals.bp || '--'}
            </Text>
            <Text style={styles.vitalUnitText}>mmHg</Text>
          </View>
          <Text style={styles.vitalRangeText}>&lt;120/80</Text>
        </View>

        {/* SpO2 Oxygen */}
        <View style={[styles.vitalCard, spo2Abnormal && styles.vitalCardAlert]}>
          <View style={styles.vitalCardTop}>
            <MaterialCommunityIcons name="water-percent" size={13} color={spo2Abnormal ? '#EF4444' : '#0891B2'} />
            <Text style={styles.vitalCardLabel}>SpO2</Text>
          </View>
          <View style={styles.vitalValueRow}>
            <Text style={[styles.vitalValueText, spo2Abnormal && { color: '#DC2626' }]}>
              {vitals.spo2 || '--'}
            </Text>
            <Text style={styles.vitalUnitText}>%</Text>
          </View>
          <Text style={styles.vitalRangeText}>95-100%</Text>
        </View>

        {/* Body Temperature */}
        <View style={[styles.vitalCard, tempAbnormal && styles.vitalCardAlert]}>
          <View style={styles.vitalCardTop}>
            <Ionicons name="thermometer" size={13} color={tempAbnormal ? '#EF4444' : '#D97706'} />
            <Text style={styles.vitalCardLabel}>Temp</Text>
          </View>
          <View style={styles.vitalValueRow}>
            <Text style={[styles.vitalValueText, tempAbnormal && { color: '#DC2626' }]}>
              {vitals.temp || '--'}
            </Text>
            <Text style={styles.vitalUnitText}>°C</Text>
          </View>
          <Text style={styles.vitalRangeText}>36.1-37.2</Text>
        </View>

        {/* Blood Glucose (if available or standard) */}
        {vitals.glucose ? (
          <View style={[styles.vitalCard, glucoseAbnormal && styles.vitalCardAlert]}>
            <View style={styles.vitalCardTop}>
              <MaterialCommunityIcons name="needle" size={13} color={glucoseAbnormal ? '#EF4444' : '#7C3AED'} />
              <Text style={styles.vitalCardLabel}>Glucose</Text>
            </View>
            <View style={styles.vitalValueRow}>
              <Text style={[styles.vitalValueText, glucoseAbnormal && { color: '#DC2626' }]}>
                {vitals.glucose}
              </Text>
              <Text style={styles.vitalUnitText}>mg/dL</Text>
            </View>
            <Text style={styles.vitalRangeText}>70-140</Text>
          </View>
        ) : null}
      </View>

      {/* 3. Clinical Notes Strip (if present) */}
      {vitals.notes ? (
        <View style={styles.notesContainer}>
          <FontAwesome5 name="comment-medical" size={11} color="#6366F1" style={{ marginRight: 6, marginTop: 1 }} />
          <Text style={styles.notesText} numberOfLines={2}>
            &ldquo;{vitals.notes}&rdquo;
          </Text>
        </View>
      ) : null}

      {/* 4. Action Buttons directly on this card's vitals section */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.recordVitalsBtn}
          onPress={() => onRecordVitals && onRecordVitals(patient)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={14} color="#059669" />
          <Text style={styles.recordVitalsBtnText}>Log New Reading</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.openMonitorBtn}
          onPress={() => onOpenMonitor && onOpenMonitor(patient)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="monitor-dashboard" size={14} color="#2563EB" />
          <Text style={styles.openMonitorBtnText}>Telemetry Monitor →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconDisc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleFlexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  timestampText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  biometricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  vitalCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  vitalCardAlert: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  vitalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  vitalCardLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  vitalValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  vitalValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  vitalUnitText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  vitalRangeText: {
    fontSize: 8.5,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    fontStyle: 'italic',
    color: '#3730A3',
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  recordVitalsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 6,
    borderRadius: 8,
  },
  recordVitalsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  openMonitorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 6,
    borderRadius: 8,
  },
  openMonitorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  // Empty State Styles
  emptyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pendingBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptySubText: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  emptyRecordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
