import React, { useState, useMemo } from 'react';
import ConnectionsModal from '../../components/ConnectionsModal';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { syncService } from '../../services/syncService';
import ConnectPatientModal from '../../components/doctor/ConnectPatientModal';

import {
  getCaregiverPatients,
  deleteCaregiverPatient,
} from '../../services/patientManagementService';
import { getPatientVitalsHistory } from '../../services/vitalsService';
import PatientVitalsMonitorModal from '../../components/caregiver/PatientVitalsMonitorModal';
import DoctorBookingModal from '../../components/doctor/DoctorBookingModal';
import MonthlyPatientHistoryModal from '../../components/doctor/MonthlyPatientHistoryModal';
import PatientRiskChartCard from '../../components/doctor/PatientRiskChartCard';
import { bookingService } from '../../services/bookingService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const calculateRiskLevel = (patient, vitalsOverride = null) => {
  let riskScore = 0;
  const reasons = [];
  
  const adherence = patient.adherence?.weekly ?? patient.medicationAdherence ?? 85;
  if (adherence < 70) {
    riskScore += 2;
    reasons.push(`Low Adherence (${adherence}%)`);
  } else if (adherence < 85) {
    riskScore += 1;
    reasons.push(`Moderate Adherence (${adherence}%)`);
  }

  const v = vitalsOverride || patient.vitals;
  if (v) {
    const { hr, bp, spo2, temp } = v;
    if (hr && (Number(hr) > 100 || Number(hr) < 50)) {
      riskScore += 2;
      reasons.push(`Abnormal HR (${hr} BPM)`);
    }
    if (spo2 && Number(spo2) < 92) {
      riskScore += 2;
      reasons.push(`Low SpO2 (${spo2}%)`);
    } else if (spo2 && Number(spo2) < 95) {
      riskScore += 1;
      reasons.push(`Borderline SpO2 (${spo2}%)`);
    }
    
    if (bp) {
      const [sys, dia] = bp.split('/');
      if (sys && Number(sys) > 140) {
        riskScore += 1;
        reasons.push(`High Systolic BP (${sys})`);
      }
      if (dia && Number(dia) > 90) {
        riskScore += 1;
        reasons.push(`High Diastolic BP (${dia})`);
      }
    }

    if (temp && Number(temp) >= 38) {
      riskScore += 2;
      reasons.push(`Fever (${temp}°C)`);
    }
  }

  if (riskScore >= 3) {
    return { key: 'HIGH', score: riskScore, level: 'High Risk (AI)', color: '#DC2626', reasons };
  }
  if (riskScore > 0) {
    return { key: 'ELEVATED', score: riskScore, level: 'Elevated Risk (AI)', color: '#D97706', reasons };
  }
  return { key: 'LOW', score: riskScore, level: 'Low Risk (AI)', color: '#059669', reasons: ['Stable Vitals & Adherence'] };
};

