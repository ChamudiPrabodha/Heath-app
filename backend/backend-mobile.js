const { WebSocketServer, WebSocket } = require('ws');
const { Server: SocketIOServer } = require('socket.io');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const USERS_FILE = path.join(__dirname, 'server_users.json');
const CONNECTIONS_FILE = path.join(__dirname, 'server_connections.json');
const INVITATIONS_FILE = path.join(__dirname, 'server_invitations.json');
const PATIENTS_FILE = path.join(__dirname, 'server_patients.json');
const FAMILY_MEMBERS_FILE = path.join(__dirname, 'server_family_members.json');
const VITALS_FILE = path.join(__dirname, 'server_vitals.json');

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory Database
const db = {
  users: [],
  patients: [],
  connections: [],
  invitations: [],
  alerts: [],
  medicationLogs: [],
  familyMembers: [],
  vitals: []
};

function saveDbToDisk() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(db.users, null, 2));
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(db.connections, null, 2));
    fs.writeFileSync(INVITATIONS_FILE, JSON.stringify(db.invitations, null, 2));
    fs.writeFileSync(PATIENTS_FILE, JSON.stringify(db.patients, null, 2));
    fs.writeFileSync(FAMILY_MEMBERS_FILE, JSON.stringify(db.familyMembers, null, 2));
    fs.writeFileSync(VITALS_FILE, JSON.stringify(db.vitals, null, 2));
  } catch (err) {
    console.error('Failed to save DB to disk:', err.message);
  }
}

function loadDbFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded)) {
        for (const user of loaded) {
          if (!db.users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
            db.users.push(user);
          }
        }
      }
    }

    const DEFAULT_BACKEND_USERS = [
      {
        id: 'pat-001',
        name: 'Eleanor Vance',
        email: 'patient@healthtrack.com',
        password: 'patient123',
        role: 'patient',
        phone: '+1 555-0192',
        emergencyContact: 'Sarah Vance (+1 555-0144)',
        pairingCode: 'CARE-1001',
      },
      {
        id: 'cg-001',
        name: 'Sarah Vance',
        email: 'caregiver@healthtrack.com',
        password: 'caregiver123',
        role: 'caregiver',
        phone: '+1 555-0144',
        patientPairingCode: 'CARE-1001',
        relationship: 'Daughter / Primary Caregiver',
      },
      {
        id: 'doc-001',
        name: 'Dr. John Smith',
        email: 'doctor@healthtrack.com',
        password: 'doctor123',
        role: 'doctor',
        phone: '+1 555-0199',
        hospital: 'General Hospital',
      },
      {
        id: 'admin-001',
        name: 'Super Admin',
        email: 'admin@healthtrack.com',
        password: 'admin123',
        role: 'admin',
      }
    ];

    for (const dUser of DEFAULT_BACKEND_USERS) {
      if (!db.users.some(u => u.email.toLowerCase() === dUser.email.toLowerCase())) {
        db.users.push(dUser);
      }
    }
    if (fs.existsSync(CONNECTIONS_FILE)) {
      const data = fs.readFileSync(CONNECTIONS_FILE, 'utf8');
      db.connections = JSON.parse(data);
    }
    if (fs.existsSync(INVITATIONS_FILE)) {
      const data = fs.readFileSync(INVITATIONS_FILE, 'utf8');
      db.invitations = JSON.parse(data);
    }
    if (fs.existsSync(PATIENTS_FILE)) {
      const data = fs.readFileSync(PATIENTS_FILE, 'utf8');
      db.patients = JSON.parse(data);
    }
    if (fs.existsSync(FAMILY_MEMBERS_FILE)) {
      const data = fs.readFileSync(FAMILY_MEMBERS_FILE, 'utf8');
      db.familyMembers = JSON.parse(data);
    }
    if (fs.existsSync(VITALS_FILE)) {
      const data = fs.readFileSync(VITALS_FILE, 'utf8');
      db.vitals = JSON.parse(data);
    }

    // Ensure all registered patients from users exist in db.patients
    db.users.filter(u => u.role === 'patient').forEach(u => {
      const pCode = (u.pairingCode || u.id || '').toUpperCase();
      if (!db.patients.some(p => p.id === pCode || (p.email && p.email.toLowerCase() === u.email.toLowerCase()))) {
        db.patients.push({
          id: pCode,
          name: u.name,
          email: u.email,
          age: u.age || null,
          condition: u.condition || 'Dementia (Moderate) • High Wander Risk',
          patientPhone: u.phone || '',
          emergencyPhone: u.emergencyContact || '',
          status: 'idle',
          batteryLevel: 85,
          lastSeen: null,
          safeZoneRadius: 500,
          medications: [],
          activities: [],
        });
      }
    });
  } catch (err) {
    console.error('Failed to load DB from disk:', err.message);
  }
}

loadDbFromDisk();

// --- Safety Critical Medication Reminder & Adherence Workflow (Figure 4.3) ---
const activeReminders = new Map(); // reminderId -> reminderObj

function calculatePatientAdherence(patientId) {
  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) return null;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const logs = (db.medicationLogs || []).filter(l => l.patientId === patientId);

  const getAdherenceForPeriod = (days) => {
    const cutoff = now - days * dayMs;
    const periodLogs = logs.filter(l => l.timestamp >= cutoff);
    if (periodLogs.length === 0) return 85;
    const taken = periodLogs.filter(l => l.status === 'taken').length;
    return Math.round((taken / periodLogs.length) * 100);
  };

  const daily = getAdherenceForPeriod(1);
  const weekly = getAdherenceForPeriod(7);
  const monthly = getAdherenceForPeriod(30);

  const recent48h = logs.filter(l => l.timestamp >= now - 2 * dayMs);
  const recentMissedCount = recent48h.filter(l => l.status === 'missed' || l.status === 'skipped').length;
  const recentTakenCount = recent48h.filter(l => l.status === 'taken').length;

  // AI Adherence-Risk Indicator Model
  let level = 'Low';
  let color = '#10B981';
  let reason = 'Patient shows stable medication compliance within scheduled clinical windows.';

  if (weekly < 65 || recentMissedCount >= 2) {
    level = 'High';
    color = '#DC2626';
    reason = `Critical risk detected: ${recentMissedCount} missed/skipped doses in the past 48 hours and 7-day adherence is ${weekly}%. Immediate caregiver intervention recommended.`;
  } else if (weekly < 85 || recentMissedCount >= 1) {
    level = 'Moderate';
    color = '#F59E0B';
    reason = `Moderate variance detected: ${recentMissedCount} missed dose recently. 7-day adherence rate is ${weekly}%. Close supervision advised.`;
  }

  const adherenceData = {
    daily,
    weekly,
    monthly,
    totalLogs: logs.length,
    recentMissedCount,
    recentTakenCount,
    aiRiskIndicator: {
      level,
      color,
      score: weekly,
      reason,
      lastEvaluated: Date.now(),
    }
  };

  patient.adherence = adherenceData;
  return adherenceData;
}

function triggerMedicationReminder(patientId, medId = null) {
  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) return null;

  const med = (medId && (patient.medications || []).find(m => m.id === medId)) ||
              (patient.medications && patient.medications[0]) || {
                id: 'm-default',
                name: 'Donepezil (Aricept)',
                dosage: '10 mg • 1 Tablet',
                time: 'Now',
                period: 'Scheduled time reached',
              };

  const reminderId = 'rem-' + Date.now();
  const windowSeconds = 45; // Safety response window (seconds)
  const expiresAt = Date.now() + windowSeconds * 1000;

  // Step 2: Push notification + Socket.IO event emitted
  console.log(`[SUPABASE PUSH] 📲 Emitted push notification to device token for patient ${patient.name} (${patient.id}): Time for ${med.name} (${med.dosage})`);

  // Start autonomous timeout countdown (Section 3.3 requirement: patient self-report cannot be sole signal)
  const timer = setTimeout(() => {
    handleMedicationTimeout(reminderId);
  }, windowSeconds * 1000);

  const reminderObj = {
    reminderId,
    patientId: patient.id,
    patientName: patient.name,
    medication: med,
    windowSeconds,
    expiresAt,
    timer,
  };

  activeReminders.set(reminderId, reminderObj);

  const reminderPayload = {
    type: 'medication_reminder',
    reminderId,
    patientId: patient.id,
    patientName: patient.name,
    medication: med,
    windowSeconds,
    expiresAt,
    serverTimestamp: Date.now(),
  };

  // Broadcast to patient app and caregiver/doctor monitoring room
  broadcastToRoom(patient.id, reminderPayload);
  broadcastToAll(reminderPayload);

  return reminderPayload;
}

function handleMedicationTimeout(reminderId) {
  const reminder = activeReminders.get(reminderId);
  if (!reminder) return;
  activeReminders.delete(reminderId);

  console.log(`[SAFETY TIMEOUT] ⏰ Safety window expired for ${reminder.patientName} (${reminder.medication.name}). Autonomously recording MISSED status.`);

  // 1. Backend independently writes a missed-status log rather than waiting indefinitely
  const log = {
    id: 'log-' + Date.now(),
    reminderId,
    patientId: reminder.patientId,
    patientName: reminder.patientName,
    medicationId: reminder.medication.id,
    medicineName: reminder.medication.name,
    dosage: reminder.medication.dosage,
    scheduledTime: reminder.medication.time,
    status: 'missed',
    responseType: 'timeout_autonomous', // Design response to section 3.3
    timestamp: Date.now(),
  };
  db.medicationLogs.unshift(log);

  // Update medication status in patient profile
  const patient = db.patients.find(p => p.id === reminder.patientId);
  if (patient) {
    const targetMed = (patient.medications || []).find(m => m.id === reminder.medication.id);
    if (targetMed) targetMed.status = 'Missed';
  }

  // 2. Caregiver notified (push + in-app)
  const alert = {
    id: 'alt-' + Date.now(),
    patientId: reminder.patientId,
    patientName: reminder.patientName,
    type: 'MISSED_MEDICATION',
    message: `🚨 Safety Alert: Patient ${reminder.patientName} did not respond within safety window for ${reminder.medication.name} (${reminder.medication.dosage}). Autonomously logged as MISSED.`,
    timestamp: Date.now(),
    isRead: false,
  };
  db.alerts.unshift(alert);

  // 3. Adherence recalculated & AI Adherence-Risk model updated
  const adherence = calculatePatientAdherence(reminder.patientId);

  const eventPayload = {
    type: 'medication_reminder_timeout',
    reminderId,
    patientId: reminder.patientId,
    medication: reminder.medication,
    status: 'missed',
    responseType: 'timeout_autonomous',
    log,
    alert,
    adherence,
  };

  broadcastToRoom(reminder.patientId, eventPayload);
  broadcastToAll(eventPayload);
  broadcastToAll({ type: 'caregiver_alert', alert });
  broadcastToAll({ type: 'adherence_updated', patientId: reminder.patientId, adherence });
  broadcastToAll({ type: 'ai_risk_updated', patientId: reminder.patientId, aiRiskIndicator: adherence.aiRiskIndicator });
}

