import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncService } from './syncService';

const getApiBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:4000/api`;
  }
  try {
    const Constants = require('expo-constants').default;
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:4000/api`;
      }
    }
    if (Constants?.linkingUri) {
      const match = Constants.linkingUri.match(/:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:4000/api`;
      }
    }
  } catch (_e) {}

  return 'http://172.18.150.21:4000/api';
};

const PATIENTS_STORAGE_KEY = '@healthtrack_caregiver_patients_v1';
const DELETED_PATIENTS_KEY = '@healthtrack_caregiver_deleted_patients_v1';
const EMERGENCY_ALERTS_KEY = '@healthtrack_caregiver_alerts_v1';

const INITIAL_PATIENTS = [];

const INITIAL_ALERTS = [];

async function getDeletedPatientIds() {
  try {
    const raw = await AsyncStorage.getItem(DELETED_PATIENTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map(id => (id || '').toString().trim().toUpperCase()));
      }
    }
  } catch (_e) {}
  return new Set();
}

async function markPatientAsDeleted(patientId) {
  try {
    const cleanId = (patientId || '').toString().trim().toUpperCase();
    const deletedSet = await getDeletedPatientIds();
    deletedSet.add(cleanId);
    await AsyncStorage.setItem(DELETED_PATIENTS_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (_e) {}
}

async function unmarkPatientAsDeleted(patientId) {
  try {
    const cleanId = (patientId || '').toString().trim().toUpperCase();
    const deletedSet = await getDeletedPatientIds();
    if (deletedSet.has(cleanId)) {
      deletedSet.delete(cleanId);
      await AsyncStorage.setItem(DELETED_PATIENTS_KEY, JSON.stringify(Array.from(deletedSet)));
    }
  } catch (_e) {}
}

export function deduplicateActivities(activities) {
  if (!Array.isArray(activities)) return [];
  const map = new Map();
  activities.forEach((act) => {
    if (act && act.id) {
      const existing = map.get(act.id);
      if (!existing || (act.completed && !existing.completed)) {
        map.set(act.id, act);
      }
    }
  });
  return Array.from(map.values());
}

export async function getCaregiverPatients() {
  const deletedSet = await getDeletedPatientIds();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  
  let localPatients = [];
  try {
    const raw = await AsyncStorage.getItem(PATIENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localPatients = parsed
          .filter(p => p && p.id && !deletedSet.has((p.id || '').toString().trim().toUpperCase()))
          .map((p) => ({
            ...p,
            activities: deduplicateActivities(p.activities),
          }));
      }
    }
  } catch (_e) {}

  try {
    const { getCurrentUser } = require('./authService');
    const user = await getCurrentUser();
    if (!user) return localPatients;

    const emailOrId = user.email || user.id;
    const res = await fetch(`${getApiBaseUrl()}/patients/connected/${emailOrId}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const connectedPatients = await res.json();
      
      // Merge backend connected patients with any local patients (skipping deleted ones)
      const mergedMap = new Map();
      localPatients.forEach(p => {
        if (p && p.id && !deletedSet.has((p.id || '').toString().trim().toUpperCase())) {
          mergedMap.set(p.id.toUpperCase(), {
            ...p,
            activities: deduplicateActivities(p.activities),
          });
        }
      });
      connectedPatients.forEach(backendP => {
        if (backendP && backendP.id) {
          const key = backendP.id.toString().trim().toUpperCase();
          if (deletedSet.has(key)) return; // Skip deleted patients!
          const existing = mergedMap.get(key) || {};
          const mergedActs = deduplicateActivities([
            ...(backendP.activities || []),
            ...(existing.activities || []),
          ]);
          mergedMap.set(key, { ...existing, ...backendP, activities: mergedActs });
        }
      });
      const updatedLocal = Array.from(mergedMap.values()).map((p) => ({
        ...p,
        activities: deduplicateActivities(p.activities),
      }));
      
      await AsyncStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(updatedLocal));
      return updatedLocal;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.log('Backend fetch failed, falling back to local storage', err);
  }

  return localPatients.length > 0 ? localPatients : INITIAL_PATIENTS;
}

export async function saveCaregiverPatients(patients) {
  try {
    await AsyncStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
  } catch (e) {
    console.error('Failed to save patients:', e);
  }
}

