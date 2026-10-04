// src/components/caregiver/ContactSupportModal.js - Help Desk & 24/7 Clinical Care Support
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ContactSupportModal({ visible, onClose }) {
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCallHelpline = () => {
    Linking.openURL('tel:18005552273').catch(() => {
      Alert.alert('Support Helpline', 'Dialing HealthTrack Clinical Support (+1 800-555-CARE)');
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@healthtrack.care?subject=Caregiver%20Support%20Request').catch(() => {
      Alert.alert('Email Support', 'Contact us at support@healthtrack.care');
    });
  };

  const handleSubmitTicket = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Missing Details', 'Please enter a subject and message describing your issue.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        'Support Ticket Created',
        'Thank you. Your inquiry has been sent to our Clinical Care & Technical Support team. An agent will follow up within 15 minutes.'
      );
      setTicketSubject('');
      setTicketMessage('');
      onClose();
    }, 800);
  };

  const guides = [
    {
      title: '🚨 Patient Wandering Emergency Protocol',
      desc: '1. Keep live map open • 2. Check trajectory trail • 3. Call patient or dial 112 with exact OSM coordinates displayed.',
    },
    {
      title: '📍 GPS Accuracy Tips',
      desc: 'High precision mode works best outdoors. Indoors, Wi-Fi assist provides approximate positioning within ±10m.',
    },
    {
      title: '💊 Medication Non-Compliance',
      desc: 'If a patient forgets their dose, trigger a gentle check-in call or notify family emergency contacts.',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="headset" size={22} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>Caregiver Support Hub</Text>
                <Text style={styles.subtitle}>24/7 clinical helpline & emergency assistance</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {/* Quick Contact Buttons */}
            <View style={styles.contactButtonsRow}>
              <TouchableOpacity style={styles.callSupportBtn} onPress={handleCallHelpline}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <View>
                  <Text style={styles.btnTitleWhite}>24/7 Emergency Line</Text>
                  <Text style={styles.btnSubWhite}>+1 800-555-CARE</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.emailSupportBtn} onPress={handleEmailSupport}>
                <Ionicons name="mail" size={20} color="#2563EB" />
                <View>
                  <Text style={styles.btnTitleBlue}>Email Support</Text>
                  <Text style={styles.btnSubBlue}>support@healthtrack.care</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Emergency Protocol Guides */}
            <Text style={styles.sectionTitle}>Emergency Care Guides</Text>
            {guides.map((g, i) => (
              <View key={i} style={styles.guideCard}>
                <Text style={styles.guideTitle}>{g.title}</Text>
                <Text style={styles.guideDesc}>{g.desc}</Text>
              </View>
            ))}

            {/* Submit Ticket Form */}
            <Text style={styles.sectionTitle}>Request Clinical or Technical Help</Text>
            <View style={styles.ticketCard}>
              <TextInput
                style={styles.subjectInput}
                value={ticketSubject}
                onChangeText={setTicketSubject}
                placeholder="Issue Subject (e.g. GPS sync issue, medication question)"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={styles.messageInput}
                value={ticketMessage}
                onChangeText={setTicketMessage}
                placeholder="Describe what you need assistance with..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.submitTicketBtn}
                onPress={handleSubmitTicket}
                disabled={submitting}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.submitTicketBtnText}>
                  {submitting ? 'Submitting...' : 'Send Support Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    marginBottom: 14,
  },
  contactButtonsRow: {
    gap: 10,
    marginBottom: 16,
  },
  callSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  btnTitleWhite: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnSubWhite: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 1,
  },
  emailSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  btnTitleBlue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
  },
  btnSubBlue: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 6,
  },
  guideCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  guideDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  ticketCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  subjectInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
  },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    height: 70,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
  },
  submitTicketBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitTicketBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
