// src/components/patient/ProfileModal.js - Patient Medical & Personal Profile Card
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileModal({ visible, currentUser, onClose }) {
  const [profileImage, setProfileImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields state
  const [bloodGroup, setBloodGroup] = useState('');
  const [ageDOB, setAgeDOB] = useState('');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');

  // When modal opens or currentUser changes, load existing or fallback to empty
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (visible && currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBloodGroup(currentUser.bloodGroup || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAgeDOB(currentUser.ageDOB || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddress(currentUser.address || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAllergies(currentUser.allergies || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(false);
    }
  }, [visible, currentUser]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setIsSaving(true);
    try {
      // In a real app, you would make an API call here to update the user in backend.
      // e.g. await fetch(`/api/patients/${currentUser.id}`, { method: 'PUT', body: JSON.stringify({...}) })
      // For now, we simulate success
      await new Promise(res => setTimeout(res, 600));

      // Update the currentUser object locally so UI reflects instantly (mock)
      if (currentUser) {
        // eslint-disable-next-line react-hooks/immutability
        currentUser.bloodGroup = bloodGroup;
        // eslint-disable-next-line react-hooks/immutability
        currentUser.ageDOB = ageDOB;
        // eslint-disable-next-line react-hooks/immutability
        currentUser.address = address;
        // eslint-disable-next-line react-hooks/immutability
        currentUser.allergies = allergies;
      }
      
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const profileItems = [
    { key: 'name', label: 'Full Name', value: currentUser?.name || 'Not set', icon: 'person-outline', editable: false },
    { key: 'email', label: 'Email Address', value: currentUser?.email || 'Not set', icon: 'mail-outline', editable: false },
    { key: 'phone', label: 'Phone Number', value: currentUser?.phone || 'Not set', icon: 'call-outline', editable: false },
    { key: 'code', label: 'Caregiver Pairing Code', value: currentUser?.pairingCode || 'Not set', icon: 'key-outline', highlight: true, editable: false },
    { key: 'bloodGroup', label: 'Blood Group', value: bloodGroup, icon: 'water-outline', editable: true, placeholder: 'e.g., O Positive (O+)', stateSetter: setBloodGroup },
    { key: 'age', label: 'Age / DOB', value: ageDOB, icon: 'calendar-outline', editable: true, placeholder: 'e.g., 72 Years (May 14, 1954)', stateSetter: setAgeDOB },
    { key: 'caregiver', label: 'Primary Caregiver', value: currentUser?.emergencyContact || 'Not set', icon: 'heart-outline', editable: false },
    { key: 'address', label: 'Home Address', value: address, icon: 'home-outline', editable: true, placeholder: 'Enter your home address', stateSetter: setAddress },
    { key: 'allergies', label: 'Known Allergies', value: allergies, icon: 'alert-circle-outline', editable: true, placeholder: 'e.g., Penicillin, Peanuts', stateSetter: setAllergies },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <FontAwesome5 name="user-check" size={24} color="#10B981" />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>Patient Profile</Text>
                <Text style={styles.subtitle}>Medical identity & emergency card</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Profile details */}
          <ScrollView style={styles.list}>
            {profileItems.map((item) => (
              <View
                key={item.key}
                style={[styles.profileCard, item.highlight && styles.profileCardHighlight]}
              >
                <View style={styles.iconBox}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.highlight ? '#059669' : '#6B7280'}
                  />
                </View>
                <View style={styles.detailsCol}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  {isEditing && item.editable ? (
                    <TextInput
                      style={styles.itemInput}
                      value={item.value}
                      onChangeText={item.stateSetter}
                      placeholder={item.placeholder}
                      placeholderTextColor="#9CA3AF"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.itemValue, 
                        item.highlight && styles.itemValueHighlight,
                        !item.value && { color: '#9CA3AF', fontStyle: 'italic' }
                      ]}
                    >
                      {item.value || 'Not provided'}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, isEditing ? styles.saveBtn : styles.editBtn]} 
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name={isEditing ? "checkmark" : "pencil"} size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>{isEditing ? 'Save Details' : 'Edit Profile'}</Text>
                </>
              )}
            </TouchableOpacity>
            
            {isEditing && (
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
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
    maxHeight: '88%',
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
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#3B82F6',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  profileCardHighlight: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  itemInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  itemValueHighlight: {
    color: '#059669',
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  editBtn: {
    backgroundColor: '#3B82F6',
  },
  saveBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
});