export async function addCaregiverPatient({
  name,
  id,
  age,
  condition,
  emergencyPhone = '',
  safeZoneRadius,
}) {
  const cleanId = (id || 'CARE-' + Math.floor(1000 + Math.random() * 9000)).trim().toUpperCase();
  await unmarkPatientAsDeleted(cleanId);

  const patients = await getCaregiverPatients();

  // Check if unique ID already exists
  const existing = patients.find((p) => (p.id || '').toUpperCase() === cleanId);
  if (existing) {
    throw new Error(`Patient with Unique ID "${cleanId}" already exists.`);
  }

  const newPatient = {
    id: cleanId,
    name: name.trim(),
    age: Number(age) || null,
    condition: condition ? condition.trim() : null,
    emergencyPhone: emergencyPhone.trim(),
    status: 'idle',
    batteryLevel: null,
    lastSeen: null,
    lastKnownLocation: null,
    safeZoneRadius: Number(safeZoneRadius) || null,
    medications: [],
    activities: [],
  };

  patients.unshift(newPatient);
  await saveCaregiverPatients(patients);
  return newPatient;
}

export async function deleteCaregiverPatient(patientId) {
  const cleanId = (patientId || '').toString().trim().toUpperCase();
  
  // 1. Permanently blacklist this patient ID locally so they never reappear
  await markPatientAsDeleted(cleanId);

  // 2. Read local patients and filter out immediately
  let localPatients = [];
  try {
    const raw = await AsyncStorage.getItem(PATIENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localPatients = parsed;
    }
  } catch (_e) {}

  const filtered = localPatients.filter(
    (p) => (p.id || '').toString().trim().toUpperCase() !== cleanId
  );
  await saveCaregiverPatients(filtered);

  // 3. Notify local event bus so UI and syncService know connection is revoked
  try {
    const { localBus } = require('./syncService');
    if (localBus && localBus.emit) {
      localBus.emit('connection_revoked', { patientRoomCode: cleanId });
    }
  } catch (_e) {}

  // 4. Call backend to permanently delete connection (with short timeout so it never blocks UI)
  try {
    const { getCurrentUser } = require('./authService');
    const currentUser = await getCurrentUser();
    const email = currentUser?.email || 'caregiver@test.com';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    fetch(`${getApiBaseUrl()}/connections/by-user/${encodeURIComponent(email)}/${encodeURIComponent(cleanId)}`, {
      method: 'DELETE',
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (res.ok) console.log(`Patient connection ${cleanId} deleted permanently on backend`);
      })
      .catch((e) => {
        clearTimeout(timeoutId);
        console.warn('Backend delete connection notice:', e.message);
      });
  } catch (err) {
    console.warn('Error during backend deletion request:', err);
  }

  return filtered;
}

export async function getPatientMedicationPlan(patientId) {
  if (!patientId) return [];
  const cleanId = patientId.trim().toUpperCase();

  try {
    const res = await fetch(`${getApiBaseUrl()}/medications/plan/${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const plan = await res.json();
      if (Array.isArray(plan)) return plan;
    }
  } catch (_e) {}

  const patients = await getCaregiverPatients();
  const p = patients.find((pt) => (pt.id || '').toUpperCase() === cleanId);
  return p?.medications || [];
}

export async function getTodayMedicationsForPatient(patientId) {
  if (!patientId) return [];
  const cleanId = patientId.trim().toUpperCase();

  try {
    const res = await fetch(`${getApiBaseUrl()}/medications/today/${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const todayMeds = await res.json();
      if (Array.isArray(todayMeds)) return todayMeds;
    }
  } catch (_e) {}

  const plan = await getPatientMedicationPlan(cleanId);
  const todayStr = new Date().toISOString().split('T')[0];
  return plan
    .filter((m) => {
      if (m.isActive === false) return false;
      if (m.startDate && m.endDate) {
        return todayStr >= m.startDate && todayStr <= m.endDate;
      }
      return true;
    })
    .map((m) => {
      const todayStatus = (m.dayStatuses && m.dayStatuses[todayStr]) || m.status || 'Pending';
      return {
        ...m,
        status: todayStatus,
      };
    });
}

export async function saveOrUpdatePatientMedication(patientId, medData) {
  if (!patientId) return null;
  const cleanId = patientId.trim().toUpperCase();
  const isUpdate = !!medData.id;

  try {
    const url = isUpdate
      ? `${getApiBaseUrl()}/medications/plan/${encodeURIComponent(cleanId)}/${encodeURIComponent(medData.id)}`
      : `${getApiBaseUrl()}/medications/plan/${encodeURIComponent(cleanId)}`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medData),
    });
    if (res.ok) {
      const savedMed = await res.json();
      await syncLocalMedication(cleanId, savedMed, isUpdate);
      return savedMed;
    }
  } catch (_e) {}

  const newMed = {
    ...medData,
    id: medData.id || 'm-' + Date.now(),
    durationDays: medData.durationDays || 30,
    startDate: medData.startDate || new Date().toISOString().split('T')[0],
    endDate: medData.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: medData.status || 'Pending',
    isActive: true,
  };
  await syncLocalMedication(cleanId, newMed, isUpdate);
  return newMed;
}

