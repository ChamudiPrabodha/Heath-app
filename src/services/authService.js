// src/services/authService.js - User Authentication & Session Service
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:4000/api`;
  }
  try {
    const Constants = require('expo-constants').default;
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:4000/api`;
    }
  } catch (_e) {}

  if (Platform.OS === 'android') return 'http://10.0.2.2:4000/api';
  return 'http://172.18.150.21:4000/api';
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 2500) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
};

const USERS_STORAGE_KEY = '@healthtrack_users_db_v1';
const CURRENT_USER_KEY = '@healthtrack_current_user_v1';

// Seed default demo accounts
const DEFAULT_USERS = [
  {
    id: 'pat-001',
    role: 'patient',
    name: 'Eleanor Vance',
    email: 'patient@healthtrack.com',
    password: 'patient123',
    phone: '+1 555-0192',
    emergencyContact: 'Sarah Vance (+1 555-0144)',
    pairingCode: 'CARE-1001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cg-001',
    role: 'caregiver',
    name: 'Sarah Vance',
    email: 'caregiver@healthtrack.com',
    password: 'caregiver123',
    phone: '+1 555-0144',
    relationship: 'Daughter / Primary Caregiver',
    patientPairingCode: 'CARE-1001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'doc-001',
    role: 'doctor',
    name: 'Dr. John Smith',
    email: 'doctor@healthtrack.com',
    password: 'doctor123',
    phone: '+1 555-0199',
    hospital: 'General Hospital',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-001',
    role: 'admin',
    name: 'Super Admin',
    email: 'admin@healthtrack.com',
    password: 'admin123',
    createdAt: new Date().toISOString(),
  }
];

export async function getUsers() {
  try {
    const data = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    let users = data ? JSON.parse(data) : [];
    if (!Array.isArray(users)) users = [];

    // Ensure all DEFAULT_USERS exist in the user list
    let updated = false;
    for (const defUser of DEFAULT_USERS) {
      const existing = users.find(u => u.email.toLowerCase() === defUser.email.toLowerCase());
      if (!existing) {
        users.push(defUser);
        updated = true;
      } else if (existing.password !== defUser.password) {
        existing.password = defUser.password;
        updated = true;
      }
    }
    if (updated || !data) {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    return users;
  } catch (_e) {
    return DEFAULT_USERS;
  }
}

export async function saveUsers(users) {
  try {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users:', e);
  }
}

export async function getCurrentUser() {
  try {
    const userStr = await AsyncStorage.getItem(CURRENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (_e) {
    return null;
  }
}

export async function setCurrentUser(user) {
  try {
    if (user) {
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error('Failed to set current user:', e);
  }
}

export async function loginAsRole(role) {
  const users = await getUsers();
  const user = users.find((u) => u.role === role);
  if (!user) throw new Error(`No default user found for role: ${role}`);
  await setCurrentUser(user);
  return user;
}

export async function loginUnified(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    throw new Error('Please enter both email and password.');
  }

  // 1. Instant local credential check (0ms delay, fully offline-capable)
  const localUsers = await getUsers();
  const localUser = localUsers.find(
    (u) => (u.email && u.email.toLowerCase() === cleanEmail) ||
           (u.pairingCode && u.pairingCode.toLowerCase() === cleanEmail) ||
           (u.patientPairingCode && u.patientPairingCode.toLowerCase() === cleanEmail)
  );

  if (localUser && localUser.password === cleanPass) {
    await setCurrentUser(localUser);
    // Background sync to backend without blocking user
    fetchWithTimeout(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass })
    }, 2000).catch(() => {});
    return localUser;
  }

  // If local user exists and password is explicitly wrong
  if (localUser && localUser.password && localUser.password !== cleanPass) {
    throw new Error('Incorrect password. Please verify and try again.');
  }

  // 2. Query backend with a strict 2.5s timeout (prevents infinite loading spinner)
  let backendUser = null;
  let backendError = null;

  try {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass })
    }, 2500);

    if (res.ok) {
      backendUser = await res.json();
    } else {
      const errData = await res.json().catch(() => ({}));
      backendError = errData.error;
    }
  } catch (e) {
    console.log('Backend login unreachable or timed out:', e.message);
  }

  // 3. If backend login succeeded
  if (backendUser) {
    const users = await getUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...backendUser };
    } else {
      users.push(backendUser);
    }
    await saveUsers(users);
    await setCurrentUser(backendUser);
    return backendUser;
  }

  // 4. If backend returned explicit password failure
  if (backendError && backendError.toLowerCase().includes('password')) {
    throw new Error(backendError);
  }

  if (backendError) {
    throw new Error(backendError);
  }

  throw new Error('No account found with this email address. Please register or check your credentials.');
}

export async function loginPatient(email, password) {
  return loginUnified(email, password);
}

