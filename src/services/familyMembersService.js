// src/services/familyMembersService.js - Permanent Family Members Memory & Contact Service
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultServerUrl } from './syncService';

const FAMILY_MEMBERS_PREFIX = '@healthtrack_family_members_';

export const RELATIONSHIP_PRESETS = [
  { label: 'Daughter', icon: 'heart', color: '#EC4899', emoji: '❤️' },
  { label: 'Son', icon: 'male', color: '#3B82F6', emoji: '💙' },
  { label: 'Spouse / Partner', icon: 'ring', color: '#8B5CF6', emoji: '💍' },
  { label: 'Granddaughter', icon: 'female', color: '#F43F5E', emoji: '🌸' },
  { label: 'Grandson', icon: 'child', color: '#06B6D4', emoji: '⭐' },
  { label: 'Sister', icon: 'female', color: '#10B981', emoji: '🌷' },
  { label: 'Brother', icon: 'male', color: '#6366F1', emoji: '🍀' },
  { label: 'Mother', icon: 'female', color: '#E11D48', emoji: '🌹' },
  { label: 'Father', icon: 'male', color: '#0284C7', emoji: '🌟' },
  { label: 'Primary Caregiver', icon: 'user-shield', color: '#059669', emoji: '🛡️' },
  { label: 'Best Friend', icon: 'smile', color: '#F59E0B', emoji: '☀️' },
];

export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', // Daughter / Young woman
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80', // Son / Young man
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', // Woman / Wife
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', // Man / Husband
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', // Granddaughter
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80', // Grandson
];

const DEFAULT_FAMILY_MEMBERS = [
  {
    id: 'fam-1',
    name: 'Emily Vance',
    relationship: 'Daughter',
    emoji: '❤️',
    birthday: '1995-10-14',
    phone: '+1 (555) 234-5678',
    whatsapp: '+1 (555) 234-5678',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    memoryNotes: 'Your beloved daughter. She visits every Sunday afternoon with tea and your favorite chocolate cookies.',
    favoriteMemory: 'Took you to the botanic gardens last spring.',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'fam-2',
    name: 'Michael Vance',
    relationship: 'Son',
    emoji: '💙',
    birthday: '1998-04-22',
    phone: '+1 (555) 876-5432',
    whatsapp: '+1 (555) 876-5432',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    memoryNotes: 'Your eldest son. He is a software engineer and calls you every evening after work at 6:00 PM.',
    favoriteMemory: 'You taught him how to fish at Lake George when he was 10.',
    createdAt: Date.now() - 86400000 * 25,
  },
  {
    id: 'fam-3',
    name: 'Sarah Vance',
    relationship: 'Spouse / Partner',
    emoji: '💍',
    birthday: '1968-12-05',
    phone: '+1 (555) 901-2345',
    whatsapp: '+1 (555) 901-2345',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    memoryNotes: 'Your loving spouse who stays by your side, manages your daily care, and holds your hand every day.',
    favoriteMemory: 'Married for over 35 wonderful years in autumn.',
    createdAt: Date.now() - 86400000 * 20,
  }
];