async function syncLocalMedication(patientId, med, isUpdate) {
  const patients = await getCaregiverPatients();
  const updated = patients.map((p) => {
    if ((p.id || '').toUpperCase() === patientId) {
      const meds = p.medications || [];
      const newMeds = isUpdate
        ? meds.map((m) => (m.id === med.id ? { ...m, ...med } : m))
        : [...meds, med];
      return { ...p, medications: newMeds };
    }
    return p;
  });
  await saveCaregiverPatients(updated);
}

export async function assignMedicationToPatient(patientId, newMed) {
  return saveOrUpdatePatientMedication(patientId, newMed);
}

export async function deleteMedicationFromPatient(patientId, medId) {
  if (!patientId || !medId) return [];
  const cleanId = patientId.trim().toUpperCase();

  try {
    await fetch(`${getApiBaseUrl()}/medications/plan/${encodeURIComponent(cleanId)}/${encodeURIComponent(medId)}`, {
      method: 'DELETE',
    });
  } catch (_e) {}

  const patients = await getCaregiverPatients();
  const updated = patients.map((p) => {
    if ((p.id || '').toUpperCase() === cleanId) {
      return {
        ...p,
        medications: (p.medications || []).filter((m) => m.id !== medId),
      };
    }
    return p;
  });
  await saveCaregiverPatients(updated);
  return updated.find((p) => (p.id || '').toUpperCase() === cleanId);
}

export async function getMedicationsForDate(patientId, dateStr) {
  if (!patientId || !dateStr) return [];
  const cleanId = patientId.trim().toUpperCase();

  try {
    const res = await fetch(`${getApiBaseUrl()}/medications/date/${encodeURIComponent(cleanId)}/${encodeURIComponent(dateStr)}`);
    if (res.ok) {
      const dateMeds = await res.json();
      if (Array.isArray(dateMeds)) return dateMeds;
    }
  } catch (_e) {}

  const plan = await getPatientMedicationPlan(cleanId);
  return plan.filter((m) => {
    if (m.isActive === false) return false;
    if (m.skippedDates && Array.isArray(m.skippedDates) && m.skippedDates.includes(dateStr)) return false;
    if (m.isSingleDay || m.specificDate) {
      return (m.specificDate || m.startDate) === dateStr;
    }
    if (m.startDate && m.endDate) {
      return dateStr >= m.startDate && dateStr <= m.endDate;
    }
    return true;
  }).map((med) => {
    const dayStatus = (med.dayStatuses && med.dayStatuses[dateStr]) || med.status || 'Pending';
    const dayOverride = (med.dayOverrides && med.dayOverrides[dateStr]) || {};
    return {
      ...med,
      ...dayOverride,
      date: dateStr,
      status: dayStatus,
    };
  });
}