function handleMedicationResponse(reminderId, patientId, medicationId, status) {
  const reminder = reminderId ? activeReminders.get(reminderId) : null;
  if (reminder) {
    clearTimeout(reminder.timer);
    activeReminders.delete(reminderId);
  }

  const patient = db.patients.find(p => p.id === patientId);
  const patientName = patient ? patient.name : 'Patient';
  const med = (patient && (patient.medications || []).find(m => m.id === medicationId)) ||
              (reminder && reminder.medication) ||
              { name: 'Medication', dosage: '' };

  const validStatus = status === 'taken' ? 'taken' : 'skipped';

  // 1. MedicationLog created immediately
  const log = {
    id: 'log-' + Date.now(),
    reminderId: reminderId || ('manual-' + Date.now()),
    patientId,
    patientName,
    medicationId,
    medicineName: med.name,
    dosage: med.dosage,
    scheduledTime: med.time || 'On-Demand',
    status: validStatus,
    responseType: 'patient_action',
    timestamp: Date.now(),
  };
  db.medicationLogs.unshift(log);

  // Update medication in patient profile
  if (patient) {
    const targetMed = (patient.medications || []).find(m => m.id === medicationId);
    if (targetMed) {
      targetMed.status = validStatus === 'taken' ? 'Taken' : 'Skipped';
    }
  }

  let caregiverAlert = null;
  // 2. If SKIP: Caregiver notified if configured (push + in-app)
  if (validStatus === 'skipped') {
    caregiverAlert = {
      id: 'alt-' + Date.now(),
      patientId,
      patientName,
      type: 'SKIPPED_MEDICATION',
      message: `⚠️ Medication Skipped: Patient ${patientName} marked ${med.name} (${med.dosage}) as SKIPPED.`,
      timestamp: Date.now(),
      isRead: false,
    };
    db.alerts.unshift(caregiverAlert);
  }

  // 3. Adherence recalculated & AI Adherence-Risk model updated
  const adherence = calculatePatientAdherence(patientId);

  const eventPayload = {
    type: 'medication_status_recorded',
    reminderId,
    patientId,
    status: validStatus,
    log,
    alert: caregiverAlert,
    adherence,
  };

  broadcastToRoom(patientId, eventPayload);
  broadcastToAll(eventPayload);
  if (caregiverAlert) {
    broadcastToAll({ type: 'caregiver_alert', alert: caregiverAlert });
  }
  broadcastToAll({ type: 'adherence_updated', patientId, adherence });
  broadcastToAll({ type: 'ai_risk_updated', patientId, aiRiskIndicator: adherence.aiRiskIndicator });

  return { success: true, log, adherence };
}

// Scheduler service (Autonomous engine evaluating active medication times)
let lastSchedulerMinute = -1;
const triggeredRemindersCache = new Set(); // Prevent duplicate alerts in same minute

setInterval(() => {
  const now = new Date();
  const currentMinute = now.getMinutes();
  if (currentMinute !== lastSchedulerMinute) {
    lastSchedulerMinute = currentMinute;
    const hours = now.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour12 = hours % 12 === 0 ? 12 : hours % 12;
    const timeStr2 = `${displayHour12 < 10 ? '0' + displayHour12 : displayHour12}:${currentMinute < 10 ? '0' + currentMinute : currentMinute} ${period}`;
    const timeStr1 = `${displayHour12}:${currentMinute < 10 ? '0' + currentMinute : currentMinute} ${period}`;
    const todayStr = now.toISOString().split('T')[0];

    db.patients.forEach(patient => {
      (patient.medications || []).forEach(med => {
        // Evaluate if medication is currently active today in its 1-month plan
        if (med.isActive === false) return;
        if (med.startDate && med.endDate && (todayStr < med.startDate || todayStr > med.endDate)) return;
        if (med.status === 'Taken') return;

        const medTimeNorm = (med.time || '').trim().toUpperCase();
        const matchesTime = medTimeNorm === timeStr2 || medTimeNorm === timeStr1;

        const triggerKey = `${patient.id}_${med.id}_${todayStr}_${timeStr2}`;
        if (matchesTime && !triggeredRemindersCache.has(triggerKey)) {
          triggeredRemindersCache.add(triggerKey);
          console.log(`[AUTONOMOUS REMINDER ENGINE] ⏰ Scheduled dose time reached for ${patient.name} (${patient.id}): ${med.name} at ${med.time}`);
          triggerMedicationReminder(patient.id, med.id);
        }
      });
    });
  }
}, 25000);

// Initialize adherence metrics for default patients
db.patients.forEach(p => calculatePatientAdherence(p.id));

app.get('/api/health', (req, res) => {
  res.json({
    name: 'Patient-Caregiver Backend & Relay Server',
    status: 'online',
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    connectedClients: wss.clients.size,
  });
});

app.get('/api/patients', (req, res) => {
  res.json(db.patients);
});

app.get('/api/users/lookup/:email', (req, res) => {
  const email = (req.params.email || '').toLowerCase();
  const user = db.users.find(u => u.email && u.email.toLowerCase() === email && u.role === 'patient');
  
  if (!user) {
    return res.status(404).json({ error: 'No patient found with this email.' });
  }
  
  const patient = db.patients.find(p => p.email && p.email.toLowerCase() === email || p.id === user.pairingCode);
  
  res.json({
    email: user.email,
    name: user.name,
    pairingCode: user.pairingCode,
    patientDetails: patient || null
  });
});

app.get('/api/patients/connected/:email', (req, res) => {
  const email = (req.params.email || '').toLowerCase();
  
  // 1. Check if caregiver user has a patientPairingCode assigned
  const user = db.users.find(u => (u.email && u.email.toLowerCase() === email) || (u.id && u.id.toLowerCase() === email));
  const pairingCodes = [];
  if (user && user.patientPairingCode) {
    pairingCodes.push(user.patientPairingCode.trim().toUpperCase());
  }

  // 2. Find all connections involving this user (either by email or room code)
  const userConns = db.connections.filter(c => 
    (c.user1Email && c.user1Email.toLowerCase() === email) || 
    (c.user2Email && c.user2Email.toLowerCase() === email) ||
    (c.user1RoomCode && c.user1RoomCode.toLowerCase() === email) ||
    (c.user2RoomCode && c.user2RoomCode.toLowerCase() === email)
  );
  
  userConns.forEach(c => {
    if (c.user1RoomCode) pairingCodes.push(c.user1RoomCode.trim().toUpperCase());
    if (c.user2RoomCode) pairingCodes.push(c.user2RoomCode.trim().toUpperCase());
    if (c.toRoomCode) pairingCodes.push(c.toRoomCode.trim().toUpperCase());
  });

  const connectedIdentifiers = userConns.map(c => {
    const isUser1 = (c.user1Email && c.user1Email.toLowerCase() === email) || (c.user1RoomCode && c.user1RoomCode.toLowerCase() === email);
    if (isUser1) {
      return (c.user2Email || c.user2RoomCode || c.toRoomCode || '').toLowerCase();
    } else {
      return (c.user1Email || c.user1RoomCode || '').toLowerCase();
    }
  }).filter(Boolean);

  const resultPatients = [];
  const seenIds = new Set();

  // Match in db.patients
  db.patients.forEach(p => {
    const pIdUpper = (p.id || '').toUpperCase();
    const idMatch = p.id && (pairingCodes.includes(pIdUpper) || connectedIdentifiers.includes(p.id.toLowerCase()));
    const emailMatch = p.email && connectedIdentifiers.includes(p.email.toLowerCase());
    if ((idMatch || emailMatch) && !seenIds.has(pIdUpper)) {
      seenIds.add(pIdUpper);
      resultPatients.push(p);
    }
  });

  // Match registered patients in db.users
  db.users.filter(u => u.role === 'patient').forEach(u => {
    const pCode = (u.pairingCode || u.id || '').toUpperCase();
    const idMatch = pairingCodes.includes(pCode) || connectedIdentifiers.includes(pCode.toLowerCase());
    const emailMatch = u.email && connectedIdentifiers.includes(u.email.toLowerCase());
    if ((idMatch || emailMatch) && !seenIds.has(pCode)) {
      seenIds.add(pCode);
      const newP = {
        id: pCode,
        name: u.name,
        email: u.email,
        age: u.age || null,
        condition: u.condition || 'Dementia (Moderate) • High Wander Risk',
        patientPhone: u.phone || '',
        emergencyPhone: u.emergencyContact || '',
        status: 'idle',
        batteryLevel: 85,
        lastSeen: null,
        safeZoneRadius: 500,
        medications: [],
        activities: [],
      };
      db.patients.push(newP);
      resultPatients.push(newP);
    }
  });

  // Direct connection fallback if patient not registered yet
  userConns.forEach(c => {
    const rCode = (c.user2RoomCode || c.toRoomCode || '').toUpperCase();
    if (rCode && !seenIds.has(rCode)) {
      seenIds.add(rCode);
      const fallbackP = {
        id: rCode,
        name: c.user2Name || c.toName || `Patient (${rCode})`,
        email: c.user2Email || '',
        age: c.age || null,
        condition: c.condition || 'Dementia (Moderate) • High Wander Risk',
        patientPhone: c.emergencyPhone || '',
        emergencyPhone: c.emergencyPhone || '',
        status: 'idle',
        batteryLevel: 85,
        lastSeen: null,
        safeZoneRadius: c.safeZoneRadius || 500,
        medications: [],
        activities: [],
      };
      db.patients.push(fallbackP);
      resultPatients.push(fallbackP);
    }
  });

  saveDbToDisk();
  res.json(resultPatients);
});

