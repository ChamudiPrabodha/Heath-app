// src/components/NotificationCenterModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';
import { formatTimeAgo } from '../services/geoUtils';

export default function NotificationCenterModal({ activeRole, visible, onClose }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications(notificationService.getNotifications(activeRole));
      notificationService.markAllAsRead(activeRole);
    }
    
    const unsub = notificationService.on('notifications_updated', () => {
      if (visible) {
        setNotifications(notificationService.getNotifications(activeRole));
      }
    });

    return () => unsub();
  }, [visible, activeRole]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <View style={styles.iconCircle}>
              <Ionicons name="notifications" size={24} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>Recent activity and alerts</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>You have no notifications yet.</Text>
            </View>
          ) : (
            notifications.map((notif) => (
              <View key={notif.id} style={[styles.card, { borderLeftColor: notif.color }]}>
                <View style={[styles.cardIconBox, { backgroundColor: notif.bg }]}>
                  <MaterialCommunityIcons name={notif.icon} size={24} color={notif.color} />
                </View>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardTitle}>{notif.title}</Text>
                  <Text style={styles.cardMessage}>{notif.message}</Text>
                  <Text style={styles.cardTime}>{formatTimeAgo(notif.timestamp)}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteNotifBtn} 
                  onPress={() => notificationService.deleteNotification(notif.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    marginTop: Platform.OS === 'ios' ? 0 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  cardTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '600',
  },
  deleteNotifBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
