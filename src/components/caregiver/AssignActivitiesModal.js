// src/components/caregiver/AssignActivitiesModal.js - Assign & Schedule Daily Activities for Patients
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  assignActivityToPatient,
  deleteActivityFromPatient,
  togglePatientActivity,
  deduplicateActivities,
} from '../../services/patientManagementService';

export default function AssignActivitiesModal({
  visible,
  patient,
  caregiverName,
  onActivitiesUpdated,
  onClose,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00 AM');
  const [duration, setDuration] = useState('30 mins');
  const [category, setCategory] = useState('Physical');

  const categories = ['Physical', 'Brain Fitness', 'Nutrition', 'Rest', 'Wellness'];

  // Deduplicate activities array so no duplicate items ever appear
  const activities = useMemo(() => {
    return deduplicateActivities(patient?.activities || []);
  }, [patient?.activities]);

  if (!patient) return null;

  const completedCount = activities.filter((a) => a.completed || a.done).length;
  const totalCount = activities.length;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddActivity = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an activity title.');
      return;
    }

    try {
      const updatedPatient = await assignActivityToPatient(
        patient.id,
        {
          title: title.trim(),
          time,
          duration,
          category,
        },
        caregiverName || 'Caregiver'
      );

      Alert.alert('Activity Assigned', `"${title}" has been assigned to ${patient.name}'s daily schedule.`);
      setTitle('');
      setShowAddForm(false);
      if (onActivitiesUpdated) onActivitiesUpdated(updatedPatient);
    } catch (_err) {
      Alert.alert('Error', 'Failed to assign activity.');
    }
  };

  const handleToggleStatus = async (item) => {
    const isNowCompleted = !(item.completed || item.done);
    try {
      await togglePatientActivity(patient.id, item.id, isNowCompleted);
      const updatedActs = activities.map((a) =>
        a.id === item.id ? { ...a, completed: isNowCompleted, done: isNowCompleted } : a
      );
      const updatedPatient = { ...patient, activities: updatedActs };
      if (onActivitiesUpdated) onActivitiesUpdated(updatedPatient);
    } catch (_err) {
      Alert.alert('Error', 'Failed to update activity status.');
    }
  };

  const handleDeleteActivity = async (actId, actTitle) => {
    Alert.alert(
      'Remove Activity',
      `Are you sure you want to remove "${actTitle}" from ${patient.name}'s routine?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteActivityFromPatient(patient.id, actId);
            if (onActivitiesUpdated) onActivitiesUpdated(updated);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.title}>Daily Activities</Text>
                <Text style={styles.subtitle}>
                  Schedule routine habits for <Text style={{ fontWeight: '700' }}>{patient.name}</Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Patient Completion Summary Progress Card */}
          {totalCount > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryLeftCol}>
                  <Text style={styles.summaryTitle}>Patient Routine Progress</Text>
                  <Text style={styles.summarySub}>
                    {completedCount === totalCount
                      ? `🎉 All ${totalCount} routine${totalCount > 1 ? 's' : ''} completed by patient!`
                      : `${completedCount} of ${totalCount} completed • ${pendingCount} pending`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressPill,
                    completedCount === totalCount
                      ? styles.progressPillComplete
                      : styles.progressPillPending,
                  ]}
                >
                  <Ionicons
                    name={completedCount === totalCount ? 'checkmark-circle' : 'time-outline'}
                    size={13}
                    color={completedCount === totalCount ? '#15803D' : '#B45309'}
                  />
                  <Text
                    style={[
                      styles.progressPillText,
                      { color: completedCount === totalCount ? '#15803D' : '#B45309' },
                    ]}
                  >
                    {progressPercent}% Done
                  </Text>
                </View>
              </View>

              {/* Visual Progress Bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: completedCount === totalCount ? '#10B981' : '#2563EB',
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Add Activity Toggle Header */}
          <View style={styles.topActionsRow}>
            <Text style={styles.actCountText}>
              Assigned Routines ({totalCount}):
            </Text>
            <TouchableOpacity
              style={styles.addActBtn}
              onPress={() => setShowAddForm(!showAddForm)}
            >
              <Ionicons
                name={showAddForm ? 'close' : 'add'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.addActBtnText}>
                {showAddForm ? 'Cancel' : '+ New Activity'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Activity Form */}
          {showAddForm && (
            <View style={styles.addFormCard}>
              <Text style={styles.formTitle}>Schedule New Routine</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Activity Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Morning Garden Walk"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={time}
                    onChangeText={setTime}
                    placeholder="09:00 AM"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Duration</Text>
                  <TextInput
                    style={styles.textInput}
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="30 mins"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Category Chips */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.chipsRow}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, category === c && styles.chipSelected]}
                      onPress={() => setCategory(c)}
                    >
                      <Text style={[styles.chipText, category === c && styles.chipTextSelected]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.confirmAddBtn} onPress={handleAddActivity}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.confirmAddBtnText}>Save Activity</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Activities List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {totalCount === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyText}>No activities assigned yet.</Text>
                <Text style={styles.emptySub}>Tap &quot;+ New Activity&quot; above to schedule tasks.</Text>
              </View>
            ) : (
              activities.map((item) => {
                const isDone = !!(item.completed || item.done);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.activityCard,
                      isDone ? styles.activityCardDone : styles.activityCardPending,
                    ]}
                  >
                    {/* Status Icon */}
                    <TouchableOpacity
                      style={[
                        styles.actIconBox,
                        isDone ? styles.actIconBoxDone : styles.actIconBoxPending,
                      ]}
                      onPress={() => handleToggleStatus(item)}
                      activeOpacity={0.75}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      ) : (
                        <MaterialCommunityIcons name="clock-outline" size={22} color="#D97706" />
                      )}
                    </TouchableOpacity>

                    {/* Details */}
                    <View style={styles.actDetails}>
                      <View style={styles.actTopRow}>
                        <Text style={[styles.actTitle, isDone && styles.actTitleDone]}>
                          {item.title}
                        </Text>
                      </View>

                      {/* Status & Category Badges Row */}
                      <View style={styles.badgesRow}>
                        {/* Patient Completion Status Badge */}
                        <View
                          style={[
                            styles.statusBadge,
                            isDone ? styles.statusBadgeDone : styles.statusBadgePending,
                          ]}
                        >
                          <Ionicons
                            name={isDone ? 'checkmark-circle' : 'hourglass-outline'}
                            size={11}
                            color={isDone ? '#15803D' : '#B45309'}
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isDone ? '#15803D' : '#B45309' },
                            ]}
                          >
                            {isDone ? 'Done by Patient' : 'Not Done Yet'}
                          </Text>
                        </View>

                        {/* Category Badge */}
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>{item.category || 'Routine'}</Text>
                        </View>
                      </View>

                      {/* Time & Duration */}
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={13} color="#64748B" />
                        <Text style={styles.timeText}>{item.time || '09:00 AM'}</Text>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.durationText}>{item.duration || '30 mins'}</Text>
                      </View>
                    </View>

                    {/* Actions: Toggle Done/Pending & Delete */}
                    <View style={styles.cardActionsCol}>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          isDone ? styles.toggleBtnDone : styles.toggleBtnPending,
                        ]}
                        onPress={() => handleToggleStatus(item)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            { color: isDone ? '#15803D' : '#2563EB' },
                          ]}
                        >
                          {isDone ? 'Done ✓' : 'Mark Done'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteActivity(item.id, item.title)}
                      >
                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
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
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLeftCol: {
    flex: 1,
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  summarySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  progressPillPending: {
    backgroundColor: '#FEF3C7',
  },
  progressPillComplete: {
    backgroundColor: '#DCFCE7',
  },
  progressPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  addActBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addActBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addFormCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: '#111827',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmAddBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  confirmAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  list: {
    maxHeight: 330,
    marginBottom: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    gap: 10,
  },
  activityCardPending: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  activityCardDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  actIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actIconBoxPending: {
    backgroundColor: '#FEF3C7',
  },
  actIconBoxDone: {
    backgroundColor: '#DCFCE7',
  },
  actDetails: {
    flex: 1,
  },
  actTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  actTitleDone: {
    color: '#166534',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeDone: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  catBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  bullet: {
    color: '#9CA3AF',
    marginHorizontal: 1,
  },
  durationText: {
    fontSize: 11,
    color: '#6B7280',
  },
  cardActionsCol: {
    alignItems: 'center',
    gap: 6,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  toggleBtnPending: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 6,
  },
  doneBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