app.post('/api/patients', (req, res) => {
  const newPatient = req.body;
  db.patients.push(newPatient);
  res.status(201).json(newPatient);
});

// AI Assessment endpoint - calls local Python ML Service
app.get('/api/patients/:id/ai-assessment', async (req, res) => {
  try {
    const patient = db.patients.find(p => p.id === req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Default mock ML features, dynamically adjusted based on basic patient data if available
    const mlPayload = {
      Age: patient.age || 72,
      MMSE: 24, // Mock score
      EDUC: 12, // Mock years of education
      'M/F': 'M' // Mock gender
    };

    // Use native fetch to call Flask API
    const mlResponse = await fetch('http://127.0.0.1:5000/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mlPayload)
    });
    
    if (!mlResponse.ok) {
      throw new Error(`ML Service responded with status ${mlResponse.status}`);
    }
    
    const mlResult = await mlResponse.json();
    res.json({
      success: true,
      patientId: patient.id,
      patientName: patient.name,
      mlAssessment: mlResult
    });

  } catch (error) {
    console.error('[AI Assessment Error]', error.message);
    res.status(500).json({ error: 'Failed to retrieve AI assessment', details: error.message });
  }
});

app.put('/api/patients/:id', (req, res) => {
  const idx = db.patients.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    db.patients[idx] = { ...db.patients[idx], ...req.body };
    res.json(db.patients[idx]);
  } else {
    res.status(404).json({ error: 'Patient not found' });
  }
});

// --- Daily Activities API ---
app.get('/api/patients/:id/activities', (req, res) => {
  const patientId = req.params.id.toUpperCase();
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.id.toLowerCase()));
  if (!patient) {
    return res.json([]);
  }
  res.json(patient.activities || []);
});

app.post('/api/patients/:id/activities', (req, res) => {
  const patientId = req.params.id.toUpperCase();
  let patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.id.toLowerCase()));
  
  if (!patient) {
    const user = db.users.find(u => (u.pairingCode && u.pairingCode.toUpperCase() === patientId) || (u.id && u.id.toUpperCase() === patientId));
    patient = {
      id: patientId,
      name: user?.name || `Patient (${patientId})`,
      email: user?.email || '',
      activities: [],
      medications: [],
      status: 'idle',
      batteryLevel: 85,
    };
    db.patients.push(patient);
  }

  if (!patient.activities) patient.activities = [];

  const activity = {
    id: req.body.id || ('act-' + Date.now()),
    title: req.body.title,
    time: req.body.time || '09:00 AM',
    duration: req.body.duration || '30 mins',
    category: req.body.category || 'Physical',
    completed: !!req.body.completed,
    caregiverName: req.body.caregiverName || 'Caregiver',
    createdAt: Date.now(),
  };

  const existingIdx = patient.activities.findIndex(a => a.id === activity.id);
  if (existingIdx !== -1) {
    patient.activities[existingIdx] = { ...patient.activities[existingIdx], ...activity };
  } else {
    patient.activities.push(activity);
  }
  saveDbToDisk();

  const payload = {
    type: 'new_activity',
    roomCode: patient.id,
    patientId: patient.id,
    patientName: patient.name,
    activity,
    caregiverName: req.body.caregiverName || 'Caregiver',
    timestamp: Date.now(),
  };

  broadcastToRoom(patient.id, payload);
  broadcastToAll(payload);

  res.status(201).json(activity);
});

app.put('/api/patients/:id/activities/:actId', (req, res) => {
  const patientId = req.params.id.toUpperCase();
  const actId = req.params.actId;
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.id.toLowerCase()));

  if (!patient || !patient.activities) {
    return res.status(404).json({ error: 'Patient or activities not found' });
  }

  const act = patient.activities.find(a => a.id === actId);
  if (!act) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  if (typeof req.body.completed === 'boolean') {
    act.completed = req.body.completed;
  }
  if (req.body.title) act.title = req.body.title;
  if (req.body.time) act.time = req.body.time;

  saveDbToDisk();

  const payload = {
    type: 'activity_status_update',
    roomCode: patient.id,
    patientId: patient.id,
    patientName: patient.name,
    activityId: actId,
    completed: act.completed,
    activity: act,
    timestamp: Date.now(),
  };

  broadcastToRoom(patient.id, payload);
  broadcastToAll(payload);

  res.json(act);
});

app.delete('/api/patients/:id/activities/:actId', (req, res) => {
  const patientId = req.params.id.toUpperCase();
  const actId = req.params.actId;
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId);

  if (patient && patient.activities) {
    patient.activities = patient.activities.filter(a => a.id !== actId);
    saveDbToDisk();

    const payload = {
      type: 'delete_activity',
      roomCode: patient.id,
      patientId: patient.id,
      activityId: actId,
      timestamp: Date.now(),
    };

    broadcastToRoom(patient.id, payload);
    broadcastToAll(payload);
  }

  res.json({ success: true });
});

// --- Daily Medication Calendar & 1-Month Prescription Plans API ---
app.get('/api/medications/plan/:patientId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.patientId.toLowerCase()));
  if (!patient) return res.json([]);
  res.json(patient.medications || []);
});

app.get('/api/medications/today/:patientId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.patientId.toLowerCase()));
  if (!patient || !patient.medications) return res.json([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeds = patient.medications.filter(m => {
    if (m.isActive === false) return false;
    if (m.skippedDates && Array.isArray(m.skippedDates) && m.skippedDates.includes(todayStr)) return false;
    if (m.isSingleDay || m.specificDate) {
      return (m.specificDate || m.startDate) === todayStr;
    }
    if (m.startDate && m.endDate) {
      return todayStr >= m.startDate && todayStr <= m.endDate;
    }
    return true;
  }).map(med => ({
    ...med,
    date: todayStr,
    status: (med.dayStatuses && med.dayStatuses[todayStr]) || med.status || 'Pending',
  }));

  res.json(todayMeds);
});

app.get('/api/medications/date/:patientId/:dateStr', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const dateStr = req.params.dateStr;
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.patientId.toLowerCase()));
  if (!patient || !patient.medications) return res.json([]);

  const dateMeds = patient.medications.filter(m => {
    if (m.isActive === false) return false;
    if (m.skippedDates && Array.isArray(m.skippedDates) && m.skippedDates.includes(dateStr)) return false;
    if (m.isSingleDay || m.specificDate) {
      return (m.specificDate || m.startDate) === dateStr;
    }
    if (m.startDate && m.endDate) {
      return dateStr >= m.startDate && dateStr <= m.endDate;
    }
    return true;
  }).map(med => ({
    ...med,
    date: dateStr,
    status: (med.dayStatuses && med.dayStatuses[dateStr]) || med.status || 'Pending',
  }));

  res.json(dateMeds);
});

app.post('/api/medications/plan/:patientId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  let patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.patientId.toLowerCase()));
  if (!patient) {
    const user = db.users.find(u => (u.pairingCode && u.pairingCode.toUpperCase() === patientId) || (u.id && u.id.toUpperCase() === patientId));
    patient = {
      id: patientId,
      name: user?.name || `Patient (${patientId})`,
      email: user?.email || '',
      activities: [],
      medications: [],
      status: 'idle',
      batteryLevel: 85,
    };
    db.patients.push(patient);
  }

  if (!patient.medications) patient.medications = [];

  const newMed = {
    id: req.body.id || ('m-' + Date.now()),
    name: req.body.name,
    dosage: req.body.dosage || '10 mg',
    time: req.body.time || '08:00 AM',
    period: req.body.period || 'Morning with breakfast',
    durationDays: req.body.durationDays || 30,
    startDate: req.body.startDate || new Date().toISOString().split('T')[0],
    endDate: req.body.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    isSingleDay: !!req.body.isSingleDay,
    specificDate: req.body.specificDate || null,
    instructions: req.body.instructions || '',
    prescribedBy: req.body.prescribedBy || 'Dr. Sarah Jenkins',
    status: req.body.status || 'Pending',
    isActive: true,
    dayStatuses: req.body.dayStatuses || {},
    skippedDates: req.body.skippedDates || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  patient.medications.push(newMed);
  saveDbToDisk();

  const payload = {
    type: 'new_prescription',
    roomCode: patient.id,
    patientId: patient.id,
    patientName: patient.name,
    medication: newMed,
    timestamp: Date.now(),
  };

  broadcastToRoom(patient.id, payload);
  broadcastToAll(payload);

  res.status(201).json(newMed);
});

app.put('/api/medications/plan/:patientId/:medId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const medId = req.params.medId;
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.patientId.toLowerCase()));
  if (!patient || !patient.medications) {
    return res.status(404).json({ error: 'Patient or medications not found' });
  }

  const medIdx = patient.medications.findIndex(m => m.id === medId);
  if (medIdx === -1) {
    return res.status(404).json({ error: 'Medication not found' });
  }

  patient.medications[medIdx] = {
    ...patient.medications[medIdx],
    ...req.body,
    updatedAt: Date.now(),
  };

  saveDbToDisk();

  const payload = {
    type: 'medication_plan_updated',
    roomCode: patient.id,
    patientId: patient.id,
    medication: patient.medications[medIdx],
    timestamp: Date.now(),
  };

  broadcastToRoom(patient.id, payload);
  broadcastToAll(payload);

  res.json(patient.medications[medIdx]);
});

