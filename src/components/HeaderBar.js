// src/components/HeaderBar.js - Top Status and Header Bar
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import NotificationCenterModal from './NotificationCenterModal';
import { notificationService } from '../services/notificationService';

export default function HeaderBar({
  activeRole,
  title = 'Live Tracking',
  subtitle,
  connectionStatus = 'connected', // 'connected' | 'connecting' | 'disconnected'
  roomCode,
  batteryLevel,
  isCharging,
  currentUser,
  hideStatusAndBattery = false,
  onLogout,
  onOpenSettings,
}) {
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnreadCount(notificationService.getUnreadCount(activeRole));
    const unsub = notificationService.on('notifications_updated', () => {
      setUnreadCount(notificationService.getUnreadCount(activeRole));
    });
    return () => unsub();
  }, [activeRole]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10B981';
      case 'connecting': return '#F59E0B';
      default: return '#EF4444';
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected': return 'LIVE';
      case 'connecting': return 'SYNCING';
      default: return 'OFFLINE';
    }
  };

  const handleLogoutPress = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to sign out of ${currentUser?.name || 'your account'}?`);
      if (confirmed && onLogout) {
        onLogout();
      }
    } else {
      Alert.alert(
        'Sign Out',
        `Are you sure you want to sign out of ${currentUser?.name || 'your account'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: onLogout },
        ]
      );
    }
  };

  const isPatient = currentUser?.role === 'patient';

  return (
    <View style={styles.container}>
      {/* User identity & Title */}
      <View style={styles.leftSection}>
        {!hideStatusAndBattery && activeRole !== 'caregiver' && activeRole !== 'doctor' && (
          <View style={styles.titleRow}>
            <View style={[styles.statusBadge, { borderColor: getStatusColor() }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {/* Right Controls */}
      <View style={styles.rightSection}>
        {!hideStatusAndBattery && activeRole !== 'caregiver' && activeRole !== 'doctor' && batteryLevel != null && (
          <View style={styles.batteryBadge}>
            <Ionicons
              name={isCharging ? 'battery-charging' : batteryLevel > 20 ? 'battery-full' : 'battery-dead'}
              size={15}
              color={batteryLevel > 20 ? '#10B981' : '#EF4444'}
            />
            <Text style={styles.batteryText}>{batteryLevel}%</Text>
          </View>
        )}

        {roomCode && activeRole !== 'caregiver' && activeRole !== 'doctor' && (
          <View style={styles.roomBadge}>
            <Ionicons name="key-outline" size={12} color="#6B7280" />
            <Text style={styles.roomText}>{roomCode}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.iconBtn} 
          onPress={() => setNotificationsModalVisible(true)}
        >
          <Ionicons name="notifications-outline" size={19} color="#4B5563" />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {onOpenSettings && (
          <TouchableOpacity style={styles.iconBtn} onPress={onOpenSettings}>
            <Ionicons name="settings-sharp" size={17} color="#4B5563" />
          </TouchableOpacity>
        )}

        {currentUser && onLogout && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>

      <NotificationCenterModal
        activeRole={activeRole}
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 160,
  },
  userBadgePatient: {
    backgroundColor: '#DCFCE7',
  },
  userBadgeCaregiver: {
    backgroundColor: '#DBEAFE',
  },
  userNameText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userTextPatient: {
    color: '#065F46',
  },
  userTextCaregiver: {
    color: '#1E40AF',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  batteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  batteryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  roomText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 2,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
