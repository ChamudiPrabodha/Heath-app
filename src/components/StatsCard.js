// src/components/StatsCard.js - Telemetry & Movement Stats Display
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { formatSpeed, getCompassDirection, detectActivity } from '../services/geoUtils';

export default function StatsCard({ location, isSimulated = false }) {
  const speed = location?.speed || 0;
  const heading = location?.heading || 0;
  const accuracy = location?.accuracy || 0;
  const altitude = location?.altitude || 0;
  const activity = detectActivity(speed);
  const compassDir = getCompassDirection(heading);

  return (
    <View style={styles.container}>
      {isSimulated && (
        <View style={styles.simulationBanner}>
          <Ionicons name="flask-outline" size={14} color="#D97706" />
          <Text style={styles.simulationText}>Simulated Walking Route Active</Text>
        </View>
      )}

      <View style={styles.grid}>
        {/* Speed */}
        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="speedometer" size={16} color="#059669" />
            <Text style={styles.statLabel}>SPEED</Text>
          </View>
          <Text style={styles.statValue}>{formatSpeed(speed)}</Text>
          <Text style={styles.statSub}>{activity.type}</Text>
        </View>

        {/* Heading */}
        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="compass" size={16} color="#3B82F6" />
            <Text style={styles.statLabel}>HEADING</Text>
          </View>
          <Text style={styles.statValue}>{Math.round(heading)}° {compassDir}</Text>
          <Text style={styles.statSub}>Direction</Text>
        </View>

        {/* GPS Accuracy */}
        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <Ionicons name="locate" size={16} color="#8B5CF6" />
            <Text style={styles.statLabel}>ACCURACY</Text>
          </View>
          <Text style={styles.statValue}>±{Math.round(accuracy)} m</Text>
          <Text style={styles.statSub}>High Precision</Text>
        </View>

        {/* Altitude */}
        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="elevation-rise" size={16} color="#EC4899" />
            <Text style={styles.statLabel}>ALTITUDE</Text>
          </View>
          <Text style={styles.statValue}>{Math.round(altitude)} m</Text>
          <Text style={styles.statSub}>Sea level</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginVertical: 8,
  },
  simulationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  simulationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  statSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