export default function DoctorDashboardScreen({ currentUser, onSelectPatient }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const [patientVitalsMap, setPatientVitalsMap] = useState({});
  const [patientMedsStatusMap, setPatientMedsStatusMap] = useState({});
  const [vitalsModalVisible, setVitalsModalVisible] = useState(false);
  const [selectedVitalsPatient, setSelectedVitalsPatient] = useState(null);
  const [vitalsInitialTab, setVitalsInitialTab] = useState('single');
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedHistoryPatient, setSelectedHistoryPatient] = useState(null);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('ALL');
  const [expandedPatientIds, setExpandedPatientIds] = useState({});
  const [todayBookings, setTodayBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);

  const togglePatientExpand = (patientId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPatientIds((prev) => ({
      ...prev,
      [patientId]: !prev[patientId],
    }));
  };

  React.useEffect(() => {
    let mounted = true;
    const loadBookings = async () => {
      const todayList = await bookingService.getTodayBookings();
      const fullList = await bookingService.getBookings();
      if (mounted) {
        setTodayBookings(todayList);
        setAllBookings(fullList);
      }
    };
    loadBookings();

    const unsub = bookingService.on('bookings_updated', async (updated) => {
      const todayList = await bookingService.getTodayBookings();
      if (mounted) {
        setTodayBookings(todayList);
        setAllBookings(updated || []);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'short' });
  }, []);

  const monthBookingsCount = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `${yr}-${mo}`;
    return allBookings.filter((b) => b.date && b.date.startsWith(prefix)).length;
  }, [allBookings]);

  React.useEffect(() => {
    let mounted = true;
    const loadPatients = async () => {
      const pts = await getCaregiverPatients();
      if (mounted) {
        setPatients(pts);

        // Fetch latest vitals for all patients
        const vMap = {};
        for (const p of pts) {
          try {
            const history = await getPatientVitalsHistory(p.id);
            if (history && history.length > 0) {
              vMap[(p.id || '').toUpperCase().trim()] = history[0];
            }
          } catch (_e) {}
        }
        if (mounted) setPatientVitalsMap(vMap);

        // Fetch today's medication status map for all patients
        const mMap = {};
        const todayStr = new Date().toISOString().split('T')[0];
        for (const p of pts) {
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
        if (mounted) setPatientMedsStatusMap(mMap);
      }
    };
    loadPatients();
  }, [connectModalVisible]);

  const handleConnectPatient = (newPatient) => {
    if (!newPatient) return;
    setPatients((prev) => {
      const exists = prev.some((p) => (p.id || '').toUpperCase() === (newPatient.id || '').toUpperCase());
      if (exists) {
        return prev.map((p) =>
          (p.id || '').toUpperCase() === (newPatient.id || '').toUpperCase()
            ? { ...p, ...newPatient }
            : p
        );
      }
      return [newPatient, ...prev];
    });
  };

  const handleDeletePatient = (patientId, patientName) => {
    const performDelete = async () => {
      const cleanId = (patientId || '').toString().trim().toUpperCase();
      // 1. Optimistic immediate removal from UI
      setPatients((prev) => prev.filter((p) => (p.id || '').toString().trim().toUpperCase() !== cleanId));

      try {
        const remaining = await deleteCaregiverPatient(patientId);
        if (Array.isArray(remaining)) {
          setPatients(remaining);
        }
      } catch (err) {
        console.error('Failed to remove patient:', err);
        Alert.alert('Error', 'Failed to remove patient: ' + (err.message || 'Unknown error'));
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(`Are you sure you want to remove ${patientName || patientId} from your patient monitoring list? This action cannot be undone.`)
        : true;
      if (confirmed) performDelete();
      return;
    }

    Alert.alert(
      'Remove Patient',
      `Are you sure you want to remove ${patientName || patientId} from your patient monitoring list? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const riskAnalysis = useMemo(() => {
    let highCount = 0;
    let elevatedCount = 0;
    let lowCount = 0;
    const highRiskPatients = [];

    patients.forEach((p) => {
      const pKey = (p.id || '').toUpperCase().trim();
      const vitals = patientVitalsMap[pKey] || p.vitals;
      const res = calculateRiskLevel(p, vitals);
      if (res.key === 'HIGH') {
        highCount++;
        highRiskPatients.push({ ...p, riskInfo: res });
      } else if (res.key === 'ELEVATED') {
        elevatedCount++;
      } else {
        lowCount++;
      }
    });

    const total = patients.length;
    const divisor = total || 1;
    const highPct = total ? Math.round((highCount / divisor) * 100) : 0;
    const elevatedPct = total ? Math.round((elevatedCount / divisor) * 100) : 0;
    const lowPct = total ? Math.max(0, 100 - highPct - elevatedPct) : 100;
    const stabilityScore = total ? Math.round((lowCount / divisor) * 100) : 100;

    return {
      total,
      highCount,
      elevatedCount,
      lowCount,
      highPct,
      elevatedPct,
      lowPct,
      stabilityScore,
      highRiskPatients,
    };
  }, [patients, patientVitalsMap]);

  const filteredPatients = useMemo(() => {
    const cleanQuery = (searchQuery || '').trim().toLowerCase();

    // If no search query, filter by risk level if selected
    if (!cleanQuery) {
      if (selectedRiskFilter !== 'ALL') {
        return patients.filter((p) => {
          const pKey = (p.id || '').toUpperCase().trim();
          const vitals = patientVitalsMap[pKey] || p.vitals;
          const res = calculateRiskLevel(p, vitals);
          return res.key === selectedRiskFilter;
        });
      }
      return patients;
    }

    // When doctor inputs letters, find patients whose name or ID starts with those letters
    const matching = [];

    patients.forEach((p) => {
      const name = (p.name || p.fullName || p.patientName || '').toLowerCase().trim();
      const id = (p.id || '').toString().toLowerCase().trim();
      const words = name.split(/\s+/);

      // Check if full name, any word in name, or ID starts with input letters
      const nameStartsWith = name.startsWith(cleanQuery);
      const wordStartsWith = words.some((w) => w.startsWith(cleanQuery));
      const idStartsWith = id.startsWith(cleanQuery);
      const nameIncludes = name.includes(cleanQuery);
      const idIncludes = id.includes(cleanQuery);

      if (nameStartsWith || wordStartsWith || idStartsWith || nameIncludes || idIncludes) {
        let matchesRisk = true;
        if (selectedRiskFilter !== 'ALL') {
          const pKey = (p.id || '').toUpperCase().trim();
          const vitals = patientVitalsMap[pKey] || p.vitals;
          const res = calculateRiskLevel(p, vitals);
          matchesRisk = res.key === selectedRiskFilter;
        }

        // Priority score for sorting:
        // 1 = name starts with query
        // 2 = any word starts with query
        // 3 = ID starts with query
        // 4 = substring match
        let priority = 4;
        if (nameStartsWith) priority = 1;
        else if (wordStartsWith) priority = 2;
        else if (idStartsWith) priority = 3;

        matching.push({ patient: p, priority, matchesRisk });
      }
    });

    // If risk filter is active, check if any matched patients belong to that filter
    const riskMatches = matching.filter((m) => m.matchesRisk);
    // If none match the risk filter, show all search matches so doctor search never fails unexpectedly
    const finalMatches = selectedRiskFilter !== 'ALL' && riskMatches.length > 0 ? riskMatches : matching;

    // Sort by priority (starting letters first), then alphabetically
    finalMatches.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const nameA = (a.patient.name || '').toLowerCase();
      const nameB = (b.patient.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return finalMatches.map((m) => m.patient);
  }, [patients, searchQuery, selectedRiskFilter, patientVitalsMap]);

  React.useEffect(() => {
    const unsubMedStatus = syncService.on('medication_status_update', (incoming) => {
      const patientId = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      const patient = patients.find(p => (p.id || '').toUpperCase().trim() === patientId);
      const patientName = patient ? patient.name : `Patient (${patientId})`;
      const medName = incoming.data?.medicineName || 'Medication';
      const dosage = incoming.data?.dosage || '';
      const status = incoming.data?.status || 'taken';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const todayStr = new Date().toISOString().split('T')[0];

      if (patientId) {
        setPatientMedsStatusMap((prev) => ({
          ...prev,
          [patientId]: {
            medicineName: medName,
            dosage,
            status,
            timeStr,
            timestamp: Date.now(),
          },
        }));

        setPatients((prev) =>
          prev.map((p) => {
            if ((p.id || '').toUpperCase().trim() === patientId) {
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

      if (status === 'taken') {
        Alert.alert(
          '💊 Medication Intake Confirmed',
          `${patientName} marked ${medName} ${dosage ? `(${dosage})` : ''} as TAKEN at ${timeStr}.`
        );
      }
    });

    const unsubMedRecorded = syncService.on('medication_status_recorded', (incoming) => {
      const patientId = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      const medName = incoming.log?.medicineName || incoming.medicineName || 'Medication';
      const dosage = incoming.log?.dosage || incoming.dosage || '';
      const status = incoming.status || incoming.log?.status || 'taken';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const todayStr = new Date().toISOString().split('T')[0];

      if (patientId) {
        setPatientMedsStatusMap((prev) => ({
          ...prev,
          [patientId]: {
            medicineName: medName,
            dosage,
            status,
            timeStr,
            timestamp: Date.now(),
          },
        }));

        setPatients((prev) =>
          prev.map((p) => {
            if ((p.id || '').toUpperCase().trim() === patientId) {
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
      const patientId = (incoming.patientId || '').toUpperCase().trim();
      const todayStr = new Date().toISOString().split('T')[0];
      if (patientId) {
        setPatients((prev) =>
          prev.map((p) => {
            if ((p.id || '').toUpperCase().trim() === patientId) {
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

    const unsubAdherence = syncService.on('adherence_updated', (incoming) => {
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id === incoming.patientId) {
            return {
              ...p,
              medicationAdherence: incoming.adherence?.weekly ?? p.medicationAdherence,
              adherence: incoming.adherence,
            };
          }
          return p;
        })
      );
    });

    const unsubVitals = syncService.on('vitals_updated', (incoming) => {
      const incId = (incoming.patientId || incoming.roomCode || '').toUpperCase().trim();
      const updatedVitals = incoming.vitals || incoming.data;
      if (updatedVitals && incId) {
        setPatientVitalsMap((prev) => ({
          ...prev,
          [incId]: updatedVitals,
        }));
        setPatients((prev) =>
          prev.map((p) => {
            if ((p.id || '').toUpperCase().trim() === incId) {
              return {
                ...p,
                vitals: updatedVitals,
              };
            }
            return p;
          })
        );
      }
    });

    const unsubInvites = syncService.on('invitation_approved', async () => {
      const pts = await getCaregiverPatients();
      setPatients(pts);
      Alert.alert('Connection Approved', 'A patient has approved your connection request.');
    });

    const unsubRevokes = syncService.on('connection_revoked', async () => {
      const pts = await getCaregiverPatients();
      setPatients(pts);
    });

    return () => {
      unsubMedStatus();
      unsubMedRecorded();
      unsubDayStatus();
      unsubAdherence();
      unsubVitals();
      unsubInvites();
      unsubRevokes();
    };
  }, [patients]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {currentUser?.name || 'Doctor'}</Text>
        <Text style={styles.subGreeting}>Monitor your patients&apos; health and AI risk predictions</Text>
      </View>

      {/* Overview Stat Counters (Patients, Today's Bookings, Month's Bookings) */}
      <View style={styles.statsOverviewRow}>
        {/* 1. Total Patients */}
        <View style={styles.overviewStatCard}>
          <View style={[styles.overviewIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="people" size={18} color="#2563EB" />
          </View>
          <Text style={styles.overviewStatValue}>{patients.length}</Text>
          <Text style={styles.overviewStatLabel}>Total Patients</Text>
          <View style={[styles.overviewPill, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.overviewPillText, { color: '#1D4ED8' }]}>Connected</Text>
          </View>
        </View>

        {/* 2. Today's Bookings */}
        <TouchableOpacity
          style={styles.overviewStatCard}
          onPress={() => setBookingModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.overviewIconBox, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="calendar" size={18} color="#059669" />
          </View>
          <Text style={styles.overviewStatValue}>{todayBookings.length}</Text>
          <Text style={styles.overviewStatLabel}>Today Bookings</Text>
          <View style={[styles.overviewPill, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.overviewPillText, { color: '#065F46' }]}>Today</Text>
          </View>
        </TouchableOpacity>

        {/* 3. Monthly Bookings */}
        <TouchableOpacity
          style={styles.overviewStatCard}
          onPress={() => setBookingModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.overviewIconBox, { backgroundColor: '#F5F3FF' }]}>
            <MaterialCommunityIcons name="calendar-month" size={18} color="#7C3AED" />
          </View>
          <Text style={styles.overviewStatValue}>{monthBookingsCount}</Text>
          <Text style={styles.overviewStatLabel}>Month Bookings</Text>
          <View style={[styles.overviewPill, { backgroundColor: '#EDE9FE' }]}>
            <Text style={[styles.overviewPillText, { color: '#6D28D9' }]}>{currentMonthName}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Calculated Chart for All Patients Risk Level */}
      <PatientRiskChartCard
        riskAnalysis={riskAnalysis}
        selectedRiskFilter={selectedRiskFilter}
        onSelectRiskFilter={setSelectedRiskFilter}
        onSelectPatient={onSelectPatient}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by starting letters, name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {searchQuery.trim().length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchBtn}
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Search / Match indicator */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.searchMatchBanner}>
          <View style={styles.searchMatchBannerLeft}>
            <Ionicons name="filter-outline" size={14} color="#1E40AF" />
            <Text style={styles.searchMatchText}>
              Patients starting with <Text style={styles.searchMatchBold}>&quot;{searchQuery.trim()}&quot;</Text> ({filteredPatients.length} found)
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearChip}>
            <Text style={styles.searchClearChipText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Patient List */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Patients</Text>
          <View style={styles.headerBtnGroup}>

            <TouchableOpacity 
              style={styles.addPatientBtn}
              onPress={() => setConnectModalVisible(true)}
            >
              <Ionicons name="link" size={16} color="#FFFFFF" />
              <Text style={styles.addPatientBtnText}>Connect Patient</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {filteredPatients.length === 0 ? (
          <View style={styles.noResultsBox}>
            <Ionicons name="search-outline" size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.noResultsTitle}>No Patients Found</Text>
            <Text style={styles.noResults}>
              {searchQuery.trim()
                ? `No patients starting with or matching "${searchQuery.trim()}".`
                : 'No patients found under the selected filter.'}
            </Text>
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                style={styles.resetSearchBtn}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.resetSearchBtnText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredPatients.map((patient) => {
            const pKey = (patient.id || '').toUpperCase().trim();
            const currentVitals = patientVitalsMap[pKey] || patient.vitals;
            const risk = calculateRiskLevel(patient, currentVitals);
            const isExpanded = !!expandedPatientIds[patient.id];
            
            return (
              <View key={patient.id} style={[styles.patientCard, !isExpanded && styles.patientCardCollapsed]}>
                {/* Header Row: Only Patient Name and ID on left, Drop Down button and Delete action on right */}
                <View style={[styles.patientHeader, !isExpanded && styles.patientHeaderCollapsed]}>
                  <TouchableOpacity
                    style={styles.patientInfo}
                    onPress={() => togglePatientExpand(patient.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(patient.name || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.patientTextCol}>
                      <Text style={styles.patientName} numberOfLines={1} ellipsizeMode="tail">
                        {patient.name}
                      </Text>
                      <Text style={styles.patientId}>ID: {patient.id}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.patientHeaderRightActions}>
                    {/* Drop Down Button to see all patient details */}
                    <TouchableOpacity
                      style={[styles.dropdownToggleBtn, isExpanded && styles.dropdownToggleBtnActive]}
                      onPress={() => togglePatientExpand(patient.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dropdownToggleText, isExpanded && styles.dropdownToggleTextActive]}>
                        {isExpanded ? 'Hide' : 'Details'}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={15}
                        color={isExpanded ? '#7C3AED' : '#2563EB'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deletePatientBtn}
                      onPress={() => handleDeletePatient(patient.id, patient.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                      accessibilityLabel={`Delete patient ${patient.name}`}
                    >
                      <Ionicons name="trash-outline" size={17} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* All Patient Details: Only displayed when Drop Down Button is expanded */}
                {isExpanded && (
                  <View style={styles.expandedDetailsContainer}>
                    {/* Badges Row: AI Risk + Pre-registered with generous breathing room */}
                    <View style={styles.badgesRow}>
                  <View style={[styles.riskBadge, { backgroundColor: risk.color + '18' }]}>
                    <MaterialCommunityIcons name="brain" size={14} color={risk.color} />
                    <Text style={[styles.riskText, { color: risk.color }]}>{risk.level}</Text>
                  </View>

                  {patient.isPreRegistered && (
                    <View style={styles.preRegisteredBadge}>
                      <Ionicons name="time-outline" size={12} color="#7E22CE" />
                      <Text style={styles.preRegisteredText}>Pre-Registered</Text>
                    </View>
                  )}
                </View>

                {/* Clinical Details */}
                <TouchableOpacity
                  style={styles.patientDetails}
                  onPress={() => onSelectPatient(patient)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Condition: </Text>
                    {patient.condition || 'General Monitoring'}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Adherence: </Text>
                    {patient.medicationAdherence != null ? `${patient.medicationAdherence}%` : 'N/A'}
                  </Text>
                </TouchableOpacity>

                {/* Real-Time Today's Medication Plan on Patient Card (Doctor View) */}
                {(() => {
                  const pKey = (patient.id || '').toUpperCase().trim();
                  const liveMedInfo = patientMedsStatusMap[pKey];
                  const todayStr = new Date().toISOString().split('T')[0];
                  const meds = patient.medications || [];
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
                          <Text style={styles.cardMedPlanTitle}>Medication Schedule</Text>
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
                                  `${patient.name} has missed ${missedMeds.length} scheduled dose(s) today:\n\n${missedMeds.map((m) => `• ${m.name} (${m.dosage ? m.dosage + ' • ' : ''}${m.time || '08:00 AM'})`).join('\n')}`,
                                  [{ text: 'OK', style: 'default' }]
                                );
                              }}
                              style={styles.badgeMissedCount}
                            >
                              <Ionicons name="alert-circle" size={12} color="#DC2626" />
                              <Text style={styles.badgeMissedCountText}>{missedMeds.length} Missed</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

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
                                        'Missed Dose ⚠️',
                                        `${m.name} (${m.dosage ? m.dosage + ' • ' : ''}${m.time || '08:00 AM'}) was scheduled today and marked as MISSED.`
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

                {/* Real-Time Patient Vitals Telemetry Section (Doctor View-Only) */}
                {(() => {
                  const pKey = (patient.id || '').toUpperCase().trim();
                  const currentVitals = patientVitalsMap[pKey] || patient.vitals;
                  
                  return (
                    <View style={styles.vitalsSectionCard}>
                      <View style={styles.vitalsCardHeader}>
                        <View style={styles.vitalsCardHeaderLeft}>
                          <View style={styles.vitalsIconWrap}>
                            <MaterialCommunityIcons name="heart-pulse" size={15} color="#E11D48" />
                          </View>
                          <Text style={styles.vitalsCardTitle}>Patient Vitals</Text>
                          <View style={styles.liveVitalsBadge}>
                            <View style={styles.livePulseDot} />
                            <Text style={styles.liveVitalsBadgeText}>LIVE</Text>
                          </View>
                        </View>

                        <View style={[styles.vitalsStatusPill, { backgroundColor: (currentVitals?.statusColor || '#10B981') + '1A' }]}>
                          <Text style={[styles.vitalsStatusPillText, { color: currentVitals?.statusColor || '#059669' }]}>
                            {currentVitals?.status || 'Normal'}
                          </Text>
                        </View>
                      </View>

                      {/* 4-Metric Grid */}
                      <View style={styles.vitalsMiniGrid}>
                        <View style={styles.vitalsMiniMetric}>
                          <Text style={styles.vitalsMiniLabel}>Heart Rate</Text>
                          <Text style={styles.vitalsMiniValue}>
                            {currentVitals?.hr ? `${currentVitals.hr} BPM` : '--'}
                          </Text>
                        </View>
                        <View style={styles.vitalsMiniMetric}>
                          <Text style={styles.vitalsMiniLabel}>Blood Pressure</Text>
                          <Text style={styles.vitalsMiniValue}>
                            {currentVitals?.bp || '--'}
                          </Text>
                        </View>
                        <View style={styles.vitalsMiniMetric}>
                          <Text style={styles.vitalsMiniLabel}>Oxygen (SpO2)</Text>
                          <Text style={styles.vitalsMiniValue}>
                            {currentVitals?.spo2 ? `${currentVitals.spo2}%` : '--'}
                          </Text>
                        </View>
                        <View style={styles.vitalsMiniMetric}>
                          <Text style={styles.vitalsMiniLabel}>Temperature</Text>
                          <Text style={styles.vitalsMiniValue}>
                            {currentVitals?.temp ? `${currentVitals.temp}°C` : '--'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.vitalsMetaRow}>
                        <Text style={styles.vitalsMetaText}>
                          Updated by: <Text style={{ fontWeight: '700' }}>{currentVitals?.recordedBy || patient.caregiver || 'Caregiver'}</Text>
                          {currentVitals?.timestamp ? ` • ${new Date(currentVitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </Text>
                      </View>

                      {/* Action Button: Doctor Vitals Page (View Only) */}
                      <TouchableOpacity
                        style={styles.openVitalsPageBtn}
                        onPress={() => {
                          setSelectedVitalsPatient(patient);
                          setVitalsInitialTab('single');
                          setVitalsModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="monitor-dashboard" size={15} color="#7C3AED" />
                        <Text style={styles.openVitalsPageBtnText}>Open Patient Vitals Page</Text>
                        <View style={styles.viewOnlyBadge}>
                          <Text style={styles.viewOnlyBadgeText}>View Only</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#7C3AED" style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                    </View>
                  );
                })()}

                <View style={styles.cardFooterActionsRow}>
                  <TouchableOpacity
                    style={styles.monthlyReportCardBtn}
                    onPress={() => {
                      setSelectedHistoryPatient(patient);
                      setHistoryModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="file-document-outline" size={15} color="#2563EB" />
                    <Text style={styles.monthlyReportCardBtnText}>Monthly History & Report</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewChartActionWrapper}
                    onPress={() => onSelectPatient(patient)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewChartActionText}>Clinical Chart</Text>
                    <Ionicons name="chevron-forward" size={14} color="#9333EA" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })
        )}
      </View>

      {/* Manage Connections (After My Patients List) */}
      <View style={styles.connectionsSection}>
        <View style={styles.connectionsSectionHeader}>
          <Text style={styles.sectionTitle}>Connections & Network</Text>
        </View>

        <TouchableOpacity
          style={styles.connectionsCard}
          onPress={() => setConnectionsModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.connectionsCardLeft}>
            <View style={styles.connectionsIconCircle}>
              <Ionicons name="git-network-outline" size={24} color="#2563EB" />
            </View>
            <View style={styles.connectionsInfo}>
              <Text style={styles.connectionsTitle}>Manage Connections</Text>
              <Text style={styles.connectionsSub}>
                Accept connection requests & view connected patient rooms
              </Text>
            </View>
          </View>
          <View style={styles.connectionsArrowCircle}>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.connectionsCard, { marginTop: 12 }]}
          onPress={() => {
            setSelectedVitalsPatient(patients[0] || null);
            setVitalsInitialTab('all');
            setVitalsModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.connectionsCardLeft}>
            <View style={[styles.connectionsIconCircle, { backgroundColor: '#FFE4E6' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#E11D48" />
            </View>
            <View style={styles.connectionsInfo}>
              <Text style={styles.connectionsTitle}>Patient Vitals Hub</Text>
              <Text style={styles.connectionsSub}>
                Real-time telemetry & vitals monitor for all patients ({patients.length})
              </Text>
            </View>
          </View>
          <View style={styles.connectionsArrowCircle}>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>
        </TouchableOpacity>

        {/* Daily Bookings & Appointments Card (Under Patient Vitals Hub) */}
        <View style={[styles.bookingCardSection, { marginTop: 14 }]}>
          <TouchableOpacity
            style={styles.doctorBookingCard}
            onPress={() => setBookingModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.bookingCardHeader}>
              <View style={styles.bookingCardHeaderLeft}>
                <View style={styles.bookingIconBadge}>
                  <Ionicons name="calendar" size={20} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.bookingCardTitle}>Daily Bookings & Appointments</Text>
                  <Text style={styles.bookingCardSub}>
                    {todayBookings.length === 1
                      ? '1 Patient appointment booked today'
                      : `${todayBookings.length} Patient appointments booked today`}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDayPill}>
                <Ionicons name="calendar-outline" size={12} color="#2563EB" />
                <Text style={styles.bookingDayPillText}>Day Planner</Text>
              </View>
            </View>

            {todayBookings.length > 0 ? (
              <View style={styles.nextBookingPreview}>
                <View style={styles.nextBookingLeft}>
                  <View style={styles.nextTimeTag}>
                    <Ionicons name="time" size={13} color="#2563EB" />
                    <Text style={styles.nextTimeText}>{todayBookings[0].time}</Text>
                  </View>
                  <View style={styles.nextBookingDetails}>
                    <Text style={styles.nextPatientName} numberOfLines={1}>
                      {todayBookings[0].patientName}
                    </Text>
                    <Text style={styles.nextTypeMeta} numberOfLines={1}>
                      {todayBookings[0].type}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingActionPill}>
                  <Text style={styles.bookingActionPillText}>View Schedule</Text>
                  <Ionicons name="chevron-forward" size={14} color="#2563EB" />
                </View>
              </View>
            ) : (
              <View style={styles.emptyBookingPreview}>
                <Text style={styles.emptyBookingText}>
                  No appointments booked for today. Tap to plan or note daily bookings.
                </Text>
                <View style={styles.noteBookingMiniBtn}>
                  <Ionicons name="add-circle" size={14} color="#2563EB" />
                  <Text style={styles.noteBookingMiniBtnText}>+ Note Booking</Text>
                </View>
              </View>
            )}

            <View style={styles.bookingCardFooter}>
              <View style={styles.bookingCardFooterLeft}>
                <Ionicons name="notifications-outline" size={13} color="#059669" />
                <Text style={styles.bookingCardFooterNotice}>
                  Instant notifications sent to patient & caregiver
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={18} color="#2563EB" />
            </View>
          </TouchableOpacity>
        </View>
      </View>


      <ConnectPatientModal 
        visible={connectModalVisible} 
        onConnect={handleConnectPatient}
        onClose={() => setConnectModalVisible(false)} 
      />

      <ConnectionsModal 
        visible={connectionsModalVisible} 
        onClose={async () => {
          setConnectionsModalVisible(false);
          const pts = await getCaregiverPatients();
          setPatients(pts);
        }} 
      />

      {/* Patient Vitals Telemetry Monitor Page (Doctor View-Only) */}
      <PatientVitalsMonitorModal
        visible={vitalsModalVisible}
        initialPatient={selectedVitalsPatient || patients[0]}
        patients={patients}
        isReadOnly={true}
        initialTab={vitalsInitialTab}
        onClose={() => setVitalsModalVisible(false)}
      />

      {/* Doctor Daily Bookings & Schedule Modal */}
      <DoctorBookingModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        patients={patients}
        doctorName={currentUser?.name || 'Dr. Vimukthi Perera'}
      />

      {/* Doctor Monthly Patient History & Downloadable Report Modal */}
      <MonthlyPatientHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        patients={patients}
        initialPatient={selectedHistoryPatient || patients[0]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginTop: 6,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subGreeting: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  clearSearchBtn: {
    padding: 6,
  },
  searchMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  searchMatchBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  searchMatchText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
  },
  searchMatchBold: {
    fontWeight: '800',
    color: '#1D4ED8',
  },
  searchClearChip: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  searchClearChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  noResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
  },
  noResultsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  resetSearchBtn: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  resetSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  addPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#9333EA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addPatientBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noResults: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
    fontStyle: 'italic',
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  patientCardCollapsed: {
    padding: 12,
    paddingVertical: 12,
    marginBottom: 10,
    borderColor: '#E5E7EB',
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientHeaderCollapsed: {
    marginBottom: 0,
  },
  patientHeaderRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  dropdownToggleBtnActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  dropdownToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  dropdownToggleTextActive: {
    color: '#7C3AED',
  },
  expandedDetailsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  patientTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  patientId: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '700',
  },
  patientDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  connectionsSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  connectionsSectionHeader: {
    marginBottom: 12,
  },
  connectionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  connectionsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  connectionsIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionsInfo: {
    flex: 1,
  },
  connectionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  connectionsSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  connectionsArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deletePatientBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preRegisteredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  preRegisteredText: {
    fontSize: 11,
    color: '#7E22CE',
    fontWeight: '700',
  },
  cardFooterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  monthlyReportCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
  },
  monthlyReportCardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  cardFooterAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  viewChartActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9333EA',
  },
  cardFooterActionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FAF5FF',
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allVitalsHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
  },
  allVitalsHubBtnText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '700',
  },
  vitalsSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  vitalsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vitalsCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vitalsIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveVitalsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveVitalsBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  vitalsStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vitalsStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  vitalsMiniGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  vitalsMiniMetric: {
    width: '24%',
    alignItems: 'center',
  },
  vitalsMiniLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  vitalsMiniValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  vitalsMetaRow: {
    marginBottom: 8,
  },
  vitalsMetaText: {
    fontSize: 10,
    color: '#64748B',
  },
  openVitalsPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
  },
  openVitalsPageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  viewOnlyBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewOnlyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6D28D9',
  },
  liveDocMedCard: {
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  liveDocMedCardTaken: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  liveDocMedCardPending: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  liveDocMedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveDocMedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDocMedIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDocMedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  liveDocMedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveDocMedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  patientCardMedPlan: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardMedPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 6,
    columnGap: 6,
    marginBottom: 8,
  },
  cardMedPlanHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  cardMedPlanIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMedPlanTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardMedPlanBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badgeTakenCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeTakenCountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
  },
  badgeMissedCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeMissedCountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  emptyPlanCardText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 2,
  },
  planItemsContainer: {
    gap: 5,
  },
  planItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
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
    marginRight: 6,
  },
  planItemName: {
    fontSize: 11,
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
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  planPillTaken: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 3,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexShrink: 0,
  },
  planPillTakenText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
  },
  planPillMissed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexShrink: 0,
    marginLeft: 6,
  },
  planPillMissedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  planPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
  },
  planPillPendingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  bookingCardSection: {
    marginBottom: 16,
  },
  doctorBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookingCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bookingIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  bookingCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bookingDayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bookingDayPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  nextBookingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  nextBookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  nextTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nextTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  nextBookingDetails: {
    flex: 1,
  },
  nextPatientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  nextTypeMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  bookingActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bookingActionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  emptyBookingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  emptyBookingText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  noteBookingMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noteBookingMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  bookingCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bookingCardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bookingCardFooterNotice: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  statsOverviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  overviewStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  overviewIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  overviewStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  overviewStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'center',
  },
  overviewPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overviewPillText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
