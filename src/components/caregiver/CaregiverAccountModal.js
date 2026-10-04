// src/components/caregiver/CaregiverAccountModal.js - Caregiver Profile & Account Preferences
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CaregiverAccountModal({
  visible,
  currentUser,
  patientsCount = 3,
  onLogout,
  onClose,
}) {
  const [sosSoundEnabled, setSosSoundEnabled] = useState(true);
  const [geofenceAlertsEnabled, setGeofenceAlertsEnabled] = useState(true);
  const [medReportsEnabled, setMedReportsEnabled] = useState(true);

  const handleLogoutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your Caregiver account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            onClose();
            if (onLogout) onLogout();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <FontAwesome5 name="user-shield" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.title}>My Account</Text>
                <Text style={styles.subtitle}>Caregiver profile & preferences</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody}>
            {/* Profile Overview Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarInitials}>
                    {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'CG'}
                  </Text>
                </View>
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>{currentUser?.name || 'Sarah Vance'}</Text>
                  <Text style={styles.profileRole}>
                    {currentUser?.relationship || 'Primary Family Caregiver'}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {currentUser?.email || 'caregiver@healthtrack.com'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsStrip}>
                <View style={styles.stripItem}>
                  <Text style={styles.stripLabel}>ACTIVE PATIENTS</Text>
                  <Text style={styles.stripValue}>{patientsCount}</Text>
                </View>
                <View style={styles.stripDivider} />
                <View style={styles.stripItem}>
                  <Text style={styles.stripLabel}>MONITORING</Text>
                  <Text style={[styles.stripValue, { color: '#10B981' }]}>24/7 Live</Text>
                </View>
                <View style={styles.stripDivider} />
                <View style={styles.stripItem}>
                  <Text style={styles.stripLabel}>STATUS</Text>
                  <Text style={[styles.stripValue, { color: '#2563EB' }]}>Verified</Text>
                </View>
              </View>
            </View>

            {/* Alert Preferences */}
            <Text style={styles.sectionHeader}>Emergency Alert Settings</Text>

            <View style={styles.settingsGroup}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>High-Priority SOS Siren</Text>
                  <Text style={styles.settingSub}>Audible alarm when patient triggers emergency SOS</Text>
                </View>
                <Switch
                  value={sosSoundEnabled}
                  onValueChange={setSosSoundEnabled}
                  trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                  thumbColor={sosSoundEnabled ? '#2563EB' : '#F3F4F6'}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Geofence Wander Alerts</Text>
                  <Text style={styles.settingSub}>Immediate push alert when safe zone is breached</Text>
                </View>
                <Switch
                  value={geofenceAlertsEnabled}
                  onValueChange={setGeofenceAlertsEnabled}
                  trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                  thumbColor={geofenceAlertsEnabled ? '#2563EB' : '#F3F4F6'}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Medication Reminders</Text>
                  <Text style={styles.settingSub}>Daily compliance alerts for scheduled patient doses</Text>
                </View>
                <Switch
                  value={medReportsEnabled}
                  onValueChange={setMedReportsEnabled}
                  trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                  thumbColor={medReportsEnabled ? '#2563EB' : '#F3F4F6'}
                />
              </View>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.logoutBtnText}>Sign Out of Caregiver Account</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Account</Text>
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
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
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
  scrollBody: {
    marginBottom: 14,
  },
  profileCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stripItem: {
    flex: 1,
    alignItems: 'center',
  },
  stripLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stripValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  stripDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    paddingHorizontal: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  doneBtn: {
    backgroundColor: '#2563EB',
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
