// src/components/patient/MedicationReminderModal.js - Figure 4.3 Safety-Critical Medication Reminder Modal
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { syncService } from '../../services/syncService';
import { updateMedicationDayStatus } from '../../services/patientManagementService';
import * as Speech from 'expo-speech';

export default function MedicationReminderModal({
  visible,
  reminderData,
  onClose,
  roomCode,
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(45);
  const [responseStatus, setResponseStatus] = useState(null); // 'taken' | 'skipped' | 'missed' | null
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const med = reminderData?.medication || {
    name: 'Donepezil (Aricept)',
    dosage: '10 mg • 1 Tablet',
    time: '08:00 AM',
    period: 'Morning with breakfast',
  };

  useEffect(() => {
    if (visible && reminderData) {
      const windowSecs = reminderData.windowSeconds || 45;
      const expiresAt = reminderData.expiresAt || (Date.now() + windowSecs * 1000);

      const startAlarmSequence = () => {
        // Continuous Vibration
        Vibration.vibrate([500, 1000], true);

        // Voice Command loop
        const playVoice = () => {
          Speech.speak(`Time to take your medication: ${med.name}. Dosage: ${med.dosage}.`, {
            rate: 0.9,
            pitch: 1.0,
            onDone: () => {
              // Wait 2 seconds before repeating
              setTimeout(() => playVoice(), 2000);
            }
          });
        };
        playVoice();
      };

      const resetTimer = setTimeout(() => {
        setResponseStatus(null);
        setFeedbackMessage('');
        setSecondsRemaining(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));

        startAlarmSequence();
      }, 0);

      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => {
        clearTimeout(resetTimer);
        clearInterval(interval);
        Speech.stop();
        Vibration.cancel();
      };
    }
  }, [visible, reminderData]);

  // Listen to autonomous timeout event from backend
  useEffect(() => {
    const unsubTimeout = syncService.on('medication_reminder_timeout', (msg) => {
      if (!reminderData || msg.reminderId === reminderData.reminderId) {
        setResponseStatus('missed');
        setFeedbackMessage(
          '⏰ Safety Response Window Expired.\nBackend independently recorded status as MISSED & alerted caregiver.'
        );
      }
    });

    return unsubTimeout;
  }, [reminderData]);

  const handleAction = (status) => {
    if (responseStatus) return; // Already responded or timed out
    
    // Stop alarms
    Speech.stop();
    Vibration.cancel();

    setResponseStatus(status);

    const reminderId = reminderData?.reminderId || ('manual-' + Date.now());
    const medId = med.id || 'm-1';

    const todayStr = new Date().toISOString().split('T')[0];
    const capitalizedStatus = status === 'taken' ? 'Taken' : 'Skipped';
    if (roomCode) {
      updateMedicationDayStatus(roomCode, medId, todayStr, capitalizedStatus).catch(() => {});
    }

    syncService.sendMedicationResponse(reminderId, roomCode, medId, status, med.name, med.dosage);
    syncService.sendMedicationStatusUpdate(roomCode, med.name, status, med.dosage);

    if (status === 'taken') {
      setFeedbackMessage('✓ Marked as TAKEN!\nMedicationLog created & adherence updated in real time.');
    } else {
      setFeedbackMessage('⚠ Marked as SKIPPED.\nMedicationLog created & caregiver alerted immediately.');
    }

    setTimeout(() => {
      if (onClose) onClose();
    }, 2500);
  };

  if (!visible) return null;

  const totalWindow = reminderData?.windowSeconds || 45;
  const progressRatio = Math.max(0, Math.min(1, secondsRemaining / totalWindow));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Safety Header Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.safetyBadge}>
              <View style={styles.safetyDot} />
              <Text style={styles.safetyBadgeText}>SAFETY-CRITICAL REMINDER</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Icon and Pill Visual */}
          <View style={styles.iconVisualWrap}>
            <View style={styles.iconPulseRing} />
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="pill" size={48} color="#059669" />
            </View>
          </View>

          {/* Medicine Details */}
          <Text style={styles.medNameText}>{med.name}</Text>
          <Text style={styles.medDosageText}>{med.dosage}</Text>
          <View style={styles.scheduleRow}>
            <Ionicons name="time-outline" size={16} color="#047857" />
            <Text style={styles.scheduleText}>{med.time || 'Due Now'} • {med.period || 'Scheduled Window'}</Text>
          </View>

          {/* Autonomous Safety Window Timer */}
          {!responseStatus ? (
            <View style={styles.timerCard}>
              <View style={styles.timerHeader}>
                <Text style={styles.timerLabel}>Autonomous Safety Response Window</Text>
                <Text style={[styles.timerValue, secondsRemaining <= 10 && styles.timerUrgent]}>
                  {secondsRemaining}s
                </Text>
              </View>
              <View style={styles.timerBarBg}>
                <View
                  style={[
                    styles.timerBarFill,
                    {
                      width: `${progressRatio * 100}%`,
                      backgroundColor: secondsRemaining <= 10 ? '#EF4444' : '#10B981',
                    },
                  ]}
                />
              </View>
              <Text style={styles.timerHelperText}>
                If no response within {secondsRemaining}s, backend independently logs MISSED status (Section 3.3).
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.feedbackCard,
                responseStatus === 'taken' && styles.feedbackTaken,
                responseStatus === 'skipped' && styles.feedbackSkipped,
                responseStatus === 'missed' && styles.feedbackMissed,
              ]}
            >
              <Ionicons
                name={
                  responseStatus === 'taken'
                    ? 'checkmark-circle'
                    : responseStatus === 'skipped'
                    ? 'alert-circle'
                    : 'close-circle'
                }
                size={26}
                color={
                  responseStatus === 'taken'
                    ? '#059669'
                    : responseStatus === 'skipped'
                    ? '#D97706'
                    : '#DC2626'
                }
              />
              <Text style={styles.feedbackText}>{feedbackMessage}</Text>
            </View>
          )}

          {/* Action Buttons: TAKEN or SKIP (Box 4 of Figure 4.3) */}
          {!responseStatus ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => handleAction('skipped')}
                activeOpacity={0.85}
              >
                <Ionicons name="play-skip-forward" size={20} color="#B45309" />
                <Text style={styles.skipButtonText}>SKIP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.takenButton}
                onPress={() => handleAction('taken')}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
                <Text style={styles.takenButtonText}>TAKEN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
              <Text style={styles.dismissButtonText}>Close Reminder</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
  },
  badgeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  safetyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  safetyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  iconVisualWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  iconPulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#D1FAE5',
    opacity: 0.8,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ECFDF5',
    borderWidth: 3,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#064E3B',
    textAlign: 'center',
  },
  medDosageText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
    textAlign: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
  },
  scheduleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  timerCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timerValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  timerUrgent: {
    color: '#EF4444',
  },
  timerBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  timerHelperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  feedbackCard: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  feedbackTaken: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  feedbackSkipped: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  feedbackMissed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1E293B',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 20,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 18,
    paddingVertical: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  takenButton: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  takenButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  dismissButton: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
