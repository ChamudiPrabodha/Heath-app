// src/screens/caregiver/CaregiverDashboardScreen.js - Multi-Patient Caregiver Command Center
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import {
  getCaregiverPatients,
  getEmergencyAlerts,
  markAlertsAsRead,
  deduplicateActivities,
  deleteCaregiverPatient,
} from '../../services/patientManagementService';
import { syncService } from '../../services/syncService';
import { notificationService } from '../../services/notificationService';
import { getPatientVitalsHistory } from '../../services/vitalsService';

// Modals
import NotificationCenterModal from '../../components/NotificationCenterModal';
import AddPatientModal from '../../components/caregiver/AddPatientModal';
import AssignMedicationModal from '../../components/caregiver/AssignMedicationModal';
import MedicationHistoryModal from '../../components/caregiver/MedicationHistoryModal';
import AssignActivitiesModal from '../../components/caregiver/AssignActivitiesModal';
import EmergencyAlertsModal from '../../components/caregiver/EmergencyAlertsModal';
import CaregiverAccountModal from '../../components/caregiver/CaregiverAccountModal';
import ContactSupportModal from '../../components/caregiver/ContactSupportModal';
import UpdateVitalsModal from '../../components/caregiver/UpdateVitalsModal';
import PatientVitalsMonitorModal from '../../components/caregiver/PatientVitalsMonitorModal';
import PatientCardVitalsSection from '../../components/caregiver/PatientCardVitalsSection';
import ConnectionsModal from '../../components/ConnectionsModal';

