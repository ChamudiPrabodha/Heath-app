// src/services/vitalsService.js - Patient Vitals Tracking & History Service
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncService, localBus, getDefaultServerUrl } from './syncService';

const VITALS_STORAGE_PREFIX = '@healthtrack_patient_vitals_history_';
const LATEST_VITALS_PREFIX = '@healthtrack_latest_vitals_';

// Initial realistic baseline vitals history for new patients
const getInitialVitalsHistory = (patientId) => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  return [
    {
      id: 'vit-1',
      patientId,
      hr: 72,
      bp: '120/80',
      spo2: 98,
      temp: '36.6',
      glucose: 98,
      notes: 'Morning routine resting vitals check. Patient was calm and hydrated.',
      recordedBy: 'Sarah Vance (Caregiver)',
      status: 'Normal',
      statusColor: '#10B981',
      timestamp: now - 2 * oneHour,
    },
    {
      id: 'vit-2',
      patientId,
      hr: 78,
      bp: '124/82',
      spo2: 97,
      temp: '36.8',
      glucose: 104,
      notes: 'Post-lunch vitals monitoring. Blood pressure stable after short walk.',
      recordedBy: 'Sarah Vance (Caregiver)',
      status: 'Normal',
      statusColor: '#10B981',
      timestamp: now - oneDay + 4 * oneHour,
    },
    {
      id: 'vit-3',
      patientId,
      hr: 82,
      bp: '135/88',
      spo2: 96,
      temp: '37.1',
      glucose: 112,
      notes: 'Slightly elevated systolic blood pressure after afternoon confusion episode.',
      recordedBy: 'Sarah Vance (Caregiver)',
      status: 'Elevated BP',
      statusColor: '#F59E0B',
      timestamp: now - 2 * oneDay,
    }
  ];
};

export function analyzeVitalsStatus({ hr, bp, spo2, temp, glucose }) {
  const issues = [];
  let isAbnormal = false;
  let isElevated = false;

  const hrNum = Number(hr);
  if (hrNum) {
    if (hrNum > 100) {
      issues.push('High HR');
      isAbnormal = true;
    } else if (hrNum < 55) {
      issues.push('Low HR');
      isElevated = true;
    }
  }

  const spo2Num = Number(spo2);
  if (spo2Num) {
    if (spo2Num < 92) {
      issues.push('Critical SpO2');
      isAbnormal = true;
    } else if (spo2Num < 95) {
      issues.push('Low SpO2');
      isElevated = true;
    }
  }

  if (bp && typeof bp === 'string' && bp.includes('/')) {
    const [sys, dia] = bp.split('/').map(n => Number(n.trim()));
    if (sys >= 140 || dia >= 90) {
      issues.push('High BP');
      isAbnormal = true;
    } else if (sys >= 130 || dia >= 85) {
      issues.push('Elevated BP');
      isElevated = true;
    }
  }

  const tempNum = Number(temp);
  if (tempNum) {
    if (tempNum >= 38.0) {
      issues.push('Fever');
      isAbnormal = true;
    } else if (tempNum >= 37.5) {
      issues.push('Mild Temp');
      isElevated = true;
    }
  }

  const glucNum = Number(glucose);
  if (glucNum) {
    if (glucNum > 180) {
      issues.push('High Glucose');
      isAbnormal = true;
    } else if (glucNum < 70) {
      issues.push('Low Glucose');
      isAbnormal = true;
    }
  }

  if (isAbnormal) {
    return { status: issues.join(' • ') || 'Abnormal', statusColor: '#EF4444' };
  }
  if (isElevated) {
    return { status: issues.join(' • ') || 'Elevated', statusColor: '#F59E0B' };
  }
  return { status: 'Normal', statusColor: '#10B981' };
}

