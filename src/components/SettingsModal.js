// src/components/SettingsModal.js - Connection & Room Code Settings Modal
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsModal({
  visible,
  currentRoomCode,
  currentServerUrl,
  connectionStatus,
  onSave,
  onClose,
}) {
  const [roomCode, setRoomCode] = useState(currentRoomCode || 'CARE-1001');
  const [serverUrl, setServerUrl] = useState(
    currentServerUrl || 'ws://172.18.150.21:4000'
  );

  const handleSave = () => {
    onSave({
      roomCode: roomCode.trim().toUpperCase(),
      serverUrl: serverUrl.trim(),
    });
    onClose();
  };

  const handleGenerateCode = () => {
    const randomCode = 'CARE-' + Math.floor(1000 + Math.random() * 9000);
    setRoomCode(randomCode);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings" size={22} color="#10B981" />
              <Text style={styles.title}>Connection Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Room Code */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Live Tracking Room Code</Text>
              <TouchableOpacity onPress={handleGenerateCode}>
                <Text style={styles.genText}>+ New Code</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={roomCode}
              onChangeText={setRoomCode}
              placeholder="e.g. CARE-1001"
              autoCapitalize="characters"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.helperText}>
              Both Patient and Caregiver must use the same Room Code to sync.
            </Text>
          </View>

          {/* Server URL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Real-time Relay Server URL (Socket.IO / WS)</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://172.18.150.21:4000"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.helperText}>
              Node.js Socket.IO server running on Port 4000 (`npm run server:mobile`).
            </Text>
          </View>

          {/* Quick presets */}
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setServerUrl('http://172.18.150.21:4000')}
            >
              <Text style={styles.presetText}>Local Wi-Fi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setServerUrl('http://localhost:4000')}
            >
              <Text style={styles.presetText}>Localhost</Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save & Reconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  genText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