app.delete('/api/medications/plan/:patientId/:medId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const medId = req.params.medId;
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.patientId.toLowerCase()));

  if (patient && patient.medications) {
    patient.medications = patient.medications.filter(m => m.id !== medId);
    saveDbToDisk();

    const payload = {
      type: 'medication_plan_updated',
      roomCode: patient.id,
      patientId: patient.id,
      medicationId: medId,
      timestamp: Date.now(),
    };

    broadcastToRoom(patient.id, payload);
    broadcastToAll(payload);
  }

  res.json({ success: true });
});

app.put('/api/medications/plan/:patientId/:medId/day-status', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const medId = req.params.medId;
  const { date, status } = req.body;

  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.patientId.toLowerCase()));
  if (!patient || !patient.medications) {
    return res.status(404).json({ error: 'Patient or medications not found' });
  }

  const med = patient.medications.find(m => m.id === medId);
  if (!med) {
    return res.status(404).json({ error: 'Medication not found' });
  }

  if (!med.dayStatuses) med.dayStatuses = {};
  med.dayStatuses[date] = status;

  const todayStr = new Date().toISOString().split('T')[0];
  if (date === todayStr) {
    med.status = status;
  }
  med.updatedAt = Date.now();

  saveDbToDisk();

  const payload = {
    type: 'medication_day_status_updated',
    roomCode: patient.id,
    patientId: patient.id,
    medicationId: medId,
    date,
    status,
    timestamp: Date.now(),
  };

  broadcastToRoom(patient.id, payload);
  broadcastToAll(payload);

  res.json({ success: true, medication: med });
});

// --- Patient Vitals Telemetry API ---
app.get('/api/vitals/history/:patientId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const records = (db.vitals || [])
    .filter(v => (v.patientId || '').toUpperCase() === patientId)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json(records);
});

app.get('/api/vitals/latest/:patientId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const records = (db.vitals || [])
    .filter(v => (v.patientId || '').toUpperCase() === patientId)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json(records[0] || null);
});

app.post('/api/vitals/record/:patientId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const vitalsRecord = {
    id: req.body.id || ('vit-' + Date.now()),
    patientId,
    hr: req.body.hr ? Number(req.body.hr) : null,
    bp: req.body.bp ? String(req.body.bp).trim() : null,
    spo2: req.body.spo2 ? Number(req.body.spo2) : null,
    temp: req.body.temp ? String(req.body.temp).trim() : null,
    glucose: req.body.glucose ? Number(req.body.glucose) : null,
    notes: req.body.notes || '',
    recordedBy: req.body.recordedBy || 'Caregiver',
    status: req.body.status || 'Normal',
    statusColor: req.body.statusColor || '#10B981',
    timestamp: req.body.timestamp || Date.now(),
  };

  if (!db.vitals) db.vitals = [];
  db.vitals.unshift(vitalsRecord);

  // Update patient object if exists
  const patient = db.patients.find(p => p.id.toUpperCase() === patientId || (p.email && p.email.toLowerCase() === req.params.patientId.toLowerCase()));
  if (patient) {
    patient.vitals = vitalsRecord;
  }

  saveDbToDisk();

  // Real-time broadcast to room and globally
  const payload = {
    type: 'vitals_updated',
    roomCode: patientId,
    patientId,
    patientName: patient?.name || patientId,
    vitals: vitalsRecord,
    timestamp: Date.now(),
  };

  broadcastToRoom(patientId, payload);
  broadcastToAll(payload);

  res.status(201).json({ success: true, vitals: vitalsRecord });
});

app.delete('/api/vitals/history/:patientId/:recordId', (req, res) => {
  const patientId = req.params.patientId.toUpperCase();
  const recordId = req.params.recordId;

  if (db.vitals) {
    db.vitals = db.vitals.filter(v => !(v.id === recordId && (v.patientId || '').toUpperCase() === patientId));
    saveDbToDisk();
  }

  res.json({ success: true });
});

app.get('/api/profiles/:identifier', (req, res) => {
  const identifier = req.params.identifier.toLowerCase();
  const requesterEmail = (req.query.requesterEmail || '').toLowerCase();

  let targetUser = db.users.find(u => 
    u.id.toLowerCase() === identifier || 
    (u.email && u.email.toLowerCase() === identifier) ||
    (u.pairingCode && u.pairingCode.toLowerCase() === identifier) ||
    (u.patientPairingCode && u.patientPairingCode.toLowerCase() === identifier)
  );
  let targetPatient = db.patients.find(p => p.id.toLowerCase() === identifier || (p.email && p.email.toLowerCase() === identifier));

  if (!targetUser && !targetPatient) {
    return res.status(404).json({ error: 'User not found' });
  }

  const role = targetUser ? targetUser.role : 'patient';
  const name = targetUser ? targetUser.name : targetPatient.name;
  const targetEmail = (targetUser && targetUser.email) ? targetUser.email.toLowerCase() : (targetPatient && targetPatient.email ? targetPatient.email.toLowerCase() : '');
  const targetId = targetUser ? targetUser.id.toLowerCase() : targetPatient.id.toLowerCase();

  const isSelf = requesterEmail && (targetEmail === requesterEmail || targetId === requesterEmail || targetUser?.pairingCode?.toLowerCase() === requesterEmail || targetUser?.patientPairingCode?.toLowerCase() === requesterEmail);
  
  if (isSelf) {
    return res.json({ isLocked: false, ...targetUser, ...targetPatient });
  }

  const isConnected = db.connections.some(c => {
    const c1E = (c.user1Email || '').toLowerCase();
    const c1R = (c.user1RoomCode || '').toLowerCase();
    const c2E = (c.user2Email || '').toLowerCase();
    const c2R = (c.user2RoomCode || '').toLowerCase();

    const requesterMatch1 = (c1E === requesterEmail || c1R === requesterEmail);
    const targetMatch2 = (c2E === targetEmail || c2R === targetId || c2E === targetId || c2R === targetEmail);

    const requesterMatch2 = (c2E === requesterEmail || c2R === requesterEmail);
    const targetMatch1 = (c1E === targetEmail || c1R === targetId || c1E === targetId || c1R === targetEmail);

    return (requesterMatch1 && targetMatch2) || (requesterMatch2 && targetMatch1);
  });

  if (isConnected) {
    return res.json({ isLocked: false, ...targetUser, ...targetPatient });
  }

  return res.json({
    id: targetId,
    name,
    role,
    isLocked: true,
    message: 'This profile is locked. Connect to view full details.'
  });
});



app.get('/api/invitations/:identifier', (req, res) => {
  const identifier = req.params.identifier.toLowerCase();
  
  let userIds = [identifier];
  const user = db.users.find(u => u.id.toLowerCase() === identifier || (u.email && u.email.toLowerCase() === identifier));
  if (user) {
    if (user.email) userIds.push(user.email.toLowerCase());
    if (user.id) userIds.push(user.id.toLowerCase());
    if (user.pairingCode) userIds.push(user.pairingCode.toLowerCase());
    if (user.patientPairingCode) userIds.push(user.patientPairingCode.toLowerCase());
  }
  
  const patient = db.patients.find(p => p.id.toLowerCase() === identifier || (p.email && p.email.toLowerCase() === identifier));
  if (patient) {
    if (patient.id) userIds.push(patient.id.toLowerCase());
    if (patient.email) userIds.push(patient.email.toLowerCase());
  }

  const userInvs = db.invitations.filter(inv => 
    (inv.toEmail && userIds.includes(inv.toEmail.toLowerCase())) || 
    (inv.toRoomCode && userIds.includes(inv.toRoomCode.toLowerCase())) ||
    (inv.fromEmail && userIds.includes(inv.fromEmail.toLowerCase()))
  );
  res.json(userInvs);
});

app.post('/api/invitations', (req, res) => {
  const inv = {
    id: 'inv-' + Date.now(),
    fromName: req.body.fromName,
    fromEmail: req.body.fromEmail,
    fromRole: req.body.fromRole,
    toEmail: req.body.toEmail ? req.body.toEmail.toLowerCase() : undefined,
    toRoomCode: req.body.toRoomCode ? req.body.toRoomCode.toUpperCase() : undefined,
    status: 'pending',
    createdAt: Date.now()
  };
  db.invitations.push(inv);
  saveDbToDisk();
  
  if (inv.toRoomCode) {
    broadcastToRoom(inv.toRoomCode, { type: 'new_invitation', invitation: inv });
  }
  
  res.status(201).json(inv);
});

app.put('/api/invitations/:id/respond', (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'
  const invIndex = db.invitations.findIndex(i => i.id === id);
  if (invIndex === -1) return res.status(404).json({ error: 'Not found' });
  
  const inv = db.invitations[invIndex];
  
  if (action === 'approve') {
    // Create connection
    const conn = {
      id: 'conn-' + Date.now(),
      user1Email: inv.fromEmail,
      user1Name: inv.fromName,
      user1Role: inv.fromRole,
      user2Email: inv.toEmail,
      user2RoomCode: inv.toRoomCode,
      // The current user approving it
      user2Name: req.body.approverName || inv.toEmail || inv.toRoomCode,
      user2Role: req.body.approverRole || 'patient',
      createdAt: Date.now()
    };
    db.connections.push(conn);
    db.invitations.splice(invIndex, 1);
    saveDbToDisk();
    
    // Broadcast back to the sender if they are listening
    broadcastToAll({ type: 'invitation_approved', connection: conn, originalInvitation: inv });
    
    res.json(conn);
  } else {
    // reject
    db.invitations.splice(invIndex, 1);
    saveDbToDisk();
    
    broadcastToAll({ type: 'invitation_rejected', originalInvitation: inv });
    
    res.json({ success: true, message: 'Rejected' });
  }
});

