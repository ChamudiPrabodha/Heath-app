// src/components/GlobalNotificationBar.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { syncService } from '../services/syncService';
import { notificationService } from '../services/notificationService';

export default function GlobalNotificationBar({ activeRole }) {
  const [notification, setNotification] = useState(null);
  // eslint-disable-next-line react-hooks/refs
  const slideAnim = useRef(new Animated.Value(-150)).current;

  const showNotification = (notif) => {
    setNotification(notif);
    Animated.spring(slideAnim, {
      toValue: 20, // Slide down to 20px from top
      useNativeDriver: true,
      bounciness: 12,
    }).start();

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      hideNotification();
    }, 5000);
  };

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  };

  useEffect(() => {
    // SOS Alert (only caregiver and doctor should see SOS)
    const unsubSos = syncService.on('sos_alert', (incoming) => {
      notificationService.addNotification({
        type: 'sos',
        title: 'SOS Emergency Alert!',
        message: `${incoming.data?.patientName || 'A patient'} triggered SOS!`,
        icon: 'alarm-light',
        color: '#DC2626',
        bg: '#FEE2E2',
      }, ['caregiver', 'doctor', 'dual']);
    });

    // New Prescription
    const unsubPrescription = syncService.on('new_prescription', (incoming) => {
      const { doctorName, patientName, medicineName, actionType } = incoming.data || {};
      const safeDoctor = doctorName || 'Doctor';
      const safePatient = patientName || 'a patient';
      const safeAction = actionType || 'added a new medicine';
      
      // Tailored Notification for Patient
      notificationService.addNotification({
        type: 'prescription',
        title: 'New Medication Prescribed',
        message: `Dr. ${safeDoctor} ${safeAction} (${medicineName}) for you. Please check your routine.`,
        icon: 'pill',
        color: '#9333EA',
        bg: '#F3E8FF',
      }, ['patient', 'dual']);

      // Tailored Notification for Caregiver
      notificationService.addNotification({
        type: 'prescription',
        title: 'Patient Medication Update',
        message: `Dr. ${safeDoctor} ${safeAction} (${medicineName}) for your patient, ${safePatient}.`,
        icon: 'clipboard-pulse',
        color: '#2563EB',
        bg: '#EFF6FF',
      }, ['caregiver']);
    });

    // Medication Status Update
    const unsubMedStatus = syncService.on('medication_status_update', (incoming) => {
      const status = incoming.data?.status || 'updated';
      const medicine = incoming.data?.medicineName || 'medication';
      notificationService.addNotification({
        type: 'med_status',
        title: 'Medication Update',
        message: `Patient marked ${medicine} as ${status.toUpperCase()}.`,
        icon: 'check-circle',
        color: status === 'taken' ? '#059669' : '#D97706',
        bg: status === 'taken' ? '#DCFCE7' : '#FEF3C7',
      }, ['doctor', 'caregiver', 'dual']);
    });

    // Doctor Booking Notification
    const unsubBooking = syncService.on('booking_notification', (incoming) => {
      const { booking } = incoming || {};
      const patientName = booking?.patientName || 'Patient';
      const date = booking?.date || 'Upcoming';
      const time = booking?.time || '';
      const doctorName = booking?.doctorName || 'Doctor';
      const type = booking?.type || 'Consultation';

      // Tailored for Patient
      notificationService.addNotification({
        type: 'booking',
        title: 'Doctor Appointment Scheduled',
        message: `Dr. ${doctorName} scheduled ${type} on ${date} at ${time}.`,
        icon: 'calendar-clock',
        color: '#0284C7',
        bg: '#E0F2FE',
      }, ['patient', 'dual']);

      // Tailored for Caregiver
      notificationService.addNotification({
        type: 'booking',
        title: 'Patient Appointment Booking',
        message: `Dr. ${doctorName} scheduled ${patientName}'s ${type} on ${date} at ${time}.`,
        icon: 'calendar-check',
        color: '#2563EB',
        bg: '#EFF6FF',
      }, ['caregiver']);
    });

    const unsubNewNotif = notificationService.on('new_notification', (notif) => {
      // Only show popup if this notification targets the current active tab
      if (notif.targetRoles && notif.targetRoles.includes(activeRole)) {
        showNotification(notif);
      }
    });

    return () => {
      unsubSos();
      unsubPrescription();
      unsubMedStatus();
      unsubBooking();
      unsubNewNotif();
    };
  }, [activeRole]);

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: notification.bg,
          borderColor: notification.color,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: notification.color }]}>
          <MaterialCommunityIcons name={notification.icon} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: notification.color }]}>{notification.title}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={hideNotification}>
          <Ionicons name="close" size={20} color={notification.color} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    zIndex: 9999, // Ensure it floats above everything
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
});