export async function getPatientVitalsHistory(patientId = 'CARE-1001') {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  const storageKey = `${VITALS_STORAGE_PREFIX}${cleanId}`;

  let localHistory = [];
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      localHistory = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[vitalsService] Local storage read error:', err);
  }

  if (!localHistory || localHistory.length === 0) {
    localHistory = getInitialVitalsHistory(cleanId);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(localHistory));
      if (localHistory[0]) {
        await AsyncStorage.setItem(`${LATEST_VITALS_PREFIX}${cleanId}`, JSON.stringify(localHistory[0]));
      }
    } catch (_e) {}
  }

  // Attempt backend sync in background
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const serverUrl = getDefaultServerUrl();
    const res = await fetch(`${serverUrl}/api/vitals/history/${encodeURIComponent(cleanId)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const backendHistory = await res.json();
      if (Array.isArray(backendHistory) && backendHistory.length > 0) {
        // Merge without losing local new entries
        const map = new Map();
        localHistory.forEach(v => map.set(v.id, v));
        backendHistory.forEach(bv => map.set(bv.id, { ...(map.get(bv.id) || {}), ...bv }));
        const merged = Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
        if (merged[0]) {
          await AsyncStorage.setItem(`${LATEST_VITALS_PREFIX}${cleanId}`, JSON.stringify(merged[0]));
        }
        return merged;
      }
    }
  } catch (_e) {
    // Offline or backend unavailable
  }

  return localHistory;
}

export async function getLatestPatientVitals(patientId = 'CARE-1001') {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  try {
    const raw = await AsyncStorage.getItem(`${LATEST_VITALS_PREFIX}${cleanId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_e) {}

  const history = await getPatientVitalsHistory(cleanId);
  return history[0] || null;
}

export async function recordPatientVitals(patientId = 'CARE-1001', rawVitals, caregiverName = 'Caregiver') {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  const storageKey = `${VITALS_STORAGE_PREFIX}${cleanId}`;
  const history = await getPatientVitalsHistory(cleanId);

  const { status, statusColor } = analyzeVitalsStatus(rawVitals);

  const newRecord = {
    id: 'vit-' + Date.now(),
    patientId: cleanId,
    hr: rawVitals.hr ? Number(rawVitals.hr) : null,
    bp: rawVitals.bp ? String(rawVitals.bp).trim() : null,
    spo2: rawVitals.spo2 ? Number(rawVitals.spo2) : null,
    temp: rawVitals.temp ? String(rawVitals.temp).trim() : null,
    glucose: rawVitals.glucose ? Number(rawVitals.glucose) : null,
    notes: (rawVitals.notes || '').trim(),
    recordedBy: caregiverName,
    status,
    statusColor,
    timestamp: Date.now(),
  };

  const updatedHistory = [newRecord, ...history];
  
  // 1. Save to local storage
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistory));
    await AsyncStorage.setItem(`${LATEST_VITALS_PREFIX}${cleanId}`, JSON.stringify(newRecord));
  } catch (err) {
    console.error('[vitalsService] Save local error:', err);
  }

  // 2. Real-time broadcast to Patient and Doctor apps
  syncService.sendVitalsUpdate(cleanId, newRecord);

  // 3. Post to backend persistent storage
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const serverUrl = getDefaultServerUrl();
    fetch(`${serverUrl}/api/vitals/record/${encodeURIComponent(cleanId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeoutId))
      .catch((e) => {
        clearTimeout(timeoutId);
        console.warn('[vitalsService] Backend record vitals notice:', e.message);
      });
  } catch (_e) {}

  return { newRecord, updatedHistory };
}

export async function deleteVitalsRecord(patientId = 'CARE-1001', recordId) {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  const storageKey = `${VITALS_STORAGE_PREFIX}${cleanId}`;
  const history = await getPatientVitalsHistory(cleanId);
  const updatedHistory = history.filter(v => v.id !== recordId);

  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistory));
    if (updatedHistory[0]) {
      await AsyncStorage.setItem(`${LATEST_VITALS_PREFIX}${cleanId}`, JSON.stringify(updatedHistory[0]));
    }
  } catch (err) {
    console.error('[vitalsService] Delete local error:', err);
  }

  // Sync to backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const serverUrl = getDefaultServerUrl();
    fetch(`${serverUrl}/api/vitals/history/${encodeURIComponent(cleanId)}/${encodeURIComponent(recordId)}`, {
      method: 'DELETE',
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeoutId))
      .catch((e) => {
        clearTimeout(timeoutId);
        console.warn('[vitalsService] Backend delete notice:', e.message);
      });
  } catch (_e) {}

  return updatedHistory;
}
