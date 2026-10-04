import { Platform } from 'react-native';
import { io } from 'socket.io-client';

export const getDefaultServerUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:4000`;
  }
  try {
    const Constants = require('expo-constants').default;
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:4000`;
      }
    }
    if (Constants?.linkingUri) {
      const match = Constants.linkingUri.match(/:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:4000`;
      }
    }
  } catch (_e) {}

  // Primary Wi-Fi LAN IP (reachable by physical phone devices)
  return 'http://172.18.150.21:4000';
};

// In-app singleton event bus (for local / dual-screen testing without latency)
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return () => this.off(event, listener);
  }
  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }
  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
}

export const localBus = new SimpleEventEmitter();

class SyncManager {
  constructor() {
    this.socket = null;
    this.ws = null;
    this.roomCode = 'CARE-1001';
    this.role = 'caregiver'; // 'patient' | 'caregiver'
    this.serverUrl = getDefaultServerUrl();
    this.isConnected = false;
    this.reconnectTimer = null;
    this.listeners = new SimpleEventEmitter();
    this.lastSentLocation = null;
    this.lastReceivedLocation = null;

    // Listen to local bus to support dual screen or local fallback
    localBus.on('internal_location_update', (payload) => {
      if (payload.roomCode === this.roomCode) {
        this.lastReceivedLocation = payload.data;
        this.listeners.emit('location_update', payload.data);
      }
    });

    localBus.on('internal_sos', (payload) => {
      if (payload.roomCode === this.roomCode) {
        this.listeners.emit('sos_alert', payload);
      }
    });

    localBus.on('internal_safe_zone', (payload) => {
      if (payload.roomCode === this.roomCode) {
        this.listeners.emit('safe_zone_update', payload.safeZone);
      }
    });

    localBus.on('internal_vitals', (payload) => {
      if (!this.roomCode || payload.roomCode === this.roomCode || this.role === 'doctor' || this.role === 'caregiver') {
        this.listeners.emit('vitals_updated', payload);
      }
    });

    localBus.on('internal_stop_sharing', (payload) => {
      if (payload.roomCode === this.roomCode) {
        this.listeners.emit('sharing_stopped', payload);
      }
    });

    localBus.on('internal_new_prescription', (payload) => {
      if (payload.roomCode === this.roomCode) {
        this.listeners.emit('new_prescription', payload);
      }
    });

    localBus.on('internal_medication_status', (payload) => {
      if (!this.roomCode || payload.roomCode === this.roomCode || this.role === 'doctor' || this.role === 'caregiver') {
        this.listeners.emit('medication_status_update', payload);
      }
    });

    localBus.on('internal_medication_response', (payload) => {
      if (!this.roomCode || payload.roomCode === this.roomCode || this.role === 'doctor' || this.role === 'caregiver') {
        this.listeners.emit('medication_response', payload);
        this.listeners.emit('medication_status_recorded', {
          type: 'medication_status_recorded',
          patientId: payload.patientId || payload.roomCode,
          roomCode: payload.roomCode || payload.patientId,
          status: payload.status,
          log: {
            medicineName: payload.medicineName || 'Medication',
            dosage: payload.dosage || '',
            status: payload.status,
            timestamp: payload.timestamp || Date.now(),
          },
        });
      }
    });

    localBus.on('internal_medication_reminder', (payload) => {
      this.listeners.emit('medication_reminder', payload);
    });

    localBus.on('internal_medication_reminder_timeout', (payload) => {
      this.listeners.emit('medication_reminder_timeout', payload);
    });

    localBus.on('internal_adherence_updated', (payload) => {
      this.listeners.emit('adherence_updated', payload);
    });

    localBus.on('internal_ai_risk_updated', (payload) => {
      this.listeners.emit('ai_risk_updated', payload);
    });

    localBus.on('internal_medication_day_status', (payload) => {
      this.listeners.emit('medication_day_status_updated', payload);
    });

    localBus.on('internal_caregiver_alert', (payload) => {
      this.listeners.emit('caregiver_alert', payload);
    });

    localBus.on('internal_new_activity', (payload) => {
      if (payload.roomCode === this.roomCode || payload.patientId === this.roomCode) {
        this.listeners.emit('new_activity', payload);
      }
    });

    localBus.on('internal_activity_status', (payload) => {
      if (payload.roomCode === this.roomCode || payload.patientId === this.roomCode) {
        this.listeners.emit('activity_status_update', payload);
      }
    });

    localBus.on('internal_delete_activity', (payload) => {
      if (payload.roomCode === this.roomCode || payload.patientId === this.roomCode) {
        this.listeners.emit('delete_activity', payload);
      }
    });

    localBus.on('internal_booking_notification', (payload) => {
      this.listeners.emit('booking_notification', payload);
    });
  }

  getNormalizedUrl(url = this.serverUrl) {
    let target = (url || getDefaultServerUrl()).trim();
    if (target.startsWith('ws://')) {
      target = 'http://' + target.slice(5);
    } else if (target.startsWith('wss://')) {
      target = 'https://' + target.slice(6);
    } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'http://' + target;
    }
    return target.replace(/\/+$/, '');
  }

  setServerUrl(url) {
    if (url && url !== this.serverUrl) {
      this.serverUrl = url;
      if (this.isConnected) {
        this.connect(this.roomCode, this.role);
      }
    }
  }

  getServerUrl() {
    return this.serverUrl;
  }

  connect(roomCode = this.roomCode, role = this.role) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.role = role;

    this.disconnect();

    const targetUrl = this.getNormalizedUrl(this.serverUrl);
    this.listeners.emit('connection_change', { status: 'connecting', url: targetUrl });

    try {
      // Connect using Socket.IO with WebSocket transport for reliable React Native networking
      const socket = io(targetUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 4000,
        timeout: 15000,
        autoConnect: true,
      });

      this.socket = socket;

      socket.on('connect', () => {
        if (this.socket !== socket) return;
        this.isConnected = true;
        this.listeners.emit('connection_change', { status: 'connected', roomCode: this.roomCode });

        // Join room immediately upon connection
        socket.emit('join', {
          roomCode: this.roomCode,
          role: this.role,
        });
      });

      socket.on('joined_room', (data) => this.handleIncomingMessage(data));
      socket.on('location_update', (data) => this.handleIncomingMessage(data));
      socket.on('sos_alert', (data) => this.handleIncomingMessage(data));
      socket.on('safe_zone_update', (data) => this.handleIncomingMessage(data));
      socket.on('sharing_stopped', (data) => this.handleIncomingMessage(data));
      socket.on('peer_status', (data) => this.handleIncomingMessage(data));
      socket.on('new_prescription', (data) => this.handleIncomingMessage(data));
      socket.on('medication_status_update', (data) => this.handleIncomingMessage(data));
      socket.on('medication_reminder', (data) => this.handleIncomingMessage(data));
      socket.on('medication_reminder_timeout', (data) => this.handleIncomingMessage(data));
      socket.on('medication_status_recorded', (data) => this.handleIncomingMessage(data));
      socket.on('adherence_updated', (data) => this.handleIncomingMessage(data));
      socket.on('ai_risk_updated', (data) => this.handleIncomingMessage(data));
      socket.on('caregiver_alert', (data) => this.handleIncomingMessage(data));
      socket.on('vitals_updated', (data) => this.handleIncomingMessage(data));
      socket.on('new_invitation', (data) => this.handleIncomingMessage(data));
      socket.on('invitation_approved', (data) => this.handleIncomingMessage(data));
      socket.on('connection_revoked', (data) => this.handleIncomingMessage(data));
      socket.on('new_activity', (data) => this.handleIncomingMessage(data));
      socket.on('activity_status_update', (data) => this.handleIncomingMessage(data));
      socket.on('delete_activity', (data) => this.handleIncomingMessage(data));
      socket.on('booking_notification', (data) => this.handleIncomingMessage(data));

      socket.on('message', (msg) => {
        let parsed = msg;
        if (typeof msg === 'string') {
          try { parsed = JSON.parse(msg); } catch (_e) {}
        }
        if (parsed && typeof parsed === 'object') {
          this.handleIncomingMessage(parsed);
        }
      });

      socket.on('connect_error', (err) => {
        console.warn('Socket.IO connection warning (local bus active):', err?.message || 'Network error');
      });

      socket.on('disconnect', (reason) => {
        if (this.socket === socket) {
          this.isConnected = false;
          this.listeners.emit('connection_change', { status: 'disconnected', roomCode: this.roomCode, reason });
        }
      });
    } catch (e) {
      console.warn('Socket.IO init exception:', e);
      this.isConnected = false;
      this.listeners.emit('connection_change', { status: 'disconnected', error: e.message });
    }
  }

  handleIncomingMessage(msg) {
    switch (msg.type) {
      case 'joined_room':
        if (msg.cachedLocation) {
          this.lastReceivedLocation = msg.cachedLocation;
          this.listeners.emit('location_update', msg.cachedLocation);
        }
        if (msg.safeZone) {
          this.listeners.emit('safe_zone_update', msg.safeZone);
        }
        this.listeners.emit('peer_status', {
          role: msg.role,
          memberCount: msg.memberCount,
          status: 'ready',
        });
        break;

      case 'location_update':
        this.lastReceivedLocation = msg.data;
        this.listeners.emit('location_update', msg.data);
        break;

      case 'sos_alert':
        this.listeners.emit('sos_alert', msg);
        break;

      case 'safe_zone_update':
        this.listeners.emit('safe_zone_update', msg.safeZone);
        break;

      case 'sharing_stopped':
        this.lastReceivedLocation = null;
        this.listeners.emit('sharing_stopped', msg);
        break;

      case 'peer_status':
        this.listeners.emit('peer_status', msg);
        break;

      case 'new_prescription':
        this.listeners.emit('new_prescription', msg);
        break;

      case 'medication_status_update':
        this.listeners.emit('medication_status_update', msg);
        break;

      case 'medication_reminder':
        this.listeners.emit('medication_reminder', msg);
        break;

      case 'medication_reminder_timeout':
        this.listeners.emit('medication_reminder_timeout', msg);
        break;

      case 'medication_status_recorded':
        this.listeners.emit('medication_status_recorded', msg);
        break;

      case 'adherence_updated':
        this.listeners.emit('adherence_updated', msg);
        break;

      case 'ai_risk_updated':
        this.listeners.emit('ai_risk_updated', msg);
        break;

      case 'caregiver_alert':
        this.listeners.emit('caregiver_alert', msg);
        break;

      case 'vitals_updated':
        this.listeners.emit('vitals_updated', msg);
        break;

      case 'new_invitation':
        this.listeners.emit('new_invitation', msg);
        break;

      case 'invitation_approved':
        this.listeners.emit('invitation_approved', msg);
        break;

      case 'connection_revoked':
        this.listeners.emit('connection_revoked', msg);
        break;

      case 'new_activity':
        this.listeners.emit('new_activity', msg);
        break;

      case 'activity_status_update':
        this.listeners.emit('activity_status_update', msg);
        break;

      case 'delete_activity':
        this.listeners.emit('delete_activity', msg);
        break;

      case 'booking_notification':
        this.listeners.emit('booking_notification', msg);
        break;

      default:
        break;
    }
  }

  send(data) {
    if (this.socket && this.socket.connected) {
      const eventName = data.type || 'message';
      this.socket.emit(eventName, data);
      this.socket.emit('message', data);
      return true;
    }
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Broadcast location update from Patient
   */
  sendLocationUpdate(locationData) {
    this.lastSentLocation = locationData;

    // Send over WebSocket network
    this.send({
      type: 'location_update',
      roomCode: this.roomCode,
      data: locationData,
    });

    // Also mirror to local event bus for zero-latency local testing
    localBus.emit('internal_location_update', {
      roomCode: this.roomCode,
      data: locationData,
    });
  }

  sendVitalsUpdate(roomCode, vitalsObj) {
    const payload = {
      type: 'vitals_updated',
      roomCode,
      patientId: roomCode,
      vitals: vitalsObj,
      timestamp: Date.now(),
    };
    this.send(payload);
    localBus.emit('internal_vitals', payload);
  }

  /**
   * Send SOS emergency alert
   */
  sendSOS(customData = {}) {
    const payload = {
      type: 'sos_alert',
      roomCode: this.roomCode,
      data: {
        ...customData,
        lastLocation: this.lastSentLocation,
        timestamp: Date.now(),
      },
    };
    this.send(payload);
    localBus.emit('internal_sos', payload);
  }

  /**
   * Update Safe Zone (Geofence)
   */
  updateSafeZone(safeZone) {
    const payload = {
      type: 'safe_zone_update',
      roomCode: this.roomCode,
      safeZone,
    };
    this.send(payload);
    localBus.emit('internal_safe_zone', payload);
  }

  /**
   * Stop live location sharing
   */
  stopSharing(reason = 'Sharing ended by patient') {
    const payload = {
      type: 'stop_sharing',
      roomCode: this.roomCode,
      reason,
    };
    this.send(payload);
    localBus.emit('internal_stop_sharing', payload);
  }

  /**
   * Broadcast new prescription added by doctor
   */
  sendNewPrescription(patientId, patientName, medicineName, doctorName, actionType) {
    const payload = {
      type: 'new_prescription',
      roomCode: patientId, // broadcasting to the patient's room
      data: {
        patientName,
        medicineName,
        doctorName,
        actionType,
        timestamp: Date.now(),
      }
    };
    this.send(payload);
    localBus.emit('internal_new_prescription', payload);
  }

  /**
   * Broadcast patient medication status (taken/missed)
   */
  sendMedicationStatusUpdate(patientId, medicineName, status, dosage = '') {
    const payload = {
      type: 'medication_status_update',
      roomCode: patientId, // broadcasting to the patient's room
      patientId,
      data: {
        medicineName,
        dosage,
        status, // 'taken' | 'missed'
        timestamp: Date.now(),
      }
    };
    this.send(payload);
    localBus.emit('internal_medication_status', payload);
  }

  /**
   * Send Medication Response (Taken / Skip)
   * Figure 4.3: Immediately creates MedicationLog, notifies caregiver if skip, recalculates adherence
   */
  sendMedicationResponse(reminderId, patientId, medicationId, status, medicineName = 'Medication', dosage = '') {
    const payload = {
      type: 'medication_response',
      reminderId,
      patientId: patientId || this.roomCode,
      roomCode: patientId || this.roomCode,
      medicationId,
      medicineName,
      dosage,
      status, // 'taken' | 'skipped'
      timestamp: Date.now(),
    };
    this.send(payload);
    localBus.emit('internal_medication_response', payload);

    // Call HTTP endpoint as guaranteed backup
    const serverHttpUrl = this.getNormalizedUrl(this.serverUrl);
    fetch(`${serverHttpUrl}/api/medications/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  /**
   * Manually or Test-Trigger a Medication Reminder
   */
  triggerMedicationReminder(patientId, medicationId) {
    const targetPatientId = patientId || this.roomCode;
    const payload = {
      type: 'trigger_medication_reminder',
      patientId: targetPatientId,
      medicationId,
    };
    this.send(payload);

    const serverHttpUrl = this.getNormalizedUrl(this.serverUrl);
    fetch(`${serverHttpUrl}/api/medications/trigger-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  /**
   * Broadcast new activity assigned by Caregiver
   */
  sendNewActivity(patientId, activity, caregiverName = 'Caregiver') {
    const targetRoom = (patientId || this.roomCode).toUpperCase();
    const payload = {
      type: 'new_activity',
      roomCode: targetRoom,
      patientId: targetRoom,
      activity,
      caregiverName,
      timestamp: Date.now(),
    };
    this.send(payload);
    localBus.emit('internal_new_activity', payload);
  }

  /**
   * Broadcast activity completion / status toggle
   */
  sendActivityStatusUpdate(patientId, activityId, completed, activity = null) {
    const targetRoom = (patientId || this.roomCode).toUpperCase();
    const payload = {
      type: 'activity_status_update',
      roomCode: targetRoom,
      patientId: targetRoom,
      activityId,
      completed,
      activity,
      timestamp: Date.now(),
    };
    this.send(payload);
    localBus.emit('internal_activity_status', payload);
  }

  /**
   * Broadcast activity deletion
   */
  sendDeleteActivity(patientId, activityId) {
    const targetRoom = (patientId || this.roomCode).toUpperCase();
    const payload = {
      type: 'delete_activity',
      roomCode: targetRoom,
      patientId: targetRoom,
      activityId,
      timestamp: Date.now(),
    };
    this.send(payload);
    localBus.emit('internal_delete_activity', payload);
  }

  on(event, callback) {
    return this.listeners.on(event, callback);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (_e) {}
      this.socket = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_e) {}
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Broadcast doctor booking notification to patient and caregiver
   */
  sendBookingNotification(bookingData) {
    const payload = {
      type: 'booking_notification',
      roomCode: bookingData.patientId || this.roomCode,
      patientId: bookingData.patientId,
      booking: bookingData,
      timestamp: Date.now(),
    };
    this.send(payload);
    localBus.emit('internal_booking_notification', payload);
  }
}

export const syncService = new SyncManager();