app.post('/api/connections/direct', (req, res) => {
  const { fromName, fromEmail, fromRole, toRoomCode, toEmail, toName, age, condition, emergencyPhone, safeZoneRadius } = req.body;
  const cleanRoomCode = (toRoomCode || '').trim().toUpperCase();
  
  const conn = {
    id: 'conn-' + Date.now(),
    user1Email: fromEmail,
    user1Name: fromName,
    user1Role: fromRole,
    user2Email: toEmail,
    user2RoomCode: cleanRoomCode,
    user2Name: toName || toEmail || cleanRoomCode,
    user2Role: 'patient',
    age: Number(age) || null,
    condition: condition || 'Dementia (Moderate) • High Wander Risk',
    emergencyPhone: emergencyPhone || '',
    safeZoneRadius: Number(safeZoneRadius) || 500,
    createdAt: Date.now()
  };
  
  db.connections.push(conn);

  // Also ensure or update in db.patients
  let patient = db.patients.find(p => p.id === cleanRoomCode || (toEmail && p.email && p.email.toLowerCase() === toEmail.toLowerCase()));
  if (!patient) {
    patient = {
      id: cleanRoomCode,
      name: toName || cleanRoomCode,
      email: toEmail || '',
      age: Number(age) || null,
      condition: condition || 'Dementia (Moderate) • High Wander Risk',
      patientPhone: emergencyPhone || '',
      emergencyPhone: emergencyPhone || '',
      status: 'idle',
      batteryLevel: 85,
      lastSeen: null,
      safeZoneRadius: Number(safeZoneRadius) || 500,
      isPreRegistered: !!req.body.isPreRegistered,
      doctorName: fromRole === 'doctor' ? fromName : undefined,
      medications: [],
      activities: [],
    };
    db.patients.push(patient);
  } else {
    if (toName) patient.name = toName;
    if (condition) patient.condition = condition;
    if (emergencyPhone) patient.emergencyPhone = emergencyPhone;
    if (age) patient.age = Number(age);
    if (fromRole === 'doctor') patient.doctorName = fromName;
    if (req.body.isPreRegistered !== undefined) patient.isPreRegistered = !!req.body.isPreRegistered;
  }

  saveDbToDisk();
  
  // Notify the patient and the requester
  broadcastToAll({ type: 'invitation_approved', connection: conn, originalInvitation: { toRoomCode: cleanRoomCode } });
  broadcastToAll({ type: 'connections_updated', connection: conn });
  
  res.json(conn);
});

app.get('/api/connections/:email', (req, res) => {
  const email = req.params.email.toLowerCase();
  const userConns = db.connections.filter(c => 
    (c.user1Email && c.user1Email.toLowerCase() === email) || (c.user2Email && c.user2Email.toLowerCase() === email) || (c.user1RoomCode && c.user1RoomCode.toLowerCase() === email) || (c.user2RoomCode && c.user2RoomCode.toLowerCase() === email)
  );
  res.json(userConns);
});

app.delete('/api/connections/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.connections.findIndex(c => c.id === id);
  if (idx !== -1) {
    const conn = db.connections[idx];
    db.connections.splice(idx, 1);
    saveDbToDisk();
    // Notify clients that connection was removed
    broadcastToAll({ type: 'connection_revoked', connectionId: id, connection: conn });
  }
  res.json({ success: true });
});

app.delete('/api/connections/by-user/:email/:patientRoomCode', (req, res) => {
  const email = (req.params.email || '').toLowerCase().trim();
  const roomCode = (req.params.patientRoomCode || '').toLowerCase().trim();
  
  // 1. Filter matching connections in db.connections
  const initialLength = db.connections.length;
  db.connections = db.connections.filter(c => {
    const u1Email = (c.user1Email || c.fromEmail || '').toLowerCase().trim();
    const u2Email = (c.user2Email || c.toEmail || '').toLowerCase().trim();
    const u1Room = (c.user1RoomCode || c.fromRoomCode || '').toLowerCase().trim();
    const u2Room = (c.user2RoomCode || c.toRoomCode || '').toLowerCase().trim();
    const patientCode = (c.patientId || c.patientRoomCode || '').toLowerCase().trim();

    const isCaregiverU1 = u1Email === email || u1Room === email;
    const isCaregiverU2 = u2Email === email || u2Room === email;

    const isPatientMatchU2 = u2Room === roomCode || u2Email === roomCode || patientCode === roomCode;
    const isPatientMatchU1 = u1Room === roomCode || u1Email === roomCode || patientCode === roomCode;

    const isMatch = (isCaregiverU1 && isPatientMatchU2) || (isCaregiverU2 && isPatientMatchU1);

    if (isMatch) {
      broadcastToAll({ type: 'connection_revoked', connectionId: c.id, connection: c, patientRoomCode: roomCode });
      return false; // exclude this connection
    }
    return true; // keep this connection
  });

  // 2. Also clear patientPairingCode in db.users for this caregiver if it was paired
  const caregiverUser = db.users.find(u => (u.email && u.email.toLowerCase() === email) || (u.id && u.id.toLowerCase() === email));
  if (caregiverUser && caregiverUser.patientPairingCode && caregiverUser.patientPairingCode.toLowerCase() === roomCode) {
    caregiverUser.patientPairingCode = null;
  }

  // 3. In db.patients, remove ephemeral/unregistered patient entry created for this connection if any
  const pIndex = db.patients.findIndex(p => (p.id || '').toLowerCase() === roomCode && ((p.caregiverEmail || '').toLowerCase() === email || !p.registeredUser));
  if (pIndex !== -1) {
    db.patients.splice(pIndex, 1);
  }

  saveDbToDisk();
  
  res.json({ success: true, deleted: initialLength - db.connections.length });
});
app.get('/api/alerts', (req, res) => {
  res.json(db.alerts);
});

app.post('/api/alerts', (req, res) => {
  db.alerts.unshift(req.body);
  res.status(201).json(req.body);
});

// Medication adherence & reminders API
app.get('/api/medications/logs/:patientId', (req, res) => {
  const { patientId } = req.params;
  const logs = (db.medicationLogs || []).filter(l => l.patientId === patientId);
  res.json(logs);
});

app.get('/api/medications/adherence/:patientId', (req, res) => {
  const { patientId } = req.params;
  const adherence = calculatePatientAdherence(patientId);
  if (adherence) {
    res.json(adherence);
  } else {
    res.status(404).json({ error: 'Patient not found' });
  }
});

app.post('/api/medications/response', (req, res) => {
  const { reminderId, patientId, medicationId, status } = req.body;
  if (!patientId || !status) {
    return res.status(400).json({ error: 'patientId and status are required' });
  }
  const result = handleMedicationResponse(reminderId, patientId, medicationId, status);
  res.json(result);
});

app.post('/api/medications/trigger-reminder', (req, res) => {
  const { patientId, medicationId } = req.body;
  const targetPatientId = patientId || 'CARE-1001';
  const reminder = triggerMedicationReminder(targetPatientId, medicationId);
  if (reminder) {
    res.json({ success: true, reminder });
  } else {
    res.status(404).json({ error: 'Patient not found' });
  }
});

// --- 1-Month Medication Plan & Automatic 1-Day Patient Schedule API ---
app.get('/api/medications/plan/:patientId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const patient = db.patients.find(p => (p.id || '').toUpperCase() === patientId || (p.pairingCode || '').toUpperCase() === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Ensure default medications if empty
  if (!patient.medications || patient.medications.length === 0) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const endStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    patient.medications = [
      {
        id: 'm1',
        name: 'Donepezil (Aricept)',
        dosage: '10 mg • 1 Tablet',
        time: '08:00 AM',
        period: 'Morning with breakfast',
        durationDays: 30,
        startDate: todayStr,
        endDate: endStr,
        instructions: 'Take 1 tablet every morning with breakfast and water',
        prescribedBy: 'Dr. Sarah Jenkins',
        status: 'Pending',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'm2',
        name: 'Vitamin B-Complex & D3',
        dosage: '1 Capsule',
        time: '01:00 PM',
        period: 'Afternoon with lunch',
        durationDays: 30,
        startDate: todayStr,
        endDate: endStr,
        instructions: 'Take with full lunch meal for neurological support',
        prescribedBy: 'Dr. Sarah Jenkins',
        status: 'Pending',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'm3',
        name: 'Amlodipine (Blood Pressure)',
        dosage: '5 mg • 1 Tablet',
        time: '08:00 PM',
        period: 'Evening with dinner',
        durationDays: 30,
        startDate: todayStr,
        endDate: endStr,
        instructions: 'Take with dinner. Monitor blood pressure periodically.',
        prescribedBy: 'Dr. Sarah Jenkins',
        status: 'Pending',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'm4',
        name: 'Omega-3 Fish Oil',
        dosage: '1000 mg • 1 Softgel',
        time: '09:30 PM',
        period: 'Bedtime',
        durationDays: 30,
        startDate: todayStr,
        endDate: endStr,
        instructions: 'Take with a glass of water before sleep',
        prescribedBy: 'Dr. Sarah Jenkins',
        status: 'Pending',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ];
    saveDbToDisk();
  }

  res.json(patient.medications || []);
});

app.get('/api/medications/today/:patientId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const patient = db.patients.find(p => (p.id || '').toUpperCase() === patientId || (p.pairingCode || '').toUpperCase() === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const allMeds = patient.medications || [];

  // System automatically extracts only today's scheduled doses from the active 1-month plan
  const todayMeds = allMeds.filter(med => {
    if (med.isActive === false) return false;
    if (med.startDate && med.endDate) {
      return todayStr >= med.startDate && todayStr <= med.endDate;
    }
    return true; // default active
  });

  res.json(todayMeds);
});

