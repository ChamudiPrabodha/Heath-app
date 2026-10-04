// src/components/SafeZoneModal.js - Geofence Configuration Modal
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SafeZoneModal({
  visible,
  currentSafeZone,
  patientLocation,
  onSave,
  onClose,
}) {
  const [selectedRadius, setSelectedRadius] = useState(
    currentSafeZone?.radiusMeters || 500
  );

  const radii = [
    { label: '200 m', value: 200, desc: 'Immediate neighborhood / Yard' },
    { label: '500 m', value: 500, desc: 'Standard walking perimeter' },
    { label: '1.0 km', value: 1000, desc: 'Extended local community' },
    { label: '2.5 km', value: 2500, desc: 'City district boundary' },
  ];

  const handleApply = () => {
    const centerLat = currentSafeZone?.lat || patientLocation?.latitude || 6.9271;
    const centerLng = currentSafeZone?.lng || patientLocation?.longitude || 79.8612;

    onSave({
      lat: centerLat,
      lng: centerLng,
      radiusMeters: selectedRadius,
    });
    onClose();
  };

  const handleCenterOnPatient = () => {
    if (!patientLocation?.latitude) return;
    onSave({
      lat: patientLocation.latitude,
      lng: patientLocation.longitude,
      radiusMeters: selectedRadius,
    });
    onClose();
  };

  const handleRemove = () => {
    onSave(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Safe Zone (Geofence)</Text>
              <Text style={styles.subtitle}>
                Receive instant alerts if the patient wanders outside this radius
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Radius selector */}
          <Text style={styles.sectionTitle}>Select Protection Radius:</Text>
          <View style={styles.optionsList}>
            {radii.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.optionItem,
                  selectedRadius === item.value && styles.optionItemSelected,
                ]}
                onPress={() => setSelectedRadius(item.value)}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedRadius === item.value && styles.radioCircleSelected,
                    ]}
                  >
                    {selectedRadius === item.value && <View style={styles.radioInner} />}
                  </View>
                  <View>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    <Text style={styles.optionDesc}>{item.desc}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.recenterButton}
              onPress={handleCenterOnPatient}
            >
              <Ionicons name="locate" size={16} color="#3B82F6" />
              <Text style={styles.recenterButtonText}>Set Center to Patient Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={handleApply}>
              <Text style={styles.primaryButtonText}>Save Safe Zone</Text>
            </TouchableOpacity>

            {currentSafeZone && (
              <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
                <Text style={styles.removeButtonText}>Disable Safe Zone</Text>
              </TouchableOpacity>
            )}
          </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  optionsList: {
    gap: 8,
    marginBottom: 16,
  },
  optionItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  optionItemSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#10B981',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  optionDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  buttonGroup: {
    gap: 10,
    marginTop: 8,
  },
  recenterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  recenterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  removeButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
