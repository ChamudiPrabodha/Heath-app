// src/components/patient/ContactsModal.js - Emergency & Medical Contact Directory
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function ContactsModal({ visible, currentUser, onClose }) {
  const initialContacts = currentUser?.emergencyContact ? [
    {
      id: '1',
      name: currentUser.emergencyContact,
      role: 'Primary Emergency Contact',
      phone: currentUser.phone || '',
      type: 'caregiver',
      icon: 'heart',
      color: '#10B981',
    }
  ] : [];

  const [contacts, setContacts] = useState(initialContacts);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handleCall = (contact) => {
    const url = `tel:${contact.phone.replace(/[^0-9+]/g, '')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Phone Dialer', `Dialing ${contact.name} at ${contact.phone}`);
    });
  };

  const handleMessage = (contact) => {
    const url = `sms:${contact.phone.replace(/[^0-9+]/g, '')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Messaging App', `Sending SMS to ${contact.name} at ${contact.phone}`);
    });
  };

  const handleAddContact = () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Error', 'Please enter at least a name and a phone number.');
      return;
    }
    const newContact = {
      id: Date.now().toString(),
      name: newName.trim(),
      role: newRole.trim() || 'Custom Contact',
      phone: newPhone.trim(),
      type: 'custom',
      icon: 'address-book',
      color: '#F59E0B',
    };
    setContacts([...contacts, newContact]);
    setNewName('');
    setNewRole('');
    setNewPhone('');
    setShowAddForm(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="call" size={22} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.title}>Important Contacts</Text>
                <Text style={styles.subtitle}>Caregiver & medical emergency lines</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* List of Contacts */}
          <ScrollView style={styles.list}>
            {contacts.map((c) => (
              <View key={c.id} style={styles.contactCard}>
                <View style={[styles.avatarCircle, { backgroundColor: `${c.color}15` }]}>
                  <FontAwesome5 name={c.icon} size={18} color={c.color} />
                </View>

                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactRole}>{c.role}</Text>
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]}
                    onPress={() => handleMessage(c)}
                  >
                    <Ionicons name="chatbubble" size={16} color={c.color} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: c.color }]}
                    onPress={() => handleCall(c)}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add Contact Form */}
            {showAddForm ? (
              <View style={styles.addFormContainer}>
                <Text style={styles.formTitle}>Add New Contact</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contact Name"
                  placeholderTextColor="#9CA3AF"
                  value={newName}
                  onChangeText={setNewName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Role or Relationship"
                  placeholderTextColor="#9CA3AF"
                  value={newRole}
                  onChangeText={setNewRole}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                />
                <View style={styles.formActions}>
                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => setShowAddForm(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveBtn} 
                    onPress={handleAddContact}
                  >
                    <Text style={styles.saveBtnText}>Save Contact</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addContactBtn} 
                onPress={() => setShowAddForm(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
                <Text style={styles.addContactText}>Add New Contact</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Contacts</Text>
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
    maxHeight: '85%',
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
    backgroundColor: '#EFF6FF',
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
  list: {
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  contactRole: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  contactPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addContactText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  addFormContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    color: '#111827',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  doneBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
});
