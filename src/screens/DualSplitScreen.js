// src/screens/DualSplitScreen.js - Dual Split-View Simulator for Side-by-Side Patient & Caregiver Testing
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import OpenStreetMap from '../components/OpenStreetMap';
import {
  startSimulatedLocationTracking,
  stopAllTracking,
  getCurrentLocation,
} from '../services/locationService';
import { syncService } from '../services/syncService';
import {
  formatSpeed,
  calculateDistance,
  formatDistance,
  calculateETA,
  checkGeofence,
} from '../services/geoUtils';

export default function DualSplitScreen({ roomCode, onOpenSettings }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [patientLocation, setPatientLocation] = useState(null);
  const [caregiverLocation, setCaregiverLocation] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
  });
  const [safeZone, setSafeZone] = useState({
    lat: 6.9271,
    lng: 79.8612,
    radiusMeters: 400,
  });
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      setPatientLocation(loc);
      setCaregiverLocation({
        latitude: loc.latitude - 0.002,
        longitude: loc.longitude - 0.002,
      });
      setSafeZone({
        lat: loc.latitude,
        lng: loc.longitude,
        radiusMeters: 350,
      });
    })();

    const unsubLoc = syncService.on('location_update', (data) => {
      setPatientLocation(data);
    });

    const unsubSos = syncService.on('sos_alert', () => {
      setSosActive(true);
    });

    return () => {
      unsubLoc();
      unsubSos();
      stopAllTracking();
    };
  }, []);

  const handleToggleSimulation = () => {
    if (isSimulating) {
      stopAllTracking();
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      startSimulatedLocationTracking(patientLocation, (loc) => {
        setPatientLocation(loc);
        syncService.sendLocationUpdate(loc);
      });
    }
  };

  const handleTriggerSOS = () => {
    setSosActive(!sosActive);
    if (!sosActive) {
      syncService.sendSOS({ location: patientLocation });
    }
  };

  const geofenceResult = patientLocation
    ? checkGeofence(patientLocation.latitude, patientLocation.longitude, safeZone)
    : { isInside: true };

  const distanceMeters =
    patientLocation && caregiverLocation
      ? calculateDistance(
          caregiverLocation.latitude,
          caregiverLocation.longitude,
          patientLocation.latitude,
          patientLocation.longitude
        )
      : null;

  return (
    <View style={styles.container}>
      {/* Top Half: Patient Controller Panel */}
      <View style={styles.patientHalf}>
        <View style={styles.sectionHeader}>
          <View style={styles.roleTagPatient}>
            <Text style={styles.roleTagText}>1. PATIENT INTERFACE</Text>
          </View>
          <Text style={styles.sessionCode}>Room: {roomCode}</Text>
        </View>

        <View style={styles.patientRow}>
          <TouchableOpacity
            style={[styles.simToggleBtn, isSimulating && styles.simToggleBtnActive]}
            onPress={handleToggleSimulation}
          >
            <Ionicons
              name={isSimulating ? 'stop' : 'walk'}
              size={18}
              color={isSimulating ? '#FFFFFF' : '#059669'}
            />
            <Text
              style={[
                styles.simToggleBtnText,
                isSimulating && styles.simToggleBtnTextActive,
              ]}
            >
              {isSimulating ? 'Stop Simulated Walk' : 'Start Simulated Walk'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sosMiniBtn, sosActive && styles.sosMiniBtnActive]}
            onPress={handleTriggerSOS}
          >
            <MaterialCommunityIcons name="alarm-light" size={18} color="#FFFFFF" />
            <Text style={styles.sosMiniBtnText}>{sosActive ? 'Dismiss SOS' : 'Trigger SOS'}</Text>
          </TouchableOpacity>
        </View>

        {/* Live Patient Quick Stats */}
        <View style={styles.quickStatsRow}>
          <Text style={styles.quickStatItem}>
            Speed: <Text style={styles.statBold}>{patientLocation ? formatSpeed(patientLocation.speed) : '0 km/h'}</Text>
          </Text>
          <Text style={styles.quickStatItem}>
            Heading: <Text style={styles.statBold}>{patientLocation ? `${Math.round(patientLocation.heading)}°` : '0°'}</Text>
          </Text>
          <Text style={styles.quickStatItem}>
            Battery: <Text style={styles.statBold}>{patientLocation?.batteryLevel || 88}%</Text>
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerBadge}>
          <Ionicons name="sync" size={14} color="#10B981" />
          <Text style={styles.dividerText}>Real-Time Live Sync</Text>
        </View>
        <View style={styles.dividerLine} />
      </View>

      {/* Bottom Half: Caregiver Live OpenStreetMap View */}
      <View style={styles.caregiverHalf}>
        <View style={styles.caregiverHeader}>
          <View style={styles.roleTagCaregiver}>
            <Text style={styles.roleTagText}>2. CAREGIVER LIVE TRACKER</Text>
          </View>
          <View style={styles.liveIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveIndicatorText}>FOLLOWING PATIENT</Text>
          </View>
        </View>

        {sosActive && (
          <View style={styles.dualSosAlert}>
            <Ionicons name="warning" size={16} color="#FFFFFF" />
            <Text style={styles.dualSosAlertText}>🚨 EMERGENCY SOS RECEIVED FROM PATIENT!</Text>
          </View>
        )}

        {/* OpenStreetMap */}
        <View style={styles.mapBox}>
          <OpenStreetMap
            patientLocation={patientLocation}
            caregiverLocation={caregiverLocation}
            safeZone={{ ...safeZone, isBreached: !geofenceResult.isInside }}
            autoFollow={true}
            showTrail={true}
            mapTheme="voyager"
          />
        </View>

        {/* Telemetry Footer */}
        <View style={styles.telemetryFooter}>
          <View style={styles.footerStat}>
            <Text style={styles.footerLabel}>DISTANCE</Text>
            <Text style={styles.footerValue}>{distanceMeters ? formatDistance(distanceMeters) : '--'}</Text>
          </View>
          <View style={styles.footerStat}>
            <Text style={styles.footerLabel}>WALKING ETA</Text>
            <Text style={styles.footerValue}>{distanceMeters ? calculateETA(distanceMeters, 'walking') : '--'}</Text>
          </View>
          <View style={styles.footerStat}>
            <Text style={styles.footerLabel}>SAFE ZONE</Text>
            <Text style={[styles.footerValue, { color: geofenceResult.isInside ? '#10B981' : '#EF4444' }]}>
              {geofenceResult.isInside ? 'SAFE' : 'BREACH'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  patientHalf: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  roleTagPatient: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  roleTagCaregiver: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  sessionCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  patientRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  simToggleBtn: {
    flex: 1.5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  simToggleBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  simToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  simToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  sosMiniBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sosMiniBtnActive: {
    backgroundColor: '#7F1D1D',
  },
  sosMiniBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  quickStatItem: {
    fontSize: 11,
    color: '#64748B',
  },
  statBold: {
    fontWeight: '800',
    color: '#1E293B',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: '#F8FAFC',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  caregiverHalf: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0F172A',
  },
  caregiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  dualSosAlert: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dualSosAlertText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mapBox: {
    flex: 1,
  },
  telemetryFooter: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerStat: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 1,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
