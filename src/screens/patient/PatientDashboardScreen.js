// src/screens/patient/PatientDashboardScreen.js - Main Post-Login Patient Home Interface
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { syncService } from '../../services/syncService';
import { getCurrentLocation } from '../../services/locationService';
import {
  getPatientActivities,
  getTodayMedicationsForPatient,
  updateMedicationDayStatus,
} from '../../services/patientManagementService';
import { notificationService } from '../../services/notificationService';
import { getFamilyMembers } from '../../services/familyMembersService';
import { getLatestPatientVitals } from '../../services/vitalsService';

// Modals
import NotificationCenterModal from '../../components/NotificationCenterModal';
import MedicationModal from '../../components/patient/MedicationModal';
import MedicationReminderModal from '../../components/patient/MedicationReminderModal';
import ContactsModal from '../../components/patient/ContactsModal';
import ProfileModal from '../../components/patient/ProfileModal';
import VitalsModal from '../../components/patient/VitalsModal';
import CognitiveGamesModal from '../../components/patient/CognitiveGamesModal';
import DailyActivitiesModal from '../../components/patient/DailyActivitiesModal';
import ConnectionsModal from '../../components/ConnectionsModal';
import FamilyMembersModal from '../../components/patient/FamilyMembersModal';

export default function PatientDashboardScreen({
  currentUser,
  roomCode,
  onNavigateToLocationShare,
  onOpenSettings,
}) {
  // Real date & time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal visibility states
  const [medicationVisible, setMedicationVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [currentReminderData, setCurrentReminderData] = useState(null);
  const [adherenceData, setAdherenceData] = useState(null);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [vitalsVisible, setVitalsVisible] = useState(false);
  const [vitalsData, setVitalsData] = useState(null);
  const [cognitiveVisible, setCognitiveVisible] = useState(false);
  const [activitiesVisible, setActivitiesVisible] = useState(false);
  const [patientActivities, setPatientActivities] = useState([]);
  const [connectionsVisible, setConnectionsVisible] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [todayMeds, setTodayMeds] = useState([]);

  // Notification states
  const [activeNotification, setActiveNotification] = useState(null);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => notificationService.getUnreadCount('patient'));

  useEffect(() => {
    let mounted = true;
    const unsub = notificationService.on('notifications_updated', () => {
      if (mounted) setUnreadCount(notificationService.getUnreadCount('patient'));
    });

    const unsubNewNotif = notificationService.on('new_notification', (notif) => {
      if (mounted && notif.targetRoles && (notif.targetRoles.includes('patient') || notif.targetRoles.includes('dual'))) {
        setActiveNotification({
          title: notif.title,
          message: notif.message,
          icon: notif.icon || 'calendar-clock',
          color: notif.color || '#2563EB',
        });
        setTimeout(() => {
          if (mounted) setActiveNotification(null);
        }, 8000);
      }
    });

    const unsubBooking = syncService.on('booking_notification', (incoming) => {
      const { booking } = incoming || {};
      const doctorName = booking?.doctorName || 'Dr. Vimukthi Perera';
      const type = booking?.type || 'Consultation';
      const time = booking?.time || '';
      const date = booking?.dateFormatted || booking?.date || 'Upcoming';
      const notes = booking?.notes ? ` • Note: ${booking.notes}` : '';

      const title = '📅 Doctor Appointment Scheduled';
      const message = `${doctorName} scheduled ${type} on ${date} at ${time}.${notes}`;

      notificationService.addNotification({
        type: 'booking',
        title,
        message,
        icon: 'calendar-clock',
        color: '#0284C7',
        bg: '#E0F2FE',
      }, ['patient', 'dual']);

      if (mounted) {
        setActiveNotification({
          title,
          message,
          icon: 'calendar-clock',
          color: '#0284C7',
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

  const effectivePatientId = (roomCode || currentUser?.pairingCode || currentUser?.id || 'CARE-1001').toUpperCase().trim();

  // Load family members and listen for real-time updates
  useEffect(() => {
    let mounted = true;
    getFamilyMembers(effectivePatientId).then((members) => {
      if (mounted) setFamilyMembers(members);
    });

    const unsubFamily = syncService.on('family_members_updated', (payload) => {
      if (!payload || payload.patientId === effectivePatientId) {
        getFamilyMembers(effectivePatientId).then((members) => {
          if (mounted) setFamilyMembers(members);
        });
      }
    });

    return () => {
      mounted = false;
      unsubFamily();
    };
  }, [effectivePatientId]);

  // Ticking digital clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load initial patient vitals telemetry
  useEffect(() => {
    let mounted = true;
    getLatestPatientVitals(effectivePatientId).then((v) => {
      if (mounted && v) {
        setVitalsData(v);
      }
    });
    return () => {
      mounted = false;
    };
  }, [effectivePatientId]);

  // Listen for medication reminders & real-time adherence updates (Figure 4.3)
  useEffect(() => {
    const unsubReminder = syncService.on('medication_reminder', (msg) => {
      if (!msg.patientId || msg.patientId === roomCode) {
        setCurrentReminderData(msg);
        setReminderModalVisible(true);
      }
    });

    const unsubAdherence = syncService.on('adherence_updated', (msg) => {
      if (msg.patientId === roomCode) {
        setAdherenceData(msg.adherence);
      }
    });

    const unsubVitals = syncService.on('vitals_updated', (msg) => {
      const targetId = (msg.patientId || msg.roomCode || '').toUpperCase().trim();
      const myId = effectivePatientId.toUpperCase().trim();
      const myRoom = (roomCode || '').toUpperCase().trim();

      if (!targetId || targetId === myId || targetId === myRoom) {
        setVitalsData(msg.vitals);

        // Immediately open the patient's vitals interface as requested
        setVitalsVisible(true);

        const hr = msg.vitals?.hr ? `❤️ ${msg.vitals.hr} BPM` : '';
        const bp = msg.vitals?.bp ? `🩺 ${msg.vitals.bp}` : '';
        const spo2 = msg.vitals?.spo2 ? `🫁 ${msg.vitals.spo2}%` : '';
        const summary = [hr, bp, spo2].filter(Boolean).join('  ');

        const notifTitle = '🩺 Vitals Updated by Caregiver';
        const notifMsg = `Your caregiver recorded: ${summary || 'New biometric health telemetry.'}`;

        notificationService.addNotification({
          title: notifTitle,
          message: notifMsg,
          icon: 'heart-pulse',
          color: '#E11D48',
          bg: '#FFE4E6',
        }, ['patient']);

        setActiveNotification({
          title: notifTitle,
          message: summary || 'New biometric vitals recorded by caregiver.',
        });

        setTimeout(() => setActiveNotification(null), 6000);
      }
    });

    const unsubInvites = syncService.on('new_invitation', (msg) => {
      const { invitation } = msg;
      Alert.alert(
        'New Connection Request',
        `${invitation.fromName} (${invitation.fromRole}) wants to connect to your room.`,
        [
          { text: 'View Requests', onPress: () => setConnectionsVisible(true) },
          { text: 'Dismiss', style: 'cancel' }
        ]
      );
    });

    return () => {
      unsubReminder();
      unsubAdherence();
      unsubVitals();
      unsubInvites();
    };
  }, [roomCode, effectivePatientId]);

  // Load and listen for today's medications (extracted automatically from doctor's 1-month plan)
  useEffect(() => {
    let isMounted = true;
    const loadMeds = async () => {
      try {
        const meds = await getTodayMedicationsForPatient(effectivePatientId);
        if (isMounted && Array.isArray(meds)) setTodayMeds(meds);
      } catch (_e) {}
    };
    loadMeds();

    const unsubPlan = syncService.on('medication_plan_updated', (incoming) => {
      const pid = (incoming.patientId || '').toUpperCase().trim();
      if (!pid || pid === effectivePatientId) {
        loadMeds();
      }
    });

    const unsubPresc = syncService.on('new_prescription', () => {
      loadMeds();
    });

    return () => {
      isMounted = false;
      if (unsubPlan) unsubPlan();
      if (unsubPresc) unsubPresc();
    };
  }, [effectivePatientId]);

  const handleTakeMedication = async (med) => {
    const todayStr = new Date().toISOString().split('T')[0];
    await updateMedicationDayStatus(effectivePatientId, med.id, todayStr, 'Taken');
    syncService.sendMedicationResponse(null, effectivePatientId, med.id, 'taken', med.name, med.dosage);
    syncService.sendMedicationStatusUpdate(effectivePatientId, med.name, 'taken', med.dosage);
    setTodayMeds((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, status: 'Taken' } : m))
    );
    Alert.alert(
      'Medicine Taken! ✓',
      `You marked ${med.name} (${med.dosage || ''}) as taken. Your caregiver and doctor have been notified.`
    );
  };

  const handleMissMedication = async (med) => {
    const todayStr = new Date().toISOString().split('T')[0];
    await updateMedicationDayStatus(effectivePatientId, med.id, todayStr, 'Missed');
    syncService.sendMedicationResponse(null, effectivePatientId, med.id, 'missed', med.name, med.dosage);
    syncService.sendMedicationStatusUpdate(effectivePatientId, med.name, 'missed', med.dosage);
    setTodayMeds((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, status: 'Missed' } : m))
    );
    Alert.alert(
      'Medication Missed ⚠️',
      `You marked ${med.name} (${med.dosage || ''}) as missed. Your caregiver and doctor have been notified.`
    );
  };

  // Load and listen for caregiver-assigned daily activities in real-time
  useEffect(() => {
    let isMounted = true;
    const loadActs = async () => {
      try {
        const acts = await getPatientActivities(effectivePatientId);
        if (isMounted) setPatientActivities(acts);
      } catch (_e) {}
    };
    loadActs();

    const unsubNewAct = syncService.on('new_activity', (incoming) => {
      const pid = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      if (pid === effectivePatientId && incoming.activity) {
        setPatientActivities((prev) => {
          const exists = prev.some((a) => a.id === incoming.activity.id);
          if (exists) {
            return prev.map((a) => (a.id === incoming.activity.id ? incoming.activity : a));
          }
          return [...prev, incoming.activity];
        });

        const notifTitle = '📅 New Routine Assigned';
        const notifMsg = `${incoming.caregiverName || 'Your caregiver'} has added "${incoming.activity.title}" at ${incoming.activity.time} to your daily schedule.`;
        
        notificationService.addNotification({
          title: notifTitle,
          message: notifMsg,
          icon: 'calendar-plus',
          color: '#2563EB',
          bg: '#EFF6FF',
        }, ['patient']);

        setActiveNotification({
          title: notifTitle,
          message: notifMsg,
        });

        // Auto-hide notification bar after 5 seconds
        setTimeout(() => setActiveNotification(null), 5000);
      }
    });

    const unsubActStatus = syncService.on('activity_status_update', (incoming) => {
      const pid = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      if (pid === effectivePatientId) {
        setPatientActivities((prev) =>
          prev.map((a) => (a.id === incoming.activityId ? { ...a, completed: incoming.completed, done: incoming.completed } : a))
        );
      }
    });

    const unsubDelAct = syncService.on('delete_activity', (incoming) => {
      const pid = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      if (pid === effectivePatientId) {
        setPatientActivities((prev) => prev.filter((a) => a.id !== incoming.activityId));
      }
    });

    return () => {
      isMounted = false;
      unsubNewAct();
      unsubActStatus();
      unsubDelAct();
    };
  }, [effectivePatientId]);

  // Removed isFullyConnected logic

  // Compute greeting based on hour of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Formatted date and time strings
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Emergency SOS Trigger
  const handleTriggerSOS = async () => {
    setSosActive(true);
    const loc = await getCurrentLocation();
    syncService.sendSOS({
      patientName: currentUser?.name || 'Patient',
      patientPhone: currentUser?.phone || '',
      emergencyContact: currentUser?.emergencyContact || '',
      location: loc,
      timestamp: Date.now(),
    });

    Alert.alert(
      '🚨 EMERGENCY SOS BROADCASTED',
      `An emergency distress alert with your live GPS location has been transmitted to your caregiver.\n\nAssistance is on the way.`,
      [{ text: 'Dismiss SOS', onPress: () => setSosActive(false) }]
    );
  };

  const patientName = currentUser?.name || 'Patient';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. Personalized Greeting with Signup Name */}
      <View style={styles.greetingCard}>
        <View style={styles.greetingRow}>
          <View style={styles.avatarCircle}>
            <FontAwesome5 name="user-alt" size={24} color="#059669" />
          </View>
          <View style={styles.greetingTextCol}>
            <Text style={styles.greetingTimeText}>{getGreeting()},</Text>
            <Text style={styles.greetingNameText} numberOfLines={1}>
              {patientName} 👋
            </Text>
          </View>
          
          {/* Notification Bell Icon */}
          <TouchableOpacity style={styles.bellBtn} onPress={() => setNotificationsModalVisible(true)}>
            <Ionicons name="notifications-outline" size={24} color="#4B5563" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. Real Date & Live Digital Clock */}
        <View style={styles.clockDateSection}>
          <View style={styles.clockRow}>
            <Ionicons name="time" size={20} color="#10B981" />
            <Text style={styles.liveClockText}>{formattedTime}</Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color="#047857" />
            <Text style={styles.liveDateText}>{formattedDate}</Text>
          </View>
          <View style={styles.weatherPill}>
            <Ionicons name="sunny" size={14} color="#F59E0B" />
            <Text style={styles.weatherText}>Comfortable & Peaceful Day • 24°C</Text>
          </View>
        </View>
      </View>

      {/* Floating Notification Bar */}
      {activeNotification && (
        <View style={styles.notificationBar}>
          <View style={styles.notificationIconBox}>
            <MaterialCommunityIcons
              name={activeNotification.icon || 'information'}
              size={24}
              color={activeNotification.color || '#2563EB'}
            />
          </View>
          <View style={styles.notificationTextCol}>
            <Text style={styles.notificationTitle}>{activeNotification.title}</Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>{activeNotification.message}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationViewBtn}
            onPress={() => {
              setActiveNotification(null);
              setNotificationsModalVisible(true);
            }}
          >
            <Text style={styles.notificationViewBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Emergency SOS Panic Button */}
      <TouchableOpacity
        style={[styles.emergencyButton, sosActive && styles.emergencyButtonActive]}
        onPress={handleTriggerSOS}
        activeOpacity={0.85}
      >
        <View style={styles.emergencyIconPulse}>
          <MaterialCommunityIcons name="alarm-light" size={28} color="#FFFFFF" />
        </View>
        <View style={styles.emergencyTextCol}>
          <Text style={styles.emergencyTitle}>EMERGENCY SOS</Text>
          <Text style={styles.emergencySub}>Tap to send immediate distress alert to Caregiver</Text>
        </View>
        <Ionicons name="alert-circle" size={24} color="#FEE2E2" />
      </TouchableOpacity>

      {/* Primary Highlight Card: 4. Location Share -> Links to PatientScreen.js */}
      <TouchableOpacity
        style={styles.locationShareHero}
        onPress={onNavigateToLocationShare}
        activeOpacity={0.88}
      >
        <View style={styles.locationHeroLeft}>
          <View style={styles.radarIconWrap}>
            <View style={styles.radarPulseRing} />
            <Ionicons name="navigate" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.locationHeroDetails}>
            <View style={styles.liveTagRow}>
              <Text style={styles.locationHeroTitle}>Location Share</Text>
              <View style={styles.liveTag}>
                <View style={styles.liveTagDot} />
                <Text style={styles.liveTagText}>LIVE GPS</Text>
              </View>
            </View>
            <Text style={styles.locationHeroSub}>
              Share live movement, route breadcrumbs & radar map with your caregiver
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#059669" />
      </TouchableOpacity>



      {/* 4.6. Today's Medication Plan (Auto-Extracted from Doctor's 1-Month Plan) */}
      <View style={styles.todayMedsSection}>
        <View style={styles.todayMedsSectionHeader}>
          <View style={styles.todayMedsTitleCol}>
            <View style={styles.todayMedsTitleRow}>
              <View style={styles.todayMedsIconCircle}>
                <MaterialCommunityIcons name="pill" size={20} color="#059669" />
              </View>
              <Text style={styles.todayMedsSectionTitle}>Today&apos;s Medication Plan</Text>
            </View>
            <Text style={styles.todayMedsSectionSub}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • Daily schedule auto-extracted from 1-month plan
            </Text>
          </View>

          <TouchableOpacity
            style={styles.openPlanBtn}
            onPress={() => setMedicationVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.openPlanBtnText}>Full View</Text>
            <Ionicons name="chevron-forward" size={14} color="#059669" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar for Today */}
        {todayMeds.length > 0 && (
          <View style={styles.todayProgressBanner}>
            <View style={styles.todayProgressRow}>
              <Text style={styles.todayProgressLabel}>TODAY&apos;S DOSES</Text>
              <Text style={styles.todayProgressValue}>
                {todayMeds.filter((m) => (m.status || '').toLowerCase() === 'taken').length} of {todayMeds.length} Taken
              </Text>
            </View>
            <View style={styles.todayProgressBarBg}>
              <View
                style={[
                  styles.todayProgressBarFill,
                  {
                    width: `${Math.round(
                      (todayMeds.filter((m) => (m.status || '').toLowerCase() === 'taken').length /
                        todayMeds.length) *
                        100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Cards of Today's Doses */}
        {todayMeds.length === 0 ? (
          <View style={styles.noMedsTodayCard}>
            <Ionicons name="checkmark-circle-outline" size={30} color="#10B981" />
            <Text style={styles.noMedsTodayTitle}>No Pending Medicines For Today</Text>
            <Text style={styles.noMedsTodaySub}>
              Your doctor hasn&apos;t scheduled any doses for today. Rest well!
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.todayMedsScrollContent}
          >
            {todayMeds.map((med) => {
              const normStatus = (med.status || 'pending').toLowerCase();
              const isTaken = normStatus === 'taken';
              const isMissed = normStatus === 'missed';
              const isPending = !isTaken && !isMissed;

              return (
                <View
                  key={med.id}
                  style={[
                    styles.todayMedCard,
                    isTaken && styles.todayMedCardTaken,
                    isMissed && styles.todayMedCardMissed,
                  ]}
                >
                  <View style={styles.todayMedTopRow}>
                    <View style={[styles.todayTimeBadge, isTaken && styles.todayTimeBadgeTaken, isMissed && styles.todayTimeBadgeMissed]}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={isTaken ? '#059669' : isMissed ? '#DC2626' : '#2563EB'}
                      />
                      <Text
                        style={[styles.todayTimeText, isTaken && styles.todayTimeTextTaken, isMissed && styles.todayTimeTextMissed]}
                      >
                        {med.time || '08:00 AM'}
                      </Text>
                    </View>
                    {isTaken ? (
                      <View style={styles.statusTakenBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#059669" />
                        <Text style={styles.statusTakenText}>Taken ✓</Text>
                      </View>
                    ) : isMissed ? (
                      <View style={styles.statusMissedBadge}>
                        <Ionicons name="close-circle" size={13} color="#DC2626" />
                        <Text style={styles.statusMissedText}>Missed ✕</Text>
                      </View>
                    ) : (
                      <View style={styles.statusPendingBadge}>
                        <Text style={styles.statusPendingText}>Scheduled</Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[styles.todayMedName, isTaken && styles.todayMedNameTaken, isMissed && styles.todayMedNameMissed]}
                    numberOfLines={2}
                  >
                    {med.name}
                  </Text>
                  <Text style={styles.todayMedDosage}>{med.dosage}</Text>
                  <Text style={styles.todayMedPeriod}>
                    {med.period || 'Morning with breakfast'}
                  </Text>

                  {/* 1-Tap Action Buttons Row */}
                  <View style={styles.todayCardActionsRow}>
                    {isPending ? (
                      <View style={styles.splitButtonsRow}>
                        <TouchableOpacity
                          style={styles.takeMedBtnSplit}
                          onPress={() => handleTakeMedication(med)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginRight: 3 }} />
                          <Text style={styles.takeMedBtnText}>Get</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.missMedBtnSplit}
                          onPress={() => handleMissMedication(med)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle" size={14} color="#FFFFFF" style={{ marginRight: 3 }} />
                          <Text style={styles.missMedBtnText}>Miss</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isTaken ? (
                      <View style={styles.confirmedDoneRow}>
                        <View style={styles.confirmedDonePill}>
                          <Ionicons name="checkmark-circle" size={13} color="#059669" />
                          <Text style={styles.confirmedDoneText}>Taken Today</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.miniUndoBtn}
                          onPress={() => handleMissMedication(med)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.miniUndoText}>Missed?</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.confirmedDoneRow}>
                        <View style={styles.confirmedMissedPill}>
                          <Ionicons name="alert-circle" size={13} color="#DC2626" />
                          <Text style={styles.confirmedMissedText}>Missed</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.miniGetNowBtn}
                          onPress={() => handleTakeMedication(med)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.miniGetNowText}>Got It!</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Section Header */}
      <Text style={styles.gridSectionTitle}>Care & Health Management</Text>

      {/* 5-Column Feature Grid */}
      <View style={styles.gridContainer}>
        {/* Family Album */}
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setFamilyModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="heart" size={26} color="#EC4899" />
          </View>
          <Text style={styles.gridCardTitle}>Family Album</Text>
          <Text style={styles.gridCardSub}>Loved ones &amp; calls</Text>
          <View style={styles.gridBadgePink}>
            <Text style={styles.gridBadgePinkText}>{familyMembers.length} Loved Ones</Text>
          </View>
        </TouchableOpacity>

        {/* Medication Plan */}
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setMedicationVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <MaterialCommunityIcons name="pill" size={26} color="#10B981" />
          </View>
          <Text style={styles.gridCardTitle}>Medication Plan</Text>
          <Text style={styles.gridCardSub}>
            {adherenceData ? `Adherence: ${adherenceData.daily}%` : 'No plans set yet'}
          </Text>
          <View style={styles.gridBadgeGreen}>
            <Text style={styles.gridBadgeGreenText}>
              {adherenceData ? `${adherenceData.daily}% Today` : 'Pending Setup'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Contacts */}
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setContactsVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="call" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.gridCardTitle}>Contacts</Text>
          <Text style={styles.gridCardSub}>Caregiver & Doctors</Text>
          <View style={styles.gridBadgeBlue}>
            <Text style={styles.gridBadgeBlueText}>1-Tap Dial</Text>
          </View>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setProfileVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <FontAwesome5 name="id-card" size={22} color="#D97706" />
          </View>
          <Text style={styles.gridCardTitle}>Profile</Text>
          <Text style={styles.gridCardSub}>Medical info & ID</Text>
          <View style={styles.gridBadgeAmber}>
            <Text style={styles.gridBadgeAmberText}>{roomCode || 'Not set'}</Text>
          </View>
        </TouchableOpacity>

        {/* Vitals */}
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setVitalsVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="heart-pulse" size={26} color="#EF4444" />
          </View>
          <Text style={styles.gridCardTitle}>Vitals</Text>
          <Text style={styles.gridCardSub}>
            {vitalsData ? `${vitalsData.hr || vitalsData.bpm || '72'} BPM • ${vitalsData.bp || '120/80'}` : 'No readings yet'}
          </Text>
          <View style={[styles.gridBadgeRed, vitalsData?.statusColor ? { backgroundColor: vitalsData.statusColor + '20' } : null]}>
            <Text style={[styles.gridBadgeRedText, vitalsData?.statusColor ? { color: vitalsData.statusColor } : null]}>
              {vitalsData?.status || (vitalsData ? 'Normal' : 'Empty')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Cognitive Activities */}
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setCognitiveVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: '#F5F3FF' }]}>
            <MaterialCommunityIcons name="brain" size={26} color="#8B5CF6" />
          </View>
          <Text style={styles.gridCardTitle}>Cognitive Games</Text>
          <Text style={styles.gridCardSub}>Brain memory fitness</Text>
          <View style={styles.gridBadgePurple}>
            <Text style={styles.gridBadgePurpleText}>Play Match</Text>
          </View>
        </TouchableOpacity>

        {/* My Activities */}
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setActivitiesVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: '#F0F9FF' }]}>
            <MaterialCommunityIcons name="calendar-check" size={26} color="#0284C7" />
          </View>
          <Text style={styles.gridCardTitle}>My Activities</Text>
          <Text style={styles.gridCardSub}>
            {patientActivities.length === 0
              ? 'Routines & Hydration'
              : `${patientActivities.length} Scheduled Routine${patientActivities.length > 1 ? 's' : ''}`}
          </Text>
          <View style={patientActivities.length > 0 ? styles.gridBadgeGreen : styles.gridBadgeCyan}>
            <Text style={patientActivities.length > 0 ? styles.gridBadgeGreenText : styles.gridBadgeCyanText}>
              {patientActivities.length === 0
                ? 'No acts scheduled'
                : `${patientActivities.filter((a) => a.completed || a.done).length}/${patientActivities.length} Done`}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Connections */}
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setConnectionsVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="git-network-outline" size={26} color="#3B82F6" />
          </View>
          <Text style={styles.gridCardTitle}>Connections</Text>
          <Text style={styles.gridCardSub}>Manage network</Text>
          <View style={styles.gridBadgeBlue}>
            <Text style={styles.gridBadgeBlueText}>Pending Invites</Text>
          </View>
        </TouchableOpacity>

      </View>

      {/* Quick Status Footer */}
      <View style={styles.pairingFooter}>
        <View style={styles.pairingLeft}>
          <MaterialCommunityIcons name="shield-account" size={20} color="#3B82F6" />
          <View>
            <Text style={styles.pairingTitle}>Caregiver Setup</Text>
            <Text style={styles.pairingSub}>
              {roomCode ? `Share Code: ${roomCode} to connect` : 'Not connected to a caregiver yet'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingsPill} onPress={onOpenSettings}>
          <Text style={styles.settingsPillText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Modals */}
      <MedicationModal
        visible={medicationVisible}
        onClose={() => setMedicationVisible(false)}
        roomCode={roomCode}
      />

      <MedicationReminderModal
        visible={reminderModalVisible}
        reminderData={currentReminderData}
        onClose={() => setReminderModalVisible(false)}
        roomCode={roomCode}
      />

      <ContactsModal
        visible={contactsVisible}
        currentUser={currentUser}
        onClose={() => setContactsVisible(false)}
      />

      <ProfileModal
        visible={profileVisible}
        currentUser={currentUser}
        onClose={() => setProfileVisible(false)}
      />

      <VitalsModal
        visible={vitalsVisible}
        vitalsData={vitalsData}
        onClose={() => setVitalsVisible(false)}
      />

      <CognitiveGamesModal
        visible={cognitiveVisible}
        onClose={() => setCognitiveVisible(false)}
      />

      <DailyActivitiesModal
        visible={activitiesVisible}
        onClose={() => setActivitiesVisible(false)}
        roomCode={effectivePatientId}
        currentUser={currentUser}
        activitiesList={patientActivities}
        onActivitiesUpdated={setPatientActivities}
      />
      
      <ConnectionsModal
        visible={connectionsVisible}
        onClose={() => setConnectionsVisible(false)}
      />

      <NotificationCenterModal
        activeRole="patient"
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
      />

      <FamilyMembersModal
        visible={familyModalVisible}
        patientId={effectivePatientId}
        familyMembers={familyMembers}
        onUpdateFamilyMembers={setFamilyMembers}
        onClose={() => setFamilyModalVisible(false)}
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
  greetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#E6F4EA',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  greetingTextCol: {
    flex: 1,
  },
  greetingTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  greetingNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 2,
  },
  bellBtn: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationBar: {
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
  },
  notificationTextCol: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  notificationMessage: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
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
  clockDateSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveClockText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liveDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weatherText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  emergencyButtonActive: {
    backgroundColor: '#991B1B',
  },
  emergencyIconPulse: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTextCol: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emergencySub: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 2,
  },
  locationShareHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  locationHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  radarIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPulseRing: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  locationHeroDetails: {
    flex: 1,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  locationHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  locationHeroSub: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  gridSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  gridCard: {
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
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  gridCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  gridBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gridBadgeGreenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  gridBadgeBlue: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gridBadgeBlueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  gridBadgeAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gridBadgeAmberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  gridBadgeRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gridBadgeRedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
  },
  gridBadgePurple: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gridBadgePurpleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
  },
  gridBadgeCyan: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gridBadgeCyanText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  gridBadgePink: {
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gridBadgePinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BE185D',
  },
  familySection: {
    marginBottom: 20,
  },
  familySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  familySectionTitleCol: {
    flex: 1,
  },
  familySectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familyHeaderIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  familySectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  familySectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  viewAlbumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  viewAlbumBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE185D',
  },
  familyScrollContent: {
    paddingRight: 10,
    gap: 14,
  },
  familyMiniCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FCE7F3',
    shadowColor: '#DB2777',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  familyCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  familyPhotoWrapper: {
    position: 'relative',
  },
  familyMiniPhoto: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#F472B6',
    backgroundColor: '#F1F5F9',
  },
  familyEmojiBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  familyDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  familyMemberName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  familyRelationTag: {
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  familyRelationTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DB2777',
  },
  familyBdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  familyBdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  miniBdayAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  miniBdayAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  familyMemoryBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#A855F7',
  },
  familyMemoryLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7E22CE',
    letterSpacing: 0.5,
  },
  familyMemoryText: {
    fontSize: 11,
    color: '#4C1D95',
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  familyPhoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
  },
  familyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  familyCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: 10,
  },
  familyCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  familyWhatsAppBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#25D366',
    paddingVertical: 8,
    borderRadius: 10,
  },
  familyWhatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  addFamilyCard: {
    width: 140,
    backgroundColor: '#FFF1F2',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFamilyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  addFamilyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#BE123C',
  },
  addFamilySub: {
    fontSize: 10,
    color: '#9F1239',
    textAlign: 'center',
    marginTop: 3,
  },
  pairingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pairingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pairingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  pairingSub: {
    fontSize: 11,
    color: '#64748B',
  },
  settingsPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  settingsPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  // Today's Medication Plan Styles
  todayMedsSection: {
    marginBottom: 24,
  },
  todayMedsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayMedsTitleCol: {
    flex: 1,
  },
  todayMedsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayMedsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayMedsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  todayMedsSectionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  openPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openPlanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  todayProgressBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  todayProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  todayProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  todayProgressValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  todayProgressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  todayProgressBarFill: {
    height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  todayMedsScrollContent: {
    gap: 12,
    paddingBottom: 6,
  },
  todayMedCard: {
    width: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  todayMedCardTaken: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  todayMedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayTimeBadgeTaken: {
    backgroundColor: '#ECFDF5',
  },
  todayTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  todayTimeTextTaken: {
    color: '#047857',
  },
  statusTakenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTakenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  statusPendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  todayMedName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  todayMedNameTaken: {
    color: '#047857',
  },
  todayMedDosage: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 2,
  },
  todayMedPeriod: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 12,
  },
  takeMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
  },
  takeMedBtnDone: {
    backgroundColor: '#059669',
    opacity: 0.8,
  },
  takeMedBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  todayMedCardMissed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  todayTimeBadgeMissed: {
    backgroundColor: '#FEE2E2',
  },
  todayTimeTextMissed: {
    color: '#B91C1C',
  },
  statusMissedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusMissedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  todayMedNameMissed: {
    color: '#991B1B',
  },
  todayCardActionsRow: {
    marginTop: 2,
  },
  splitButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  takeMedBtnSplit: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 8,
  },
  missMedBtnSplit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 9,
    borderRadius: 8,
  },
  missMedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmedDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  confirmedDonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmedDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  confirmedMissedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmedMissedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  miniUndoBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#FEE2E2',
  },
  miniUndoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  miniGetNowBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#D1FAE5',
  },
  miniGetNowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  noMedsTodayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noMedsTodayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  noMedsTodaySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
