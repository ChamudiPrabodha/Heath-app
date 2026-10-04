import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/authService';
import { syncService } from '../services/syncService';

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

export default function ConnectionsModal({ visible, onClose }) {
  const [activeTab, setActiveTab] = useState('connections'); // 'connections' | 'invitations' | 'send'
  const [currentUser, setCurrentUser] = useState(null);
  
  const [connections, setConnections] = useState([]);
  const [invitations, setInvitations] = useState([]);
  
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [searchedProfile, setSearchedProfile] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const loadData = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    if (!user) return;
    
    try {
      const connRes = await fetch(`${getApiBaseUrl()}/connections/${user.email || user.id}`);
      if (connRes.ok) setConnections(await connRes.json());
      
      const invRes = await fetch(`${getApiBaseUrl()}/invitations/${user.email || user.id}`);
      if (invRes.ok) {
        const allInvs = await invRes.json();
        const userIdentifier = (user.email || user.id).toLowerCase();
        setInvitations(allInvs.filter(i => (i.fromEmail || '').toLowerCase() !== userIdentifier));
      }
    } catch (err) {
      console.log('Failed to fetch connections', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (visible) {
      setTimeout(() => {
        if (isMounted) loadData();
      }, 0);
    }
    return () => { isMounted = false; };
  }, [visible]);

  const handleSearchProfile = async () => {
    if (!inviteIdentifier) {
      Alert.alert('Error', 'Please enter a room code or email.');
      return;
    }
    setIsSearching(true);
    setSearchedProfile(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/profiles/${inviteIdentifier}?requesterEmail=${currentUser.email || currentUser.id}`);
      if (res.ok) {
        const profile = await res.json();
        setSearchedProfile(profile);
      } else {
        Alert.alert('Not Found', 'No user found with that code or email.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to search profile');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvite = async () => {
    if (!searchedProfile) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/connections/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: currentUser.name,
          fromEmail: currentUser.email || currentUser.id,
          fromRole: currentUser.role,
          toRoomCode: searchedProfile.id.toUpperCase(),
          toEmail: searchedProfile.email,
          toName: searchedProfile.name,
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Connected successfully! You can now monitor the patient.');
        setInviteIdentifier('');
        setSearchedProfile(null);
        setActiveTab('connections');
        syncService.listeners?.emit('connections_updated', {});
        loadData();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to connect');
    }
  };

  const handleRespond = async (id, action) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/invitations/${id}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approverName: currentUser.name,
          approverRole: currentUser.role
        })
      });
      if (res.ok) {
        Alert.alert('Success', `Invitation ${action}d!`);
        syncService.listeners?.emit('connections_updated', {});
        loadData();
      } else {
        const errorData = await res.json();
        Alert.alert('Cannot Approve', errorData.error || 'Failed to respond to invitation');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to respond to invitation');
    }
  };

  const handleRemoveConnection = async (id) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/connections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        Alert.alert('Removed', 'Connection removed successfully');
        syncService.listeners?.emit('connections_updated', {});
        loadData();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to remove connection');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Connections & Invites</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'connections' && styles.activeTab]} 
              onPress={() => setActiveTab('connections')}>
              <Text style={activeTab === 'connections' ? styles.activeTabText : styles.tabText}>My Connections</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'invitations' && styles.activeTab]} 
              onPress={() => setActiveTab('invitations')}>
              <Text style={activeTab === 'invitations' ? styles.activeTabText : styles.tabText}>
                Invites {invitations.length > 0 && `(${invitations.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'send' && styles.activeTab]} 
              onPress={() => setActiveTab('send')}>
              <Text style={activeTab === 'send' ? styles.activeTabText : styles.tabText}>Invite New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {activeTab === 'connections' && (
              connections.length === 0 ? (
                <Text style={styles.emptyText}>No connections yet.</Text>
              ) : (
                connections.map(c => {
                  const isUser1 = c.user1Email === (currentUser?.email || currentUser?.id);
                  const otherName = isUser1 ? c.user2Name : c.user1Name;
                  const otherRole = isUser1 ? c.user2Role : c.user1Role;
                  const otherEmail = isUser1 ? c.user2Email : c.user1Email;

                  return (
                    <View key={c.id} style={styles.card}>
                      <View>
                        <Text style={styles.cardTitle}>{otherName} ({otherRole})</Text>
                        <Text style={styles.cardSub}>{otherEmail}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveConnection(c.id)} style={styles.removeBtn}>
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )
                })
              )
            )}

            {activeTab === 'invitations' && (
              invitations.length === 0 ? (
                <Text style={styles.emptyText}>No pending invitations.</Text>
              ) : (
                invitations.map(i => (
                  <View key={i.id} style={styles.card}>
                    <View style={{flex: 1}}>
                      <Text style={styles.cardTitle}>{i.fromName} ({i.fromRole})</Text>
                      <Text style={styles.cardSub}>Wants to connect with you</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => handleRespond(i.id, 'approve')} style={styles.approveBtn}>
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRespond(i.id, 'reject')} style={styles.rejectBtn}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )
            )}

            {activeTab === 'send' && (
              <View style={styles.sendForm}>
                <Text style={styles.label}>Search User (Email or Room Code)</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="e.g. CARE-1001"
                    value={inviteIdentifier}
                    onChangeText={(text) => { setInviteIdentifier(text); setSearchedProfile(null); }}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={handleSearchProfile} style={styles.searchBtn} disabled={isSearching}>
                    <Text style={styles.searchBtnText}>{isSearching ? '...' : 'Search'}</Text>
                  </TouchableOpacity>
                </View>

                {searchedProfile && (
                  <View style={styles.profileCard}>
                    {searchedProfile.isLocked ? (
                      <View style={styles.lockedContainer}>
                        <Ionicons name="lock-closed" size={48} color="#9CA3AF" />
                        <Text style={styles.lockedName}>{searchedProfile.name}</Text>
                        <Text style={styles.lockedRole}>{searchedProfile.role.toUpperCase()}</Text>
                        <Text style={styles.lockedMsg}>{searchedProfile.message}</Text>
                        <TouchableOpacity onPress={handleSendInvite} style={styles.submitBtn}>
                          <Text style={styles.submitBtnText}>Connect Immediately</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.unlockedContainer}>
                        <Ionicons name="person-circle" size={48} color="#3B82F6" />
                        <Text style={styles.unlockedName}>{searchedProfile.name}</Text>
                        <Text style={styles.unlockedRole}>{searchedProfile.role.toUpperCase()}</Text>
                        <Text style={styles.unlockedMsg}>You are already connected to this user!</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSub: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  removeBtn: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removeBtnText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  rejectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  rejectBtnText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  sendForm: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  searchBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lockedContainer: {
    alignItems: 'center',
  },
  unlockedContainer: {
    alignItems: 'center',
  },
  lockedName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    color: '#111827',
  },
  unlockedName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    color: '#111827',
  },
  lockedRole: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  unlockedRole: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginTop: 4,
  },
  lockedMsg: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  unlockedMsg: {
    fontSize: 14,
    color: '#10B981',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
