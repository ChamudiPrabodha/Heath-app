// src/screens/CaregiverScreen.js - Caregiver Real-Time Following & Tracking Interface
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import OpenStreetMap from '../../components/OpenStreetMap';
import SafeZoneModal from '../../components/SafeZoneModal';
import { syncService } from '../../services/syncService';
import { getCurrentLocation } from '../../services/locationService';
import {
  calculateDistance,
  formatDistance,
  calculateETA,
  checkGeofence,
  formatTimeAgo,
  formatSpeed,
  detectActivity,
} from '../../services/geoUtils';

export default function CaregiverScreen({
  roomCode,
  serverUrl,
  connectionStatus,
  currentUser,
  patientName,
  onOpenSettings,
  onBackToDashboard,
}) {
  const initialLoc = syncService.lastReceivedLocation || syncService.lastSentLocation;
  const [patientLocation, setPatientLocation] = useState(initialLoc || null);
  const [caregiverLocation, setCaregiverLocation] = useState(null);
  const [safeZone, setSafeZone] = useState({
    lat: initialLoc ? initialLoc.latitude : 6.9271,
    lng: initialLoc ? initialLoc.longitude : 79.8612,
    radiusMeters: 500,
  });
  const [safeZoneModalVisible, setSafeZoneModalVisible] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [mapTheme, setMapTheme] = useState('voyager'); // 'voyager' | 'standard' | 'dark'
  const [sosAlert, setSosAlert] = useState(null);
  const [lastUpdatedText, setLastUpdatedText] = useState('Waiting for patient...');
  const mapComponentRef = useRef(null);

  // Caregiver own location
  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      setCaregiverLocation(loc);
    })();
  }, []);

  const handleCallPatient = () => {
    // Open phone dialer
    Linking.openURL('tel:112').catch(() => {
      Alert.alert('Emergency Contact', 'Dialing patient or emergency services.');
    });
  };

  // Listen to incoming real-time events from Patient
  useEffect(() => {
    // When patient updates location
    const unsubLoc = syncService.on('location_update', (data) => {
      setPatientLocation(data);
      // Auto-set safe zone center if not yet set
      setSafeZone((prev) => {
        if (!prev) {
          return { lat: data.latitude, lng: data.longitude, radiusMeters: 500 };
        }
        return prev;
      });
    });

    // When patient triggers SOS
    const unsubSos = syncService.on('sos_alert', (data) => {
      setSosAlert(data);
      Alert.alert(
        '🚨 EMERGENCY SOS ALERT',
        'The patient has activated an emergency SOS alert!\nCheck the map for immediate location.',
        [
          { text: 'Acknowledge', style: 'default' },
          {
            text: 'Call Now',
            style: 'destructive',
            onPress: handleCallPatient,
          },
        ]
      );
    });

    // When safe zone updated
    const unsubSafe = syncService.on('safe_zone_update', (zone) => {
      if (zone) setSafeZone(zone);
    });

    // When patient stops sharing
    const unsubStop = syncService.on('sharing_stopped', (data) => {
      Alert.alert('Live Sharing Ended', data.reason || 'The patient has stopped live location sharing.');
    });

    return () => {
      unsubLoc();
      unsubSos();
      unsubSafe();
      unsubStop();
    };
  }, []);

  // Timer to refresh "Updated Xs ago"
  useEffect(() => {
    const timer = setInterval(() => {
      if (patientLocation?.timestamp) {
        setLastUpdatedText(`Updated ${formatTimeAgo(patientLocation.timestamp)}`);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [patientLocation?.timestamp]);

  // Geofence status calculation
  const geofenceResult = patientLocation
    ? checkGeofence(patientLocation.latitude, patientLocation.longitude, safeZone)
    : { isInside: true };

  const isSafeZoneBreached = safeZone && !geofenceResult.isInside;

  // Distance & ETA between Caregiver and Patient
  const distanceMeters =
    patientLocation && caregiverLocation
      ? calculateDistance(
          caregiverLocation.latitude,
          caregiverLocation.longitude,
          patientLocation.latitude,
          patientLocation.longitude
        )
      : null;

  const walkingETA = distanceMeters != null ? calculateETA(distanceMeters, 'walking') : '--';
  const drivingETA = distanceMeters != null ? calculateETA(distanceMeters, 'driving') : '--';



  const handleOpenDirections = () => {
    if (!patientLocation) return;
    const lat = patientLocation.latitude;
    const lng = patientLocation.longitude;
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${lat}%2C${lng}`);
    });
  };

  const handleSaveSafeZone = (newZone) => {
    setSafeZone(newZone);
    syncService.updateSafeZone(newZone);
  };

  const cycleMapTheme = () => {
    const themes = ['voyager', 'standard', 'dark'];
    const next = themes[(themes.indexOf(mapTheme) + 1) % themes.length];
    setMapTheme(next);
  };

  return (
    <View style={styles.container}>
      {/* Top Back Navigation & Active Patient Strip */}
      {onBackToDashboard && (
        <View style={styles.topNavBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBackToDashboard}>
            <Ionicons name="arrow-back" size={18} color="#1E40AF" />
            <Text style={styles.backBtnText}>Dashboard</Text>
          </TouchableOpacity>
          <View style={styles.trackingPatientBadge}>
            <Ionicons name="radio-outline" size={14} color="#10B981" />
            <Text style={styles.trackingPatientName} numberOfLines={1}>
              {patientName || 'Patient'} ({roomCode})
            </Text>
          </View>
        </View>
      )}

      {/* SOS High-Priority Banner */}
      {sosAlert && (
        <View style={styles.sosBanner}>
          <MaterialCommunityIcons name="alarm-light" size={24} color="#FFFFFF" />
          <View style={styles.sosBannerTextCol}>
            <Text style={styles.sosBannerTitle}>EMERGENCY SOS ACTIVE</Text>
            <Text style={styles.sosBannerSub}>Patient requested immediate assistance</Text>
          </View>
          <TouchableOpacity
            style={styles.sosDismissBtn}
            onPress={() => setSosAlert(null)}
          >
            <Text style={styles.sosDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Geofence Breach Warning Banner */}
      {isSafeZoneBreached && (
        <View style={styles.geofenceAlertBanner}>
          <Ionicons name="warning" size={20} color="#FFFFFF" />
          <Text style={styles.geofenceAlertText}>
            ALERT: Patient is outside the safe zone ({formatDistance(geofenceResult.distanceToEdge)} past perimeter)!
          </Text>
        </View>
      )}

      {/* Main Interactive OpenStreetMap View */}
      <View style={styles.mapWrapper}>
        <OpenStreetMap
          ref={mapComponentRef}
          patientLocation={patientLocation}
          caregiverLocation={caregiverLocation}
          safeZone={safeZone ? { ...safeZone, isBreached: isSafeZoneBreached } : null}
          autoFollow={autoFollow}
          showTrail={true}
          mapTheme={mapTheme}
        />

        {/* Floating Map Action Controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={[styles.floatingBtn, autoFollow && styles.floatingBtnActive]}
            onPress={() => setAutoFollow(!autoFollow)}
          >
            <Ionicons
              name={autoFollow ? 'lock-closed' : 'lock-open-outline'}
              size={20}
              color={autoFollow ? '#10B981' : '#4B5563'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => setSafeZoneModalVisible(true)}
          >
            <MaterialCommunityIcons
              name="shield-outline"
              size={20}
              color={safeZone ? '#10B981' : '#4B5563'}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingBtn} onPress={cycleMapTheme}>
            <Ionicons name="layers-outline" size={20} color="#4B5563" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingBtn} onPress={onOpenSettings}>
            <Ionicons name="settings-outline" size={20} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* WhatsApp-Style Patient Tracking Bottom Sheet Card */}
      <View style={styles.bottomCard}>
        {/* Drag handle pill */}
        <View style={styles.dragHandle} />

        {/* Top summary row */}
        <View style={styles.patientProfileRow}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarDisc}>
              <FontAwesome5 name="user" size={18} color="#FFFFFF" />
            </View>
            <View style={[styles.onlineDot, { backgroundColor: patientLocation ? '#10B981' : '#9CA3AF' }]} />
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.patientTitle}>{patientName || 'Patient'}</Text>
              <View
                style={[
                  styles.safeBadge,
                  { backgroundColor: isSafeZoneBreached ? '#FEE2E2' : '#DCFCE7' },
                ]}
              >
                <Text
                  style={[
                    styles.safeBadgeText,
                    { color: isSafeZoneBreached ? '#DC2626' : '#15803D' },
                  ]}
                >
                  {isSafeZoneBreached ? 'Wandering' : 'Safe Area'}
                </Text>
              </View>
            </View>
            <Text style={styles.statusTimestamp}>
              ID: {roomCode} • {patientLocation ? lastUpdatedText : 'Waiting for patient live broadcast...'}
            </Text>
          </View>

          {patientLocation?.batteryLevel != null && (
            <View style={styles.batteryPill}>
              <Ionicons
                name={patientLocation.batteryLevel > 20 ? 'battery-full' : 'battery-dead'}
                size={14}
                color={patientLocation.batteryLevel > 20 ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.batteryPillText}>{patientLocation.batteryLevel}%</Text>
            </View>
          )}
        </View>

        {/* Live Metrics Grid */}
        <View style={styles.metricsRow}>
          {/* Distance */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>DISTANCE</Text>
            <Text style={styles.metricValue}>
              {distanceMeters != null ? formatDistance(distanceMeters) : '--'}
            </Text>
            <Text style={styles.metricSub}>From you</Text>
          </View>

          {/* Speed */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>SPEED</Text>
            <Text style={styles.metricValue}>
              {patientLocation ? formatSpeed(patientLocation.speed) : '0.0 km/h'}
            </Text>
            <Text style={styles.metricSub}>
              {patientLocation ? detectActivity(patientLocation.speed).type : 'Stationary'}
            </Text>
          </View>

          {/* ETA */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>EST. TIME</Text>
            <Text style={styles.metricValue}>{walkingETA}</Text>
            <Text style={styles.metricSub}>Walk ({drivingETA} drive)</Text>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.callButton} onPress={handleCallPatient}>
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.directionsButton} onPress={handleOpenDirections}>
            <Ionicons name="navigate" size={18} color="#1D4ED8" />
            <Text style={styles.directionsButtonText}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.geofenceButton}
            onPress={() => setSafeZoneModalVisible(true)}
          >
            <MaterialCommunityIcons name="shield-account" size={18} color="#059669" />
            <Text style={styles.geofenceButtonText}>Safe Zone</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Geofence Safe Zone Modal */}
      <SafeZoneModal
        visible={safeZoneModalVisible}
        currentSafeZone={safeZone}
        patientLocation={patientLocation}
        onSave={handleSaveSafeZone}
        onClose={() => setSafeZoneModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  sosBanner: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sosBannerTextCol: {
    flex: 1,
  },
  sosBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sosBannerSub: {
    fontSize: 11,
    color: '#FEE2E2',
  },
  sosDismissBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sosDismissText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  geofenceAlertBanner: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  geofenceAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  floatingControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 10,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingBtnActive: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  patientProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patientTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  safeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  safeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTimestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  batteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  batteryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  directionsButton: {
    flex: 1.2,
    backgroundColor: '#EFF6FF',
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  directionsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  geofenceButton: {
    flex: 1.2,
    backgroundColor: '#ECFDF5',
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  geofenceButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  trackingPatientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    maxWidth: 200,
  },
  trackingPatientName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
});