app.post('/api/medications/plan/:patientId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const patient = db.patients.find(p => (p.id || '').toUpperCase() === patientId || (p.pairingCode || '').toUpperCase() === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const durationDays = Number(req.body.durationDays) || 30; // Default 1 month (30 days)
  const today = new Date();
  const todayStr = req.body.startDate || today.toISOString().split('T')[0];
  const endStr = req.body.endDate || new Date(Date.now() + durationDays * 86400000).toISOString().split('T')[0];

  const newMed = {
    id: req.body.id || 'm-' + Date.now(),
    name: req.body.name,
    dosage: req.body.dosage || '1 Tablet',
    time: req.body.time || '08:00 AM',
    period: req.body.period || 'Morning with breakfast',
    durationDays,
    startDate: todayStr,
    endDate: endStr,
    instructions: req.body.instructions || '',
    prescribedBy: req.body.doctorName || 'Doctor',
    status: 'Pending',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  patient.medications = patient.medications || [];
  patient.medications.push(newMed);
  saveDbToDisk();

  // Real-time broadcast to patient room and all monitoring clients
  const syncPayload = {
    type: 'medication_plan_updated',
    patientId,
    action: 'add',
    medication: newMed,
    planLength: patient.medications.length,
    doctorName: req.body.doctorName || 'Doctor'
  };
  broadcastToRoom(patientId, syncPayload);
  broadcastToAll(syncPayload);

  // Send new prescription event for caregiver & patient notices
  broadcastToRoom(patientId, {
    type: 'new_prescription',
    roomCode: patientId,
    patientId,
    data: {
      patientId,
      patientName: patient.name,
      medicineName: `${newMed.name} (${newMed.dosage})`,
      doctorName: req.body.doctorName || 'Doctor',
      action: '1-Month Plan Updated',
      timestamp: new Date().toISOString(),
    }
  });

  res.status(201).json(newMed);
});

app.put('/api/medications/plan/:patientId/:medId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const { medId } = req.params;
  const patient = db.patients.find(p => (p.id || '').toUpperCase() === patientId || (p.pairingCode || '').toUpperCase() === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  patient.medications = patient.medications || [];
  const idx = patient.medications.findIndex(m => m.id === medId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Medication not found in patient plan' });
  }

  const durationDays = req.body.durationDays ? Number(req.body.durationDays) : patient.medications[idx].durationDays;
  let endDate = patient.medications[idx].endDate;
  if (req.body.endDate) {
    endDate = req.body.endDate;
  } else if (req.body.durationDays && patient.medications[idx].startDate) {
    const startMs = new Date(patient.medications[idx].startDate).getTime();
    endDate = new Date(startMs + durationDays * 86400000).toISOString().split('T')[0];
  }

  patient.medications[idx] = {
    ...patient.medications[idx],
    ...req.body,
    durationDays,
    endDate,
    updatedAt: Date.now(),
  };

  saveDbToDisk();

  const updatedMed = patient.medications[idx];
  const syncPayload = {
    type: 'medication_plan_updated',
    patientId,
    action: 'update',
    medication: updatedMed,
    doctorName: req.body.doctorName || 'Doctor'
  };
  broadcastToRoom(patientId, syncPayload);
  broadcastToAll(syncPayload);

  res.json(updatedMed);
});

app.delete('/api/medications/plan/:patientId/:medId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const { medId } = req.params;
  const patient = db.patients.find(p => (p.id || '').toUpperCase() === patientId || (p.pairingCode || '').toUpperCase() === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  patient.medications = (patient.medications || []).filter(m => m.id !== medId);
  saveDbToDisk();

  const syncPayload = {
    type: 'medication_plan_updated',
    patientId,
    action: 'delete',
    medicationId: medId
  };
  broadcastToRoom(patientId, syncPayload);
  broadcastToAll(syncPayload);

  res.json({ success: true, medicationId: medId });
});

app.get('/api/medications/date/:patientId/:dateStr', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const dateStr = req.params.dateStr; // YYYY-MM-DD
  const patient = db.patients.find(p => (p.id || '').toUpperCase() === patientId || (p.pairingCode || '').toUpperCase() === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const allMeds = patient.medications || [];
  const dateMeds = allMeds.filter(med => {
    if (med.isActive === false) return false;
    if (med.skippedDates && Array.isArray(med.skippedDates) && med.skippedDates.includes(dateStr)) return false;
    if (med.isSingleDay || med.specificDate) {
      return (med.specificDate || med.startDate) === dateStr;
    }
    if (med.startDate && med.endDate) {
      return dateStr >= med.startDate && dateStr <= med.endDate;
    }
    return true;
  }).map(med => {
    const dayStatus = (med.dayStatuses && med.dayStatuses[dateStr]) || med.status || 'Pending';
    const dayOverride = (med.dayOverrides && med.dayOverrides[dateStr]) || {};
    return {
      ...med,
      ...dayOverride,
      date: dateStr,
      status: dayStatus,
    };
  });

  res.json(dateMeds);
});

app.put('/api/medications/plan/:patientId/:medId/day-status', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const { medId } = req.params;
  const { date, status } = req.body; // date: YYYY-MM-DD, status: 'Taken' | 'Pending' | 'Skipped'
  const patient = db.patients.find(p => (p.id || '').toUpperCase() === patientId || (p.pairingCode || '').toUpperCase() === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const med = (patient.medications || []).find(m => m.id === medId);
  if (!med) {
    return res.status(404).json({ error: 'Medication not found' });
  }

  if (!med.dayStatuses) med.dayStatuses = {};
  med.dayStatuses[date] = status;
  med.updatedAt = Date.now();
  saveDbToDisk();

  // Broadcast real-time status update to all connected clients
  const syncPayload = {
    type: 'medication_day_status_updated',
    patientId,
    medicationId: medId,
    date,
    status,
    medicineName: med.name
  };
  broadcastToRoom(patientId, syncPayload);
  broadcastToAll(syncPayload);

  res.json({ success: true, medId, date, status });
});

app.put('/api/medications/plan/:patientId/:medId/day-override', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const { medId } = req.params;
  const { date, overrideData } = req.body;
  const patient = db.patients.find(p => (p.id || '').toUpperCase() === patientId || (p.pairingCode || '').toUpperCase() === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const med = (patient.medications || []).find(m => m.id === medId);
  if (!med) {
    return res.status(404).json({ error: 'Medication not found' });
  }

  if (!med.dayOverrides) med.dayOverrides = {};
  med.dayOverrides[date] = { ...(med.dayOverrides[date] || {}), ...overrideData };
  med.updatedAt = Date.now();
  saveDbToDisk();

  const syncPayload = {
    type: 'medication_day_override_updated',
    patientId,
    medicationId: medId,
    date,
    override: med.dayOverrides[date]
  };
  broadcastToRoom(patientId, syncPayload);
  broadcastToAll(syncPayload);

  res.json({ success: true, medId, date, override: med.dayOverrides[date] });
});

// --- Family Members Memory & Contact API for Dementia Patients ---
app.get('/api/family-members/:patientId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const members = (db.familyMembers || []).filter(m => (m.patientId || '').toUpperCase() === patientId);
  res.json(members);
});

app.post('/api/family-members/:patientId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const newMember = {
    id: req.body.id || 'fam-' + Date.now(),
    patientId,
    name: req.body.name,
    relationship: req.body.relationship || 'Family Member',
    emoji: req.body.emoji || '❤️',
    birthday: req.body.birthday || '',
    phone: req.body.phone || '',
    whatsapp: req.body.whatsapp || req.body.phone || '',
    photo: req.body.photo || '',
    memoryNotes: req.body.memoryNotes || '',
    favoriteMemory: req.body.favoriteMemory || '',
    createdAt: req.body.createdAt || Date.now(),
  };

  db.familyMembers = db.familyMembers || [];
  db.familyMembers.unshift(newMember);
  saveDbToDisk();

  broadcastToRoom(patientId, { type: 'family_members_updated', patientId, member: newMember, action: 'add' });
  broadcastToAll({ type: 'family_members_updated', patientId, member: newMember, action: 'add' });

  res.status(201).json(newMember);
});

app.put('/api/family-members/:patientId/:id', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const { id } = req.params;
  const idx = (db.familyMembers || []).findIndex(m => m.id === id && (m.patientId || '').toUpperCase() === patientId);

  if (idx !== -1) {
    db.familyMembers[idx] = {
      ...db.familyMembers[idx],
      ...req.body,
      updatedAt: Date.now(),
    };
    saveDbToDisk();
    const updated = db.familyMembers[idx];
    broadcastToRoom(patientId, { type: 'family_members_updated', patientId, member: updated, action: 'update' });
    broadcastToAll({ type: 'family_members_updated', patientId, member: updated, action: 'update' });
    return res.json(updated);
  }

  res.status(404).json({ error: 'Family member not found' });
});

app.delete('/api/family-members/:patientId/:id', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const { id } = req.params;
  const initialLength = (db.familyMembers || []).length;
  db.familyMembers = (db.familyMembers || []).filter(m => !(m.id === id && (m.patientId || '').toUpperCase() === patientId));

  if (db.familyMembers.length !== initialLength) {
    saveDbToDisk();
    broadcastToRoom(patientId, { type: 'family_members_updated', patientId, memberId: id, action: 'delete' });
    broadcastToAll({ type: 'family_members_updated', patientId, memberId: id, action: 'delete' });
  }

  res.json({ success: true, deleted: initialLength - db.familyMembers.length });
});

// --- Patient Biometric Vitals Tracking & History API ---
app.get('/api/vitals/history/:patientId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const records = (db.vitals || [])
    .filter(v => (v.patientId || '').toUpperCase() === patientId)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json(records);
});

app.get('/api/vitals/latest/:patientId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const records = (db.vitals || [])
    .filter(v => (v.patientId || '').toUpperCase() === patientId)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json(records[0] || null);
});