export async function updateMedicationDayStatus(patientId, medId, dateStr, status) {
  if (!patientId || !medId || !dateStr) return null;
  const cleanId = patientId.trim().toUpperCase();

  try {
    await fetch(`${getApiBaseUrl()}/medications/plan/${encodeURIComponent(cleanId)}/${encodeURIComponent(medId)}/day-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, status }),
    });
  } catch (_e) {}

  const patients = await getCaregiverPatients();
  let updatedMed = null;
  const updated = patients.map((p) => {
    if ((p.id || '').toUpperCase() === cleanId) {
      const meds = (p.medications || []).map((m) => {
        if (m.id === medId) {
          const dayStatuses = { ...(m.dayStatuses || {}), [dateStr]: status };
          updatedMed = { ...m, dayStatuses, status: dateStr === new Date().toISOString().split('T')[0] ? status : m.status };
          return updatedMed;
        }
        return m;
      });
      return { ...p, medications: meds };
    }
    return p;
  });
  await saveCaregiverPatients(updated);

  try {
    const { localBus } = require('./syncService');
    if (localBus && localBus.emit) {
      localBus.emit('internal_medication_day_status', {
        patientId: cleanId,
        medicationId: medId,
        date: dateStr,
        status,
      });
    }
  } catch (_e) {}

  return updatedMed;
}

export async function updateMedicationDayOverride(patientId, medId, dateStr, overrideData) {
  if (!patientId || !medId || !dateStr) return null;
  const cleanId = patientId.trim().toUpperCase();

  try {
    await fetch(`${getApiBaseUrl()}/medications/plan/${encodeURIComponent(cleanId)}/${encodeURIComponent(medId)}/day-override`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, overrideData }),
    });
  } catch (_e) {}

  const patients = await getCaregiverPatients();
  let updatedMed = null;
  const updated = patients.map((p) => {
    if ((p.id || '').toUpperCase() === cleanId) {
      const meds = (p.medications || []).map((m) => {
        if (m.id === medId) {
          const dayOverrides = { ...(m.dayOverrides || {}), [dateStr]: { ...((m.dayOverrides || {})[dateStr] || {}), ...overrideData } };
          updatedMed = { ...m, dayOverrides };
          return updatedMed;
        }
        return m;
      });
      return { ...p, medications: meds };
    }
    return p;
  });
  await saveCaregiverPatients(updated);
  return updatedMed;
}

export async function deleteMedicationForDate(patientId, medId, dateStr, onlyThisDay = false) {
  if (!patientId || !medId) return [];
  const cleanId = patientId.trim().toUpperCase();

  if (!onlyThisDay) {
    return deleteMedicationFromPatient(cleanId, medId);
  }

  const patients = await getCaregiverPatients();
  const updated = patients.map((p) => {
    if ((p.id || '').toUpperCase() === cleanId) {
      const meds = (p.medications || []).map((m) => {
        if (m.id === medId) {
          const skipped = Array.isArray(m.skippedDates) ? [...m.skippedDates] : [];
          if (!skipped.includes(dateStr)) skipped.push(dateStr);
          return { ...m, skippedDates: skipped };
        }
        return m;
      });
      return { ...p, medications: meds };
    }
    return p;
  });
  await saveCaregiverPatients(updated);

  try {
    await fetch(`${getApiBaseUrl()}/medications/plan/${encodeURIComponent(cleanId)}/${encodeURIComponent(medId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skippedDates: [dateStr] }),
    });
  } catch (_e) {}

  return updated.find((p) => (p.id || '').toUpperCase() === cleanId);
}

const PATIENT_ACTIVITIES_PREFIX = '@healthtrack_patient_activities_';

export async function getPatientActivities(patientId) {
  if (!patientId) return [];
  const cleanId = patientId.trim().toUpperCase();
  const cacheKey = `${PATIENT_ACTIVITIES_PREFIX}${cleanId}`;

  let localActs = [];
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) localActs = JSON.parse(raw);
  } catch (e) {}

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${getApiBaseUrl()}/patients/${cleanId}/activities`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const serverActs = await res.json();
      if (Array.isArray(serverActs)) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(serverActs));
        return serverActs;
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
  }

  // Also check if found in caregiver's stored patient list
  if (localActs.length === 0) {
    try {
      const patients = await getCaregiverPatients();
      const match = patients.find(p => p.id === cleanId);
      if (match && match.activities && match.activities.length > 0) {
        localActs = match.activities;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(localActs));
      }
    } catch (_e) {}
  }

  return localActs;
}

export async function savePatientActivities(patientId, activities) {
  if (!patientId) return;
  const cleanId = patientId.trim().toUpperCase();
  try {
    await AsyncStorage.setItem(`${PATIENT_ACTIVITIES_PREFIX}${cleanId}`, JSON.stringify(activities));
  } catch (e) {
    console.error('Failed to save patient activities:', e);
  }
}

export async function assignActivityToPatient(patientId, newActivity, caregiverName = 'Caregiver') {
  const cleanId = (patientId || '').trim().toUpperCase();
  let createdActivity = {
    ...newActivity,
    id: newActivity.id || ('act-' + Date.now()),
    completed: false,
    caregiverName,
    createdAt: Date.now(),
  };

  // Try saving to backend
  try {
    const res = await fetch(`${getApiBaseUrl()}/patients/${cleanId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...createdActivity,
        caregiverName,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        createdActivity = data;
      }
    }
  } catch (err) {
    console.warn('Backend activity post failed, caching locally:', err);
  }

  // Update caregiver's local list
  const patients = await getCaregiverPatients();
  const updated = patients.map((p) => {
    if (p.id === cleanId) {
      const acts = deduplicateActivities(p.activities || []);
      const existingIdx = acts.findIndex((a) => a.id === createdActivity.id);
      const nextActs = existingIdx >= 0
        ? acts.map((a) => (a.id === createdActivity.id ? createdActivity : a))
        : [...acts, createdActivity];
      return {
        ...p,
        activities: deduplicateActivities(nextActs),
      };
    }
    return p;
  });
  await saveCaregiverPatients(updated);

  // Update local activities cache for the patient
  try {
    const existing = await getPatientActivities(cleanId);
    const existingDeduplicated = existing.filter((a) => a.id !== createdActivity.id);
    await savePatientActivities(cleanId, [...existingDeduplicated, createdActivity]);
  } catch (_e) {}

  // Broadcast in real-time
  try {
    syncService.sendNewActivity(cleanId, createdActivity, caregiverName);
  } catch (e) {
    console.error('Failed to broadcast new_activity:', e);
  }

  return updated.find((p) => p.id === cleanId);
}

