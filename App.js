// App.js - Dementia Care 360: Real-Time Patient & Caregiver Live Tracking with User Authentication
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import GlobalNotificationBar from './src/components/GlobalNotificationBar';
import HeaderBar from './src/components/HeaderBar';
import SettingsModal from './src/components/SettingsModal';
import PatientScreen from './src/screens/PatientScreen';
import PatientDashboardScreen from './src/screens/patient/PatientDashboardScreen';
import CaregiverScreen from './src/screens/caregiver/CaregiverScreen';
import CaregiverDashboardScreen from './src/screens/caregiver/CaregiverDashboardScreen';
import DoctorDashboardScreen from './src/screens/doctor/DoctorDashboardScreen';
import DoctorPatientDetailScreen from './src/screens/doctor/DoctorPatientDetailScreen';
import DualSplitScreen from './src/screens/DualSplitScreen';
import AuthGatewayScreen from './src/screens/auth/AuthGatewayScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import { syncService } from './src/services/syncService';
import { getBatteryStatus } from './src/services/batteryService';
import { getCurrentUser, logoutUser } from './src/services/authService';

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    /* Force show scrollbar for all web pages */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
      display: block !important;
    }
    ::-webkit-scrollbar-track {
      background: #F8FAFC;
    }
    ::-webkit-scrollbar-thumb {
      background: #CBD5E1;
      border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #94A3B8;
    }
    /* Ensure body can scroll natively if needed */
    html, body, #root {
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }
  `;
  document.head.appendChild(style);
}

const WebWrapper = ({ children, fullWidth }) => {
  if (Platform.OS !== 'web') return children;
  return (
    <View style={{ flex: 1, minHeight: '100vh', backgroundColor: '#E5E7EB', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: fullWidth ? '100%' : 480, minHeight: '100vh', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24 }}>
        {children}
      </View>
    </View>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('patient'); // 'patient' | 'caregiver' | 'dual'
  const [patientSubScreen, setPatientSubScreen] = useState('dashboard'); // 'dashboard' | 'location_share'
  const [caregiverSubScreen, setCaregiverSubScreen] = useState('dashboard'); // 'dashboard' | 'map_tracking'
  const [doctorSubScreen, setDoctorSubScreen] = useState('dashboard'); // 'dashboard' | 'patient_detail'
  const [monitoredPatient, setMonitoredPatient] = useState({ id: 'CARE-1001', name: 'Eleanor Vance' });
  const [roomCode, setRoomCode] = useState('CARE-1001');
  const [serverUrl, setServerUrl] = useState('ws://172.18.150.21:4000');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [batteryInfo, setBatteryInfo] = useState({ batteryLevel: 88, isCharging: false });

  // Load existing session & initial battery info
  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          let target = 'patient';
          if (user.role === 'doctor') target = 'doctor';
          else if (user.role === 'caregiver') target = 'caregiver';
          else if (user.role === 'admin') target = 'admin';
          setActiveTab(target);
          if (user.pairingCode) setRoomCode(user.pairingCode);
          if (user.patientPairingCode) setRoomCode(user.patientPairingCode);
        }
      } catch (err) {
        console.warn('Error checking user session:', err);
      } finally {
        setIsAuthChecking(false);
      }

      const b = await getBatteryStatus();
      setBatteryInfo(b);
    })();

    syncService.setServerUrl(serverUrl);
    syncService.connect(roomCode, activeTab === 'caregiver' ? 'caregiver' : 'patient');

    const unsubConn = syncService.on('connection_change', (info) => {
      setConnectionStatus(info.status);
    });

    return () => {
      unsubConn();
      syncService.disconnect();
    };
  }, []);

  // Update role in syncService when active tab changes
  useEffect(() => {
    if (activeTab === 'admin') return; // Admin might not need sync or can just be 'admin'
    const role = activeTab === 'doctor' ? 'doctor' : (activeTab === 'caregiver' ? 'caregiver' : 'patient');
    syncService.connect(roomCode, role);
  }, [activeTab]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    let targetTab = 'patient';
    if (user.role === 'doctor') targetTab = 'doctor';
    else if (user.role === 'caregiver') targetTab = 'caregiver';
    else if (user.role === 'admin') targetTab = 'admin';
    setActiveTab(targetTab);
    setPatientSubScreen('dashboard');
    const targetCode = user.pairingCode || user.patientPairingCode || 'CARE-1001';
    setRoomCode(targetCode);
    syncService.connect(targetCode, user.role);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  const handleSaveSettings = (settings) => {
    setRoomCode(settings.roomCode);
    setServerUrl(settings.serverUrl);
    syncService.setServerUrl(settings.serverUrl);
    if (activeTab !== 'admin') {
      syncService.connect(settings.roomCode, activeTab === 'caregiver' ? 'caregiver' : 'patient');
    }
  };

  const getScreenTitle = () => {
    switch (activeTab) {
      case 'patient':
        return patientSubScreen === 'location_share'
          ? 'Live Location Sharing'
          : 'Patient Dashboard';
      case 'caregiver':
        return caregiverSubScreen === 'map_tracking'
          ? `Tracking: ${monitoredPatient?.name || 'Patient'}`
          : 'Caregiver Command Center';
      case 'doctor':
        return doctorSubScreen === 'patient_detail'
          ? `Patient: ${monitoredPatient?.name || 'Patient'}`
          : 'Doctor Dashboard';
      case 'admin': return 'Admin Command Center';
      case 'dual': return 'Dual Real-Time Demo';
      default: return 'Live Tracking';
    }
  };

  const getScreenSubtitle = () => {
    switch (activeTab) {
      case 'patient':
        return patientSubScreen === 'location_share'
          ? 'WhatsApp-style live location broadcaster'
          : 'Care routines, vitals & quick assistance';
      case 'caregiver':
        return caregiverSubScreen === 'map_tracking'
          ? `Real-time OpenStreetMap radar (${monitoredPatient?.id || roomCode})`
          : 'Multi-patient monitoring, alerts & care plans';
      case 'doctor':
        return doctorSubScreen === 'patient_detail'
          ? 'Risk levels, Prescriptions & Contact'
          : 'Monitor patients and prescribe medicines';
      case 'admin': return 'System-wide monitoring and configuration';
      case 'dual': return 'Side-by-side simulator for single-device test';
      default: return '';
    }
  };

  if (isAuthChecking) {
    return (
      <WebWrapper>
        <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Initializing Dementia Care 360...</Text>
        </View>
      </WebWrapper>
    );
  }

  // Authentication Gate
  if (!currentUser) {
    return (
      <WebWrapper>
        <AuthGatewayScreen
        onLoginSuccess={handleLoginSuccess}
        />
      </WebWrapper>
    );
  }

  return (
    <WebWrapper fullWidth={activeTab === 'admin'}>
      <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Global Real-Time Notification Banner */}
      {activeTab !== 'admin' && <GlobalNotificationBar activeRole={activeTab} />}

      {/* Top Universal Header Bar */}
      {activeTab !== 'admin' && !(activeTab === 'caregiver' && caregiverSubScreen === 'dashboard') && (
        <HeaderBar
          activeRole={activeTab}
          title={getScreenTitle()}
          subtitle={getScreenSubtitle()}
          connectionStatus={connectionStatus}
          roomCode={
            activeTab === 'doctor'
              ? null
              : activeTab === 'caregiver' && caregiverSubScreen === 'map_tracking'
              ? monitoredPatient?.id
              : roomCode
          }
          batteryLevel={batteryInfo.batteryLevel}
          isCharging={batteryInfo.isCharging}
          currentUser={currentUser}
          hideStatusAndBattery={
            activeTab === 'doctor' ||
            (activeTab === 'patient' && patientSubScreen === 'dashboard')
          }
          onLogout={handleLogout}
          onOpenSettings={() => setSettingsModalVisible(true)}
        />
      )}

      {/* Main Active Screen */}
      <View style={styles.screenContainer}>
        {activeTab === 'admin' ? (
          Platform.OS === 'web' ? (
            <AdminDashboardScreen onLogout={handleLogout} />
          ) : (
            <View style={styles.adminMobileNotice}>
              <View style={styles.adminMobileNoticeBox}>
                <View style={styles.adminNoticeIconCircle}>
                  <MaterialCommunityIcons name="monitor-dashboard" size={48} color="#DC2626" />
                </View>
                <Text style={styles.adminNoticeTitle}>Admin Portal Is Web-Only</Text>
                <Text style={styles.adminNoticeDesc}>
                  The Admin Command Center is strictly available on desktop web browsers. Please visit the web dashboard on your computer to manage the system.
                </Text>
                <TouchableOpacity style={styles.adminLogoutBtn} onPress={handleLogout}>
                  <Feather name="log-out" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.adminLogoutBtnText}>Sign Out of Admin</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          <>
            {activeTab === 'patient' && (
          patientSubScreen === 'location_share' ? (
            <PatientScreen
              roomCode={roomCode}
              serverUrl={serverUrl}
              connectionStatus={connectionStatus}
              currentUser={currentUser}
              onBackToDashboard={() => setPatientSubScreen('dashboard')}
              onOpenSettings={() => setSettingsModalVisible(true)}
            />
          ) : (
            <PatientDashboardScreen
              currentUser={currentUser}
              roomCode={roomCode}
              onNavigateToLocationShare={() => setPatientSubScreen('location_share')}
              onOpenSettings={() => setSettingsModalVisible(true)}
            />
          )
        )}
        {activeTab === 'caregiver' && (
          caregiverSubScreen === 'map_tracking' ? (
            <CaregiverScreen
              roomCode={monitoredPatient?.id || roomCode}
              patientName={monitoredPatient?.name || 'Patient'}
              serverUrl={serverUrl}
              connectionStatus={connectionStatus}
              currentUser={currentUser}
              onBackToDashboard={() => setCaregiverSubScreen('dashboard')}
              onOpenSettings={() => setSettingsModalVisible(true)}
            />
          ) : (
            <CaregiverDashboardScreen
              currentUser={currentUser}
              roomCode={roomCode}
              onTrackPatientLocation={(patientId) => {
                const pName = patientId === 'CARE-1001' ? 'Eleanor Vance' : patientId === 'CARE-2042' ? 'Arthur Pendelton' : patientId === 'CARE-3309' ? 'Clara Oswald' : 'Patient';
                setMonitoredPatient({ id: patientId, name: pName });
                setRoomCode(patientId);
                syncService.connect(patientId, 'caregiver');
                setCaregiverSubScreen('map_tracking');
              }}
              onOpenSettings={() => setSettingsModalVisible(true)}
              onLogout={handleLogout}
            />
          )
        )}
        {activeTab === 'doctor' && (
          doctorSubScreen === 'patient_detail' ? (
            <DoctorPatientDetailScreen
              patient={monitoredPatient}
              currentUser={currentUser}
              onBack={() => setDoctorSubScreen('dashboard')}
            />
          ) : (
            <DoctorDashboardScreen
              currentUser={currentUser}
              onSelectPatient={(patient) => {
                setMonitoredPatient(patient);
                setDoctorSubScreen('patient_detail');
              }}
              onLogout={handleLogout}
            />
          )
        )}
        {activeTab === 'dual' && (
          <DualSplitScreen
            roomCode={roomCode}
            onOpenSettings={() => setSettingsModalVisible(true)}
          />
        )}
        </>
        )}
      </View>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsModalVisible}
        currentRoomCode={roomCode}
        currentServerUrl={serverUrl}
        connectionStatus={connectionStatus}
        onSave={handleSaveSettings}
        onClose={() => setSettingsModalVisible(false)}
      />
    </SafeAreaView>
    </WebWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navIconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  navIconDiscPatient: {
    backgroundColor: '#10B981',
  },
  navIconDiscCaregiver: {
    backgroundColor: '#2563EB',
  },
  navIconDiscDoctor: {
    backgroundColor: '#9333EA',
  },
  navIconDiscDual: {
    backgroundColor: '#8B5CF6',
  },
  navIconDiscAdmin: {
    backgroundColor: '#3B82F6',
  },
  navTabActivePatient: {
    backgroundColor: '#ECFDF5',
  },
  navTabActiveCaregiver: {
    backgroundColor: '#EFF6FF',
  },
  navTabActiveDoctor: {
    backgroundColor: '#F3E8FF',
  },
  navTabActiveDual: {
    backgroundColor: '#F5F3FF',
  },
  navTabActiveAdmin: {
    backgroundColor: '#EFF6FF',
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  navLabelActivePatient: {
    color: '#059669',
    fontWeight: '700',
  },
  navLabelActiveCaregiver: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  navLabelActiveDoctor: {
    color: '#9333EA',
    fontWeight: '700',
  },
  navLabelActiveDual: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  navLabelActiveAdmin: {
    color: '#2563EB',
    fontWeight: '700',
  },
  adminMobileNotice: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  adminMobileNoticeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
    width: '100%',
    maxWidth: 380,
  },
  adminNoticeIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  adminNoticeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 10,
    textAlign: 'center',
  },
  adminNoticeDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  adminLogoutBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  adminLogoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
