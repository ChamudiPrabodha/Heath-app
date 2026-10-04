import React, { createElement, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

// A helper for raw HTML/SVG on web
const WebSVG = ({ svgString, style }) => {
  if (Platform.OS !== 'web') return <View style={style} />;
  return createElement('div', {
    style: { ...style, display: 'flex' },
    dangerouslySetInnerHTML: { __html: svgString },
  });
};

export default function AdminDashboardScreen({ onLogout }) {
  const [activeTab, setActiveTab] = useState('home');

  const renderSidebarItem = (id, icon, label, badge) => (
    <TouchableOpacity 
      style={[styles.navItem, activeTab === id && styles.navItemActive]}
      onPress={() => setActiveTab(id)}
    >
      <Feather name={icon} size={18} color={activeTab === id ? '#FFFFFF' : '#8B949E'} />
      <Text style={[styles.navItemText, activeTab === id && styles.navItemTextActive]}>{label}</Text>
      {badge && <View style={styles.navBadge}><Text style={styles.navBadgeText}>{badge}</Text></View>}
    </TouchableOpacity>
  );

  const renderEmptyState = (title, icon) => (
    <View style={styles.emptyState}>
      <Feather name={icon} size={48} color="#374151" />
      <Text style={styles.emptyTitle}>{title} Management</Text>
      <Text style={styles.emptySub}>This module is currently under development.</Text>
    </View>
  );

  const renderPatients = () => (
    <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statTitle}>Total</Text><Text style={styles.statValueLarge}>2,150</Text></View>
        <View style={styles.statCard}><Text style={styles.statTitle}>Critical</Text><Text style={[styles.statValueLarge, {color: '#EF4444'}]}>42</Text></View>
        <View style={styles.statCard}><Text style={styles.statTitle}>Stable</Text><Text style={[styles.statValueLarge, {color: '#10B981'}]}>1,820</Text></View>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}><Text style={styles.cardTitle}>Patient Directory</Text></View>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, {flex: 1}]}>Name</Text>
            <Text style={[styles.th, {flex: 1}]}>Condition</Text>
            <Text style={[styles.th, {flex: 1}]}>Facility</Text>
            <Text style={[styles.th, {flex: 1}]}>Status</Text>
          </View>
          {['Eleanor Vance', 'Arthur Pendelton', 'Clara Oswald', 'John Doe'].map((n, i) => (
            <View style={styles.tr} key={i}>
              <Text style={[styles.td, {flex: 1}]}>{n}</Text>
              <Text style={[styles.td, {flex: 1}]}>{"Alzheimer's Stage"} {i+1}</Text>
              <Text style={[styles.td, {flex: 1}]}>Oakview Wing A</Text>
              <Text style={[styles.td, {flex: 1, color: i===2 ? '#EF4444' : '#10B981'}]}>{i===2 ? 'Critical' : 'Stable'}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderCaregivers = () => (
    <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeader}><Text style={styles.cardTitle}>Active Caregivers</Text></View>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, {flex: 1}]}>Caregiver</Text>
            <Text style={[styles.th, {flex: 1}]}>Assigned Patients</Text>
            <Text style={[styles.th, {flex: 1}]}>Shift</Text>
          </View>
          {['Sarah Vance', 'Martha Pendelton', 'Danny Pink'].map((n, i) => (
            <View style={styles.tr} key={i}>
              <Text style={[styles.td, {flex: 1}]}>{n}</Text>
              <Text style={[styles.td, {flex: 1}]}>{i+4} Patients</Text>
              <Text style={[styles.td, {flex: 1}]}>08:00 - 16:00</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderDashboards = () => (
    <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 8 }}>Role Interface Overview</Text>
        <Text style={{ color: '#8B949E', fontSize: 14 }}>Compare capabilities and active metrics across different user roles in real-time.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {/* Doctor Dashboard */}
        <View style={[styles.card, { flex: 1, borderColor: '#3B82F6', borderWidth: 1 }]}>
          <View style={[styles.cardHeader, { borderBottomWidth: 1, borderBottomColor: '#2D333B', paddingBottom: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="stethoscope" size={20} color="#3B82F6" />
              <Text style={styles.cardTitle}>Doctor View</Text>
            </View>
            <View style={styles.navBadge}><Text style={styles.navBadgeText}>Full Access</Text></View>
          </View>
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>Pending Approvals</Text>
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>14 Prescriptions</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>Critical Alerts</Text>
              <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>3 Patients</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>{"Today's Rounds"}</Text>
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>24 Scheduled</Text>
            </View>
            
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 12 }}>Key Capabilities</Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• Modify Care Plans & Meds</Text>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• Approve Caregiver Requests</Text>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• Access Full Medical History</Text>
            </View>
          </View>
        </View>

        {/* Caregiver Dashboard */}
        <View style={[styles.card, { flex: 1, borderColor: '#10B981', borderWidth: 1 }]}>
          <View style={[styles.cardHeader, { borderBottomWidth: 1, borderBottomColor: '#2D333B', paddingBottom: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="account-heart" size={20} color="#10B981" />
              <Text style={styles.cardTitle}>Caregiver View</Text>
            </View>
            <View style={styles.navBadge}><Text style={styles.navBadgeText}>Task Access</Text></View>
          </View>
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>Assigned Patients</Text>
              <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>8 Active</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>Tasks Pending</Text>
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>12 Tasks</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>Current Shift</Text>
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>08:00 - 16:00</Text>
            </View>

            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 12 }}>Key Capabilities</Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• Log Patient Vitals & Mood</Text>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• Mark Meds as Administered</Text>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• Alert Doctors/Supervisors</Text>
            </View>
          </View>
        </View>

        {/* Patient Dashboard */}
        <View style={[styles.card, { flex: 1, borderColor: '#F59E0B', borderWidth: 1 }]}>
          <View style={[styles.cardHeader, { borderBottomWidth: 1, borderBottomColor: '#2D333B', paddingBottom: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="human-cane" size={20} color="#F59E0B" />
              <Text style={styles.cardTitle}>Patient View</Text>
            </View>
            <View style={styles.navBadge}><Text style={styles.navBadgeText}>Read-Only</Text></View>
          </View>
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>Next Medication</Text>
              <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>Donepezil (2 PM)</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>Daily Activity Goal</Text>
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>75% Reached</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8B949E', fontSize: 12 }}>Family Visits</Text>
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>Tomorrow</Text>
            </View>

            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 12 }}>Key Capabilities</Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• View Personal Schedule</Text>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• Engage in Memory Games</Text>
              <Text style={{ color: '#D1D5DB', fontSize: 12 }}>• Call Nurse / Family</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderDashboard = () => (
    <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
      {/* Top 4 Stats */}
      <View style={styles.statsRow}>
        {/* Stat 1 */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>1. Total Patients</Text>
          <View style={styles.statContentRow}>
            <Text style={styles.statValueLarge}>2,150</Text>
            <View style={styles.statBreakdown}>
              <Text style={styles.statBreakdownText}><View style={[styles.dot, {backgroundColor: '#3B82F6'}]} /> MIN (1,120)</Text>
              <Text style={styles.statBreakdownText}><View style={[styles.dot, {backgroundColor: '#F59E0B'}]} /> Moderate (750)</Text>
              <Text style={styles.statBreakdownText}><View style={[styles.dot, {backgroundColor: '#EF4444'}]} /> Severe (300)</Text>
            </View>
          </View>
        </View>
        {/* Stat 2 */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>2. Active Caregiver to Patient Ratio</Text>
          <Text style={styles.statValueLarge}>1:8</Text>
        </View>
        {/* Stat 3 */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>3. Critical Incidents Today</Text>
          <Text style={styles.statValueLarge}>4</Text>
        </View>
        {/* Stat 4 */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>4. Care Plan Compliance</Text>
          <Text style={styles.statValueLarge}>96%</Text>
        </View>
      </View>

      {/* Middle Row (Chart + Facility Status) */}
      <View style={styles.middleRow}>
        <View style={[styles.card, { flex: 3 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Cognitive Decline & Engagement Trends (Last 7 Days)</Text>
            <Feather name="more-horizontal" size={16} color="#8B949E" />
          </View>
          <View style={styles.chartLegend}>
            <Text style={styles.legendText}><View style={[styles.dot, {backgroundColor: '#3B82F6'}]} /> Patient Engagement Scores</Text>
            <Text style={styles.legendText}><View style={[styles.dot, {backgroundColor: '#F59E0B'}]} /> Memory Score Averages</Text>
          </View>
          {/* Mock Line Chart */}
          <View style={styles.chartContainer}>
            <WebSVG
              style={{ width: '100%', height: 200 }}
              svgString={`
                <svg width="100%" height="200" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <!-- Grid Lines -->
                  <line x1="0" y1="40" x2="800" y2="40" stroke="#2D333B" stroke-width="1"/>
                  <line x1="0" y1="80" x2="800" y2="80" stroke="#2D333B" stroke-width="1"/>
                  <line x1="0" y1="120" x2="800" y2="120" stroke="#2D333B" stroke-width="1"/>
                  <line x1="0" y1="160" x2="800" y2="160" stroke="#2D333B" stroke-width="1"/>
                  
                  <!-- Line 1 (Blue) -->
                  <path d="M 0 60 Q 100 120 200 80 T 400 40 T 600 90 T 800 50" fill="none" stroke="#3B82F6" stroke-width="3"/>
                  <circle cx="200" cy="80" r="4" fill="#3B82F6"/>
                  <circle cx="400" cy="40" r="4" fill="#3B82F6"/>
                  <circle cx="600" cy="90" r="4" fill="#3B82F6"/>
                  
                  <!-- Line 2 (Orange) -->
                  <path d="M 0 140 Q 100 80 200 120 T 400 60 T 600 130 T 800 70" fill="none" stroke="#F59E0B" stroke-width="3"/>
                  <circle cx="200" cy="120" r="4" fill="#F59E0B"/>
                  <circle cx="400" cy="60" r="4" fill="#F59E0B"/>
                  <circle cx="600" cy="130" r="4" fill="#F59E0B"/>
                  
                  <!-- Line 3 (Green/Teal) -->
                  <path d="M 0 100 Q 100 150 200 110 T 400 150 T 600 100 T 800 140" fill="none" stroke="#10B981" stroke-width="3"/>
                  <circle cx="200" cy="110" r="4" fill="#10B981"/>
                  <circle cx="400" cy="150" r="4" fill="#10B981"/>
                  <circle cx="600" cy="100" r="4" fill="#10B981"/>
                </svg>
              `}
            />
            {/* Y Axis Labels */}
            <View style={styles.yAxis}>
              <Text style={styles.axisText}>50K</Text>
              <Text style={styles.axisText}>40K</Text>
              <Text style={styles.axisText}>30K</Text>
              <Text style={styles.axisText}>20K</Text>
              <Text style={styles.axisText}>10K</Text>
            </View>
            {/* X Axis Labels */}
            <View style={styles.xAxis}>
              <Text style={styles.axisText}>Mon</Text>
              <Text style={styles.axisText}>Tue</Text>
              <Text style={styles.axisText}>Wed</Text>
              <Text style={styles.axisText}>Thu</Text>
              <Text style={styles.axisText}>Fri</Text>
              <Text style={styles.axisText}>Sat</Text>
              <Text style={styles.axisText}>Sun</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { flex: 1, marginLeft: 16 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Facility Status</Text>
          </View>
          <View style={styles.facilityList}>
            <View style={styles.facilityItem}>
              <View style={styles.facilityIconGreen}><Feather name="check" size={12} color="#FFF" /></View>
              <Text style={styles.facilityName}>Wing A:</Text>
              <View style={[styles.statusTag, {backgroundColor: '#064E3B'}]}><Text style={[styles.statusTagText, {color: '#34D399'}]}>Stable</Text></View>
            </View>
            <View style={styles.facilityItem}>
              <View style={styles.facilityIconYellow}><Feather name="alert-circle" size={12} color="#FFF" /></View>
              <Text style={styles.facilityName}>Wing B:</Text>
              <View style={[styles.statusTag, {backgroundColor: '#78350F'}]}><Text style={[styles.statusTagText, {color: '#FBBF24'}]}>Attention</Text></View>
            </View>
            <View style={styles.facilityItem}>
              <View style={styles.facilityIconRed}><Feather name="alert-triangle" size={12} color="#FFF" /></View>
              <Text style={styles.facilityName}>Wing C:</Text>
              <View style={[styles.statusTag, {backgroundColor: '#7F1D1D'}]}><Text style={[styles.statusTagText, {color: '#F87171'}]}>Critical - Staffing</Text></View>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Row (4 Cols) */}
      <View style={styles.bottomRow}>
        {/* Col 1 */}
        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Facility Metrics</Text>
            <Feather name="more-horizontal" size={16} color="#8B949E" />
          </View>
          
          <Text style={styles.chartSubTitle}>Fall Incidents by Facility</Text>
          <View style={styles.barChartRow}>
            <Text style={styles.barLabel}>Oakview</Text>
            <View style={styles.barTrack}><View style={[styles.barFill, {width: '40%', backgroundColor: '#F87171'}]} /></View>
            <Text style={styles.barValue}>2</Text>
          </View>
          <View style={styles.barChartRow}>
            <Text style={styles.barLabel}>Sunnyside</Text>
            <View style={styles.barTrack}><View style={[styles.barFill, {width: '20%', backgroundColor: '#34D399'}]} /></View>
            <Text style={styles.barValue}>1</Text>
          </View>
          <View style={styles.barChartRow}>
            <Text style={styles.barLabel}>Maple</Text>
            <View style={styles.barTrack}><View style={[styles.barFill, {width: '0%', backgroundColor: '#60A5FA'}]} /></View>
            <Text style={styles.barValue}>0</Text>
          </View>

          <Text style={[styles.chartSubTitle, {marginTop: 20}]}>Average Resident Activity Level</Text>
          <View style={styles.verticalBarChart}>
            <View style={styles.vBarWrapper}><View style={[styles.vBar, {height: 40, backgroundColor: '#3B82F6'}]} /><Text style={styles.vBarLabel}>Oakview</Text></View>
            <View style={styles.vBarWrapper}><View style={[styles.vBar, {height: 60, backgroundColor: '#10B981'}]} /><Text style={styles.vBarLabel}>Sunnyside</Text></View>
            <View style={styles.vBarWrapper}><View style={[styles.vBar, {height: 30, backgroundColor: '#6366F1'}]} /><Text style={styles.vBarLabel}>Maple</Text></View>
          </View>
        </View>

        {/* Col 2 */}
        <View style={[styles.card, { flex: 1.5 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Care Events</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, {width: 40}]}>ID</Text>
              <Text style={[styles.th, {flex: 1}]}>Patient Name</Text>
              <Text style={[styles.th, {flex: 1}]}>Event Type</Text>
              <Text style={[styles.th, {width: 60}]}>Time</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, {width: 40}]}>907</Text>
              <Text style={[styles.td, {flex: 1}]}>Sarah Laa...</Text>
              <Text style={[styles.td, {flex: 1}]}>Event type</Text>
              <Text style={[styles.td, {width: 60}]}>11:15...</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, {width: 40}]}>335</Text>
              <Text style={[styles.td, {flex: 1}]}>Marid I...</Text>
              <Text style={[styles.td, {flex: 1}]}>Event type</Text>
              <Text style={[styles.td, {width: 60}]}>11:15...</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, {width: 40}]}>335</Text>
              <Text style={[styles.td, {flex: 1}]}>Maria M...</Text>
              <Text style={[styles.td, {flex: 1}]}>Event type</Text>
              <Text style={[styles.td, {width: 60}]}>11:15...</Text>
            </View>
          </View>
        </View>

        {/* Col 3 & 4 */}
        <View style={{ flex: 1, gap: 16 }}>
          {/* Alerts */}
          <View style={[styles.card, { flex: 1 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Caregiver Alerts</Text>
              <Feather name="more-horizontal" size={16} color="#8B949E" />
            </View>
            <View style={styles.alertItem}>
              <MaterialCommunityIcons name="alert-triangle" size={14} color="#F87171" />
              <Text style={styles.alertText}>Nurse J. - Schedule conflict</Text>
            </View>
            <View style={styles.alertItem}>
              <MaterialCommunityIcons name="alert-triangle" size={14} color="#F87171" />
              <Text style={styles.alertText}>Patient K. - Missed med dosage</Text>
            </View>
            <View style={styles.alertItem}>
              <MaterialCommunityIcons name="alert-triangle" size={14} color="#F87171" />
              <Text style={styles.alertText}>Patient J. - Missed med dosage</Text>
            </View>
            
            <Text style={[styles.cardTitle, {marginTop: 16, marginBottom: 8}]}>System Health</Text>
            <Text style={styles.sysHealthText}>All systems operational.</Text>
          </View>

          {/* Heatmap */}
          <View style={[styles.card, { flex: 1 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Caregiver Allocation</Text>
              <Feather name="more-horizontal" size={16} color="#8B949E" />
            </View>
            <View style={styles.heatmapLegend}>
              <Text style={styles.legendText}><Feather name="check-circle" size={12} color="#34D399" /> Database Sync</Text>
              <Text style={styles.legendText}><Feather name="check-circle" size={12} color="#34D399" /> Server Status</Text>
            </View>
            <View style={styles.heatmapGrid}>
              {[...Array(5)].map((_, r) => (
                <View key={r} style={styles.heatmapRow}>
                  <Text style={styles.heatmapLabel}>Wing {String.fromCharCode(65 + r)}</Text>
                  {[...Array(12)].map((_, c) => {
                    const colors = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    return <View key={c} style={[styles.heatmapCell, { backgroundColor: color }]} />;
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="brain" size={28} color="#3B82F6" />
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoTextMain}>CognitiveCare</Text>
            <Text style={styles.logoTextSub}>Management</Text>
          </View>
        </View>

        <ScrollView style={styles.navLinks} showsVerticalScrollIndicator={false}>
          {renderSidebarItem('home', 'home', 'Dashboard')}
          {renderSidebarItem('dashboards', 'layout', 'Role Dashboards')}
          {renderSidebarItem('patients', 'users', 'Patients', '2,150')}
          {renderSidebarItem('caregivers', 'user-check', 'Caregivers')}
          {renderSidebarItem('facilities', 'grid', 'Facilities')}
          {renderSidebarItem('careplans', 'clipboard', 'Care Plans')}
          {renderSidebarItem('reports', 'file-text', 'Reports')}
          {renderSidebarItem('research', 'activity', 'Research')}
          {renderSidebarItem('settings', 'settings', 'Settings')}
        </ScrollView>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Feather name="log-out" size={16} color="#8B949E" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Dementia Healthcare Management System</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationBtn}>
              <Feather name="bell" size={18} color="#8B949E" />
              <Text style={styles.notificationLabel}>Notifications</Text>
              <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>12</Text></View>
            </TouchableOpacity>

            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>SC</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>Profile</Text>
                <Text style={styles.profileRole}>Admin Sarah Chen, MD</Text>
              </View>
              <Feather name="chevron-down" size={16} color="#8B949E" style={{ marginLeft: 4 }} />
            </View>

            <TouchableOpacity style={styles.quickActionBtn}>
              <Text style={styles.quickActionText}>Quick Action</Text>
              <Feather name="chevron-down" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'home' && renderDashboard()}
        {activeTab === 'dashboards' && renderDashboards()}
        {activeTab === 'patients' && renderPatients()}
        {activeTab === 'caregivers' && renderCaregivers()}
        {activeTab === 'facilities' && renderEmptyState('Facilities', 'grid')}
        {activeTab === 'careplans' && renderEmptyState('Care Plans', 'clipboard')}
        {activeTab === 'reports' && renderEmptyState('Reports', 'file-text')}
        {activeTab === 'research' && renderEmptyState('Research', 'activity')}
        {activeTab === 'settings' && renderEmptyState('Settings', 'settings')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E242B',
    height: '100%',
  },
  sidebar: {
    width: 240,
    backgroundColor: '#15181E',
    borderRightWidth: 1,
    borderRightColor: '#2D333B',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 12,
  },
  logoTextContainer: {
    flexDirection: 'column',
  },
  logoTextMain: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoTextSub: {
    color: '#8B949E',
    fontSize: 12,
  },
  navLinks: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#2D333B',
  },
  navItemText: {
    color: '#8B949E',
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  navItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  navBadgeText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2D333B',
    marginTop: 'auto',
  },
  logoutText: {
    color: '#8B949E',
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#1E242B',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  notificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationLabel: {
    color: '#8B949E',
    fontSize: 13,
  },
  notificationBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  profileText: {
    justifyContent: 'center',
  },
  profileName: {
    color: '#8B949E',
    fontSize: 11,
  },
  profileRole: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionBtn: {
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  dashboardScroll: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#262B33',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statTitle: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  statContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statValueLarge: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
  },
  statBreakdown: {
    gap: 2,
  },
  statBreakdownText: {
    color: '#9CA3AF',
    fontSize: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  middleRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#262B33',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendText: {
    color: '#9CA3AF',
    fontSize: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    height: 220,
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 20,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  xAxis: {
    position: 'absolute',
    left: 40,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  axisText: {
    color: '#6B7280',
    fontSize: 10,
  },
  facilityList: {
    gap: 16,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  facilityIconGreen: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  facilityIconYellow: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  facilityIconRed: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  facilityName: { color: '#D1D5DB', fontSize: 13, flex: 1 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusTagText: { fontSize: 11, fontWeight: '600' },
  bottomRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  chartSubTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 12,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    color: '#D1D5DB',
    fontSize: 11,
    width: 60,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barValue: {
    color: '#D1D5DB',
    fontSize: 11,
    width: 20,
    textAlign: 'right',
  },
  verticalBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
  },
  vBarWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  vBar: {
    width: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  vBarLabel: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  table: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 8,
    marginBottom: 8,
  },
  th: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  td: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertText: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  sysHealthText: {
    color: '#10B981',
    fontSize: 12,
  },
  heatmapLegend: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  heatmapGrid: {
    gap: 4,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heatmapLabel: {
    color: '#6B7280',
    fontSize: 10,
    width: 40,
  },
  heatmapCell: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySub: {
    color: '#8B949E',
    fontSize: 14,
    marginTop: 8,
  }
});
