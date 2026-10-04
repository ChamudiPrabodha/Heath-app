// src/components/caregiver/DailyMedicationCalendar.js - Real Calendar Architecture for Dementia Medication Plans
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getPatientMedicationPlan,
  getMedicationsForDate,
  updateMedicationDayStatus,
  saveOrUpdatePatientMedication,
  deleteMedicationForDate,
} from '../../services/patientManagementService';
import { syncService } from '../../services/syncService';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const COMMON_DEMENTIA_PRESETS = [
  { name: 'Donepezil (Aricept)', dosage: '10 mg • 1 Tablet', period: 'Morning with breakfast', time: '08:00 AM' },
  { name: 'Memantine HCl', dosage: '10 mg • 1 Tablet', period: 'Morning with breakfast', time: '09:00 AM' },
  { name: 'Rivastigmine Patch', dosage: '9.5 mg / 24h', period: 'Morning patch', time: '08:00 AM' },
  { name: 'Amlodipine (Blood Pressure)', dosage: '5 mg • 1 Tablet', period: 'Evening with dinner', time: '08:00 PM' },
  { name: 'Vitamin B-Complex & D3', dosage: '1 Capsule', period: 'Afternoon with lunch', time: '01:00 PM' },
  { name: 'Omega-3 Fish Oil', dosage: '1000 mg • 1 Softgel', period: 'Bedtime', time: '09:30 PM' },
];

