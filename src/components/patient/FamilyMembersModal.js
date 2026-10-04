// src/components/patient/FamilyMembersModal.js - Dementia Memory Album & Family Contact Directory
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  RELATIONSHIP_PRESETS,
  AVATAR_PRESETS,
  calculateAge,
  formatBirthdayDisplay,
  getBirthdayCountdown,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from '../../services/familyMembersService';

export default function FamilyMembersModal({
  visible,
  patientId,
  familyMembers = [],
  onUpdateFamilyMembers,
  onClose,
}) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photo, setPhoto] = useState('');
  const [memoryNotes, setMemoryNotes] = useState('');
  const [favoriteMemory, setFavoriteMemory] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setRelationship('Daughter');
    setBirthday('');
    setPhone('');
    setWhatsapp('');
    setPhoto('');
    setMemoryNotes('');
    setFavoriteMemory('');
    setEditingMember(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setPhoto(AVATAR_PRESETS[0]);
    setFormVisible(true);
  };

  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setName(member.name || '');
    setRelationship(member.relationship || 'Loved One');
    setBirthday(member.birthday || '');
    setPhone(member.phone || '');
    setWhatsapp(member.whatsapp || member.phone || '');
    setPhoto(member.photo || AVATAR_PRESETS[0]);
    setMemoryNotes(member.memoryNotes || '');
    setFavoriteMemory(member.favoriteMemory || '');
    setFormVisible(true);
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow gallery access to choose a family member photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleSaveMember = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your family member’s name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Missing Phone', 'Please enter a contact phone number.');
      return;
    }

    setSaving(true);
    try {
      let updatedList = [];
      const memberPayload = {
        name: name.trim(),
        relationship: relationship.trim(),
        birthday: birthday.trim(),
        phone: phone.trim(),
        whatsapp: (whatsapp || phone).trim(),
        photo: photo || AVATAR_PRESETS[0],
        memoryNotes: memoryNotes.trim(),
        favoriteMemory: favoriteMemory.trim(),
      };

      if (editingMember) {
        updatedList = await updateFamilyMember(patientId, editingMember.id, memberPayload);
      } else {
        updatedList = await addFamilyMember(patientId, memberPayload);
      }

      if (onUpdateFamilyMembers) {
        onUpdateFamilyMembers(updatedList);
      }

      setFormVisible(false);
      resetForm();
    } catch (err) {
      console.error('Failed saving family member:', err);
      Alert.alert('Save Failed', 'Could not save family member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (member) => {
    const doDelete = async () => {
      try {
        const updated = await deleteFamilyMember(patientId, member.id);
        if (onUpdateFamilyMembers) onUpdateFamilyMembers(updated);
      } catch (e) {
        console.error('Failed deleting member:', e);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Remove ${member.name} from family album?`)) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      'Remove Loved One',
      `Are you sure you want to remove ${member.name} from your memory album?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  // 1-Tap Call Handler
  const handleNormalCall = (phoneNumber, name) => {
    if (!phoneNumber) return;
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Phone Dialer', `Dialing ${name} at ${phoneNumber}`);
    });
  };

  // 1-Tap WhatsApp Call / Video Handler
  const handleWhatsAppCall = (whatsAppNumber, name) => {
    if (!whatsAppNumber) return;
    const cleanNumber = whatsAppNumber.replace(/[^0-9]/g, '');
    const appUrl = `whatsapp://send?phone=${cleanNumber}&text=Hello%20${encodeURIComponent(name)}!`;
    const webUrl = `https://wa.me/${cleanNumber}`;

    Linking.canOpenURL(appUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(appUrl);
        } else {
          return Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl).catch(() => {
          Alert.alert('WhatsApp', `Connecting to WhatsApp with ${name} (${whatsAppNumber})`);
        });
      });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="heart" size={24} color="#EC4899" />
              </View>
              <View>
                <Text style={styles.title}>My Family &amp; Loved Ones</Text>
                <Text style={styles.subtitle}>Memory album • 1-tap call &amp; video</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Quick Add Button Bar */}
          <View style={styles.topActionsRow}>
            <View style={styles.memberCountBadge}>
              <Ionicons name="people" size={16} color="#4F46E5" />
              <Text style={styles.memberCountText}>
                {familyMembers.length} Loved One{familyMembers.length === 1 ? '' : 's'}
              </Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd} activeOpacity={0.8}>
              <Ionicons name="person-add" size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>+ Add Family Member</Text>
            </TouchableOpacity>
          </View>

          {/* Family Members Scroll List */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {familyMembers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={48} color="#FDA4AF" />
                <Text style={styles.emptyTitle}>No Family Members Yet</Text>
                <Text style={styles.emptySub}>
                  Tap &quot;+ Add Family Member&quot; above to add your children, spouse, or loved ones with their photo and birthday.
                </Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAdd}>
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyAddBtnText}>Add First Loved One</Text>
                </TouchableOpacity>
              </View>
            ) : (
              familyMembers.map((member) => {
                const age = calculateAge(member.birthday);
                const bdayCountdown = getBirthdayCountdown(member.birthday);

                return (
                  <View key={member.id} style={styles.familyCard}>
                    {/* Top Row: Photo + Identity + Actions */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.photoWrapper}>
                        <Image
                          source={{
                            uri: member.photo || AVATAR_PRESETS[0],
                          }}
                          style={styles.memberPhoto}
                        />
                        <View style={styles.photoHeartBadge}>
                          <Text style={{ fontSize: 11 }}>{member.emoji || '❤️'}</Text>
                        </View>
                      </View>

                      <View style={styles.memberMainInfo}>
                        <View style={styles.nameHeaderRow}>
                          <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
                          <View style={styles.cardMenuRow}>
                            <TouchableOpacity
                              onPress={() => handleOpenEdit(member)}
                              style={styles.iconCircleBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="pencil" size={14} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDelete(member)}
                              style={[styles.iconCircleBtn, { backgroundColor: '#FEE2E2' }]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={14} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Relationship Badge */}
                        <View style={styles.relationshipPill}>
                          <Ionicons name="heart" size={11} color="#DB2777" />
                          <Text style={styles.relationshipText}>
                            {member.relationship || 'Loved One'}
                          </Text>
                        </View>

                        {/* Birthday & Age */}
                        <View style={styles.birthdayRow}>
                          <MaterialCommunityIcons name="cake-variant" size={15} color="#D97706" />
                          <Text style={styles.birthdayText}>
                            {formatBirthdayDisplay(member.birthday)}
                            {age != null ? ` (${age} yrs old)` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Birthday Alert Banner if approaching */}
                    {bdayCountdown && (
                      <View style={styles.bdayAlertBanner}>
                        <Ionicons name="gift" size={16} color="#B45309" />
                        <Text style={styles.bdayAlertText}>{bdayCountdown}</Text>
                      </View>
                    )}

                    {/* Memory Anchor Card (Crucial for Dementia Patients) */}
                    <View style={styles.memoryCueBox}>
                      <View style={styles.memoryCueHeader}>
                        <Ionicons name="sparkles" size={14} color="#8B5CF6" />
                        <Text style={styles.memoryCueHeaderTitle}>WHO IS THIS TO ME?</Text>
                      </View>
                      <Text style={styles.memoryCueText}>
                        {member.memoryNotes || `${member.name} is your beloved ${member.relationship}. They love you dearly.`}
                      </Text>
                      {member.favoriteMemory ? (
                        <View style={styles.favMemoryRow}>
                          <Text style={styles.favMemoryLabel}>Cherished Memory:</Text>
                          <Text style={styles.favMemoryText}>{member.favoriteMemory}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Phone Number Display */}
                    <View style={styles.phoneDisplayRow}>
                      <Ionicons name="call-outline" size={14} color="#4B5563" />
                      <Text style={styles.phoneDisplayText}>{member.phone}</Text>
                    </View>

                    {/* Action Buttons: Normal Call & WhatsApp Video Call */}
                    <View style={styles.callButtonsRow}>
                      {/* Normal Phone Call */}
                      <TouchableOpacity
                        style={styles.normalCallBtn}
                        onPress={() => handleNormalCall(member.phone, member.name)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="call" size={18} color="#FFFFFF" />
                        <Text style={styles.normalCallBtnText}>Call Phone</Text>
                      </TouchableOpacity>

                      {/* WhatsApp Call / Video Call */}
                      <TouchableOpacity
                        style={styles.whatsAppCallBtn}
                        onPress={() => handleWhatsAppCall(member.whatsapp || member.phone, member.name)}
                        activeOpacity={0.8}
                      >
                        <FontAwesome5 name="whatsapp" size={19} color="#FFFFFF" />
                        <View style={styles.waBtnCol}>
                          <Text style={styles.whatsAppCallBtnText}>WhatsApp Call</Text>
                          <Text style={styles.whatsAppCallBtnSub}>Video &amp; Chat</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Add / Edit Form Modal */}
          <Modal visible={formVisible} animationType="fade" transparent onRequestClose={() => setFormVisible(false)}>
            <View style={styles.formOverlay}>
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {editingMember ? 'Edit Family Member' : 'Add Family Member'}
                  </Text>
                  <TouchableOpacity onPress={() => setFormVisible(false)}>
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                  {/* Photo Selection */}
                  <Text style={styles.fieldLabel}>Photo</Text>
                  <View style={styles.photoPickerRow}>
                    <Image source={{ uri: photo || AVATAR_PRESETS[0] }} style={styles.pickerPreviewPhoto} />
                    <View style={styles.photoPickerActions}>
                      <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handlePickPhoto}>
                        <Ionicons name="image" size={16} color="#3B82F6" />
                        <Text style={styles.uploadPhotoBtnText}>Choose from Gallery</Text>
                      </TouchableOpacity>
                      <Text style={styles.orPresetText}>Or choose avatar:</Text>
                      <View style={styles.presetRow}>
                        {AVATAR_PRESETS.slice(0, 4).map((pUrl, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setPhoto(pUrl)}
                            style={[styles.presetThumbWrap, photo === pUrl && styles.presetThumbActive]}
                          >
                            <Image source={{ uri: pUrl }} style={styles.presetThumb} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Name */}
                  <Text style={styles.fieldLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Emily Vance"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                  />

                  {/* Relationship */}
                  <Text style={styles.fieldLabel}>Relationship to Patient *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                    {RELATIONSHIP_PRESETS.map((preset) => {
                      const isSelected = relationship.toLowerCase() === preset.label.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={preset.label}
                          style={[
                            styles.presetPill,
                            isSelected && { backgroundColor: preset.color, borderColor: preset.color },
                          ]}
                          onPress={() => setRelationship(preset.label)}
                        >
                          <Text style={{ fontSize: 13, marginRight: 4 }}>{preset.emoji}</Text>
                          <Text style={[styles.presetPillText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Birthday */}
                  <Text style={styles.fieldLabel}>Birthday (YYYY-MM-DD or MM/DD/YYYY)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 1995-10-14"
                    placeholderTextColor="#9CA3AF"
                    value={birthday}
                    onChangeText={setBirthday}
                  />

                  {/* Phone Number */}
                  <Text style={styles.fieldLabel}>Phone Number (Normal Call) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +1 555-234-5678"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />

                  {/* WhatsApp Number */}
                  <Text style={styles.fieldLabel}>WhatsApp Number (Video &amp; Voice)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +1 555-234-5678 (Leave empty to use phone)"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                  />

                  {/* Memory Notes (Crucial for Alzheimer's / Dementia grounding) */}
                  <Text style={styles.fieldLabel}>Memory Helper Note (Who is this to you?)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="e.g. She visits every Sunday afternoon and brings you warm chocolate cookies."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    value={memoryNotes}
                    onChangeText={setMemoryNotes}
                  />

                  {/* Favorite Memory */}
                  <Text style={styles.fieldLabel}>Cherished Memory / Story</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. You taught her how to ride a bicycle in 2002."
                    placeholderTextColor="#9CA3AF"
                    value={favoriteMemory}
                    onChangeText={setFavoriteMemory}
                  />

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.saveSubmitBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSaveMember}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.saveSubmitBtnText}>
                        {editingMember ? 'Update Loved One' : 'Save to Family Album'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
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
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EC4899',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 18,
  },
  listContent: {
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#BE123C',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  familyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FCE7F3',
    shadowColor: '#DB2777',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 14,
  },
  photoWrapper: {
    position: 'relative',
  },
  memberPhoto: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2.5,
    borderColor: '#F472B6',
    backgroundColor: '#F1F5F9',
  },
  photoHeartBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  memberMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  cardMenuRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relationshipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  relationshipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DB2777',
  },
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  birthdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  bdayAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bdayAlertText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  memoryCueBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3.5,
    borderLeftColor: '#A855F7',
  },
  memoryCueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  memoryCueHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#7E22CE',
    letterSpacing: 0.6,
  },
  memoryCueText: {
    fontSize: 13,
    color: '#3B0764',
    lineHeight: 18,
    fontWeight: '600',
  },
  favMemoryRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
  },
  favMemoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B21A8',
  },
  favMemoryText: {
    fontSize: 12,
    color: '#581C87',
    fontStyle: 'italic',
    marginTop: 1,
  },
  phoneDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  phoneDisplayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  callButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  normalCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  normalCallBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  whatsAppCallBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  waBtnCol: {
    alignItems: 'flex-start',
  },
  whatsAppCallBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  whatsAppCallBtnSub: {
    color: '#DCFCE7',
    fontSize: 10,
    fontWeight: '600',
  },

  // Form Modal Styles
  formOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  formScroll: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  photoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerPreviewPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#EC4899',
    backgroundColor: '#E2E8F0',
  },
  photoPickerActions: {
    flex: 1,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  uploadPhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  orPresetText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 4,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetThumbWrap: {
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetThumbActive: {
    borderColor: '#EC4899',
  },
  presetThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  pillsScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetPillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  saveSubmitBtn: {
    backgroundColor: '#EC4899',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
