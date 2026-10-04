// src/components/patient/MedicationModal.js - Interactive Medication Schedule & Adherence
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { syncService } from '../../services/syncService';
// Notifications removed due to error

import {
  getTodayMedicationsForPatient,
  updateMedicationDayStatus,
} from '../../services/patientManagementService';

export default function MedicationModal({ visible, onClose, roomCode }) {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTodayMeds = async () => {
    if (!roomCode) return;
    try {
      const todayList = await getTodayMedicationsForPatient(roomCode);
      if (Array.isArray(todayList) && todayList.length > 0) {
        setMeds(todayList);
      } else {
        // Fallback default starter doses
        setMeds([
          {
            id: '1',
            name: 'Donepezil (Aricept)',
            dosage: '10 mg • 1 Tablet',
            time: '08:00 AM',
            period: 'Morning with breakfast',
            status: 'taken',
            color: '#10B981',
          },
          {
            id: '2',
            name: 'Vitamin B-Complex & D3',
            dosage: '1 Capsule',
            time: '01:00 PM',
            period: 'Afternoon with lunch',
            status: 'pending',
            color: '#3B82F6',
          },
          {
            id: '3',
            name: 'Amlodipine (Blood Pressure)',
            dosage: '5 mg • 1 Tablet',
            time: '08:00 PM',
            period: 'Evening with dinner',
            status: 'pending',
            color: '#F59E0B',
          },
          {
            id: '4',
            name: 'Omega-3 Fish Oil',
            dosage: '1000 mg • 1 Softgel',
            time: '09:30 PM',
            period: 'Bedtime',
            status: 'pending',
            color: '#8B5CF6',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && roomCode) {
      loadTodayMeds();
    }
  }, [visible, roomCode]);

  useEffect(() => {
    const unsubPlan = syncService.on('medication_plan_updated', (msg) => {
      const targetId = (msg.patientId || '').toUpperCase().trim();
      const myId = (roomCode || '').toUpperCase().trim();
      if (!targetId || targetId === myId) {
        loadTodayMeds();
      }
    });

    const unsubNew = syncService.on('new_prescription', () => {
      loadTodayMeds();
    });

    return () => {
      if (unsubPlan) unsubPlan();
      if (unsubNew) unsubNew();
    };
  }, [roomCode]);

  const triggerMedicineReminderFlow = (medId, medName) => {
    syncService.triggerMedicationReminder(roomCode, medId);
    Alert.alert(
      "⏰ Safety Reminder Triggered",
      `Automated reminder workflow dispatched for ${medName}!\n\nVoice alarms, vibration, and push notification sent. If no response within 45s, status will be recorded as MISSED.`
    );
  };

  const updateMedStatus = async (id, newStatus) => {
    const med = meds.find((m) => m.id === id);
    if (!med) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const capitalizedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

    if (roomCode) {
      await updateMedicationDayStatus(roomCode, id, todayStr, capitalizedStatus);
    }

    // Notify backend, caregiver and doctor immediately
    syncService.sendMedicationResponse(null, roomCode, id, newStatus.toLowerCase(), med.name, med.dosage);
    syncService.sendMedicationStatusUpdate(roomCode, med.name, newStatus.toLowerCase(), med.dosage);

    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, status: capitalizedStatus } : m)));

    if (newStatus.toLowerCase() === 'taken') {
      Alert.alert('Medicine Confirmed ✓', `You marked ${med.name} (${med.dosage || ''}) as TAKEN. Caregiver and doctor have been notified.`);
    } else if (newStatus.toLowerCase() === 'missed') {
      Alert.alert('Medication Missed ⚠️', `You marked ${med.name} as MISSED. Caregiver and doctor have been notified.`);
    }
  };

  const takenCount = meds.filter((m) => (m.status || '').toLowerCase() === 'taken').length;
  const progressPercent = meds.length > 0 ? Math.round((takenCount / meds.length) * 100) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="pill" size={24} color="#10B981" />
              </View>
              <View>
                <Text style={styles.title}>Medication Plan</Text>
                <Text style={styles.subtitle}>Today&apos;s dosage schedule</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Adherence Progress Bar */}
          <View style={styles.progressCard}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Today&apos;s Adherence</Text>
              <Text style={styles.progressValue}>
                {takenCount} of {meds.length} Taken ({progressPercent}%)
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* List of Medications */}
          <ScrollView style={styles.list}>
            {meds.map((item) => {
              const normStatus = (item.status || 'pending').toLowerCase();
              const isTaken = normStatus === 'taken';
              const isMissed = normStatus === 'missed';
              const isPending = !isTaken && !isMissed;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.medCard,
                    isTaken && styles.medCardTaken,
                    isMissed && styles.medCardMissed,
                  ]}
                >
                  <View style={styles.medDetails}>
                    <View style={styles.medTopRow}>
                      <Text style={[
                        styles.medName,
                        isTaken && styles.medNameTaken,
                        isMissed && styles.medNameMissed,
                      ]}>
                        {item.name}
                      </Text>
                      <View style={styles.topBadgesRow}>
                        <View style={styles.timeBadge}>
                          <Ionicons name="time-outline" size={12} color="#4B5563" />
                          <Text style={styles.timeText}>{item.time}</Text>
                        </View>
                        {isTaken ? (
                          <View style={styles.badgeTaken}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={styles.badgeTakenText}>Taken ✓</Text>
                          </View>
                        ) : isMissed ? (
                          <View style={styles.badgeMissed}>
                            <Ionicons name="close-circle" size={12} color="#DC2626" />
                            <Text style={styles.badgeMissedText}>Missed ✕</Text>
                          </View>
                        ) : (
                          <View style={styles.badgePending}>
                            <Ionicons name="hourglass-outline" size={12} color="#D97706" />
                            <Text style={styles.badgePendingText}>Scheduled</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.dosageText}>{item.dosage}</Text>
                    <Text style={styles.periodText}>{item.period}</Text>
                  </View>

                  {/* Status Actions */}
                  <View style={styles.actionsContainer}>
                    {isPending ? (
                      <View style={styles.buttonsRow}>
                        <TouchableOpacity 
                          style={styles.actionBtnGet} 
                          onPress={() => updateMedStatus(item.id, 'taken')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnGetText}>Get Medicine</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.actionBtnMiss} 
                          onPress={() => updateMedStatus(item.id, 'missed')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnMissText}>Missed</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.notifyBtn} 
                          onPress={() => triggerMedicineReminderFlow(item.id, item.name)}
                          activeOpacity={0.8}
                          accessibilityLabel="Test Alarm"
                        >
                          <Ionicons name="notifications" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : isTaken ? (
                      <View style={styles.activeResultRow}>
                        <View style={styles.resultMsgBoxTaken}>
                          <Ionicons name="checkmark-circle" size={16} color="#059669" />
                          <Text style={styles.resultMsgTextTaken}>Medicine Confirmed Taken ✓</Text>
                        </View>
                        <View style={styles.resultActionBtns}>
                          <TouchableOpacity 
                            style={styles.miniSwitchBtn} 
                            onPress={() => updateMedStatus(item.id, 'missed')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.miniSwitchBtnText}>Change to Missed</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.resetBtn} 
                            onPress={() => updateMedStatus(item.id, 'pending')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.resetBtnText}>Undo</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.activeResultRow}>
                        <View style={styles.resultMsgBoxMissed}>
                          <Ionicons name="alert-circle" size={16} color="#DC2626" />
                          <Text style={styles.resultMsgTextMissed}>Marked as Missed ✕</Text>
                        </View>
                        <View style={styles.resultActionBtns}>
                          <TouchableOpacity 
                            style={styles.miniTakeNowBtn} 
                            onPress={() => updateMedStatus(item.id, 'taken')}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.miniTakeNowBtnText}>Get Medicine Now</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.resetBtn} 
                            onPress={() => updateMedStatus(item.id, 'pending')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.resetBtnText}>Undo</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Bottom Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    maxHeight: '88%',
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
  progressCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  list: {
    marginBottom: 16,
  },
  medCard: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  medCardTaken: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  medCardMissed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  medNameMissed: {
    color: '#991B1B',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  dosageText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  periodText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionBtnGet: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnGetText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  actionBtnMiss: {
    flex: 1.4,
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnMissText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  notifyBtn: {
    backgroundColor: '#3B82F6',
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeTaken: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgeTakenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  badgeMissed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgeMissedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
  },
  badgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  activeResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultMsgBoxTaken: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultMsgTextTaken: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  resultMsgBoxMissed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultMsgTextMissed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
  },
  resultActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniSwitchBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  miniSwitchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  miniTakeNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  miniTakeNowBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resetBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 11,
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
