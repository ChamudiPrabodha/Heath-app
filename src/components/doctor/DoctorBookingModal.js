// src/components/doctor/DoctorBookingModal.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  bookingService,
  getTodayDateStr,
  getOffsetDateStr,
  formatDisplayDate,
} from '../../services/bookingService';

const CONSULTATION_TYPES = [
  { label: 'In-Clinic Consultation', icon: 'hospital-building', color: '#2563EB', bg: '#EFF6FF' },
  { label: 'Telehealth Video Call', icon: 'video', color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Routine Follow-up', icon: 'stethoscope', color: '#059669', bg: '#ECFDF5' },
  { label: 'Medication Review', icon: 'pill', color: '#D97706', bg: '#FFFBEB' },
  { label: 'Home Care Visit', icon: 'home-heart', color: '#DC2626', bg: '#FEF2F2' },
];

const PRESET_TIMES = ['09:00 AM', '10:30 AM', '11:45 AM', '02:00 PM', '03:30 PM', '05:00 PM'];

export default function DoctorBookingModal({
  visible,
  onClose,
  patients = [],
  doctorName = 'Dr. Vimukthi Perera',
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [allBookings, setAllBookings] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notifiedMap, setNotifiedMap] = useState({});
  const [successToast, setSuccessToast] = useState(null);

  // New Booking Form State
  const [formPatientId, setFormPatientId] = useState(
    () => (patients && patients.length > 0 ? patients[0].id : 'CARE-8133')
  );
  const [formPatientName, setFormPatientName] = useState(
    () => (patients && patients.length > 0 ? patients[0].name : 'Chamudi Prabodha')
  );
  const [formDate, setFormDate] = useState(getTodayDateStr());
  const [formTime, setFormTime] = useState('09:30 AM');
  const [formCustomTime, setFormCustomTime] = useState('');
  const [formType, setFormType] = useState('In-Clinic Consultation');
  const [formNotes, setFormNotes] = useState('');
  const [formNotify, setFormNotify] = useState(true);

  // Load Bookings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const bList = await bookingService.getBookings();
      if (mounted) setAllBookings(bList);
    };
    if (visible) {
      load();
    }
    const unsub = bookingService.on('bookings_updated', (updated) => {
      if (mounted) setAllBookings([...updated]);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [visible]);

  // Generate date chips for day-by-day navigation (-2 days to +5 days)
  const dateStrip = useMemo(() => {
    const list = [];
    for (let i = -2; i <= 6; i++) {
      const dStr = getOffsetDateStr(i);
      const parts = dStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const hasBookings = allBookings.some((b) => b.date === dStr);
      list.push({ dateStr: dStr, dayName, dayNum, isToday: i === 0, hasBookings });
    }
    return list;
  }, [allBookings]);

  // Filter bookings for the selected date
  const dayBookings = useMemo(() => {
    return allBookings
      .filter((b) => b.date === selectedDate)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [allBookings, selectedDate]);

  // Step day navigation
  const shiftDay = (days) => {
    try {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + days);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yr}-${mo}-${da}`);
    } catch (_e) {}
  };

  const handleSendNotification = (booking) => {
    bookingService.notifyPatientAndCaregiver(booking, doctorName);
    setNotifiedMap((prev) => ({ ...prev, [booking.id]: true }));
    setSuccessToast(`Notification dispatched to ${booking.patientName} & caregiver!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleSaveBooking = async () => {
    if (!formPatientName.trim()) {
      Alert.alert('Missing Field', 'Please select or enter a patient name.');
      return;
    }

    const finalTime = formCustomTime.trim() || formTime;
    const newBookingData = {
      patientId: formPatientId || 'PAT-' + Date.now(),
      patientName: formPatientName.trim(),
      date: formDate || selectedDate,
      time: finalTime,
      type: formType,
      notes: formNotes.trim(),
      status: 'Confirmed',
      doctorName,
      shouldNotify: formNotify,
    };

    await bookingService.addBooking(newBookingData);

    setIsFormOpen(false);
    setFormNotes('');
    setFormCustomTime('');

    const message = formNotify
      ? `Booking noted for ${formPatientName} and notifications sent to patient & caregiver!`
      : `Booking successfully noted for ${formPatientName}.`;

    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  const handleDeleteBooking = (booking) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to remove the booking for ${booking.patientName} on ${formatDisplayDate(booking.date)} at ${booking.time}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await bookingService.deleteBooking(booking.id);
            setSuccessToast('Booking deleted.');
            setTimeout(() => setSuccessToast(null), 3000);
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (booking) => {
    const nextStatus =
      booking.status === 'Confirmed'
        ? 'Completed'
        : booking.status === 'Completed'
        ? 'Upcoming'
        : 'Confirmed';
    await bookingService.updateBooking(booking.id, { status: nextStatus });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar" size={24} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.title}>Daily Bookings & Appointments</Text>
                <Text style={styles.subtitle}>Doctor schedule, daily notes & notifications</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Success Toast */}
          {successToast && (
            <View style={styles.toastBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.toastText} numberOfLines={2}>
                {successToast}
              </Text>
            </View>
          )}

          <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent}>
            {/* Day by Day Navigator Strip */}
            <View style={styles.dayNavigatorContainer}>
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={() => shiftDay(-1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color="#374151" />
                </TouchableOpacity>

                <View style={styles.currentDateDisplay}>
                  <Text style={styles.currentDateTitle}>
                    {formatDisplayDate(selectedDate)}
                  </Text>
                  {selectedDate === getTodayDateStr() && (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayPillText}>TODAY</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={() => shiftDay(1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={18} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Day Chips Horizontal Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateChipsScroll}
              >
                {dateStrip.map((item) => {
                  const isSelected = item.dateStr === selectedDate;
                  return (
                    <TouchableOpacity
                      key={item.dateStr}
                      style={[
                        styles.dateChip,
                        isSelected && styles.dateChipSelected,
                      ]}
                      onPress={() => {
                        setSelectedDate(item.dateStr);
                        setFormDate(item.dateStr);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dateChipDay,
                          isSelected && styles.dateChipDaySelected,
                        ]}
                      >
                        {item.dayName}
                      </Text>
                      <Text
                        style={[
                          styles.dateChipNum,
                          isSelected && styles.dateChipNumSelected,
                        ]}
                      >
                        {item.dayNum}
                      </Text>
                      {item.hasBookings && (
                        <View
                          style={[
                            styles.bookingDot,
                            isSelected && styles.bookingDotSelected,
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selected Day Agenda Bar & Add Button */}
            <View style={styles.agendaHeaderRow}>
              <View>
                <Text style={styles.agendaTitle}>Daily Clinical Schedule</Text>
                <Text style={styles.agendaSubtitle}>
                  {dayBookings.length === 1
                    ? '1 Booking scheduled'
                    : `${dayBookings.length} Bookings scheduled`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addBookingBtn}
                onPress={() => {
                  setFormDate(selectedDate);
                  setIsFormOpen(!isFormOpen);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFormOpen ? 'close-circle' : 'add-circle'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.addBookingBtnText}>
                  {isFormOpen ? 'Close Form' : '+ Note Booking'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Note New Booking Form (Expandable Sheet) */}
            {isFormOpen && (
              <View style={styles.formContainer}>
                <View style={styles.formHeaderRow}>
                  <Text style={styles.formTitle}>Note Daily Booking</Text>
                  <Text style={styles.formSub}>For {formatDisplayDate(formDate)}</Text>
                </View>

                {/* Patient Selector */}
                <Text style={styles.fieldLabel}>Select Connected Patient</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                  {patients && patients.length > 0 ? (
                    patients.map((p) => {
                      const isSel = formPatientId === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.patientChip, isSel && styles.patientChipSelected]}
                          onPress={() => {
                            setFormPatientId(p.id);
                            setFormPatientName(p.name);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="person-circle"
                            size={18}
                            color={isSel ? '#FFFFFF' : '#2563EB'}
                          />
                          <Text
                            style={[
                              styles.patientChipText,
                              isSel && styles.patientChipTextSelected,
                            ]}
                          >
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <TouchableOpacity
                      style={[styles.patientChip, styles.patientChipSelected]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="person-circle" size={18} color="#FFFFFF" />
                      <Text style={[styles.patientChipText, styles.patientChipTextSelected]}>
                        Chamudi Prabodha (CARE-8133)
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* Time Slot Selector */}
                <Text style={styles.fieldLabel}>Scheduled Time</Text>
                <View style={styles.timePillsGrid}>
                  {PRESET_TIMES.map((timeOption) => {
                    const isSel = formTime === timeOption && !formCustomTime;
                    return (
                      <TouchableOpacity
                        key={timeOption}
                        style={[styles.timeChip, isSel && styles.timeChipSelected]}
                        onPress={() => {
                          setFormTime(timeOption);
                          setFormCustomTime('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={isSel ? '#FFFFFF' : '#4B5563'}
                        />
                        <Text
                          style={[
                            styles.timeChipText,
                            isSel && styles.timeChipTextSelected,
                          ]}
                        >
                          {timeOption}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Time */}
                <TextInput
                  style={styles.inputField}
                  placeholder="Or enter custom time (e.g. 04:15 PM)"
                  placeholderTextColor="#9CA3AF"
                  value={formCustomTime}
                  onChangeText={(val) => {
                    setFormCustomTime(val);
                  }}
                />

                {/* Consultation Type Selector */}
                <Text style={styles.fieldLabel}>Consultation Type / Mode</Text>
                <View style={styles.typesContainer}>
                  {CONSULTATION_TYPES.map((t) => {
                    const isSel = formType === t.label;
                    return (
                      <TouchableOpacity
                        key={t.label}
                        style={[
                          styles.typeCard,
                          isSel && { borderColor: t.color, backgroundColor: t.bg },
                        ]}
                        onPress={() => setFormType(t.label)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={t.icon}
                          size={18}
                          color={isSel ? t.color : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.typeCardText,
                            isSel && { color: t.color, fontWeight: '700' },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Clinical Notes */}
                <Text style={styles.fieldLabel}>Clinical Purpose & Doctor Notes</Text>
                <TextInput
                  style={[styles.inputField, styles.textAreaField]}
                  placeholder="E.g. Review cognitive assessment, Donepezil side effects, vitals telemetry..."
                  placeholderTextColor="#9CA3AF"
                  value={formNotes}
                  onChangeText={setFormNotes}
                  multiline
                  numberOfLines={3}
                />

                {/* Notification Toggle */}
                <TouchableOpacity
                  style={styles.notifyCheckboxRow}
                  onPress={() => setFormNotify(!formNotify)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      formNotify && styles.checkboxBoxChecked,
                    ]}
                  >
                    {formNotify && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.checkboxInfo}>
                    <Text style={styles.checkboxTitle}>
                      Notify Patient & Caregiver Immediately
                    </Text>
                    <Text style={styles.checkboxSub}>
                      Sends instant alert and push notification to patient & caregiver dashboards
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Save Button */}
                <View style={styles.formActionRow}>
                  <TouchableOpacity
                    style={styles.cancelFormBtn}
                    onPress={() => setIsFormOpen(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelFormBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBookingBtn}
                    onPress={handleSaveBooking}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.saveBookingBtnText}>Save & Note Booking</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Bookings List for Selected Day */}
            {dayBookings.length === 0 ? (
              <View style={styles.emptyDayContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="calendar-outline" size={36} color="#94A3B8" />
                </View>
                <Text style={styles.emptyDayTitle}>No Bookings For This Day</Text>
                <Text style={styles.emptyDaySub}>
                  You have not scheduled any patient consultations for {formatDisplayDate(selectedDate)}.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => {
                    setFormDate(selectedDate);
                    setIsFormOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={18} color="#2563EB" />
                  <Text style={styles.emptyAddBtnText}>+ Note First Booking</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.bookingsList}>
                {dayBookings.map((b) => {
                  const typeObj =
                    CONSULTATION_TYPES.find((t) => t.label === b.type) ||
                    CONSULTATION_TYPES[0];
                  const isNotified = !!b.notifiedAt || !!notifiedMap[b.id];

                  return (
                    <View key={b.id} style={styles.bookingCard}>
                      {/* Top Row: Time and Status */}
                      <View style={styles.bookingTopRow}>
                        <View style={styles.timeTag}>
                          <Ionicons name="time" size={14} color="#2563EB" />
                          <Text style={styles.timeTagText}>{b.time}</Text>
                        </View>

                        <View style={styles.cardHeaderRight}>
                          <TouchableOpacity
                            onPress={() => handleToggleStatus(b)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.statusPill,
                                b.status === 'Completed'
                                  ? styles.statusPillCompleted
                                  : styles.statusPillConfirmed,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  b.status === 'Completed'
                                    ? styles.statusTextCompleted
                                    : styles.statusTextConfirmed,
                                ]}
                              >
                                {b.status || 'Confirmed'}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDeleteBooking(b)}
                            style={styles.deleteBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Patient Info Row */}
                      <View style={styles.patientInfoRow}>
                        <View style={styles.patientAvatar}>
                          <Text style={styles.patientAvatarText}>
                            {(b.patientName || 'P').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.patientNameCol}>
                          <Text style={styles.patientName}>{b.patientName}</Text>
                          <Text style={styles.patientMeta}>
                            ID: {b.patientId || 'CARE-8133'} • Doctor: {b.doctorName || doctorName}
                          </Text>
                        </View>
                      </View>

                      {/* Type Badge */}
                      <View style={[styles.typeBadge, { backgroundColor: typeObj.bg }]}>
                        <MaterialCommunityIcons
                          name={typeObj.icon}
                          size={15}
                          color={typeObj.color}
                        />
                        <Text style={[styles.typeBadgeText, { color: typeObj.color }]}>
                          {b.type}
                        </Text>
                      </View>

                      {/* Notes Section */}
                      {b.notes ? (
                        <View style={styles.notesBox}>
                          <Ionicons
                            name="document-text-outline"
                            size={14}
                            color="#64748B"
                            style={{ marginTop: 2 }}
                          />
                          <Text style={styles.notesText}>{b.notes}</Text>
                        </View>
                      ) : null}

                      {/* Notification Trigger Action Bar */}
                      <View style={styles.bookingFooterRow}>
                        <View style={styles.notifiedStatusWrap}>
                          {isNotified ? (
                            <View style={styles.notifiedBadge}>
                              <Ionicons name="checkmark-done" size={13} color="#059669" />
                              <Text style={styles.notifiedBadgeText}>Patient & Caregiver Notified</Text>
                            </View>
                          ) : (
                            <Text style={styles.notYetNotifiedText}>Not yet notified</Text>
                          )}
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.notifyActionBtn,
                            isNotified && styles.notifyActionBtnSent,
                          ]}
                          onPress={() => handleSendNotification(b)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isNotified ? 'notifications' : 'paper-plane'}
                            size={14}
                            color={isNotified ? '#059669' : '#FFFFFF'}
                          />
                          <Text
                            style={[
                              styles.notifyActionBtnText,
                              isNotified && styles.notifyActionBtnTextSent,
                            ]}
                          >
                            {isNotified ? 'Resend Alert' : 'Notify Patient & Caregiver'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  dayNavigatorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentDateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  todayPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  todayPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  dateChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  dateChip: {
    width: 60,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dateChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  dateChipDay: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  dateChipDaySelected: {
    color: '#BFDBFE',
  },
  dateChipNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  dateChipNumSelected: {
    color: '#FFFFFF',
  },
  bookingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#2563EB',
    marginTop: 4,
  },
  bookingDotSelected: {
    backgroundColor: '#FDE047',
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  agendaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  agendaSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addBookingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeaderRow: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  formSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  horizontalChips: {
    marginBottom: 6,
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  patientChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  patientChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  patientChipTextSelected: {
    color: '#FFFFFF',
  },
  timePillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 8,
  },
  textAreaField: {
    height: 70,
    textAlignVertical: 'top',
  },
  typesContainer: {
    gap: 6,
    marginBottom: 8,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  notifyCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginVertical: 8,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkboxInfo: {
    flex: 1,
  },
  checkboxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  checkboxSub: {
    fontSize: 10,
    color: '#047857',
    marginTop: 1,
  },
  formActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelFormBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelFormBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  saveBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  saveBookingBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyDayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyDayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyDaySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  statusPillCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextConfirmed: {
    color: '#15803D',
  },
  statusTextCompleted: {
    color: '#64748B',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  patientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  patientNameCol: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notesText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    flex: 1,
  },
  bookingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notifiedStatusWrap: {
    flex: 1,
  },
  notifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  notYetNotifiedText: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  notifyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notifyActionBtnSent: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  notifyActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifyActionBtnTextSent: {
    color: '#059669',
  },
});
