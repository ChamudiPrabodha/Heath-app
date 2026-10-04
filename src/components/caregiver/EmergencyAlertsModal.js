// src/components/caregiver/EmergencyAlertsModal.js - Patient Emergency Distress Notifications Center
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatTimeAgo } from '../../services/geoUtils';

export default function EmergencyAlertsModal({
  visible,
  alerts = [],
  onTrackPatient,
  onClearAlerts,
  onClose,
}) {
  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert('Phone Call', 'Dialing patient emergency hotline.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {
      Alert.alert('Phone Call', `Dialing ${phone}`);
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="alarm-light" size={24} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.title}>Emergency Notifications</Text>
                <Text style={styles.subtitle}>Patient SOS distress alerts & safety breaches</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Quick Bar */}
          <View style={styles.actionsBar}>
            <Text style={styles.alertCount}>
              Total Alerts: <Text style={{ color: '#DC2626', fontWeight: '800' }}>{alerts.length}</Text>
            </Text>
            {alerts.length > 0 && onClearAlerts && (
              <TouchableOpacity onPress={onClearAlerts}>
                <Text style={styles.clearBtnText}>Dismiss All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* List of Alerts */}
          <ScrollView style={styles.list}>
            {alerts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="shield-checkmark" size={38} color="#10B981" />
                <Text style={styles.emptyTitle}>All Patients Safe</Text>
                <Text style={styles.emptySub}>No emergency SOS alerts or safety breaches recorded.</Text>
              </View>
            ) : (
              alerts.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.alertCard,
                    item.type === 'SOS' ? styles.alertCardSOS : styles.alertCardGeofence,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.patientInfoCol}>
                      <View style={styles.patientBadgeRow}>
                        <Text style={styles.patientName}>{item.patientName || 'Patient'}</Text>
                        <View style={styles.idBadge}>
                          <Text style={styles.idBadgeText}>{item.patientId || 'CARE'}</Text>
                        </View>
                      </View>
                      <Text style={styles.timestamp}>
                        {formatTimeAgo(item.timestamp)} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.typeBadge,
                        item.type === 'SOS' ? styles.typeBadgeSOS : styles.typeBadgeGeofence,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          item.type === 'SOS' ? styles.typeTextSOS : styles.typeTextGeofence,
                        ]}
                      >
                        {item.type === 'SOS' ? '🚨 SOS PANIC' : '⚠️ WANDERING'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.alertMessage}>{item.message}</Text>

                  {item.coords && (
                    <Text style={styles.coordsText}>
                      Coordinates: {item.coords.latitude?.toFixed(4)}, {item.coords.longitude?.toFixed(4)}
                    </Text>
                  )}

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.trackBtn}
                      onPress={() => {
                        onClose();
                        if (onTrackPatient) onTrackPatient(item.patientId);
                      }}
                    >
                      <Ionicons name="navigate" size={16} color="#FFFFFF" />
                      <Text style={styles.trackBtnText}>View on Live Map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCall('+1 555-0192')}
                    >
                      <Ionicons name="call" size={16} color="#1D4ED8" />
                      <Text style={styles.callBtnText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Alerts</Text>
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
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  alertCount: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  list: {
    maxHeight: 400,
    marginBottom: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  alertCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  alertCardSOS: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  alertCardGeofence: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  patientInfoCol: {
    flex: 1,
  },
  patientBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  idBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },
  timestamp: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeSOS: {
    backgroundColor: '#FEE2E2',
  },
  typeBadgeGeofence: {
    backgroundColor: '#FEF3C7',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  typeTextSOS: {
    color: '#DC2626',
  },
  typeTextGeofence: {
    color: '#D97706',
  },
  alertMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  coordsText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trackBtn: {
    flex: 1.5,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  doneBtn: {
    backgroundColor: '#1E293B',
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