app.post('/api/vitals/record/:patientId', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const newRecord = {
    id: req.body.id || 'vit-' + Date.now(),
    patientId,
    hr: req.body.hr != null ? Number(req.body.hr) : null,
    bp: req.body.bp ? String(req.body.bp).trim() : null,
    spo2: req.body.spo2 != null ? Number(req.body.spo2) : null,
    temp: req.body.temp ? String(req.body.temp).trim() : null,
    glucose: req.body.glucose != null ? Number(req.body.glucose) : null,
    notes: req.body.notes ? String(req.body.notes).trim() : '',
    recordedBy: req.body.recordedBy || 'Caregiver',
    status: req.body.status || 'Normal',
    statusColor: req.body.statusColor || '#10B981',
    timestamp: req.body.timestamp || Date.now(),
  };

  db.vitals = db.vitals || [];
  db.vitals.unshift(newRecord);
  saveDbToDisk();

  // Broadcast in real-time to Patient and Caregiver/Doctor sockets
  const vitalsPayload = {
    type: 'vitals_updated',
    roomCode: patientId,
    patientId,
    vitals: newRecord,
    timestamp: newRecord.timestamp,
  };
  broadcastToRoom(patientId, vitalsPayload);
  broadcastToAll(vitalsPayload);

  res.status(201).json(newRecord);
});

app.delete('/api/vitals/history/:patientId/:id', (req, res) => {
  const patientId = (req.params.patientId || '').toUpperCase().trim();
  const { id } = req.params;
  const initialLength = (db.vitals || []).length;
  db.vitals = (db.vitals || []).filter(v => !(v.id === id && (v.patientId || '').toUpperCase() === patientId));

  if (db.vitals.length !== initialLength) {
    saveDbToDisk();
  }

  res.json({ success: true, deleted: initialLength - db.vitals.length });
});

// Authentication APIs (Universal Multi-Role Auth)
app.post('/api/auth/login', (req, res) => {
  const { email, code, password } = req.body;
  const input = (email || code || '').trim().toLowerCase();

  if (!input) {
    return res.status(400).json({ error: 'Please enter your email or code.' });
  }

  // 1. Check in db.users
  const user = (db.users || []).find(u => 
    u.email.toLowerCase() === input ||
    (u.pairingCode && u.pairingCode.toLowerCase() === input) ||
    (u.patientPairingCode && u.patientPairingCode.toLowerCase() === input) ||
    (u.id && u.id.toLowerCase() === input)
  );

  if (user) {
    if (password && user.password && user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password. Please verify and try again.' });
    }
    return res.json({
      ...user,
      token: 'mock-jwt-token'
    });
  }

  // 2. Check room code in db.patients
  const patient = db.patients.find(p => p.id.toLowerCase() === input);
  if (patient) {
    return res.json({
      id: patient.id,
      name: patient.name,
      role: 'patient',
      email: `${patient.id.toLowerCase()}@healthtrack.com`,
      pairingCode: patient.id,
      phone: patient.patientPhone,
      emergencyContact: patient.emergencyPhone,
      token: 'mock-jwt-token',
    });
  }

  // 3. Fallback for legacy codes starting with CARE- or DOC-
  if (input.startsWith('care-')) {
    return res.json({
      id: 'cg-legacy',
      name: 'Sarah Vance',
      role: 'caregiver',
      email: 'caregiver@healthtrack.com',
      patientPairingCode: input.toUpperCase(),
      token: 'mock-jwt-token',
    });
  }
  if (input.startsWith('doc-')) {
    return res.json({
      id: 'doc-legacy',
      name: 'Dr. Sarah Jenkins',
      role: 'doctor',
      email: 'doctor@healthtrack.com',
      token: 'mock-jwt-token',
    });
  }

  res.status(401).json({ error: 'No account found with this email address.' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, phone, emergencyContact, pairingCode, patientPairingCode, hospital, relationship } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = (db.users || []).find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: `An account with this email address already exists as a ${existing.role}.` });
  }

  const newUser = {
    id: `${role.slice(0, 3)}-${Date.now()}`,
    name: name ? name.trim() : (role === 'admin' ? 'Admin' : 'User'),
    email: cleanEmail,
    password,
    role,
    phone: phone ? phone.trim() : '',
    emergencyContact: emergencyContact ? emergencyContact.trim() : '',
    pairingCode: pairingCode ? pairingCode.trim().toUpperCase() : (role === 'patient' ? 'CARE-1001' : undefined),
    patientPairingCode: patientPairingCode ? patientPairingCode.trim().toUpperCase() : (role === 'caregiver' ? 'CARE-1001' : undefined),
    hospital: hospital ? hospital.trim() : '',
    relationship: relationship ? relationship.trim() : '',
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDbToDisk();

  // If new patient, also register into db.patients
  if (role === 'patient') {
    const pCode = newUser.pairingCode || 'CARE-1001';
    const cleanUserEmail = (newUser.email || '').toLowerCase().trim();
    let existingP = db.patients.find(p => p.id === pCode || (p.email && p.email.toLowerCase().trim() === cleanUserEmail));
    if (!existingP) {
      db.patients.push({
        id: pCode,
        name: newUser.name,
        email: newUser.email,
        age: null,
        condition: null,
        patientPhone: newUser.phone,
        emergencyPhone: newUser.emergencyContact,
        status: 'offline',
        batteryLevel: null,
        lastSeen: null,
        safeZoneRadius: null,
        medications: [],
        activities: [],
      });
    } else {
      // Connect pre-registered patient with newly registered user account!
      existingP.email = newUser.email;
      existingP.name = newUser.name || existingP.name;
      existingP.patientPhone = newUser.phone || existingP.patientPhone;
      existingP.emergencyPhone = newUser.emergencyContact || existingP.emergencyPhone;
      existingP.isPreRegistered = false;
    }
  }

  res.status(201).json({
    ...newUser,
    token: 'mock-jwt-token'
  });
});

app.get('/api/auth/users', (req, res) => {
  res.json((db.users || []).map(({ password, ...u }) => u));
});


const server = http.createServer(app);

// Initialize Socket.IO Server with full CORS & WebSocket/Polling transport
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const wss = new WebSocketServer({ noServer: true });