export default function CaregiverDashboardScreen({
  currentUser,
  roomCode,
  onTrackPatientLocation,
  onOpenSettings,
  onLogout,
}) {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedPatientForMeds, setSelectedPatientForMeds] = useState(null);
  const [selectedPatientForMedHistory, setSelectedPatientForMedHistory] = useState(null);
  const [selectedPatientForActivities, setSelectedPatientForActivities] = useState(null);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState(null);
  const [patientVitalsMap, setPatientVitalsMap] = useState({});
  const [patientMedsStatusMap, setPatientMedsStatusMap] = useState({});
  const [vitalsMonitorVisible, setVitalsMonitorVisible] = useState(false);
  const [vitalsMonitorPatient, setVitalsMonitorPatient] = useState(null);

  // Modals visibility
  const [addPatientVisible, setAddPatientVisible] = useState(false);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => notificationService.getUnreadCount('caregiver'));
  const [activeNotification, setActiveNotification] = useState(null);

  // Notification syncing & real-time notification bar
  useEffect(() => {
    let mounted = true;
    const unsub = notificationService.on('notifications_updated', () => {
      if (mounted) setUnreadCount(notificationService.getUnreadCount('caregiver'));
    });

    const unsubNewNotif = notificationService.on('new_notification', (notif) => {
      if (mounted && notif.targetRoles && notif.targetRoles.includes('caregiver')) {
        setActiveNotification({
          title: notif.title,
          message: notif.message,
          icon: notif.icon || 'calendar-check',
          color: notif.color || '#2563EB',
          bg: notif.bg || '#EFF6FF',
        });
        setTimeout(() => {
          if (mounted) setActiveNotification(null);
        }, 8000);
      }
    });

    const unsubBooking = syncService.on('booking_notification', (incoming) => {
      const { booking } = incoming || {};
      const doctorName = booking?.doctorName || 'Dr. Vimukthi Perera';
      const patientName = booking?.patientName || 'Patient';
      const type = booking?.type || 'Consultation';
      const time = booking?.time || '';
      const date = booking?.dateFormatted || booking?.date || 'Upcoming';
      const notes = booking?.notes ? ` • Note: ${booking.notes}` : '';

      const title = '📅 Patient Appointment Scheduled';
      const message = `${doctorName} scheduled ${patientName}'s ${type} on ${date} at ${time}.${notes}`;

      notificationService.addNotification({
        type: 'booking',
        title,
        message,
        icon: 'calendar-check',
        color: '#2563EB',
        bg: '#EFF6FF',
      }, ['caregiver']);

      if (mounted) {
        setActiveNotification({
          title,
          message,
          icon: 'calendar-check',
          color: '#2563EB',
          bg: '#EFF6FF',
        });
        setTimeout(() => {
          if (mounted) setActiveNotification(null);
        }, 8000);
      }
    });

    return () => {
      mounted = false;
      unsub();
      unsubNewNotif();
      unsubBooking();
    };
  }, []);

  // Load patients and alerts
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      const pList = await getCaregiverPatients();
      const aList = await getEmergencyAlerts();
      if (mounted) {
        const cleaned = pList.map((p) => ({
          ...p,
          activities: deduplicateActivities(p.activities),
        }));
        setPatients(cleaned);
        setAlerts(aList);

        // Fetch latest vitals for all patients
        try {
          const vMap = {};
          for (const p of cleaned) {
            const hList = await getPatientVitalsHistory(p.id);
            if (hList && hList.length > 0) {
              vMap[p.id] = hList[0];
            }
          }
          setPatientVitalsMap(vMap);
        } catch (_vErr) {}

        // Initialize medication intake status map for today
        try {
          const mMap = {};
          const todayStr = new Date().toISOString().split('T')[0];
          for (const p of cleaned) {
            const pKey = (p.id || '').toUpperCase().trim();
            const takenMed = (p.medications || []).find(
              (m) => (m.dayStatuses && m.dayStatuses[todayStr] === 'Taken') || m.status === 'Taken'
            );
            if (takenMed) {
              mMap[pKey] = {
                medicineName: takenMed.name,
                dosage: takenMed.dosage,
                status: 'taken',
                timeStr: takenMed.time || 'Today',
                timestamp: Date.now(),
              };
            }
          }
          setPatientMedsStatusMap(mMap);
        } catch (_mErr) {}
      }
    };

    loadData();

    // Listen to real-time incoming SOS alerts from socket
    const unsubSos = syncService.on('sos_alert', (incoming) => {
      const newAlert = {
        id: 'alt-' + Date.now(),
        patientId: incoming.roomCode || 'CARE-1001',
        patientName: incoming.data?.patientName || 'Patient',
        type: 'SOS',
        message: '🚨 Live SOS alert triggered by patient!',
        timestamp: Date.now(),
        coords: incoming.data?.location || null,
        isRead: false,
      };

      setAlerts((prev) => [newAlert, ...prev]);

      Alert.alert(
        '🚨 EMERGENCY ALERT RECEIVED',
        `${newAlert.patientName} (${newAlert.patientId}) has activated an emergency SOS distress alert!`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Track on Live Map',
            style: 'destructive',
            onPress: () => onTrackPatientLocation(newAlert.patientId),
          },
        ]
      );
    });

    // Listen to real-time new prescription added by doctor
    const unsubPrescription = syncService.on('new_prescription', (incoming) => {
      const { doctorName, patientName, medicineName, actionType } = incoming.data || {};
      const safeDoctor = doctorName || 'Doctor';
      const safePatient = patientName || 'a patient';
      const safeAction = actionType || 'added a new medicine';

      const newAlert = {
        id: 'alt-' + Date.now(),
        patientId: incoming.roomCode,
        patientName: safePatient,
        type: 'Medication',
        message: `Dr. ${safeDoctor} ${safeAction} (${medicineName}) for your patient, ${safePatient}.`,
        timestamp: Date.now(),
        isRead: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);
    });

    // Listen to real-time medication status updates
    const unsubMedStatus = syncService.on('medication_status_update', (incoming) => {
      const pid = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      const medName = incoming.data?.medicineName || 'Medication';
      const dosage = incoming.data?.dosage || '';
      const status = incoming.data?.status || 'taken';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const todayStr = new Date().toISOString().split('T')[0];

      if (pid) {
        setPatientMedsStatusMap((prev) => ({
          ...prev,
          [pid]: {
            medicineName: medName,
            dosage,
            status,
            timeStr,
            timestamp: Date.now(),
          },
        }));

        setPatients((prev) =>
          prev.map((p) => {
            if ((p.id || '').toUpperCase().trim() === pid) {
              const capStatus = status === 'taken' ? 'Taken' : status === 'missed' ? 'Missed' : 'Skipped';
              const updatedMeds = (p.medications || []).map((m) => {
                if (m.name?.toLowerCase() === medName.toLowerCase() || m.id === incoming.data?.medicationId) {
                  return {
                    ...m,
                    status: capStatus,
                    dayStatuses: { ...(m.dayStatuses || {}), [todayStr]: capStatus },
                  };
                }
                return m;
              });
              return { ...p, medications: updatedMeds };
            }
            return p;
          })
        );
      }

      const newAlert = {
        id: 'alt-' + Date.now(),
        patientId: incoming.roomCode,
        patientName: 'Patient',
        type: 'Medication',
        message: `Patient marked medication as ${status.toUpperCase()}: ${medName}.`,
        timestamp: Date.now(),
        isRead: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);

      if (status === 'taken') {
        notificationService.addNotification({
          title: '💊 Medicine Taken Confirmed',
          message: `Patient marked ${medName} ${dosage ? `(${dosage})` : ''} as TAKEN at ${timeStr}.`,
          icon: 'pill',
          color: '#10B981',
          bg: '#ECFDF5',
        }, ['caregiver']);
      }
    });

    const unsubMedRecorded = syncService.on('medication_status_recorded', (incoming) => {
      const pid = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      const medName = incoming.log?.medicineName || incoming.medicineName || 'Medication';
      const dosage = incoming.log?.dosage || incoming.dosage || '';
      const status = incoming.status || incoming.log?.status || 'taken';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const todayStr = new Date().toISOString().split('T')[0];

      if (pid) {
        setPatientMedsStatusMap((prev) => ({
          ...prev,
          [pid]: {
            medicineName: medName,
            dosage,
            status,
            timeStr,
            timestamp: Date.now(),
          },
        }));

        setPatients((prev) =>
          prev.map((p) => {
            if ((p.id || '').toUpperCase().trim() === pid) {
              const capStatus = status === 'taken' ? 'Taken' : status === 'missed' ? 'Missed' : 'Skipped';
              const updatedMeds = (p.medications || []).map((m) => {
                if (m.name?.toLowerCase() === medName.toLowerCase() || m.id === (incoming.log?.medicationId || incoming.medicationId)) {
                  return {
                    ...m,
                    status: capStatus,
                    dayStatuses: { ...(m.dayStatuses || {}), [todayStr]: capStatus },
                  };
                }
                return m;
              });
              return { ...p, medications: updatedMeds };
            }
            return p;
          })
        );
      }
    });

    const unsubDayStatus = syncService.on('medication_day_status_updated', (incoming) => {
      const pid = (incoming.patientId || '').toUpperCase().trim();
      const todayStr = new Date().toISOString().split('T')[0];
      if (pid) {
        setPatients((prev) =>
          prev.map((p) => {
            if ((p.id || '').toUpperCase().trim() === pid) {
              const updatedMeds = (p.medications || []).map((m) => {
                if (m.id === incoming.medicationId) {
                  return {
                    ...m,
                    status: incoming.date === todayStr ? incoming.status : m.status,
                    dayStatuses: { ...(m.dayStatuses || {}), [incoming.date]: incoming.status },
                  };
                }
                return m;
              });
              return { ...p, medications: updatedMeds };
            }
            return p;
          })
        );
      }
    });

    // Listen to real-time caregiver alerts (missed medications, skips, etc. from Fig 4.3)
    const unsubCaregiverAlert = syncService.on('caregiver_alert', (incoming) => {
      const alert = incoming.alert || incoming;
      setAlerts((prev) => [alert, ...prev]);

      Alert.alert(
        alert.type === 'MISSED_MEDICATION' ? '🚨 CRITICAL: MEDICATION MISSED' : '⚠️ MEDICATION ALERT',
        alert.message,
        [{ text: 'Acknowledge', style: 'default' }]
      );
    });

    const unsubAdherence = syncService.on('adherence_updated', (incoming) => {
      setPatients((prev) =>
        prev.map((p) => (p.id === incoming.patientId ? { ...p, adherence: incoming.adherence } : p))
      );
    });

    const unsubInvites = syncService.on('invitation_approved', async () => {
      if (mounted) {
        const pList = await getCaregiverPatients();
        setPatients(pList);
        Alert.alert('Connection Approved', 'A patient has approved your connection request and is now on your dashboard.');
      }
    });

    const unsubRevokes = syncService.on('connection_revoked', async () => {
      if (mounted) {
        const pList = await getCaregiverPatients();
        setPatients(pList);
      }
    });

    const unsubConnections = syncService.on('connections_updated', async () => {
      if (mounted) {
        const pList = await getCaregiverPatients();
        setPatients(pList);
      }
    });

    const unsubApproved = syncService.on('invitation_approved', async () => {
      if (mounted) {
        const pList = await getCaregiverPatients();
        setPatients(pList);
      }
    });

    const unsubNewAct = syncService.on('new_activity', (incoming) => {
      const pid = (incoming.patientId || incoming.roomCode || '').toUpperCase();
      if (pid && incoming.activity) {
        setPatients((prev) =>
          prev.map((p) => {
            if (p.id.toUpperCase() === pid) {
              const currentActs = deduplicateActivities(p.activities || []);
              const exists = currentActs.some((a) => a.id === incoming.activity.id);
              const nextActs = exists
                ? currentActs.map((a) => (a.id === incoming.activity.id ? incoming.activity : a))
                : [...currentActs, incoming.activity];
              return { ...p, activities: deduplicateActivities(nextActs) };
            }
            return p;
          })
        );

        setSelectedPatientForActivities((currentSelected) => {
          if (currentSelected && currentSelected.id.toUpperCase() === pid) {
            const currentActs = deduplicateActivities(currentSelected.activities || []);
            const exists = currentActs.some((a) => a.id === incoming.activity.id);
            const nextActs = exists
              ? currentActs.map((a) => (a.id === incoming.activity.id ? incoming.activity : a))
              : [...currentActs, incoming.activity];
            return { ...currentSelected, activities: deduplicateActivities(nextActs) };
          }
          return currentSelected;
        });
      }
    });

    const unsubActStatus = syncService.on('activity_status_update', (incoming) => {
      const pid = (incoming.patientId || incoming.roomCode || '').toUpperCase();
      if (pid) {
        setPatients((prev) =>
          prev.map((p) => {
            if (p.id.toUpperCase() === pid) {
              const currentActs = deduplicateActivities(p.activities || []);
              const updatedActs = currentActs.map((a) =>
                a.id === incoming.activityId
                  ? { ...a, completed: incoming.completed, done: incoming.completed }
                  : a
              );
              return { ...p, activities: updatedActs };
            }
            return p;
          })
        );

        setSelectedPatientForActivities((currentSelected) => {
          if (currentSelected && currentSelected.id.toUpperCase() === pid) {
            const currentActs = deduplicateActivities(currentSelected.activities || []);
            const updatedActs = currentActs.map((a) =>
              a.id === incoming.activityId
                ? { ...a, completed: incoming.completed, done: incoming.completed }
                : a
            );
            return { ...currentSelected, activities: updatedActs };
          }
          return currentSelected;
        });
      }
    });

    const unsubDelAct = syncService.on('delete_activity', (incoming) => {
      const pid = (incoming.patientId || incoming.roomCode || '').toUpperCase();
      if (pid) {
        setPatients((prev) =>
          prev.map((p) => {
            if (p.id.toUpperCase() === pid) {
              const currentActs = deduplicateActivities(p.activities || []);
              return { ...p, activities: currentActs.filter((a) => a.id !== incoming.activityId) };
            }
            return p;
          })
        );

        setSelectedPatientForActivities((currentSelected) => {
          if (currentSelected && currentSelected.id.toUpperCase() === pid) {
            const currentActs = deduplicateActivities(currentSelected.activities || []);
            return { ...currentSelected, activities: currentActs.filter((a) => a.id !== incoming.activityId) };
          }
          return currentSelected;
        });
      }
    });

    const unsubVitals = syncService.on('vitals_updated', (incoming) => {
      if (incoming?.patientId && incoming.vitals) {
        const pid = incoming.patientId;
        setPatientVitalsMap((prev) => ({
          ...prev,
          [pid]: incoming.vitals,
        }));
      }
    });

    return () => {
      mounted = false;
      unsubSos();
      unsubPrescription();
      unsubMedStatus();
      unsubMedRecorded();
      unsubDayStatus();
      unsubCaregiverAlert();
      unsubAdherence();
      unsubInvites();
      unsubRevokes();
      unsubConnections();
      unsubApproved();
      unsubNewAct();
      unsubActStatus();
      unsubDelAct();
      unsubVitals();
    };
  }, []);

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  const handlePatientAdded = (newP) => {
    if (!newP) return;
    setPatients((prev) => {
      const exists = prev.some((p) => p.id === newP.id);
      if (exists) {
        return prev.map((p) => (p.id === newP.id ? { ...p, ...newP } : p));
      }
      return [newP, ...prev];
    });
  };

  const handleMedicationsUpdated = (updatedP) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedP.id ? updatedP : p))
    );
    setSelectedPatientForMeds(updatedP);
  };

  const handleActivitiesUpdated = (updatedP) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updatedP.id ? updatedP : p))
    );
    setSelectedPatientForActivities(updatedP);
  };

  const handleOpenAlerts = async () => {
    setAlertsModalVisible(true);
    const updated = await markAlertsAsRead();
    setAlerts(updated);
  };

  const handleDeletePatient = (id, name) => {
    const performDelete = async () => {
      const cleanId = (id || '').toString().trim().toUpperCase();
      // 1. Optimistic immediate UI removal
      setPatients((prev) => prev.filter((p) => (p.id || '').toString().trim().toUpperCase() !== cleanId));
      
      try {
        const updated = await deleteCaregiverPatient(id);
        setPatients(updated);
      } catch (err) {
        console.error('Failed to remove patient:', err);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to remove ${name} from your dashboard? This action cannot be undone.`)) {
        performDelete();
      }
      return;
    }

    Alert.alert(
      'Remove Patient',
      `Are you sure you want to remove ${name} from your dashboard? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: performDelete,
        }
      ]
    );
  };

  const caregiverName = currentUser?.name || 'Sarah Vance';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. Caregiver Header & Greeting */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.avatarDisc}>
            <FontAwesome5 name="user-shield" size={22} color="#1D4ED8" />
          </View>
          <View style={styles.headerDetails}>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>CAREGIVER COMMAND</Text>
              </View>
              {unreadAlertsCount > 0 && (
                <TouchableOpacity style={styles.sosPill} onPress={handleOpenAlerts}>
                  <View style={styles.sosDot} />
                  <Text style={styles.sosPillText}>{unreadAlertsCount} SOS ALERT</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.greetingTitle}>Welcome back,</Text>
            <Text style={styles.caregiverNameText} numberOfLines={1}>{caregiverName} 👋</Text>
            {roomCode && (
              <View style={styles.roomBadgeHeader}>
                <Ionicons name="key-outline" size={12} color="#6B7280" />
                <Text style={styles.roomTextHeader}>{roomCode}</Text>
              </View>
            )}
          </View>

          {/* Top Right Action Icons */}
          <View style={styles.topRightActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setNotificationsModalVisible(true)}>
              <Ionicons name="notifications-outline" size={20} color="#4B5563" />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.accountIconBtn}
              onPress={() => setAccountModalVisible(true)}
            >
              <Ionicons name="person-circle-outline" size={28} color="#2563EB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Summary Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{patients.length}</Text>
            <Text style={styles.metricLbl}>Patients</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={[styles.metricVal, { color: '#10B981' }]}>
              {patients.filter((p) => p.status === 'online').length}
            </Text>
            <Text style={styles.metricLbl}>Live Online</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={[styles.metricVal, { color: unreadAlertsCount > 0 ? '#DC2626' : '#6B7280' }]}>
              {unreadAlertsCount}
            </Text>
            <Text style={styles.metricLbl}>Active SOS</Text>
          </View>
        </View>
      </View>

      {/* 2. Top Emergency SOS Notification Banner (if any active alerts) */}
      {alerts.length > 0 && (
        <TouchableOpacity style={styles.alertBanner} onPress={handleOpenAlerts}>
          <MaterialCommunityIcons name="alarm-light" size={22} color="#FFFFFF" />
          <View style={styles.alertBannerTextCol}>
            <Text style={styles.alertBannerTitle}>
              {alerts[0].patientName} triggered SOS ({alerts[0].patientId})
            </Text>
            <Text style={styles.alertBannerSub}>Tap to view notifications & locate on map</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Real-time Caregiver Floating Notification Bar */}
      {activeNotification && (
        <View style={styles.caregiverNotificationBar}>
          <View style={[styles.notificationIconBox, { backgroundColor: activeNotification.bg || '#EFF6FF' }]}>
            <MaterialCommunityIcons
              name={activeNotification.icon || 'calendar-check'}
              size={22}
              color={activeNotification.color || '#2563EB'}
            />
          </View>
          <View style={styles.notificationTextCol}>
            <Text style={styles.notificationTitle}>{activeNotification.title}</Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {activeNotification.message}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationViewBtn}
            onPress={() => {
              setActiveNotification(null);
              setNotificationsModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.notificationViewBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Patients Section Header + Add Patient Button */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Monitored Patients</Text>
          <Text style={styles.sectionSub}>Unique identification & live status</Text>
        </View>
        <TouchableOpacity
          style={styles.addPatientBtn}
          onPress={() => setAddPatientVisible(true)}
        >
          <Ionicons name="person-add" size={16} color="#FFFFFF" />
          <Text style={styles.addPatientBtnText}>+ Add Patient</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Multiple Patients List */}
      <View style={styles.patientsList}>
        {patients.length === 0 ? (
          <View style={styles.emptyPatientsCard}>
            <Ionicons name="people-outline" size={44} color="#9CA3AF" />
            <Text style={styles.emptyPatientsTitle}>No Monitored Patients Yet</Text>
            <Text style={styles.emptyPatientsSub}>
              Tap &quot;+ Add Patient&quot; above to connect a patient using their unique Tracking Room Code (e.g. CARE-1001).
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setAddPatientVisible(true)}
            >
              <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyAddBtnText}>Add &amp; Connect Patient</Text>
            </TouchableOpacity>
          </View>
        ) : (
          patients.map((item) => {
            const isOnline = item.status === 'online';
            return (
              <View key={item.id} style={styles.patientCard}>
                {/* Top Card Info */}
                <View style={styles.patientTopRow}>
                  <View style={styles.patientAvatarBox}>
                    <Text style={styles.patientAvatarLetter}>
                      {item.name.charAt(0)}
                    </Text>
                    {isOnline && <View style={styles.onlineDot} />}
                  </View>

                  <View style={styles.patientMainInfo}>
                    <View style={styles.patientNameLine}>
                      <Text style={styles.patientCardName}>{item.name}</Text>
                      {/* Unique Identification Number Badge */}
                      <View style={styles.patientIdBadge}>
                        <Text style={styles.patientIdBadgeText}>{item.id}</Text>
                      </View>
                    </View>
                    <Text style={styles.patientCondition} numberOfLines={1}>
                      {item.condition}
                    </Text>

                    {/* Contacts Row */}
                    <View style={styles.contactsWrapper}>
                      {/* Patient Contact */}
                      <View style={styles.contactItem}>
                        <Text style={styles.contactRole}>Patient:</Text>
                        <View style={styles.contactActionsRow}>
                          <TouchableOpacity style={styles.contactIconBtn} onPress={() => Linking.openURL(`tel:${item.patientPhone || item.emergencyPhone || '+15550000'}`)}>
                            <Ionicons name="call" size={13} color="#059669" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.contactIconBtn} onPress={() => Linking.openURL(`sms:${item.patientPhone || item.emergencyPhone || '+15550000'}`)}>
                            <Ionicons name="chatbubble" size={13} color="#059669" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {/* Doctor Contact */}
                      <View style={styles.contactItem}>
                        <Text style={styles.contactRole} numberOfLines={1}>{item.doctorName || 'Doctor'}:</Text>
                        <View style={styles.contactActionsRow}>
                          <TouchableOpacity style={styles.contactIconBtn} onPress={() => Linking.openURL(`tel:${item.doctorPhone || '+15550000'}`)}>
                            <Ionicons name="call" size={13} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.contactIconBtn} onPress={() => Linking.openURL(`sms:${item.doctorPhone || '+15550000'}`)}>
                            <Ionicons name="chatbubble" size={13} color="#2563EB" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Battery & Status */}
                  <View style={styles.patientMetaCol}>
                    {isOnline && (
                      <View style={[styles.statusPill, styles.statusPillOnline]}>
                        <View style={[styles.statusDotSmall, { backgroundColor: '#10B981' }]} />
                        <Text style={[styles.statusPillText, { color: '#065F46' }]}>LIVE</Text>
                      </View>
                    )}

                    <View style={styles.batteryRow}>
                      <Ionicons
                        name="battery-half"
                        size={14}
                        color={(item.batteryLevel ?? 85) > 20 ? '#10B981' : '#EF4444'}
                      />
                      <Text style={styles.batteryText}>{item.batteryLevel != null ? `${item.batteryLevel}%` : '85%'}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.deletePatientBtn}
                      onPress={() => handleDeletePatient(item.id, item.name)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      activeOpacity={0.7}
                      accessibilityLabel={`Delete patient ${item.name}`}
                    >
                      <Ionicons name="trash-outline" size={17} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Figure 4.3 Adherence & AI Adherence-Risk Model Indicator */}
                <View style={styles.adherenceRiskRow}>
                  <View style={styles.adherenceMiniStat}>
                    <Ionicons name="pie-chart-outline" size={14} color="#059669" />
                    <Text style={styles.adherenceMiniText}>
                      7-Day Adherence: <Text style={{ fontWeight: '800', color: '#065F46' }}>{item.adherence?.weekly ?? 85}%</Text>
                    </Text>
                  </View>
                  <View style={[
                    styles.aiRiskBadge,
                    { backgroundColor: (item.adherence?.aiRiskIndicator?.color || '#10B981') + '20' }
                  ]}>
                    <MaterialCommunityIcons name="brain" size={13} color={item.adherence?.aiRiskIndicator?.color || '#10B981'} />
                    <Text style={[
                      styles.aiRiskBadgeText,
                      { color: item.adherence?.aiRiskIndicator?.color || '#059669' }
                    ]}>
                      AI: {item.adherence?.aiRiskIndicator?.level || 'Low'} Risk
                    </Text>
                  </View>
                </View>

                {/* Real-Time Today's Medication Plan on Patient Card (Caregiver View) */}
                {(() => {
                  const pKey = (item.id || '').toUpperCase().trim();
                  const liveMedInfo = patientMedsStatusMap[pKey];
                  const todayStr = new Date().toISOString().split('T')[0];
                  const meds = item.medications || [];
                  const totalMeds = meds.length;

                  const takenMeds = meds.filter((m) => {
                    const raw = ((m.dayStatuses && m.dayStatuses[todayStr]) || m.status || '').toLowerCase();
                    if (liveMedInfo && (liveMedInfo.medicineName?.toLowerCase() === m.name?.toLowerCase() || m.id === liveMedInfo.medicationId)) {
                      return liveMedInfo.status?.toLowerCase() === 'taken';
                    }
                    return raw === 'taken';
                  });

                  const missedMeds = meds.filter((m) => {
                    const raw = ((m.dayStatuses && m.dayStatuses[todayStr]) || m.status || '').toLowerCase();
                    if (liveMedInfo && (liveMedInfo.medicineName?.toLowerCase() === m.name?.toLowerCase() || m.id === liveMedInfo.medicationId)) {
                      return liveMedInfo.status?.toLowerCase() === 'missed';
                    }
                    return raw === 'missed';
                  });

                  return (
                    <View style={styles.patientCardMedPlan}>
                      <View style={styles.cardMedPlanHeader}>
                        <View style={styles.cardMedPlanHeaderLeft}>
                          <View style={styles.cardMedPlanIconWrap}>
                            <MaterialCommunityIcons name="pill" size={15} color="#059669" />
                          </View>
                          <Text style={styles.cardMedPlanTitle}>Daily Medication Plan</Text>
                        </View>

                        <View style={styles.cardMedPlanBadges}>
                          <View style={styles.badgeTakenCount}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={styles.badgeTakenCountText}>{takenMeds.length}/{totalMeds} Taken</Text>
                          </View>
                          {missedMeds.length > 0 && (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => {
                                Alert.alert(
                                  'Missed Medication Alert ⚠️',
                                  `${item.name} has missed ${missedMeds.length} scheduled dose(s) today:\n\n${missedMeds.map((m) => `• ${m.name} (${m.dosage ? m.dosage + ' • ' : ''}${m.time || '08:00 AM'})`).join('\n')}\n\nWould you like to send an urgent reminder alert?`,
                                  [
                                    { text: 'Dismiss', style: 'cancel' },
                                    {
                                      text: 'Send Alert Reminder 🔔',
                                      onPress: () => {
                                        Alert.alert('Alert Dispatched', `Urgent reminder notification sent to ${item.name}.`);
                                      },
                                    },
                                  ]
                                );
                              }}
                              style={styles.badgeMissedCount}
                            >
                              <Ionicons name="alert-circle" size={13} color="#DC2626" />
                              <Text style={styles.badgeMissedCountText}>{missedMeds.length} Missed</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Prominent Missed Medication Alert Action Bar */}
                      {missedMeds.length > 0 && (
                        <View style={styles.missedMedsAlertNotice}>
                          <View style={styles.missedMedsAlertNoticeHeader}>
                            <View style={styles.missedMedsAlertIconWrap}>
                              <Ionicons name="warning" size={16} color="#DC2626" />
                            </View>
                            <View style={styles.missedMedsAlertNoticeTextCol}>
                              <Text style={styles.missedMedsAlertNoticeTitle}>
                                {missedMeds.length} Missed Dose{missedMeds.length > 1 ? 's' : ''} Today
                              </Text>
                              <Text style={styles.missedMedsAlertNoticeSub} numberOfLines={1}>
                                {missedMeds.map((m) => m.name).join(', ')}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.missedMedsAlertNoticeBtn}
                            onPress={() => {
                              Alert.alert(
                                'Send Medication Alert ⚠️',
                                `Send urgent alert notification to ${item.name} for ${missedMeds.length} missed dose(s)?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Send Alert 🔔',
                                    onPress: () => Alert.alert('Alert Dispatched', `Urgent reminder notification sent to ${item.name}.`),
                                  },
                                ]
                              );
                            }}
                          >
                            <Ionicons name="notifications" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.missedMedsAlertNoticeBtnText}>Alert Patient</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {totalMeds === 0 ? (
                        <Text style={styles.emptyPlanCardText}>No active medications scheduled for today</Text>
                      ) : (
                        <View style={styles.planItemsContainer}>
                          {meds.map((m) => {
                            const raw = ((m.dayStatuses && m.dayStatuses[todayStr]) || m.status || 'Pending').toLowerCase();
                            let effectiveStatus = raw;
                            let timeTaken = null;
                            if (liveMedInfo && (liveMedInfo.medicineName?.toLowerCase() === m.name?.toLowerCase() || m.id === liveMedInfo.medicationId)) {
                              effectiveStatus = liveMedInfo.status?.toLowerCase() || raw;
                              timeTaken = liveMedInfo.timeStr;
                            }
                            const isT = effectiveStatus === 'taken';
                            const isM = effectiveStatus === 'missed';

                            return (
                              <View key={m.id || m.name} style={[styles.planItemRow, isT && styles.planItemRowTaken, isM && styles.planItemRowMissed]}>
                                <View style={styles.planItemInfo}>
                                  <Text style={[styles.planItemName, isT && styles.planItemNameTaken, isM && styles.planItemNameMissed]} numberOfLines={1}>
                                    {m.name}
                                  </Text>
                                  <Text style={styles.planItemMeta} numberOfLines={1}>
                                    {m.dosage ? `${m.dosage} • ` : ''}{m.time || '08:00 AM'}
                                  </Text>
                                </View>

                                {isT ? (
                                  <View style={styles.planPillTaken}>
                                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                                    <Text style={styles.planPillTakenText}>Taken ✓{timeTaken ? ` (${timeTaken})` : ''}</Text>
                                  </View>
                                ) : isM ? (
                                  <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                      Alert.alert(
                                        'Missed Dose Alert ⚠️',
                                        `${m.name} (${m.dosage ? m.dosage + ' • ' : ''}${m.time || '08:00 AM'}) was scheduled today and marked as MISSED.\n\nSend an urgent reminder to ${item.name}?`,
                                        [
                                          { text: 'Cancel', style: 'cancel' },
                                          {
                                            text: 'Send Alert 🔔',
                                            onPress: () => Alert.alert('Alert Sent', `Reminder alert sent to ${item.name} for ${m.name}.`),
                                          },
                                        ]
                                      );
                                    }}
                                    style={styles.planPillMissed}
                                  >
                                    <Ionicons name="close-circle" size={12} color="#DC2626" />
                                    <Text style={styles.planPillMissedText}>Missed ✕</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <View style={styles.planPillPending}>
                                    <Ionicons name="hourglass-outline" size={12} color="#D97706" />
                                    <Text style={styles.planPillPendingText}>Pending</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Real-Time Interactive Patient Vitals Interface */}
                <PatientCardVitalsSection
                  patient={item}
                  vitals={patientVitalsMap[item.id]}
                  onRecordVitals={(p) => setSelectedPatientForVitals(p)}
                  onOpenMonitor={(p) => {
                    setVitalsMonitorPatient(p);
                    setVitalsMonitorVisible(true);
                  }}
                />

                {/* Action Buttons for this patient */}
                <View style={styles.patientActionsContainer}>
                  {/* 1. Track on Live OpenStreetMap */}
                  <TouchableOpacity
                    style={styles.trackPatientBtn}
                    onPress={() => onTrackPatientLocation(item.id)}
                  >
                    <Ionicons name="navigate" size={18} color="#FFFFFF" />
                    <Text style={styles.trackPatientBtnText}>Track Live Location</Text>
                  </TouchableOpacity>

                  <View style={styles.secondaryActionsRow}>
                    {/* 2. Assign Medication */}
                    <TouchableOpacity
                      style={styles.medsBtn}
                      onPress={() => setSelectedPatientForMeds(item)}
                    >
                      <Ionicons name="medical" size={15} color="#059669" />
                      <Text style={styles.medsBtnText}>Plan Meds</Text>
                    </TouchableOpacity>

                    {/* 2.5 Monitor Medication */}
                    <TouchableOpacity
                      style={styles.monitorMedsBtn}
                      onPress={() => setSelectedPatientForMedHistory(item)}
                    >
                      <Ionicons name="time" size={15} color="#2563EB" />
                      <Text style={styles.monitorMedsBtnText}>History</Text>
                    </TouchableOpacity>

                    {/* 3. Assign Activity */}
                    {(() => {
                      const acts = deduplicateActivities(item.activities || []);
                      const doneActs = acts.filter((a) => a.completed || a.done).length;
                      const hasActs = acts.length > 0;
                      const allDone = hasActs && doneActs === acts.length;

                      return (
                        <TouchableOpacity
                          style={[styles.actsBtn, allDone && styles.actsBtnAllDone]}
                          onPress={() => setSelectedPatientForActivities(item)}
                        >
                          <Ionicons
                            name={allDone ? 'checkmark-done-circle' : 'calendar'}
                            size={15}
                            color={allDone ? '#059669' : '#2563EB'}
                          />
                          <Text style={[styles.actsBtnText, allDone && styles.actsBtnTextAllDone]}>
                            {hasActs ? `Routines (${doneActs}/${acts.length} Done)` : 'Routines (0)'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })()}

                    {/* 4. Update Vitals */}
                    <TouchableOpacity
                      style={styles.vitalsBtn}
                      onPress={() => {
                        setVitalsMonitorPatient(item);
                        setVitalsMonitorVisible(true);
                      }}
                    >
                      <Ionicons name="heart" size={15} color="#E11D48" />
                      <Text style={styles.vitalsBtnText}>
                        Vitals
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 5. Caregiver Quick Portal Grid */}
      <Text style={styles.sectionTitle}>Command & Support Center</Text>

      <View style={styles.portalGrid}>
        {/* Emergency Notifications Center */}
        <TouchableOpacity style={styles.portalCard} onPress={handleOpenAlerts}>
          <View style={[styles.portalIconCircle, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="alarm-light" size={24} color="#DC2626" />
          </View>
          <Text style={styles.portalCardTitle}>Emergency Alerts</Text>
          <Text style={styles.portalCardSub}>Patient SOS logs</Text>
          <View
            style={[
              styles.portalPill,
              { backgroundColor: unreadAlertsCount > 0 ? '#FEE2E2' : '#DCFCE7' },
            ]}
          >
            <Text
              style={[
                styles.portalPillText,
                { color: unreadAlertsCount > 0 ? '#DC2626' : '#15803D' },
              ]}
            >
              {unreadAlertsCount > 0 ? `${unreadAlertsCount} Unread SOS` : 'All Safe'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Vital Monitor Page */}
        <TouchableOpacity
          style={styles.portalCard}
          onPress={() => {
            setVitalsMonitorPatient(patients[0] || null);
            setVitalsMonitorVisible(true);
          }}
        >
          <View style={[styles.portalIconCircle, { backgroundColor: '#FFE4E6' }]}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#E11D48" />
          </View>
          <Text style={styles.portalCardTitle}>Vital Monitor</Text>
          <Text style={styles.portalCardSub}>Patient telemetry</Text>
          <View style={[styles.portalPill, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.portalPillText, { color: '#E11D48' }]}>Live Vitals</Text>
          </View>
        </TouchableOpacity>

        {/* Daily Medication Plan */}
        <TouchableOpacity
          style={styles.portalCard}
          onPress={() => setSelectedPatientForMeds(patients[0] || null)}
        >
          <View style={[styles.portalIconCircle, { backgroundColor: '#EDE9FE' }]}>
            <MaterialCommunityIcons name="calendar-month-outline" size={24} color="#7C3AED" />
          </View>
          <Text style={styles.portalCardTitle}>Medication Plan</Text>
          <Text style={styles.portalCardSub}>Calendar & routine</Text>
          <View style={[styles.portalPill, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[styles.portalPillText, { color: '#6D28D9' }]}>Schedules</Text>
          </View>
        </TouchableOpacity>



        {/* My Account */}
        <TouchableOpacity
          style={styles.portalCard}
          onPress={() => setAccountModalVisible(true)}
        >
          <View style={[styles.portalIconCircle, { backgroundColor: '#EFF6FF' }]}>
            <FontAwesome5 name="user-cog" size={20} color="#2563EB" />
          </View>
          <Text style={styles.portalCardTitle}>My Account</Text>
          <Text style={styles.portalCardSub}>Profile & alerts</Text>
          <View style={[styles.portalPill, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.portalPillText, { color: '#1D4ED8' }]}>Caregiver ID</Text>
          </View>
        </TouchableOpacity>

        {/* Contact Support */}
        <TouchableOpacity
          style={styles.portalCard}
          onPress={() => setSupportModalVisible(true)}
        >
          <View style={[styles.portalIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="headset" size={22} color="#059669" />
          </View>
          <Text style={styles.portalCardTitle}>Contact Support</Text>
          <Text style={styles.portalCardSub}>24/7 Clinical helpline</Text>
          <View style={[styles.portalPill, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.portalPillText, { color: '#047857' }]}>1-800-555-CARE</Text>
          </View>
        </TouchableOpacity>

        {/* System Settings */}
        <TouchableOpacity style={styles.portalCard} onPress={onOpenSettings}>
          <View style={[styles.portalIconCircle, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="settings-sharp" size={22} color="#4B5563" />
          </View>
          <Text style={styles.portalCardTitle}>Relay Settings</Text>
          <Text style={styles.portalCardSub}>Server & ports</Text>
          <View style={[styles.portalPill, { backgroundColor: '#E5E7EB' }]}>
            <Text style={[styles.portalPillText, { color: '#374151' }]}>Configure</Text>
          </View>
        </TouchableOpacity>

        {/* Connections & Invites */}
        <TouchableOpacity style={styles.portalCard} onPress={() => setConnectionsModalVisible(true)}>
          <View style={[styles.portalIconCircle, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="git-network-outline" size={22} color="#3B82F6" />
          </View>
          <Text style={styles.portalCardTitle}>Connections</Text>
          <Text style={styles.portalCardSub}>Manage network</Text>
          <View style={[styles.portalPill, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.portalPillText, { color: '#1D4ED8' }]}>Invites</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ConnectionsModal
        visible={connectionsModalVisible}
        onClose={async () => {
          setConnectionsModalVisible(false);
          const pts = await getCaregiverPatients();
          setPatients(pts);
        }}
      />
      <AddPatientModal
        visible={addPatientVisible}
        onPatientAdded={handlePatientAdded}
        onClose={async () => {
          setAddPatientVisible(false);
          const pts = await getCaregiverPatients();
          setPatients(pts);
        }}
      />

      <AssignMedicationModal
        visible={!!selectedPatientForMeds}
        patient={selectedPatientForMeds}
        onMedicationsUpdated={handleMedicationsUpdated}
        onClose={() => setSelectedPatientForMeds(null)}
      />

      <MedicationHistoryModal
        visible={!!selectedPatientForMedHistory}
        patient={selectedPatientForMedHistory}
        onClose={() => setSelectedPatientForMedHistory(null)}
      />

      <AssignActivitiesModal
        visible={!!selectedPatientForActivities}
        patient={
          patients.find((p) => p.id === selectedPatientForActivities?.id) ||
          selectedPatientForActivities
        }
        caregiverName={caregiverName}
        onActivitiesUpdated={handleActivitiesUpdated}
        onClose={() => setSelectedPatientForActivities(null)}
      />

      <UpdateVitalsModal
        visible={!!selectedPatientForVitals}
        patient={selectedPatientForVitals}
        caregiverName={caregiverName}
        onVitalsUpdated={(newRecord, patientId) => {
          setPatientVitalsMap((prev) => ({
            ...prev,
            [patientId]: newRecord,
          }));
        }}
        onClose={() => setSelectedPatientForVitals(null)}
      />

      <PatientVitalsMonitorModal
        visible={vitalsMonitorVisible}
        initialPatient={vitalsMonitorPatient || patients[0]}
        patients={patients}
        caregiverName={caregiverName}
        onClose={() => setVitalsMonitorVisible(false)}
      />

      <EmergencyAlertsModal
        visible={alertsModalVisible}
        alerts={alerts}
        onTrackPatient={(id) => onTrackPatientLocation(id)}
        onClearAlerts={() => setAlerts([])}
        onClose={() => setAlertsModalVisible(false)}
      />

      <CaregiverAccountModal
        visible={accountModalVisible}
        currentUser={currentUser}
        patientsCount={patients.length}
        onLogout={onLogout}
        onClose={() => setAccountModalVisible(false)}
      />

      <ContactSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
      />

      <NotificationCenterModal
        activeRole="caregiver"
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
      />
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
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    marginRight: 12,
  },
  headerDetails: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  sosPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sosDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  sosPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  greetingTitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  caregiverNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  roomBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  roomTextHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  accountIconBtn: {
    padding: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  alertBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  alertBannerTextCol: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  alertBannerSub: {
    fontSize: 11,
    color: '#FEE2E2',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addPatientBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  patientsList: {
    gap: 12,
    marginBottom: 20,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patientTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  patientAvatarBox: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginRight: 10,
  },
  patientAvatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  patientMainInfo: {
    flex: 1,
  },
  patientNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  patientCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  patientIdBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  patientCondition: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  contactsWrapper: {
    marginTop: 4,
    gap: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    width: 60,
  },
  contactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactIconBtn: {
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 6,
  },
  patientMetaCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillOnline: {
    backgroundColor: '#DCFCE7',
  },
  statusPillIdle: {
    backgroundColor: '#F3F4F6',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  batteryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  deletePatientBtn: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  patientActionsContainer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trackPatientBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  trackPatientBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  medsBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  medsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  monitorMedsBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  monitorMedsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  actsBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  actsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  actsBtnAllDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  actsBtnTextAllDone: {
    color: '#065F46',
  },
  vitalsBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF1F2',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  vitalsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE123C',
  },
  portalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  portalCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  portalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  portalCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  portalCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  portalPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  portalPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  adherenceRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  adherenceMiniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adherenceMiniText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  aiRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiRiskBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyPatientsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  emptyPatientsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  emptyPatientsSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Vitals Mini Strip on Patient Card
  vitalsMiniStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vitalsMiniLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  vitalMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vitalMiniVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  vitalMiniUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  vitalMiniDivider: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  vitalMiniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vitalMiniStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  // Calendar Section
  calendarSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  calendarSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarSectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Vitals Update History Section
  vitalsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  vitalsSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vitalsSectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openVitalsMonitorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  openVitalsMonitorBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  quickRecordVitalsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  quickRecordVitalsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Patient-by-Patient Vitals Carousel
  vitalsPatientCarousel: {
    gap: 12,
    paddingBottom: 8,
    marginBottom: 12,
  },
  vitalsPatientCard: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  vitalsPatientCardAlert: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  vpcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  vpcAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  vpcAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C3AED',
  },
  vpcInfo: {
    flex: 1,
  },
  vpcName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  vpcId: {
    fontSize: 10,
    color: '#64748B',
  },
  vpcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  vpcDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  vpcBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  vpcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vpcItem: {
    width: '48%',
    marginBottom: 4,
  },
  vpcLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  vpcVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  vpcFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  vpcTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  vpcActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },

  vitalsHistoryContainer: {
    marginBottom: 20,
    gap: 10,
  },
  emptyVitalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyVitalsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptyVitalsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  vitalsHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  vitalsHistoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vitalsHistoryPatientInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  vitalsHistoryPatientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  vitalsHistoryTimestamp: {
    fontSize: 11,
    color: '#64748B',
  },
  vitalsHistoryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  vitalsHistoryStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  vitalsHistoryMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  vitalsHistMetricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  vitalsHistMetricText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  vitalsHistoryNotesText: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 2,
  },
  liveMedStatusCard: {
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
  },
  liveMedCardTaken: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  liveMedCardPending: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  liveMedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveMedTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveMedIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveMedCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  liveMedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveMedStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  patientCardMedPlan: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardMedPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    marginBottom: 10,
  },
  cardMedPlanHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  cardMedPlanIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMedPlanTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardMedPlanBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgeTakenCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeTakenCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  badgeMissedCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeMissedCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
  },
  missedMedsAlertNotice: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  missedMedsAlertNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  missedMedsAlertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  missedMedsAlertNoticeTextCol: {
    flex: 1,
  },
  missedMedsAlertNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  missedMedsAlertNoticeSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#B91C1C',
    marginTop: 1.5,
  },
  missedMedsAlertNoticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  missedMedsAlertNoticeBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  emptyPlanCardText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  planItemsContainer: {
    gap: 6,
  },
  planItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  planItemRowTaken: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  planItemRowMissed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  planItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  planItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  planItemNameTaken: {
    color: '#065F46',
  },
  planItemNameMissed: {
    color: '#991B1B',
  },
  planItemMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  planPillTaken: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexShrink: 0,
  },
  planPillTakenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  planPillMissed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexShrink: 0,
    marginLeft: 6,
  },
  planPillMissedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
  },
  planPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexShrink: 0,
  },
  planPillPendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  caregiverNotificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationIconBox: {
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTextCol: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  notificationMessage: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },
  notificationViewBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
  },
  notificationViewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
