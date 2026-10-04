// src/components/patient/VitalsModal.js - Patient Health Telemetry & Vitals Tracking
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function VitalsModal({ visible, vitalsData, onClose }) {
  const hrVal = vitalsData?.hr ? String(vitalsData.hr) : '72';
  const hrNum = Number(hrVal);
  const isHrAbnormal = hrNum > 100 || hrNum < 50;

  const bpVal = vitalsData?.bp || '120/80';
  const spo2Val = vitalsData?.spo2 ? String(vitalsData.spo2) : '98';
  const spo2Num = Number(spo2Val);
  const isSpo2Low = spo2Num < 92;

  const tempVal = vitalsData?.temp ? String(vitalsData.temp) : '36.6';
  const tempNum = Number(tempVal);
  const isFever = tempNum >= 38.0;

  const vitals = [
    {
      id: 'hr',
      label: 'Heart Rate',
      value: hrVal,
      unit: 'BPM',
      status: isHrAbnormal ? 'Attention' : 'Normal / Optimal',
      statusColor: isHrAbnormal ? '#EF4444' : '#10B981',
      icon: 'heart-pulse',
      iconColor: '#EF4444',
      time: vitalsData ? 'Caregiver Live Sync' : 'Checked 15m ago',
      desc: 'Resting pulse in optimal healthy range',
    },
    {
      id: 'bp',
      label: 'Blood Pressure',
      value: bpVal,
      unit: 'mmHg',
      status: vitalsData?.status?.includes('BP') ? vitalsData.status : 'Normal',
      statusColor: vitalsData?.status?.includes('BP') ? '#F59E0B' : '#10B981',
      icon: 'gauge',
      iconColor: '#3B82F6',
      time: vitalsData ? 'Caregiver Live Sync' : 'Checked today 08:30 AM',
      desc: 'Systolic / Diastolic arterial pressure',
    },
    {
      id: 'spo2',
      label: 'Blood Oxygen (SpO2)',
      value: `${spo2Val}%`,
      unit: '',
      status: isSpo2Low ? 'Low SpO2' : 'Optimal',
      statusColor: isSpo2Low ? '#EF4444' : '#10B981',
      icon: 'water-percent',
      iconColor: '#06B6D4',
      time: vitalsData ? 'Caregiver Live Sync' : 'Checked 1h ago',
      desc: 'Oxygen saturation level in blood cells',
    },
    {
      id: 'temp',
      label: 'Body Temperature',
      value: tempVal,
      unit: '°C',
      status: isFever ? 'Fever' : 'Normal',
      statusColor: isFever ? '#EF4444' : '#10B981',
      icon: 'thermometer',
      iconColor: '#F59E0B',
      time: vitalsData ? 'Caregiver Live Sync' : 'Checked today 08:00 AM',
      desc: 'Core thermal temperature monitoring',
    },
    ...(vitalsData?.glucose
      ? [
          {
            id: 'glucose',
            label: 'Blood Glucose',
            value: `${vitalsData.glucose}`,
            unit: 'mg/dL',
            status:
              Number(vitalsData.glucose) > 140
                ? 'Elevated'
                : Number(vitalsData.glucose) < 70
                ? 'Low'
                : 'Normal',
            statusColor:
              Number(vitalsData.glucose) > 140 || Number(vitalsData.glucose) < 70
                ? '#EF4444'
                : '#10B981',
            icon: 'needle',
            iconColor: '#8B5CF6',
            time: 'Caregiver Logged',
            desc: 'Blood sugar biometric reading',
          },
        ]
      : []),
    {
      id: 'steps',
      label: 'Daily Steps',
      value: '3,420',
      unit: '/ 5,000 steps',
      status: '68% Goal',
      statusColor: '#3B82F6',
      icon: 'walk',
      iconColor: '#10B981',
      time: 'Live counter',
      desc: 'Active distance: ~2.4 km walked today',
    },
    {
      id: 'sleep',
      label: 'Sleep Quality',
      value: '7h 35m',
      unit: '',
      status: 'Restful',
      statusColor: '#10B981',
      icon: 'bed',
      iconColor: '#8B5CF6',
      time: 'Last night',
      desc: 'Deep sleep: 2h 10m • Light sleep: 5h 25m',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="heart-pulse" size={24} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.title}>Health Vitals</Text>
                <Text style={styles.subtitle}>Real-time biometric telemetry</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Caregiver Update Notice Banner */}
          {vitalsData?.recordedBy ? (
            <View style={styles.caregiverBanner}>
              <View style={styles.caregiverBannerIconBox}>
                <MaterialCommunityIcons name="doctor" size={22} color="#047857" />
              </View>
              <View style={styles.caregiverBannerContent}>
                <View style={styles.caregiverBannerTop}>
                  <Text style={styles.caregiverBannerTitle}>
                    Updated by {vitalsData.recordedBy}
                  </Text>
                  <View
                    style={[
                      styles.bannerStatusPill,
                      { backgroundColor: (vitalsData.statusColor || '#10B981') + '25' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bannerStatusText,
                        { color: vitalsData.statusColor || '#059669' },
                      ]}
                    >
                      {vitalsData.status || 'Normal'}
                    </Text>
                  </View>
                </View>
                {vitalsData.notes ? (
                  <Text style={styles.caregiverBannerNotes}>&ldquo;{vitalsData.notes}&rdquo;</Text>
                ) : (
                  <Text style={styles.caregiverBannerSub}>
                    Telemetry was verified and recorded just now.
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {/* List of Vitals */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {vitals.map((v) => (
              <View key={v.id} style={styles.vitalCard}>
                <View style={[styles.vitalIconCircle, { backgroundColor: `${v.iconColor}15` }]}>
                  <MaterialCommunityIcons name={v.icon} size={22} color={v.iconColor} />
                </View>

                <View style={styles.vitalDetails}>
                  <View style={styles.vitalTop}>
                    <Text style={styles.vitalLabel}>{v.label}</Text>
                    <View style={[styles.statusPill, { backgroundColor: `${v.statusColor}15` }]}>
                      <Text style={[styles.statusPillText, { color: v.statusColor }]}>
                        {v.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.valueRow}>
                    <Text style={styles.vitalValue}>{v.value}</Text>
                    {v.unit ? <Text style={styles.vitalUnit}>{v.unit}</Text> : null}
                  </View>

                  <Text style={styles.vitalDesc}>{v.desc}</Text>
                  <Text style={styles.vitalTime}>{v.time}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Vitals</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    backgroundColor: '#FEE2E2',
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
  caregiverBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  caregiverBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  caregiverBannerContent: {
    flex: 1,
  },
  caregiverBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  caregiverBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  bannerStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bannerStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  caregiverBannerSub: {
    fontSize: 12,
    color: '#047857',
  },
  caregiverBannerNotes: {
    fontSize: 12,
    color: '#065F46',
    fontStyle: 'italic',
    marginTop: 2,
  },
  list: {
    marginBottom: 16,
    maxHeight: 480,
  },
  vitalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  vitalIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  vitalDetails: {
    flex: 1,
  },
  vitalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vitalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  vitalUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  vitalDesc: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  vitalTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  doneBtn: {
    backgroundColor: '#10B981',
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