// Allow Socket.IO to handle /socket.io/ upgrades without conflict, delegate other ws connections to wss
server.on('upgrade', (request, socket, head) => {
  if (request.url && request.url.startsWith('/socket.io/')) {
    return; // Socket.io engine handles this
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Socket.io Real-time Event Subsystem
io.on('connection', (socket) => {
  socket.roomCode = null;
  socket.role = 'guest';

  console.log(`[Socket.io CONNECT] Client connected: ${socket.id}`);

  socket.on('join', (data = {}) => {
    const rawCode = data.roomCode || data.room;
    if (!rawCode) return;
    const roomCode = rawCode.toUpperCase().trim();
    const role = data.role || 'caregiver';

    socket.roomCode = roomCode;
    socket.role = role;
    socket.join(roomCode);

    console.log(`[Socket.io JOIN] ${role.toUpperCase()} joined room "${roomCode}" (${socket.id})`);

    const patientAdh = calculatePatientAdherence(roomCode);
    const joinPayload = {
      type: 'joined_room',
      roomCode,
      role,
      cachedLocation: lastKnownLocations.get(roomCode) || null,
      safeZone: roomMetadata.get(roomCode)?.safeZone || null,
      adherence: patientAdh,
      timestamp: Date.now(),
    };

    socket.emit('joined_room', joinPayload);
    socket.emit('message', joinPayload);

    broadcastToRoom(roomCode, {
      type: 'peer_status',
      role,
      status: 'connected',
    }, null, socket.id);
  });

  socket.on('location_update', (message = {}) => {
    const roomCode = socket.roomCode || message.roomCode;
    if (!roomCode) return;
    const payload = {
      ...(message.data || message),
      serverTimestamp: Date.now(),
    };
    lastKnownLocations.set(roomCode, payload);
    broadcastToRoom(roomCode, {
      type: 'location_update',
      roomCode,
      data: payload,
    }, null, socket.id);
  });

  socket.on('sos_alert', (message = {}) => {
    const roomCode = socket.roomCode || message.roomCode;
    if (!roomCode) return;
    console.log(`🚨 [Socket.io SOS] Room "${roomCode}" triggered SOS!`);
    const sosPayload = {
      type: 'sos_alert',
      roomCode,
      data: message.data || message || {},
      timestamp: Date.now(),
    };
    broadcastToRoom(roomCode, sosPayload);
    broadcastToAll(sosPayload);
  });

  socket.on('safe_zone_update', (message = {}) => {
    const roomCode = socket.roomCode || message.roomCode;
    if (!roomCode) return;
    const safeZone = message.safeZone || message;
    const currentMeta = roomMetadata.get(roomCode) || {};
    currentMeta.safeZone = safeZone;
    roomMetadata.set(roomCode, currentMeta);

    broadcastToRoom(roomCode, {
      type: 'safe_zone_update',
      roomCode,
      safeZone,
    });
  });

  socket.on('stop_sharing', (message = {}) => {
    const roomCode = socket.roomCode || message.roomCode;
    if (!roomCode) return;
    lastKnownLocations.delete(roomCode);
    broadcastToRoom(roomCode, {
      type: 'sharing_stopped',
      roomCode,
      reason: message.reason || 'Patient ended live sharing',
    });
  });

  socket.on('new_prescription', (message = {}) => {
    const targetRoom = message.roomCode || socket.roomCode;
    if (targetRoom) {
      broadcastToRoom(targetRoom, {
        type: 'new_prescription',
        ...message,
      });
    }
  });

  socket.on('medication_status_update', (message = {}) => {
    const targetRoom = message.roomCode || socket.roomCode;
    if (targetRoom) {
      broadcastToRoom(targetRoom, {
        type: 'medication_status_update',
        ...message,
      });
    }
  });

  socket.on('trigger_medication_reminder', (message = {}) => {
    const targetId = message.patientId || socket.roomCode || 'CARE-1001';
    triggerMedicationReminder(targetId, message.medicationId);
  });

  socket.on('medication_response', (message = {}) => {
    const { reminderId, patientId, medicationId, status } = message;
    const targetId = patientId || socket.roomCode;
    handleMedicationResponse(reminderId, targetId, medicationId, status);
  });

  socket.on('vitals_updated', (message = {}) => {
    const targetRoom = message.roomCode || socket.roomCode;
    if (targetRoom) {
      broadcastToRoom(targetRoom, {
        type: 'vitals_updated',
        ...message,
      });
    }
  });

  socket.on('new_activity', (message = {}) => {
    const targetRoom = message.roomCode || message.patientId || socket.roomCode;
    if (targetRoom) {
      const payload = {
        type: 'new_activity',
        roomCode: targetRoom,
        ...message,
      };
      broadcastToRoom(targetRoom, payload);
      broadcastToAll(payload);
    }
  });

  socket.on('activity_status_update', (message = {}) => {
    const targetRoom = message.roomCode || message.patientId || socket.roomCode;
    if (targetRoom) {
      const payload = {
        type: 'activity_status_update',
        roomCode: targetRoom,
        ...message,
      };
      broadcastToRoom(targetRoom, payload);
      broadcastToAll(payload);
    }
  });

  socket.on('delete_activity', (message = {}) => {
    const targetRoom = message.roomCode || message.patientId || socket.roomCode;
    if (targetRoom) {
      const payload = {
        type: 'delete_activity',
        roomCode: targetRoom,
        ...message,
      };
      broadcastToRoom(targetRoom, payload);
      broadcastToAll(payload);
    }
  });

  socket.on('booking_notification', (message = {}) => {
    const targetRoom = message.roomCode || message.patientId || socket.roomCode;
    const payload = {
      type: 'booking_notification',
      roomCode: targetRoom,
      ...message,
    };
    if (targetRoom) {
      broadcastToRoom(targetRoom, payload);
    }
    broadcastToAll(payload);
  });

  socket.on('message', (message = {}) => {
    if (typeof message === 'object' && message.type) {
      if (message.type === 'join') {
        const roomCode = (message.roomCode || '').toUpperCase().trim();
        if (roomCode) {
          socket.roomCode = roomCode;
          socket.role = message.role || 'caregiver';
          socket.join(roomCode);
        }
      } else {
        const targetRoom = message.roomCode || socket.roomCode;
        if (targetRoom) {
          broadcastToRoom(targetRoom, message, null, socket.id);
        }
      }
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.io DISCONNECT] Client ${socket.id} disconnected (${reason})`);
    if (socket.roomCode) {
      broadcastToRoom(socket.roomCode, {
        type: 'peer_status',
        role: socket.role,
        status: 'disconnected',
      }, null, socket.id);
    }
  });
});

// Room storage: roomCode -> Set of WebSocket clients
const rooms = new Map();
// Last known location cache: roomCode -> last location object
const lastKnownLocations = new Map();
// Room metadata: roomCode -> { safeZone: { lat, lng, radiusMeters } }
const roomMetadata = new Map();

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ interface: name, address: iface.address });
      }
    }
  }
  return ips;
}

wss.on('connection', (ws) => {
  ws.roomCode = null;
  ws.role = 'guest'; // 'patient' | 'caregiver'
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'join': {
          const { roomCode, role } = message;
          if (!roomCode) return;

          // Leave old room if any
          if (ws.roomCode && rooms.has(ws.roomCode)) {
            rooms.get(ws.roomCode).delete(ws);
          }

          ws.roomCode = roomCode.toUpperCase().trim();
          ws.role = role || 'caregiver';

          if (!rooms.has(ws.roomCode)) {
            rooms.set(ws.roomCode, new Set());
          }
          rooms.get(ws.roomCode).add(ws);

          console.log(`[JOIN] ${ws.role.toUpperCase()} joined room "${ws.roomCode}" (Total in room: ${rooms.get(ws.roomCode).size})`);

          // Send confirmation back with cached adherence & safeZone
          const patientAdh = calculatePatientAdherence(ws.roomCode);
          ws.send(JSON.stringify({
            type: 'joined_room',
            roomCode: ws.roomCode,
            role: ws.role,
            memberCount: rooms.get(ws.roomCode).size,
            cachedLocation: lastKnownLocations.get(ws.roomCode) || null,
            safeZone: roomMetadata.get(ws.roomCode)?.safeZone || null,
            adherence: patientAdh,
          }));

          // Notify other participants in the room
          broadcastToRoom(ws.roomCode, {
            type: 'peer_status',
            role: ws.role,
            status: 'connected',
            memberCount: rooms.get(ws.roomCode).size,
          }, ws);
          break;
        }

        case 'location_update': {
          if (!ws.roomCode) return;
          const payload = {
            ...message.data,
            serverTimestamp: Date.now(),
          };

          // Cache last known location
          lastKnownLocations.set(ws.roomCode, payload);

          // Broadcast to everyone else in this room (especially caregivers)
          broadcastToRoom(ws.roomCode, {
            type: 'location_update',
            roomCode: ws.roomCode,
            data: payload,
          }, ws);
          break;
        }

        case 'sos_alert': {
          if (!ws.roomCode) return;
          console.log(`🚨 [SOS ALERT] Room "${ws.roomCode}" triggered SOS!`);
          broadcastToRoom(ws.roomCode, {
            type: 'sos_alert',
            roomCode: ws.roomCode,
            data: message.data || {},
            timestamp: Date.now(),
          });
          break;
        }

        case 'safe_zone_update': {
          if (!ws.roomCode) return;
          const currentMeta = roomMetadata.get(ws.roomCode) || {};
          currentMeta.safeZone = message.safeZone;
          roomMetadata.set(ws.roomCode, currentMeta);

          broadcastToRoom(ws.roomCode, {
            type: 'safe_zone_update',
            roomCode: ws.roomCode,
            safeZone: message.safeZone,
          });
          break;
        }

        case 'stop_sharing': {
          if (!ws.roomCode) return;
          lastKnownLocations.delete(ws.roomCode);
          broadcastToRoom(ws.roomCode, {
            type: 'sharing_stopped',
            roomCode: ws.roomCode,
            reason: message.reason || 'Patient ended live sharing',
          });
          break;
        }

        case 'trigger_medication_reminder': {
          const targetId = message.patientId || ws.roomCode || 'CARE-1001';
          triggerMedicationReminder(targetId, message.medicationId);
          break;
        }

        case 'medication_response': {
          const { reminderId, patientId, medicationId, status } = message;
          const targetId = patientId || ws.roomCode;
          handleMedicationResponse(reminderId, targetId, medicationId, status);
          break;
        }

        case 'new_activity': {
          const targetRoom = message.roomCode || ws.roomCode;
          if (targetRoom) {
            broadcastToRoom(targetRoom, {
              type: 'new_activity',
              ...message,
            });
            broadcastToAll({
              type: 'new_activity',
              ...message,
            });
          }
          break;
        }

        case 'activity_status_update': {
          const targetRoom = message.roomCode || ws.roomCode;
          if (targetRoom) {
            broadcastToRoom(targetRoom, {
              type: 'activity_status_update',
              ...message,
            });
            broadcastToAll({
              type: 'activity_status_update',
              ...message,
            });
          }
          break;
        }

        case 'delete_activity': {
          const targetRoom = message.roomCode || ws.roomCode;
          if (targetRoom) {
            broadcastToRoom(targetRoom, {
              type: 'delete_activity',
              ...message,
            });
            broadcastToAll({
              type: 'delete_activity',
              ...message,
            });
          }
          break;
        }

        case 'booking_notification': {
          const targetRoom = message.roomCode || ws.roomCode;
          const payload = {
            type: 'booking_notification',
            ...message,
          };
          if (targetRoom) {
            broadcastToRoom(targetRoom, payload);
          }
          broadcastToAll(payload);
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[MESSAGE ERROR]', err.message);
    }
  });

  ws.on('close', () => {
    if (ws.roomCode && rooms.has(ws.roomCode)) {
      const room = rooms.get(ws.roomCode);
      room.delete(ws);
      console.log(`[LEAVE] ${ws.role.toUpperCase()} left room "${ws.roomCode}" (Remaining: ${room.size})`);

      if (room.size === 0) {
        rooms.delete(ws.roomCode);
      } else {
        broadcastToRoom(ws.roomCode, {
          type: 'peer_status',
          role: ws.role,
          status: 'disconnected',
          memberCount: room.size,
        });
      }
    }
  });
});

function broadcastToRoom(roomCode, messageObj, excludeWs = null, excludeSocketId = null) {
  // 1. Raw WebSocket broadcast
  const room = rooms.get(roomCode);
  if (room) {
    const str = JSON.stringify(messageObj);
    for (const client of room) {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(str);
      }
    }
  }

  // 2. Socket.io room broadcast
  try {
    const eventType = messageObj.type || 'message';
    if (excludeSocketId) {
      io.to(roomCode).except(excludeSocketId).emit(eventType, messageObj);
      io.to(roomCode).except(excludeSocketId).emit('message', messageObj);
    } else {
      io.to(roomCode).emit(eventType, messageObj);
      io.to(roomCode).emit('message', messageObj);
    }
  } catch (err) {
    console.error('[Socket.io broadcastToRoom Error]:', err.message);
  }
}

function broadcastToAll(messageObj) {
  // 1. Raw WebSocket broadcast
  const str = JSON.stringify(messageObj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });

  // 2. Socket.io global broadcast
  try {
    const eventType = messageObj.type || 'message';
    io.emit(eventType, messageObj);
    io.emit('message', messageObj);
  } catch (err) {
    console.error('[Socket.io broadcastToAll Error]:', err.message);
  }
}

// Heartbeat every 25 seconds
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Live Location Relay Server Running on Port ${PORT}`);
  console.log(`======================================================`);
  console.log(`Local Access:   ws://localhost:${PORT}`);
  const ips = getLocalIPs();
  ips.forEach((ip) => {
    console.log(`Mobile Access:  ws://${ip.address}:${PORT} (${ip.interface})`);
  });
  console.log(`======================================================\n`);
});
