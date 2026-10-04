const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.WEB_PORT || 4001;

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Mock database for Admin Dashboard
const adminDb = {
  stats: {
    totalPatients: 2150,
    criticalPatients: 42,
    stablePatients: 1820,
    activeCaregiverRatio: '1:8',
    criticalIncidentsToday: 4,
    carePlanCompliance: 96,
    breakdown: { mild: 1120, moderate: 750, severe: 300 }
  },
  patientsDirectory: [
    { id: 'p1', name: 'Eleanor Vance', condition: "Alzheimer's Stage 1", facility: 'Oakview Wing A', status: 'Stable' },
    { id: 'p2', name: 'Arthur Pendelton', condition: "Vascular Dementia", facility: 'Oakview Wing A', status: 'Stable' },
    { id: 'p3', name: 'Clara Oswald', condition: "Mild Cognitive Impairment", facility: 'Sunnyside Wing B', status: 'Critical' },
    { id: 'p4', name: 'John Doe', condition: "Alzheimer's Stage 2", facility: 'Maple Wing C', status: 'Stable' },
  ],
  activeCaregivers: [
    { id: 'c1', name: 'Sarah Vance', assignedPatients: 4, shift: '08:00 - 16:00' },
    { id: 'c2', name: 'Martha Pendelton', assignedPatients: 5, shift: '08:00 - 16:00' },
    { id: 'c3', name: 'Danny Pink', assignedPatients: 6, shift: '16:00 - 00:00' },
  ],
  facilities: [
    { id: 'f1', name: 'Wing A', status: 'Stable', statusColor: 'green' },
    { id: 'f2', name: 'Wing B', status: 'Attention', statusColor: 'yellow' },
    { id: 'f3', name: 'Wing C', status: 'Critical - Staffing', statusColor: 'red' },
  ],
  recentEvents: [
    { id: 907, patientName: 'Sarah Laa...', eventType: 'Medication Missed', time: '11:15 AM' },
    { id: 335, patientName: 'Marid I...', eventType: 'SOS Alert', time: '10:42 AM' },
    { id: 336, patientName: 'Maria M...', eventType: 'Wandering Detected', time: '09:30 AM' },
  ],
  alerts: [
    { id: 'al1', message: 'Nurse J. - Schedule conflict', severity: 'high' },
    { id: 'al2', message: 'Patient K. - Missed med dosage', severity: 'high' },
    { id: 'al3', message: 'Patient J. - Missed med dosage', severity: 'high' },
  ],
  roleComparison: {
    doctor: {
      pendingApprovals: 14,
      criticalAlerts: 3,
      todaysRounds: 24,
      capabilities: ['Modify Care Plans & Meds', 'Approve Caregiver Requests', 'Access Full Medical History']
    },
    caregiver: {
      assignedPatients: 8,
      tasksPending: 12,
      currentShift: '08:00 - 16:00',
      capabilities: ['Log Patient Vitals & Mood', 'Mark Meds as Administered', 'Alert Doctors/Supervisors']
    },
    patient: {
      nextMedication: 'Donepezil (2 PM)',
      dailyActivityGoal: '75%',
      familyVisits: 'Tomorrow',
      capabilities: ['View Personal Schedule', 'Engage in Memory Games', 'Call Nurse / Family']
    }
  }
};

// Admin Dashboard Endpoints
app.get('/api/admin/stats', (req, res) => res.json({ success: true, data: adminDb.stats }));
app.get('/api/admin/patients', (req, res) => res.json({ success: true, data: adminDb.patientsDirectory }));
app.get('/api/admin/caregivers', (req, res) => res.json({ success: true, data: adminDb.activeCaregivers }));
app.get('/api/admin/facilities', (req, res) => res.json({ success: true, data: adminDb.facilities }));
app.get('/api/admin/events', (req, res) => res.json({ success: true, data: adminDb.recentEvents }));
app.get('/api/admin/alerts', (req, res) => res.json({ success: true, data: adminDb.alerts }));
app.get('/api/admin/roles-overview', (req, res) => res.json({ success: true, data: adminDb.roleComparison }));
app.get('/api/admin/dashboard-all', (req, res) => res.json({ success: true, data: adminDb }));

io.on('connection', (socket) => {
  console.log(`[Web Socket.io CONNECT] Client connected: ${socket.id}`);
  socket.emit('admin_stats_update', adminDb.stats);

  socket.on('disconnect', () => {
    console.log(`[Web Socket.io DISCONNECT] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Web Backend Server (HTTP + Socket.IO) running on port ${PORT}`);
});
