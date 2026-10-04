// src/services/notificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = '@healthtrack_notifications';

class NotificationService {
  constructor() {
    this.listeners = new Map();
    this.notifications = [];
    this.loadNotifications();
  }

  async loadNotifications() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.emit('notifications_updated', this.notifications);
      }
    } catch (e) {
      console.error('Error loading notifications', e);
    }
  }

  async saveNotifications() {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (e) {
      console.error('Error saving notifications', e);
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
      arr.forEach(cb => cb(data));
    }
  }

  addNotification(notif, targetRoles = ['patient', 'caregiver', 'doctor']) {
    // Prevent duplicate notifications within 2 seconds
    const isDuplicate = this.notifications.some(n => 
      n.title === notif.title && 
      n.message === notif.message && 
      (Date.now() - n.timestamp) < 2000
    );

    if (isDuplicate) return;

    const newNotif = {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: Date.now(),
      isRead: false,
      targetRoles,
      ...notif,
    };
    this.notifications.unshift(newNotif);
    
    // Cap at 150 notifications total
    if (this.notifications.length > 150) {
      this.notifications = this.notifications.slice(0, 150);
    }
    
    this.saveNotifications();
    this.emit('notifications_updated', this.notifications);
    this.emit('new_notification', newNotif);
  }

  getNotifications(role) {
    if (!role) return this.notifications;
    return this.notifications.filter(n => n.targetRoles && n.targetRoles.includes(role));
  }

  markAllAsRead(role) {
    let changed = false;
    this.notifications = this.notifications.map(n => {
      if (!role || (n.targetRoles && n.targetRoles.includes(role))) {
        if (!n.isRead) {
          changed = true;
          return { ...n, isRead: true };
        }
      }
      return n;
    });
    
    if (changed) {
      this.saveNotifications();
      this.emit('notifications_updated', this.notifications);
    }
  }

  deleteNotification(id) {
    const initialLen = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.id !== id);
    if (this.notifications.length !== initialLen) {
      this.saveNotifications();
      this.emit('notifications_updated', this.notifications);
    }
  }

  getUnreadCount(role) {
    return this.notifications.filter(n => (!role || (n.targetRoles && n.targetRoles.includes(role))) && !n.isRead).length;
  }
}

export const notificationService = new NotificationService();