export async function deleteActivityFromPatient(patientId, actId) {
  const cleanId = (patientId || '').trim().toUpperCase();

  // Call backend
  try {
    fetch(`${getApiBaseUrl()}/patients/${cleanId}/activities/${actId}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch (_e) {}

  // Update caregiver list
  const patients = await getCaregiverPatients();
  const updated = patients.map((p) => {
    if (p.id === cleanId) {
      const acts = deduplicateActivities(p.activities || []);
      return {
        ...p,
        activities: acts.filter((a) => a.id !== actId),
      };
    }
    return p;
  });
  await saveCaregiverPatients(updated);

  // Update patient cache
  try {
    const existing = await getPatientActivities(cleanId);
    const filtered = existing.filter((a) => a.id !== actId);
    await savePatientActivities(cleanId, filtered);
  } catch (_e) {}

  // Broadcast in real-time
  try {
    syncService.sendDeleteActivity(cleanId, actId);
  } catch (e) {
    console.error('Failed to broadcast delete_activity:', e);
  }

  return updated.find((p) => p.id === cleanId);
}

export async function togglePatientActivity(patientId, actId, completed) {
  const cleanId = (patientId || '').trim().toUpperCase();
  let updatedActivity = null;

  // Call backend
  try {
    const res = await fetch(`${getApiBaseUrl()}/patients/${cleanId}/activities/${actId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) {
      updatedActivity = await res.json();
    }
  } catch (_e) {}

  // Update local patient activities cache
  try {
    const current = await getPatientActivities(cleanId);
    const next = current.map(a => (a.id === actId ? { ...a, completed } : a));
    await savePatientActivities(cleanId, next);
  } catch (_e) {}

  // Update caregiver storage if patient exists there
  try {
    const patients = await getCaregiverPatients();
    const updated = patients.map((p) => {
      if (p.id === cleanId) {
        const acts = deduplicateActivities(p.activities || []);
        return {
          ...p,
          activities: acts.map((a) =>
            a.id === actId ? { ...a, completed } : a
          ),
        };
      }
      return p;
    });
    await saveCaregiverPatients(updated);
  } catch (_e) {}

  // Broadcast in real-time
  try {
    syncService.sendActivityStatusUpdate(cleanId, actId, completed, updatedActivity);
  } catch (e) {
    console.error('Failed to broadcast activity_status_update:', e);
  }

  return updatedActivity;
}

export async function getEmergencyAlerts() {
  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_ALERTS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(EMERGENCY_ALERTS_KEY, JSON.stringify(INITIAL_ALERTS));
      return INITIAL_ALERTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_ALERTS;
  }
}

export async function addEmergencyAlert(alertObj) {
  try {
    const alerts = await getEmergencyAlerts();
    const newAlert = {
      id: 'alt-' + Date.now(),
      ...alertObj,
      timestamp: Date.now(),
      isRead: false,
    };
    alerts.unshift(newAlert);
    await AsyncStorage.setItem(EMERGENCY_ALERTS_KEY, JSON.stringify(alerts));
    return alerts;
  } catch (e) {
    return [];
  }
}

export async function markAlertsAsRead() {
  try {
    const alerts = await getEmergencyAlerts();
    const updated = alerts.map((a) => ({ ...a, isRead: true }));
    await AsyncStorage.setItem(EMERGENCY_ALERTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

export async function getAiAssessment(patientId) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/patients/${patientId}/ai-assessment`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch AI assessment:', error);
    return null;
  }
}