export default function DailyMedicationCalendar({
  patient,
  patients = [],
  onSelectPatient,
  currentUser,
  isDoctorView = false,
}) {
  const activePatient = patient || (patients && patients[0]) || null;
  const patientId = activePatient?.id || '';

  // Calendar State: default to current date
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth()); // 0-indexed (9 = Oct)
  const [selectedDateStr, setSelectedDateStr] = useState(() => todayStr);

  const [medicationsPlan, setMedicationsPlan] = useState([]);
  const [dayMeds, setDayMeds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add / Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('one_time'); // 'one_time' (recurring/date range) | 'day_by_day' (single date)
  const [editingMedId, setEditingMedId] = useState(null);
  const [formMedName, setFormMedName] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formTime, setFormTime] = useState('08:00 AM');
  const [formPeriod, setFormPeriod] = useState('Morning with breakfast');
  const [formDurationDays, setFormDurationDays] = useState(30);
  const [formInstructions, setFormInstructions] = useState('');
  const [savingMed, setSavingMed] = useState(false);

  // Load Patient's Medication Plan
  const loadPlan = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const plan = await getPatientMedicationPlan(patientId);
      setMedicationsPlan(plan || []);
    } catch (_err) {
      console.warn('Failed to load medication plan');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let isMounted = true;
    if (patientId) {
      getPatientMedicationPlan(patientId).then((plan) => {
        if (isMounted) setMedicationsPlan(plan || []);
      }).catch((_e) => {});
    }
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  // Compute / load Day Medications for selectedDateStr
  useEffect(() => {
    let isMounted = true;
    if (patientId && selectedDateStr) {
      getMedicationsForDate(patientId, selectedDateStr).then((res) => {
        if (isMounted) setDayMeds(res || []);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [patientId, selectedDateStr, medicationsPlan]);

  // Real-time listener for medication events
  useEffect(() => {
    const unsubDayStatus = syncService.on('medication_day_status_updated', (incoming) => {
      if ((incoming.patientId || '').toUpperCase() === (patientId || '').toUpperCase()) {
        loadPlan();
      }
    });

    const unsubPlan = syncService.on('medication_plan_updated', (incoming) => {
      if ((incoming.patientId || '').toUpperCase() === (patientId || '').toUpperCase()) {
        loadPlan();
      }
    });

    const unsubNewPrescription = syncService.on('new_prescription', (incoming) => {
      if ((incoming.patientId || incoming.roomCode || '').toUpperCase() === (patientId || '').toUpperCase()) {
        loadPlan();
      }
    });

    return () => {
      unsubDayStatus();
      unsubPlan();
      unsubNewPrescription();
    };
  }, [patientId, loadPlan]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Calendar Grid Generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Leading padding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Trailing days from next month to complete the grid rows
    const remainder = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainder; i++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Aggregate medication schedule per date string
  const dateMedStats = useMemo(() => {
    const map = {};
    if (!medicationsPlan || medicationsPlan.length === 0) return map;

    calendarDays.forEach(({ dateStr }) => {
      const activeForDate = medicationsPlan.filter((m) => {
        if (m.isActive === false) return false;
        if (m.skippedDates && Array.isArray(m.skippedDates) && m.skippedDates.includes(dateStr)) return false;
        if (m.isSingleDay || m.specificDate) {
          return (m.specificDate || m.startDate) === dateStr;
        }
        if (m.startDate && m.endDate) {
          return dateStr >= m.startDate && dateStr <= m.endDate;
        }
        return true;
      });

      if (activeForDate.length > 0) {
        let takenCount = 0;
        let pendingCount = 0;
        let missedCount = 0;

        activeForDate.forEach((m) => {
          const st = (m.dayStatuses && m.dayStatuses[dateStr]) || m.status || 'Pending';
          if (st === 'Taken') takenCount++;
          else if (st === 'Skipped' || st === 'Missed') missedCount++;
          else pendingCount++;
        });

        map[dateStr] = {
          count: activeForDate.length,
          takenCount,
          pendingCount,
          missedCount,
          allTaken: takenCount === activeForDate.length,
        };
      }
    });

    return map;
  }, [medicationsPlan, calendarDays]);

  // Toggle or Update Single Day Status
  const handleToggleDayStatus = async (med, currentStatus) => {
    const nextStatus = currentStatus === 'Taken' ? 'Pending' : 'Taken';
    try {
      await updateMedicationDayStatus(patientId, med.id, selectedDateStr, nextStatus);
      setDayMeds((prev) =>
        prev.map((m) => (m.id === med.id ? { ...m, status: nextStatus } : m))
      );
      loadPlan();
    } catch (_err) {
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  // Open Form for Adding or Editing
  const handleOpenAdd = (mode = 'one_time') => {
    setEditingMedId(null);
    setModalMode(mode);
    setFormMedName('');
    setFormDosage('');
    setFormTime('08:00 AM');
    setFormPeriod('Morning with breakfast');
    setFormDurationDays(30);
    setFormInstructions('');
    setModalVisible(true);
  };

  const handleOpenEdit = (med) => {
    setEditingMedId(med.id);
    setModalMode(med.isSingleDay ? 'day_by_day' : 'one_time');
    setFormMedName(med.name || '');
    setFormDosage(med.dosage || '');
    setFormTime(med.time || '08:00 AM');
    setFormPeriod(med.period || 'Morning with breakfast');
    setFormDurationDays(med.durationDays || 30);
    setFormInstructions(med.instructions || '');
    setModalVisible(true);
  };

  const handleApplyPreset = (preset) => {
    setFormMedName(preset.name);
    setFormDosage(preset.dosage);
    setFormPeriod(preset.period);
    setFormTime(preset.time);
  };

  // Save Prescription (One-Time or Day-by-Day)
  const handleSavePrescription = async () => {
    if (!formMedName.trim()) {
      Alert.alert('Required Field', 'Please enter a medicine name.');
      return;
    }
    if (!formDosage.trim()) {
      Alert.alert('Required Field', 'Please specify the dosage (e.g. 10 mg • 1 Tablet).');
      return;
    }

    setSavingMed(true);
    try {
      let startDate = selectedDateStr;
      let endDate = selectedDateStr;
      const isDayOnly = modalMode === 'day_by_day';

      if (!isDayOnly) {
        // Bulk / One-Time assignment across duration
        startDate = selectedDateStr;
        const startMs = new Date(startDate).getTime() || Date.now();
        const duration = Number(formDurationDays) || 30;
        endDate = new Date(startMs + duration * 86400000).toISOString().split('T')[0];
      }

      const payload = {
        ...(editingMedId ? { id: editingMedId } : {}),
        name: formMedName.trim(),
        dosage: formDosage.trim(),
        time: formTime.trim(),
        period: formPeriod.trim(),
        durationDays: isDayOnly ? 1 : Number(formDurationDays) || 30,
        startDate,
        endDate,
        isSingleDay: isDayOnly,
        specificDate: isDayOnly ? selectedDateStr : undefined,
        instructions: formInstructions.trim(),
        prescribedBy: currentUser?.name || (isDoctorView ? 'Doctor' : 'Caregiver'),
        status: 'Pending',
        isActive: true,
      };

      await saveOrUpdatePatientMedication(patientId, payload);

      // Broadcast new prescription to other portals
      syncService.sendNewPrescription(
        patientId,
        activePatient?.name || 'Patient',
        `${payload.name} (${payload.dosage})`,
        currentUser?.name || (isDoctorView ? 'Doctor' : 'Caregiver'),
        isDayOnly
          ? `scheduled for ${selectedDateStr}`
          : `prescribed ${payload.durationDays}-day plan starting ${startDate}`
      );

      Alert.alert(
        'Prescription Saved',
        isDayOnly
          ? `${payload.name} assigned specifically for ${selectedDateStr}.`
          : `Assigned in one time: ${payload.name} (${payload.durationDays} Days, ${startDate} to ${endDate}).`
      );

      setModalVisible(false);
      setEditingMedId(null);
      await loadPlan();
    } catch (err) {
      Alert.alert('Error', 'Failed to save prescription: ' + (err.message || 'Unknown'));
    } finally {
      setSavingMed(false);
    }
  };

  // Delete / Remove dose
  const handleDeleteDose = (med) => {
    Alert.alert(
      'Remove Medication',
      `How would you like to remove "${med.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove for THIS DAY ONLY',
          onPress: async () => {
            await deleteMedicationForDate(patientId, med.id, selectedDateStr, true);
            await loadPlan();
          },
        },
        {
          text: 'Remove ENTIRE PLAN',
          style: 'destructive',
          onPress: async () => {
            await deleteMedicationForDate(patientId, med.id, selectedDateStr, false);
            await loadPlan();
          },
        },
      ]
    );
  };

  // Format display string for selected date
  const selectedDateFormatted = useMemo(() => {
    try {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const monthShort = MONTH_NAMES[dt.getMonth()].slice(0, 3);
      const dayOfWeek = WEEKDAYS[dt.getDay()];
      return {
        title: `${monthShort} ${d}`,
        subtitle: `${dayOfWeek}, ${monthShort} ${d}, ${y}`,
        dayOfWeek,
      };
    } catch (_e) {
      return { title: selectedDateStr, subtitle: '', dayOfWeek: '' };
    }
  }, [selectedDateStr]);

  return (
    <View style={styles.container}>
      {/* Patient Switcher (if multiple patients available) */}
      {patients && patients.length > 1 && (
        <View style={styles.patientSelectorRow}>
          <Text style={styles.patientSelectorLabel}>PATIENT CALENDAR:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientChipsScroll}>
            {patients.map((p) => {
              const isSelected = p.id === patientId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientChip, isSelected && styles.patientChipActive]}
                  onPress={() => onSelectPatient && onSelectPatient(p)}
                >
                  <View style={[styles.patientChipDot, isSelected && styles.patientChipDotActive]} />
                  <Text style={[styles.patientChipName, isSelected && styles.patientChipNameActive]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.patientChipId, isSelected && styles.patientChipIdActive]}>
                    ({p.id})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Prominent, Spacious Prescribe Action Button */}
      <TouchableOpacity
        style={styles.topPrescribeBtn}
        onPress={() => handleOpenAdd('one_time')}
        activeOpacity={0.85}
      >
        <View style={styles.topPrescribeIconWrap}>
          <MaterialCommunityIcons name="pill" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.topPrescribeTextCol}>
          <Text style={styles.topPrescribeTitle}>Prescribe Medication Plan</Text>
          <Text style={styles.topPrescribeSub}>Create 1-month routine or single-day prescription</Text>
        </View>
        <View style={styles.topPrescribeBadge}>
          <Ionicons name="add" size={14} color="#7C3AED" />
          <Text style={styles.topPrescribeBadgeText}>New Plan</Text>
        </View>
      </TouchableOpacity>

      {/* Main Calendar Card */}
      <View style={styles.calendarCard}>
        {/* Top Header Row (Month & Navigation) */}
        <View style={styles.monthHeaderRow}>
          <View style={styles.monthTitleWrapper}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.monthTitleText}>
              {MONTH_NAMES[currentMonth].slice(0, 3)} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerRightControls}>
            <TouchableOpacity style={styles.todayPill} onPress={handleJumpToToday}>
              <Ionicons name="today-outline" size={13} color="#6D28D9" />
              <Text style={styles.todayPillText}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => Alert.alert('Medication Calendar', 'One-touch day view. Tap any day cell to see and manage dementia medication plans. Cells with yellow tint and sprout indicate scheduled doses.')}
            >
              <Ionicons name="help-circle-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekday Header Row */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((dayName, idx) => (
            <View key={idx} style={styles.weekdayCol}>
              <Text style={styles.weekdayText}>{dayName}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Month Grid */}
        <View style={styles.gridContainer}>
          {calendarDays.map((item, index) => {
            const isSelected = item.dateStr === selectedDateStr;
            const isToday = item.dateStr === todayStr;
            const stats = dateMedStats[item.dateStr];
            const hasMeds = !!stats && stats.count > 0;

            return (
              <TouchableOpacity
                key={`${item.dateStr}-${index}`}
                style={[
                  styles.dayCell,
                  hasMeds && styles.dayCellWithMeds,
                  isSelected && styles.dayCellSelected,
                  !item.isCurrentMonth && styles.dayCellInactive,
                ]}
                onPress={() => setSelectedDateStr(item.dateStr)}
                activeOpacity={0.7}
              >
                {/* Cell Header: Sprout icon & Cycle/Dose count */}
                <View style={styles.cellTopRow}>
                  {hasMeds ? (
                    <Text style={styles.cellSproutIcon}>🌱</Text>
                  ) : (
                    <View style={{ width: 10 }} />
                  )}

                  {hasMeds ? (
                    <Text style={[styles.cellDoseCountText, !item.isCurrentMonth && styles.textMuted]}>
                      {stats.count}
                    </Text>
                  ) : null}
                </View>

                {/* Day Number */}
                <View style={styles.dayNumWrapper}>
                  <Text
                    style={[
                      styles.dayNumText,
                      isSelected && styles.dayNumTextSelected,
                      isToday && styles.dayNumTextToday,
                      !item.isCurrentMonth && styles.dayNumTextFaint,
                    ]}
                  >
                    {item.dayNum}
                  </Text>
                </View>

                {/* Status indicator dot if meds present */}
                {hasMeds && (
                  <View style={styles.cellBottomDots}>
                    {stats.takenCount > 0 && <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />}
                    {stats.pendingCount > 0 && <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />}
                    {stats.missedCount > 0 && <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Date Detail Section (Directly underneath calendar like in screenshot) */}
      <View style={styles.dayDetailCard}>
        {/* Selected Date Header + Edit Button */}
        <View style={styles.dayHeaderRow}>
          <View style={styles.dayHeaderLeft}>
            <Text style={styles.dayTitleLarge}>{selectedDateFormatted.title}</Text>
            <Text style={styles.daySubtitle}>
              {selectedDateFormatted.subtitle} • {dayMeds.length} {dayMeds.length === 1 ? 'Medication' : 'Medications'}
            </Text>
          </View>

          {/* Lavender/Pink Edit Button matching the screenshot */}
          <TouchableOpacity
            style={styles.editActionPill}
            onPress={() => handleOpenAdd('day_by_day')}
          >
            <Text style={styles.editActionIcon}>💧</Text>
            <Ionicons name="pencil" size={14} color="#7C3AED" style={{ marginRight: 4 }} />
            <Text style={styles.editActionText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Adherence / Summary Chip */}
        {dayMeds.length > 0 && (
          <View style={styles.summaryBadgeRow}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryBadgeText}>
              {(() => {
                const taken = dayMeds.filter((m) => m.status === 'Taken').length;
                if (taken === dayMeds.length) return 'ALL DOSES COMPLETED FOR THIS DATE';
                if (taken > 0) return `${taken}/${dayMeds.length} DOSES TAKEN • PENDING DOSES REMAINING`;
                return `${dayMeds.length} DOSES SCHEDULED • PENDING ADMINISTRATION`;
              })()}
            </Text>
          </View>
        )}

        {/* Medication List for Selected Date */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#7C3AED" />
            <Text style={styles.loadingText}>Loading day plan...</Text>
          </View>
        ) : dayMeds.length === 0 ? (
          <View style={styles.emptyDayBox}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="pill-off" size={26} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyDayTitle}>No Medication Planned</Text>
            <Text style={styles.emptyDaySub}>
              There are no prescriptions scheduled for {selectedDateFormatted.title}. Use the action cards below to schedule doses.
            </Text>
          </View>
        ) : (
          <View style={styles.medsList}>
            {dayMeds.map((med) => {
              const isTaken = med.status === 'Taken';
              const isSkipped = med.status === 'Skipped' || med.status === 'Missed';

              return (
                <View key={med.id} style={[styles.medCard, isTaken && styles.medCardTaken]}>
                  {/* Status & Name Header */}
                  <View style={styles.medCardTop}>
                    <View style={styles.medCardIconWrap}>
                      <MaterialCommunityIcons
                        name={isTaken ? 'check-circle' : 'pill'}
                        size={22}
                        color={isTaken ? '#10B981' : isSkipped ? '#EF4444' : '#6D28D9'}
                      />
                    </View>

                    <View style={styles.medCardInfo}>
                      <Text style={[styles.medNameText, isTaken && styles.medNameTextTaken]}>
                        {med.name}
                      </Text>
                      <Text style={styles.medDosageText}>
                        {med.dosage} • <Text style={{ color: '#4B5563', fontWeight: '600' }}>{med.period}</Text>
                      </Text>
                    </View>

                    {/* Time Badge */}
                    <View style={styles.medTimeBadge}>
                      <Ionicons name="time-outline" size={12} color="#4B5563" />
                      <Text style={styles.medTimeBadgeText}>{med.time || '08:00 AM'}</Text>
                    </View>
                  </View>

                  {/* Instructions */}
                  {med.instructions ? (
                    <Text style={styles.medInstructionsText} numberOfLines={2}>
                      💬 {med.instructions}
                    </Text>
                  ) : null}

                  {/* Actions Row */}
                  <View style={styles.medCardBottom}>
                    <View style={styles.medPrescriberWrap}>
                      <Text style={styles.medPrescriberText}>
                        Prescribed: {med.prescribedBy || 'Doctor'} {med.isSingleDay ? '(Single Day)' : '(Recurring)'}
                      </Text>
                    </View>

                    <View style={styles.medButtonsRow}>
                      {/* Quick Take Toggle Button */}
                      <TouchableOpacity
                        style={[styles.takeBtn, isTaken ? styles.takeBtnActive : styles.takeBtnPending]}
                        onPress={() => handleToggleDayStatus(med, med.status)}
                      >
                        <Ionicons
                          name={isTaken ? 'checkmark-circle' : 'ellipse-outline'}
                          size={15}
                          color={isTaken ? '#FFFFFF' : '#059669'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.takeBtnText, isTaken && styles.takeBtnTextActive]}>
                          {isTaken ? 'Taken' : 'Mark Taken'}
                        </Text>
                      </TouchableOpacity>

                      {/* Edit Button */}
                      <TouchableOpacity
                        style={styles.editSmallBtn}
                        onPress={() => handleOpenEdit(med)}
                      >
                        <Ionicons name="create-outline" size={15} color="#4B5563" />
                      </TouchableOpacity>

                      {/* Remove Button */}
                      <TouchableOpacity
                        style={styles.deleteSmallBtn}
                        onPress={() => handleDeleteDose(med)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Dedicated Date Prescription Actions Section with Proper Space & Hierarchy */}
        <View style={styles.dayActionsSection}>
          <View style={styles.dayActionsHeader}>
            <Ionicons name="sparkles" size={14} color="#7C3AED" />
            <Text style={styles.dayActionsTitle}>Prescription Actions for {selectedDateFormatted.title}</Text>
          </View>

          <View style={styles.dayActionsStack}>
            {/* Action 1: Assign for This Day */}
            <TouchableOpacity
              style={styles.dayActionCardPrimary}
              onPress={() => handleOpenAdd('day_by_day')}
              activeOpacity={0.8}
            >
              <View style={styles.dayActionIconCirclePrimary}>
                <Ionicons name="calendar" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.dayActionTextCol}>
                <Text style={styles.dayActionPrimaryTitle}>Assign for This Day</Text>
                <Text style={styles.dayActionPrimarySub}>
                  Schedule specific dose only for {selectedDateFormatted.title}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={20} color="#DDD6FE" />
            </TouchableOpacity>

            {/* Action 2: Assign 1-Month Plan */}
            <TouchableOpacity
              style={styles.dayActionCardSecondary}
              onPress={() => handleOpenAdd('one_time')}
              activeOpacity={0.8}
            >
              <View style={styles.dayActionIconCircleSecondary}>
                <Ionicons name="flash" size={18} color="#6D28D9" />
              </View>
              <View style={styles.dayActionTextCol}>
                <Text style={styles.dayActionSecondaryTitle}>Assign 1-Month Plan</Text>
                <Text style={styles.dayActionSecondarySub}>
                  Set 30-day recurring routine starting {selectedDateFormatted.title}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={20} color="#7C3AED" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Add / Edit Prescription Modal (Day-by-Day & One-Time Assignment) */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconDisc}>
                  <MaterialCommunityIcons name="pill" size={24} color="#6D28D9" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {editingMedId ? 'Edit Prescription' : 'Prescribe Medication'}
                  </Text>
                  <Text style={styles.modalSub}>
                    Patient: <Text style={{ fontWeight: '700' }}>{activePatient?.name || patientId}</Text>
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Assignment Mode Tabs (One-Time vs Day-by-Day) */}
              <View style={styles.modeTabsRow}>
                <TouchableOpacity
                  style={[styles.modeTab, modalMode === 'one_time' && styles.modeTabActive]}
                  onPress={() => setModalMode('one_time')}
                >
                  <Ionicons
                    name="flash"
                    size={16}
                    color={modalMode === 'one_time' ? '#6D28D9' : '#6B7280'}
                  />
                  <Text style={[styles.modeTabText, modalMode === 'one_time' && styles.modeTabTextActive]}>
                    ⚡ Assign in One Time
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTab, modalMode === 'day_by_day' && styles.modeTabActive]}
                  onPress={() => setModalMode('day_by_day')}
                >
                  <Ionicons
                    name="calendar"
                    size={16}
                    color={modalMode === 'day_by_day' ? '#6D28D9' : '#6B7280'}
                  />
                  <Text style={[styles.modeTabText, modalMode === 'day_by_day' && styles.modeTabTextActive]}>
                    📅 Day-by-Day ({selectedDateFormatted.title})
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modeDescriptionText}>
                {modalMode === 'one_time'
                  ? '⚡ Assign across a full date duration (e.g. 30-Day Plan). Medications will automatically populate on every calendar day.'
                  : `📅 Assign specifically for ${selectedDateFormatted.subtitle}. Perfect for fine-tuning dosages or temporary doses.`}
              </Text>

              {/* Quick Presets for Dementia Care */}
              <View style={styles.presetSection}>
                <Text style={styles.inputLabelSmall}>DEMENTIA CARE PRESETS:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
                  {COMMON_DEMENTIA_PRESETS.map((preset, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.presetChip, formMedName === preset.name && styles.presetChipActive]}
                      onPress={() => handleApplyPreset(preset)}
                    >
                      <Text style={[styles.presetChipText, formMedName === preset.name && styles.presetChipTextActive]}>
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Medicine Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Medicine Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formMedName}
                  onChangeText={setFormMedName}
                  placeholder="e.g. Donepezil (Aricept)"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Dosage and Time */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.inputLabel}>Dosage *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formDosage}
                    onChangeText={setFormDosage}
                    placeholder="10 mg • 1 Tablet"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formTime}
                    onChangeText={setFormTime}
                    placeholder="08:00 AM"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Time Chips */}
              <View style={styles.timeChipsRow}>
                {['08:00 AM', '01:00 PM', '06:00 PM', '08:00 PM', '09:30 PM'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, formTime === t && styles.timeChipActive]}
                    onPress={() => setFormTime(t)}
                  >
                    <Text style={[styles.timeChipText, formTime === t && styles.timeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Routine Period */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Routine Period</Text>
                <View style={styles.periodChipsRow}>
                  {[
                    'Morning with breakfast',
                    'Afternoon with lunch',
                    'Evening with dinner',
                    'Bedtime',
                  ].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.periodChip, formPeriod === p && styles.periodChipActive]}
                      onPress={() => setFormPeriod(p)}
                    >
                      <Text style={[styles.periodChipText, formPeriod === p && styles.periodChipTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Duration (Only for One-Time Assignment) */}
              {modalMode === 'one_time' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Duration</Text>
                  <View style={styles.durationRow}>
                    {[
                      { days: 30, label: '30 Days (1 Mo)' },
                      { days: 60, label: '60 Days (2 Mo)' },
                      { days: 14, label: '14 Days (2 Wk)' },
                      { days: 7, label: '7 Days (1 Wk)' },
                    ].map((dur) => (
                      <TouchableOpacity
                        key={dur.days}
                        style={[styles.durationChip, formDurationDays === dur.days && styles.durationChipActive]}
                        onPress={() => setFormDurationDays(dur.days)}
                      >
                        <Text style={[styles.durationChipText, formDurationDays === dur.days && styles.durationChipTextActive]}>
                          {dur.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Clinical Instructions */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Instructions / Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formInstructions}
                  onChangeText={setFormInstructions}
                  placeholder="e.g. Take with water after breakfast. Monitor for dizziness."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>

              {/* Save / Cancel Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSavePrescription}
                  disabled={savingMed}
                >
                  {savingMed ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>
                        {editingMedId ? 'Update Plan' : 'Save Prescription'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  // Patient Selector
  patientSelectorRow: {
    marginBottom: 12,
  },
  patientSelectorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  patientChipsScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  patientChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  patientChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
    marginRight: 6,
  },
  patientChipDotActive: {
    backgroundColor: '#7C3AED',
  },
  patientChipName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  patientChipNameActive: {
    color: '#6D28D9',
    fontWeight: '700',
  },
  patientChipId: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
  },
  patientChipIdActive: {
    color: '#7C3AED',
  },

  // Main Calendar Card
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  monthTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 90,
    textAlign: 'center',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: 4,
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  iconCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dedicated Top Prescribe Action Button
  topPrescribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  topPrescribeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topPrescribeTextCol: {
    flex: 1,
  },
  topPrescribeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  topPrescribeSub: {
    fontSize: 11,
    color: '#EDE9FE',
    marginTop: 2,
  },
  topPrescribeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 2,
  },
  topPrescribeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },

  // Weekday Header Row
  weekdayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 4,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Calendar Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.95,
    padding: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
  },
  dayCellWithMeds: {
    backgroundColor: '#FEF9C3', // Warm yellow/cream tint matching the user screenshot!
    borderColor: '#FEF08A',
  },
  dayCellSelected: {
    borderColor: '#6D28D9', // Prominent purple/violet border matching user screenshot!
    borderWidth: 2.2,
    borderRadius: 8,
    backgroundColor: '#FEF9C3',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCellInactive: {
    opacity: 0.35,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  cellTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cellSproutIcon: {
    fontSize: 10,
  },
  cellDoseCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#854D0E',
  },
  dayNumWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  dayNumTextSelected: {
    color: '#4C1D95',
    fontWeight: '900',
  },
  dayNumTextToday: {
    color: '#7C3AED',
  },
  dayNumTextFaint: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  cellBottomDots: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  textMuted: {
    color: '#94A3B8',
  },

  // Selected Day Detail Section
  dayDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayTitleLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  daySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  editActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  editActionIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  editActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 8,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
    marginRight: 8,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
  },

  // Medication Cards
  loadingBox: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  emptyDayBox: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyDayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptyDaySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 16,
    paddingHorizontal: 8,
  },

  // Dedicated Day Actions Section
  dayActionsSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dayActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  dayActionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayActionsStack: {
    gap: 10,
  },
  dayActionCardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  dayActionIconCirclePrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayActionTextCol: {
    flex: 1,
  },
  dayActionPrimaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dayActionPrimarySub: {
    fontSize: 11,
    color: '#DDD6FE',
    marginTop: 2,
  },
  dayActionCardSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
  },
  dayActionIconCircleSecondary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayActionSecondaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
  },
  dayActionSecondarySub: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 2,
  },

  medsList: {
    gap: 10,
    marginTop: 4,
  },
  medCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  medCardTaken: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  medCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  medCardInfo: {
    flex: 1,
  },
  medNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  medNameTextTaken: {
    color: '#065F46',
  },
  medDosageText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  medTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  medTimeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  medInstructionsText: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  medCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  medPrescriberWrap: {
    flex: 1,
  },
  medPrescriberText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  medButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  takeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  takeBtnPending: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  takeBtnActive: {
    backgroundColor: '#10B981',
  },
  takeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  takeBtnTextActive: {
    color: '#FFFFFF',
  },
  editSmallBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  deleteSmallBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
  },
  closeBtn: {
    padding: 6,
  },
  modalScroll: {
    padding: 18,
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#6D28D9',
    fontWeight: '700',
  },
  modeDescriptionText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
    paddingHorizontal: 4,
  },

  presetSection: {
    marginBottom: 14,
  },
  inputLabelSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  presetScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginRight: 6,
  },
  presetChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  presetChipTextActive: {
    color: '#6D28D9',
    fontWeight: '700',
  },

  inputGroup: {
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  timeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  timeChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  timeChipActive: {
    backgroundColor: '#7C3AED',
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  periodChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  periodChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  periodChipActive: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  periodChipTextActive: {
    color: '#6D28D9',
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 6,
  },
  durationChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  durationChipActive: {
    backgroundColor: '#6D28D9',
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  durationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