export async function signUpPatient({
  name,
  email,
  password,
  phone = '',
  emergencyContact = '',
  pairingCode = 'CARE-1001',
}) {
  const cleanEmail = email.trim().toLowerCase();

  // Try backend registration
  try {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: 'patient',
        phone: phone.trim(),
        emergencyContact: emergencyContact.trim(),
        pairingCode: pairingCode.trim().toUpperCase() || 'CARE-1001',
      })
    }, 2500);
    if (res.ok) {
      const user = await res.json();
      const users = await getUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      if (idx >= 0) users[idx] = user;
      else users.push(user);
      await saveUsers(users);
      await setCurrentUser(user);
      return user;
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) throw new Error(errData.error);
    }
  } catch(err) {
    if (err.message && err.message.includes('already exists')) throw err;
    console.log('Backend register unreachable, using local store:', err.message);
  }

  const users = await getUsers();
  const existing = users.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    throw new Error(`An account with this email address already exists as a ${existing.role}. Please sign in instead.`);
  }

  const newPatient = {
    id: 'pat-' + Date.now(),
    role: 'patient',
    name: name.trim(),
    email: cleanEmail,
    password,
    phone: phone.trim(),
    emergencyContact: emergencyContact.trim(),
    pairingCode: pairingCode.trim().toUpperCase() || 'CARE-1001',
    createdAt: new Date().toISOString(),
  };

  users.push(newPatient);
  await saveUsers(users);
  await setCurrentUser(newPatient);
  return newPatient;
}

export async function loginCaregiver(email, password) {
  return loginUnified(email, password);
}

export async function signUpCaregiver({
  name,
  email,
  password,
  phone = '',
  relationship = 'Primary Caregiver',
  patientPairingCode = 'CARE-1001',
}) {
  const cleanEmail = email.trim().toLowerCase();

  // Try backend registration
  try {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: 'caregiver',
        phone: phone.trim(),
        relationship: relationship.trim(),
        patientPairingCode: patientPairingCode.trim().toUpperCase() || 'CARE-1001',
      })
    }, 2500);
    if (res.ok) {
      const user = await res.json();
      const users = await getUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      if (idx >= 0) users[idx] = user;
      else users.push(user);
      await saveUsers(users);
      await setCurrentUser(user);
      return user;
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) throw new Error(errData.error);
    }
  } catch(err) {
    if (err.message && err.message.includes('already exists')) throw err;
    console.log('Backend register unreachable, using local store:', err.message);
  }

  const users = await getUsers();
  const existing = users.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    throw new Error(`An account with this email address already exists as a ${existing.role}. Please sign in instead.`);
  }

  const newCaregiver = {
    id: 'cg-' + Date.now(),
    role: 'caregiver',
    name: name.trim(),
    email: cleanEmail,
    password,
    phone: phone.trim(),
    relationship: relationship.trim(),
    patientPairingCode: patientPairingCode.trim().toUpperCase() || 'CARE-1001',
    createdAt: new Date().toISOString(),
  };

  users.push(newCaregiver);
  await saveUsers(users);
  await setCurrentUser(newCaregiver);
  return newCaregiver;
}

export async function loginDoctor(email, password) {
  return loginUnified(email, password);
}

export async function signUpDoctor({
  name,
  email,
  password,
  phone = '',
  hospital = '',
}) {
  const cleanEmail = email.trim().toLowerCase();

  // Try backend registration
  try {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: 'doctor',
        phone: phone.trim(),
        hospital: hospital.trim(),
      })
    }, 2500);
    if (res.ok) {
      const user = await res.json();
      const users = await getUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      if (idx >= 0) users[idx] = user;
      else users.push(user);
      await saveUsers(users);
      await setCurrentUser(user);
      return user;
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) throw new Error(errData.error);
    }
  } catch(err) {
    if (err.message && err.message.includes('already exists')) throw err;
    console.log('Backend register unreachable, using local store:', err.message);
  }

  const users = await getUsers();
  const existing = users.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    throw new Error(`An account with this email address already exists as a ${existing.role}. Please sign in instead.`);
  }

  const newDoctor = {
    id: 'doc-' + Date.now(),
    role: 'doctor',
    name: name.trim(),
    email: cleanEmail,
    password,
    phone: phone.trim(),
    hospital: hospital.trim(),
    createdAt: new Date().toISOString(),
  };

  users.push(newDoctor);
  await saveUsers(users);
  await setCurrentUser(newDoctor);
  return newDoctor;
}

export async function signUpAdmin({
  name = 'Admin',
  email,
  password,
}) {
  const cleanEmail = email.trim().toLowerCase();

  // Try backend registration
  try {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: 'admin',
      })
    }, 2500);
    if (res.ok) {
      const user = await res.json();
      const users = await getUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      if (idx >= 0) users[idx] = user;
      else users.push(user);
      await saveUsers(users);
      await setCurrentUser(user);
      return user;
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) throw new Error(errData.error);
    }
  } catch(err) {
    if (err.message && err.message.includes('already exists')) throw err;
    console.log('Backend register unreachable, using local store:', err.message);
  }

  const users = await getUsers();
  const existing = users.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    throw new Error(`An account with this email address already exists as a ${existing.role}. Please sign in instead.`);
  }

  const newAdmin = {
    id: 'admin-' + Date.now(),
    role: 'admin',
    name: name.trim(),
    email: cleanEmail,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(newAdmin);
  await saveUsers(users);
  await setCurrentUser(newAdmin);
  return newAdmin;
}

export async function logoutUser() {
  await setCurrentUser(null);
}