export function calculateAge(birthdayStr) {
  if (!birthdayStr) return null;
  try {
    const dob = new Date(birthdayStr);
    if (isNaN(dob.getTime())) return null;
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch (_e) {
    return null;
  }
}

export function formatBirthdayDisplay(birthdayStr) {
  if (!birthdayStr) return 'Not set';
  try {
    const parts = birthdayStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dob = new Date(year, month, day);
      if (!isNaN(dob.getTime())) {
        return dob.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
    const d = new Date(birthdayStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    }
  } catch (_e) {}
  return birthdayStr;
}

export function getBirthdayCountdown(birthdayStr) {
  if (!birthdayStr) return null;
  try {
    const parts = birthdayStr.split('-');
    if (parts.length < 2) return null;
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2] || parts[0], 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    let nextBday = new Date(currentYear, month, day);
    
    // If passed this year, look at next year
    if (nextBday.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
      nextBday = new Date(currentYear + 1, month, day);
    }
    const oneDay = 24 * 60 * 60 * 1000;
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const daysLeft = Math.round((nextBday.getTime() - todayMidnight) / oneDay);
    
    if (daysLeft === 0) return '🎉 Today is their Birthday!';
    if (daysLeft === 1) return '🎂 Tomorrow is their Birthday!';
    if (daysLeft <= 30) return `🎂 Birthday in ${daysLeft} days`;
    return null;
  } catch (_e) {
    return null;
  }
}

export async function getFamilyMembers(patientId = 'CARE-1001') {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  const storageKey = `${FAMILY_MEMBERS_PREFIX}${cleanId}`;

  let localData = [];
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[familyMembersService] Failed reading local storage:', e);
  }

  // If local storage is empty, initialize with default seed members
  if (!localData || localData.length === 0) {
    localData = DEFAULT_FAMILY_MEMBERS;
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(localData));
    } catch (_e) {}
  }

  // Attempt backend sync in background
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const serverUrl = getDefaultServerUrl();
    const res = await fetch(`${serverUrl}/api/family-members/${encodeURIComponent(cleanId)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const backendMembers = await res.json();
      if (Array.isArray(backendMembers) && backendMembers.length > 0) {
        // Merge without losing local new entries
        const map = new Map();
        localData.forEach(m => map.set(m.id, m));
        backendMembers.forEach(bm => map.set(bm.id, { ...(map.get(bm.id) || {}), ...bm }));
        const merged = Array.from(map.values());
        await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (_err) {
    // Backend offline / network error - local data is safely returned
  }

  return localData;
}

export async function saveFamilyMembers(patientId, members) {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  const storageKey = `${FAMILY_MEMBERS_PREFIX}${cleanId}`;
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(members));
  } catch (e) {
    console.error('[familyMembersService] Failed saving local:', e);
  }
}

export async function addFamilyMember(patientId = 'CARE-1001', newMemberData) {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  const members = await getFamilyMembers(cleanId);

  const matchedPreset = RELATIONSHIP_PRESETS.find(
    p => p.label.toLowerCase() === (newMemberData.relationship || '').toLowerCase()
  );

  const newMember = {
    id: 'fam-' + Date.now(),
    name: (newMemberData.name || '').trim(),
    relationship: (newMemberData.relationship || 'Loved One').trim(),
    emoji: matchedPreset ? matchedPreset.emoji : '❤️',
    birthday: newMemberData.birthday ? newMemberData.birthday.trim() : '',
    phone: (newMemberData.phone || '').trim(),
    whatsapp: (newMemberData.whatsapp || newMemberData.phone || '').trim(),
    photo: newMemberData.photo || AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
    memoryNotes: (newMemberData.memoryNotes || '').trim(),
    favoriteMemory: (newMemberData.favoriteMemory || '').trim(),
    createdAt: Date.now(),
  };

  const updated = [newMember, ...members];
  await saveFamilyMembers(cleanId, updated);

  // Sync to backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const serverUrl = getDefaultServerUrl();
    fetch(`${serverUrl}/api/family-members/${encodeURIComponent(cleanId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMember),
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeoutId))
      .catch((e) => {
        clearTimeout(timeoutId);
        console.warn('[familyMembersService] Backend sync notice:', e.message);
      });
  } catch (_e) {}

  return updated;
}

export async function updateFamilyMember(patientId = 'CARE-1001', memberId, updatedData) {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  const members = await getFamilyMembers(cleanId);

  const updated = members.map(m => {
    if (m.id === memberId) {
      return {
        ...m,
        ...updatedData,
        updatedAt: Date.now(),
      };
    }
    return m;
  });

  await saveFamilyMembers(cleanId, updated);

  // Sync to backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const serverUrl = getDefaultServerUrl();
    fetch(`${serverUrl}/api/family-members/${encodeURIComponent(cleanId)}/${encodeURIComponent(memberId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeoutId))
      .catch((e) => {
        clearTimeout(timeoutId);
        console.warn('[familyMembersService] Backend update notice:', e.message);
      });
  } catch (_e) {}

  return updated;
}

export async function deleteFamilyMember(patientId = 'CARE-1001', memberId) {
  const cleanId = (patientId || 'CARE-1001').toUpperCase().trim();
  const members = await getFamilyMembers(cleanId);
  const updated = members.filter(m => m.id !== memberId);
  await saveFamilyMembers(cleanId, updated);

  // Sync to backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const serverUrl = getDefaultServerUrl();
    fetch(`${serverUrl}/api/family-members/${encodeURIComponent(cleanId)}/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeoutId))
      .catch((e) => {
        clearTimeout(timeoutId);
        console.warn('[familyMembersService] Backend delete notice:', e.message);
      });
  } catch (_e) {}

  return updated;
}
