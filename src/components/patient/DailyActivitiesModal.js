// src/components/patient/DailyActivitiesModal.js - Daily Routines, Habits & Hydration Tracker
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getPatientActivities,
  togglePatientActivity,
} from '../../services/patientManagementService';

function getActivityVisuals(category = '', title = '') {
  const cat = (category || '').toLowerCase();
  const t = (title || '').toLowerCase();

  if (cat.includes('physical') || t.includes('walk') || t.includes('stretch') || t.includes('exercise')) {
    return { icon: 'walk', color: '#10B981', bg: '#ECFDF5' };
  }
  if (cat.includes('brain') || t.includes('puzzle') || t.includes('game') || t.includes('memory')) {
    return { icon: 'brain', color: '#8B5CF6', bg: '#F5F3FF' };
  }
  if (cat.includes('nutrition') || t.includes('meal') || t.includes('breakfast') || t.includes('lunch') || t.includes('dinner') || t.includes('food')) {
    return { icon: 'food-apple', color: '#F59E0B', bg: '#FFFBEB' };
  }
  if (cat.includes('rest') || t.includes('sleep') || t.includes('nap') || t.includes('quiet')) {
    return { icon: 'weather-night', color: '#3B82F6', bg: '#EFF6FF' };
  }
  if (cat.includes('wellness') || t.includes('yoga') || t.includes('meditation')) {
    return { icon: 'heart-pulse', color: '#EC4899', bg: '#FDF2F8' };
  }
  return { icon: 'calendar-check', color: '#0284C7', bg: '#F0F9FF' };
}

export default function DailyActivitiesModal({
  visible,
  onClose,
  roomCode,
  currentUser,
  activitiesList = [],
  onActivitiesUpdated,
}) {
  const [waterGlasses, setWaterGlasses] = useState(5);
  const targetGlasses = 8;

  const effectivePatientId = (roomCode || currentUser?.pairingCode || currentUser?.id || 'CARE-1001').toUpperCase().trim();

  // Sync activities on open if list is not populated yet
  useEffect(() => {
    let active = true;
    if (visible && (!activitiesList || activitiesList.length === 0)) {
      getPatientActivities(effectivePatientId).then((acts) => {
        if (active && onActivitiesUpdated && acts) {
          onActivitiesUpdated(acts);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [visible, effectivePatientId, activitiesList, onActivitiesUpdated]);

  const handleToggle = async (item) => {
    const isCompleted = !(item.completed || item.done);

    // Optimistically update
    const next = activitiesList.map((a) =>
      a.id === item.id ? { ...a, completed: isCompleted, done: isCompleted } : a
    );
    if (onActivitiesUpdated) {
      onActivitiesUpdated(next);
    }

    try {
      await togglePatientActivity(effectivePatientId, item.id, isCompleted);
    } catch (err) {
      console.warn('Failed to update activity status:', err);
    }
  };

  const addGlass = () => {
    if (waterGlasses < 12) setWaterGlasses(waterGlasses + 1);
  };

  const removeGlass = () => {
    if (waterGlasses > 0) setWaterGlasses(waterGlasses - 1);
  };

  const completedActivities = (activitiesList || []).filter((a) => a.completed || a.done).length;
  const totalActivities = (activitiesList || []).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="calendar-check" size={24} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>Daily Activities</Text>
                <Text style={styles.subtitle}>Caregiver-scheduled routines & habits</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Hydration Tracker Card */}
          <View style={styles.waterCard}>
            <View style={styles.waterTop}>
              <View style={styles.waterTitleRow}>
                <Ionicons name="water" size={20} color="#0284C7" />
                <Text style={styles.waterTitle}>Daily Hydration Tracker</Text>
              </View>
              <Text style={styles.waterCountText}>
                {waterGlasses} / {targetGlasses} Glasses
              </Text>
            </View>

            {/* Glass Icons */}
            <View style={styles.glassesRow}>
              {Array.from({ length: targetGlasses }).map((_, i) => (
                <Ionicons
                  key={i}
                  name="water"
                  size={20}
                  color={i < waterGlasses ? '#0284C7' : '#CBD5E1'}
                />
              ))}
            </View>

            <View style={styles.waterControls}>
              <TouchableOpacity style={styles.waterBtn} onPress={removeGlass}>
                <Ionicons name="remove" size={18} color="#0369A1" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.waterAddBtn} onPress={addGlass}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.waterAddBtnText}>Drank a Glass</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Routine List Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>
              Today&apos;s Routines ({completedActivities} of {totalActivities} Completed)
            </Text>
            {totalActivities > 0 && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>
                  {Math.round((completedActivities / totalActivities) * 100)}% Done
                </Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {totalActivities === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={32} color="#059669" />
                  </View>
                  <Text style={styles.emptyTitle}>No Activities Scheduled Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    When your caregiver adds daily activities from their dashboard, they will automatically appear here in real time.
                  </Text>
                </View>
              ) : (
                activitiesList.map((item) => {
                  const isDone = !!(item.completed || item.done);
                  const visual = getActivityVisuals(item.category, item.title);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.activityCard, isDone && styles.activityCardDone]}
                      onPress={() => handleToggle(item)}
                      activeOpacity={0.75}
                    >
                      <TouchableOpacity
                        style={[styles.checkbox, isDone && styles.checkboxDone]}
                        onPress={() => handleToggle(item)}
                      >
                        {isDone && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                      </TouchableOpacity>

                      <View style={styles.activityInfo}>
                        <View style={styles.actTitleRow}>
                          <Text style={[styles.activityTitle, isDone && styles.activityTitleDone]}>
                            {item.title}
                          </Text>
                          {item.category && (
                            <View style={[styles.categoryBadge, { backgroundColor: visual.bg }]}>
                              <Text style={[styles.categoryBadgeText, { color: visual.color }]}>
                                {item.category}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={13} color="#64748B" />
                          <Text style={styles.activityTime}>{item.time || '09:00 AM'}</Text>
                          <Text style={styles.bullet}>•</Text>
                          <Ionicons name="hourglass-outline" size={12} color="#94A3B8" />
                          <Text style={styles.activityDuration}>{item.duration || '20 mins'}</Text>
                        </View>

                        {item.caregiverName && (
                          <Text style={styles.caregiverTag}>
                            Caregiver: {item.caregiverName}
                          </Text>
                        )}
                      </View>

                      <View style={[styles.typeIcon, { backgroundColor: visual.bg }]}>
                        <MaterialCommunityIcons name={visual.icon} size={20} color={visual.color} />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Activities</Text>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    backgroundColor: '#ECFDF5',
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
  waterCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  waterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  waterCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  glassesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 6,
  },
  waterControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  waterBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  waterAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  progressBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  progressBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 6,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    maxHeight: 320,
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  activityCardDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  activityInfo: {
    flex: 1,
  },
  actTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  activityTitleDone: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  bullet: {
    color: '#9CA3AF',
    marginHorizontal: 2,
  },
  activityDuration: {
    fontSize: 11,
    color: '#64748B',
  },
  caregiverTag: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
    fontStyle: 'italic',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    backgroundColor: '#10B981',
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
