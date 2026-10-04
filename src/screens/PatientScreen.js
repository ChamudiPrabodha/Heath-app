// src/screens/PatientScreen.js - Patient Live Location Sharing Interface (WhatsApp Style)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import OpenStreetMap from '../components/OpenStreetMap';
import StatsCard from '../components/StatsCard';
import {
  startRealLocationTracking,
  startSimulatedLocationTracking,
  stopAllTracking,
  getCurrentLocation,
} from '../services/locationService';
import { syncService } from '../services/syncService';
import { getBatteryStatus } from '../services/batteryService';

export default function PatientScreen({
  roomCode,
  serverUrl,
  connectionStatus,
  currentUser,
  onOpenSettings,
  onBackToDashboard,
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('1 hour'); // '15 mins', '1 hour', '8 hours'
  const [timeLeftMinutes, setTimeLeftMinutes] = useState(60);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [peerCount, setPeerCount] = useState(0);

  const isSharingRef = useRef(false);
  const mountedRef = useRef(true);

  const durationOptions = [
    { label: '15 mins', value: '15 mins', minutes: 15 },
    { label: '1 hour', value: '1 hour', minutes: 60 },
    { label: '8 hours', value: '8 hours', minutes: 480 },
  ];

  // Fetch initial location on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const initial = await getCurrentLocation();
      if (mounted) {
        setCurrentLocation(initial);
      }
    })();

    // Listen for peer join/leaves
    const unsubPeer = syncService.on('peer_status', (data) => {
      if (mountedRef.current && data.memberCount) setPeerCount(data.memberCount);
    });

    return () => {
      mountedRef.current = false;
      unsubPeer();
      // DO NOT stop tracking on unmount to allow single-device background testing
      // stopAllTracking();
    };
  }, []);

  // Timer countdown for live sharing duration
  useEffect(() => {
    let timer = null;
    if (isSharing && timeLeftMinutes > 0) {
      timer = setInterval(() => {
        setTimeLeftMinutes((prev) => {
          if (prev <= 1) {
            handleStopSharing('Live sharing duration expired');
            return 0;
          }
          return prev - 1;
        });
      }, 60000);
    }
    return () => clearInterval(timer);
  }, [isSharing, timeLeftMinutes]);

  const handleLocationUpdate = (locData) => {
    if (mountedRef.current) {
      setCurrentLocation(locData);
    }
    if (isSharingRef.current) {
      syncService.sendLocationUpdate(locData);
    }
  };

  const handleStartSharing = async (simulate = false) => {
    const opt = durationOptions.find((o) => o.value === selectedDuration);
    setTimeLeftMinutes(opt ? opt.minutes : 60);

    let started = false;
    if (simulate) {
      started = startSimulatedLocationTracking(currentLocation, handleLocationUpdate);
      setIsSimulated(true);
    } else {
      started = await startRealLocationTracking(handleLocationUpdate, (errMsg) => {
        Alert.alert(
          'GPS Access Required',
          `${errMsg}\n\nYou can also click "Test Route Simulation" to test live movement instantly without GPS.`
        );
      });
      setIsSimulated(false);
    }

    if (started) {
      setIsSharing(true);
      isSharingRef.current = true;
      // Immediately push current location
      if (currentLocation) {
        syncService.sendLocationUpdate(currentLocation);
      }
    }
  };

  const handleStopSharing = (reason = 'Live location ended') => {
    stopAllTracking();
    setIsSharing(false);
    isSharingRef.current = false;
    setIsSimulated(false);
    syncService.stopSharing(reason);
  };

  const triggerSOS = () => {
    setSosActive(true);
    syncService.sendSOS({
      patientName: 'Patient Device',
      message: 'EMERGENCY: Patient pressed SOS button!',
      location: currentLocation,
    });

    Alert.alert(
      '🚨 SOS Emergency Alert Sent',
      'An immediate emergency distress alert with your current GPS coordinates has been broadcasted to all connected caregivers.',
      [{ text: 'Dismiss SOS', onPress: () => setSosActive(false) }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Back to Dashboard Navigation Link */}
      {onBackToDashboard && (
        <TouchableOpacity style={styles.backDashboardBtn} onPress={onBackToDashboard}>
          <Ionicons name="arrow-back" size={18} color="#065F46" />
          <Text style={styles.backDashboardText}>Back to Patient Dashboard</Text>
        </TouchableOpacity>
      )}

      {/* WhatsApp-Style Top Live Status Banner */}
      <View style={[styles.statusCard, isSharing ? styles.statusCardActive : styles.statusCardInactive]}>
        <View style={styles.statusHeader}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarCircle, isSharing && styles.avatarPulse]}>
              <FontAwesome5 name="user-circle" size={28} color="#FFFFFF" />
            </View>
            {isSharing && <View style={styles.liveBadgeDot} />}
          </View>

          <View style={styles.statusDetails}>
            <View style={styles.statusRow}>
              <Text style={styles.patientName}>Patient Device</Text>
              <View style={[styles.liveTag, { backgroundColor: isSharing ? '#10B981' : '#9CA3AF' }]}>
                <Text style={styles.liveTagText}>
                  {isSharing ? 'LIVE SHARING' : 'INACTIVE'}
                </Text>
              </View>
            </View>
            <Text style={styles.statusSub}>
              {isSharing
                ? `Sharing with caregiver (${timeLeftMinutes}m left)`
                : 'Share your live movement and location in real time'}
            </Text>
          </View>
        </View>

        {/* Duration Selection (WhatsApp Style) */}
        {!isSharing && (
          <View style={styles.durationSection}>
            <Text style={styles.durationTitle}>Share Live Location For:</Text>
            <View style={styles.durationRow}>
              {durationOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.durationChip,
                    selectedDuration === opt.value && styles.durationChipSelected,
                  ]}
                  onPress={() => setSelectedDuration(opt.value)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      selectedDuration === opt.value && styles.durationTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Main Action Button */}
        {isSharing ? (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={() => handleStopSharing('Patient stopped sharing')}
          >
            <Ionicons name="stop-circle" size={20} color="#FFFFFF" />
            <Text style={styles.stopButtonText}>Stop Live Sharing</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.startActionGroup}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => handleStartSharing(false)}
            >
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Share Live Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simButton}
              onPress={() => handleStartSharing(true)}
            >
              <Ionicons name="play-forward" size={16} color="#059669" />
              <Text style={styles.simButtonText}>Test Simulated Walk</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Emergency SOS Panic Button */}
      <TouchableOpacity
        style={[styles.sosButton, sosActive && styles.sosButtonActive]}
        onPress={triggerSOS}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="alarm-light" size={24} color="#FFFFFF" />
        <View style={styles.sosTextCol}>
          <Text style={styles.sosTitle}>EMERGENCY SOS</Text>
          <Text style={styles.sosSub}>Instant distress broadcast to Caregiver</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Live Map Preview */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <View style={styles.mapTitleRow}>
            <Ionicons name="map-outline" size={18} color="#111827" />
            <Text style={styles.mapTitle}>Live OpenStreetMap View</Text>
          </View>
          <Text style={styles.mapSub}>
            {isSharing ? 'Pulsating radar marker active' : 'Previewing coordinates'}
          </Text>
        </View>

        <View style={styles.mapContainer}>
          <OpenStreetMap
            patientLocation={currentLocation}
            autoFollow={true}
            showTrail={true}
            mapTheme="voyager"
          />
        </View>
      </View>

      {/* Movement & Telemetry Stats */}
      <StatsCard location={currentLocation} isSimulated={isSimulated} />

      {/* Connection & Room Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Ionicons name="radio-outline" size={20} color="#3B82F6" />
            <View>
              <Text style={styles.infoLabel}>Caregiver Pairing Code</Text>
              <Text style={styles.roomCodeValue}>{roomCode}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.configBtn} onPress={onOpenSettings}>
            <Text style={styles.configBtnText}>Configure</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.infoFooter}>
          Caregiver device can connect to code <Text style={{ fontWeight: '700' }}>{roomCode}</Text> to follow your live movements on OpenStreetMap.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1.5,
  },
  statusCardActive: {
    borderColor: '#10B981',
  },
  statusCardInactive: {
    borderColor: '#E5E7EB',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPulse: {
    backgroundColor: '#059669',
  },
  liveBadgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusDetails: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  liveTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  durationSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  durationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  durationChipSelected: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  durationTextSelected: {
    color: '#059669',
    fontWeight: '700',
  },
  startActionGroup: {
    marginTop: 14,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  simButton: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  simButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  stopButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  stopButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sosButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sosButtonActive: {
    backgroundColor: '#991B1B',
  },
  sosTextCol: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sosSub: {
    fontSize: 11,
    color: '#FEE2E2',
    marginTop: 1,
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  mapSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  mapContainer: {
    height: 240,
    width: '100%',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  roomCodeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  configBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  configBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  infoFooter: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
  backDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backDashboardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
});
