// src/services/bookingService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notificationService';
import { syncService } from './syncService';

const BOOKINGS_STORAGE_KEY = '@healthtrack_doctor_bookings';

export const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getOffsetDateStr = (daysOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch (_e) {}
  return dateStr;
};

const DEFAULT_BOOKINGS = [
  {
    id: 'book-101',
    patientId: 'CARE-8133',
    patientName: 'Chamudi Prabodha',
    date: getTodayDateStr(),
    time: '09:30 AM',
    type: 'In-Clinic Consultation',
    mode: 'in_clinic',
    notes: 'Comprehensive cognitive assessment & check Donepezil tolerance.',
    status: 'Confirmed',
    doctorName: 'Dr. Vimukthi Perera',
    createdAt: Date.now() - 3600000 * 2,
    notifiedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'book-102',
    patientId: 'CARE-8133',
    patientName: 'Chamudi Prabodha',
    date: getTodayDateStr(),
    time: '02:30 PM',
    type: 'Telehealth Video Call',
    mode: 'telehealth',
    notes: 'Afternoon telemetry checkup & hydration log review with primary caregiver.',
    status: 'Upcoming',
    doctorName: 'Dr. Vimukthi Perera',
    createdAt: Date.now() - 3600000 * 4,
    notifiedAt: null,
  },
  {
    id: 'book-103',
    patientId: 'CARE-8133',
    patientName: 'Chamudi Prabodha',
    date: getOffsetDateStr(1),
    time: '11:00 AM',
    type: 'Routine Follow-up',
    mode: 'in_clinic',
    notes: 'Evaluate nighttime wander risk metrics and adjust evening dosage schedule.',
    status: 'Upcoming',
    doctorName: 'Dr. Vimukthi Perera',
    createdAt: Date.now() - 3600000 * 8,
    notifiedAt: null,
  },
  {
    id: 'book-104',
    patientId: 'CARE-8133',
    patientName: 'Chamudi Prabodha',
    date: getOffsetDateStr(3),
    time: '10:00 AM',
    type: 'Medication Review',
    mode: 'in_clinic',
    notes: 'Review complete weekly pill adherence report and blood pressure trend.',
    status: 'Upcoming',
    doctorName: 'Dr. Vimukthi Perera',
    createdAt: Date.now() - 3600000 * 12,
    notifiedAt: null,
  },
];

class BookingService {
  constructor() {
    this.listeners = new Map();
    this.bookings = [];
    this.isLoaded = false;
    this.loadBookings();
  }

  async loadBookings() {
    try {
      const stored = await AsyncStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (stored) {
        this.bookings = JSON.parse(stored);
      } else {
        this.bookings = [...DEFAULT_BOOKINGS];
        await this.saveBookings();
      }
      this.isLoaded = true;
      this.emit('bookings_updated', this.bookings);
    } catch (e) {
      console.error('[BookingService] Failed to load bookings:', e);
      this.bookings = [...DEFAULT_BOOKINGS];
      this.isLoaded = true;
    }
  }

  async saveBookings() {
    try {
      await AsyncStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(this.bookings));
      this.emit('bookings_updated', this.bookings);
    } catch (e) {
      console.error('[BookingService] Failed to save bookings:', e);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => {
      const arr = this.listeners.get(event);
      if (arr) {
        this.listeners.set(event, arr.filter(cb => cb !== callback));
      }
    };
  }

  emit(event, data) {
    const arr = this.listeners.get(event);
    if (arr) {
      arr.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[BookingService] Error in listener for ${event}:`, err);
        }
      });
    }
  }

  async getBookings() {
    if (!this.isLoaded) {
      await this.loadBookings();
    }
    return this.bookings;
  }

  async getBookingsForDate(dateStr) {
    const all = await this.getBookings();
    return all
      .filter(b => b.date === dateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  async getTodayBookings() {
    const todayStr = getTodayDateStr();
    return this.getBookingsForDate(todayStr);
  }

  async addBooking(bookingData) {
    const newBooking = {
      id: 'book-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: Date.now(),
      status: 'Upcoming',
      notifiedAt: null,
      ...bookingData,
    };

    this.bookings.unshift(newBooking);
    await this.saveBookings();

    if (bookingData.shouldNotify) {
      this.notifyPatientAndCaregiver(newBooking, bookingData.doctorName);
    }

    return newBooking;
  }

  async updateBooking(id, updates) {
    let found = false;
    this.bookings = this.bookings.map(b => {
      if (b.id === id) {
        found = true;
        return { ...b, ...updates };
      }
      return b;
    });

    if (found) {
      await this.saveBookings();
    }
    return this.bookings.find(b => b.id === id);
  }

  async deleteBooking(id) {
    const initialLen = this.bookings.length;
    this.bookings = this.bookings.filter(b => b.id !== id);
    if (this.bookings.length !== initialLen) {
      await this.saveBookings();
      return true;
    }
    return false;
  }

  notifyPatientAndCaregiver(booking, doctorName = 'Dr. Vimukthi Perera') {
    const patientName = booking.patientName || 'Patient';
    const dateFormatted = formatDisplayDate(booking.date) || booking.date;
    const time = booking.time || 'Scheduled Time';
    const type = booking.type || 'Clinical Consultation';
    const notes = booking.notes ? ` Notes: "${booking.notes}"` : '';

    // 1. Patient Notification
    notificationService.addNotification({
      type: 'booking',
      title: '📅 Doctor Appointment Scheduled',
      message: `${doctorName} scheduled an appointment (${type}) on ${dateFormatted} at ${time}.${notes}`,
      icon: 'calendar-clock',
      color: '#0284C7',
      bg: '#E0F2FE',
    }, ['patient', 'dual']);

    // 2. Caregiver Notification
    notificationService.addNotification({
      type: 'booking',
      title: '📅 Patient Appointment Booking',
      message: `${doctorName} scheduled an appointment for ${patientName} on ${dateFormatted} at ${time} (${type}).${notes}`,
      icon: 'calendar-check',
      color: '#2563EB',
      bg: '#EFF6FF',
    }, ['caregiver']);

    // 3. Doctor Notification confirmation
    notificationService.addNotification({
      type: 'booking',
      title: '✅ Booking Notification Dispatched',
      message: `Notification sent to ${patientName} & caregiver for ${dateFormatted} at ${time}.`,
      icon: 'check-circle',
      color: '#059669',
      bg: '#ECFDF5',
    }, ['doctor']);

    // 4. Real-time WebSocket / local sync event
    syncService.sendBookingNotification({
      ...booking,
      doctorName,
      patientName,
      dateFormatted,
    });

    // Mark as notified
    this.updateBooking(booking.id, { notifiedAt: Date.now() });

    return true;
  }
}

export const bookingService = new BookingService();
