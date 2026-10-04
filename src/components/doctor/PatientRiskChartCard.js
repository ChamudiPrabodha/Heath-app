import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PatientRiskChartCard({
  riskAnalysis,
  selectedRiskFilter,
  onSelectRiskFilter,
  onSelectPatient,
}) {
  const [showHighRiskDetails, setShowHighRiskDetails] = useState(false);

  const {
    total = 0,
    highCount = 0,
    elevatedCount = 0,
    lowCount = 0,
    highPct = 0,
    elevatedPct = 0,
    lowPct = 0,
    stabilityScore = 100,
    highRiskPatients = [],
  } = riskAnalysis || {};

  const toggleDetails = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHighRiskDetails(!showHighRiskDetails);
  };

  const handleCardPress = (filterKey) => {
    if (selectedRiskFilter === filterKey) {
      onSelectRiskFilter('ALL');
    } else {
      onSelectRiskFilter(filterKey);
    }
  };

  // Safe percentage widths for the stacked bar
  const safeHighWidth = total > 0 && highCount > 0 ? Math.max(highPct, 8) : 0;
  const safeElevatedWidth = total > 0 && elevatedCount > 0 ? Math.max(elevatedPct, 8) : 0;

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={20} color="#7C3AED" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>Patients Risk Stratification</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Calculated real-time across {total} monitored {total === 1 ? 'patient' : 'patients'}
            </Text>
          </View>
        </View>

        <View style={styles.aiLiveBadge}>
          <View style={styles.aiLiveDot} />
          <Text style={styles.aiLiveBadgeText}>AI Calculated</Text>
        </View>
      </View>

      {/* Stability Score & Clinical Summary Banner */}
      <View style={styles.stabilityBanner}>
        <View style={styles.stabilityScoreCircle}>
          <Text style={styles.stabilityScoreVal}>{stabilityScore}%</Text>
          <Text style={styles.stabilityScoreLabel}>Stable</Text>
        </View>
        <View style={styles.stabilityInfoCol}>
          <Text style={styles.stabilityHeadline}>
            {highCount > 0
              ? `${highCount} ${highCount === 1 ? 'Patient Requires' : 'Patients Require'} Urgent Attention`
              : elevatedCount > 0
              ? `${elevatedCount} Patients Under Close Observation`
              : 'All Monitored Patients Clinically Stable'}
          </Text>
          <Text style={styles.stabilitySub}>
            {highCount > 0
              ? 'Critical biometrics or adherence deficit detected by telemetry heuristics.'
              : elevatedCount > 0
              ? 'Moderate vital deviations or missed medication schedules observed.'
              : 'Vital metrics and medication compliance within normal target windows.'}
          </Text>
        </View>
      </View>

      {/* Multi-Segment Stacked Calculated Bar Chart */}
      <View style={styles.chartSection}>
        <View style={styles.barContainer}>
          {total === 0 ? (
            <View style={[styles.barSegment, { flex: 1, backgroundColor: '#E2E8F0' }]} />
          ) : (
            <>
              {highCount > 0 && (
                <View
                  style={[
                    styles.barSegment,
                    {
                      width: `${safeHighWidth}%`,
                      backgroundColor: '#DC2626',
                    },
                  ]}
                />
              )}
              {elevatedCount > 0 && (
                <View
                  style={[
                    styles.barSegment,
                    {
                      width: `${safeElevatedWidth}%`,
                      backgroundColor: '#D97706',
                    },
                  ]}
                />
              )}
              {lowCount > 0 && (
                <View
                  style={[
                    styles.barSegment,
                    {
                      flex: 1,
                      backgroundColor: '#059669',
                    },
                  ]}
                />
              )}
            </>
          )}
        </View>

        {/* Legend / Proportional Readout */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>
              High: <Text style={styles.legendBold}>{highCount}</Text> ({highPct}%)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.legendText}>
              Elevated: <Text style={styles.legendBold}>{elevatedCount}</Text> ({elevatedPct}%)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
            <Text style={styles.legendText}>
              Low: <Text style={styles.legendBold}>{lowCount}</Text> ({lowPct}%)
            </Text>
          </View>
        </View>
      </View>

      {/* Interactive 3-Card Filter Strip */}
      <View style={styles.breakdownCardsRow}>
        {/* High Risk Card */}
        <TouchableOpacity
          style={[
            styles.riskColCard,
            styles.riskColCardHigh,
            selectedRiskFilter === 'HIGH' && styles.riskColCardActiveHigh,
          ]}
          onPress={() => handleCardPress('HIGH')}
          activeOpacity={0.8}
        >
          <View style={styles.colCardTop}>
            <View style={[styles.colCardIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={14} color="#DC2626" />
            </View>
            <View style={[styles.colCardPill, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.colCardPillText, { color: '#991B1B' }]}>{highPct}%</Text>
            </View>
          </View>
          <Text style={[styles.colCardCount, { color: '#DC2626' }]}>{highCount}</Text>
          <Text style={styles.colCardLabel}>High Risk</Text>
          <Text style={styles.colCardSub}>Urgent Check</Text>
          {selectedRiskFilter === 'HIGH' && (
            <View style={[styles.activeFilterCheck, { backgroundColor: '#DC2626' }]}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Elevated Risk Card */}
        <TouchableOpacity
          style={[
            styles.riskColCard,
            styles.riskColCardElevated,
            selectedRiskFilter === 'ELEVATED' && styles.riskColCardActiveElevated,
          ]}
          onPress={() => handleCardPress('ELEVATED')}
          activeOpacity={0.8}
        >
          <View style={styles.colCardTop}>
            <View style={[styles.colCardIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#D97706" />
            </View>
            <View style={[styles.colCardPill, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.colCardPillText, { color: '#92400E' }]}>{elevatedPct}%</Text>
            </View>
          </View>
          <Text style={[styles.colCardCount, { color: '#D97706' }]}>{elevatedCount}</Text>
          <Text style={styles.colCardLabel}>Elevated</Text>
          <Text style={styles.colCardSub}>Observation</Text>
          {selectedRiskFilter === 'ELEVATED' && (
            <View style={[styles.activeFilterCheck, { backgroundColor: '#D97706' }]}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Low Risk Card */}
        <TouchableOpacity
          style={[
            styles.riskColCard,
            styles.riskColCardLow,
            selectedRiskFilter === 'LOW' && styles.riskColCardActiveLow,
          ]}
          onPress={() => handleCardPress('LOW')}
          activeOpacity={0.8}
        >
          <View style={styles.colCardTop}>
            <View style={[styles.colCardIconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
            </View>
            <View style={[styles.colCardPill, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.colCardPillText, { color: '#065F46' }]}>{lowPct}%</Text>
            </View>
          </View>
          <Text style={[styles.colCardCount, { color: '#059669' }]}>{lowCount}</Text>
          <Text style={styles.colCardLabel}>Low Risk</Text>
          <Text style={styles.colCardSub}>Stable Target</Text>
          {selectedRiskFilter === 'LOW' && (
            <View style={[styles.activeFilterCheck, { backgroundColor: '#059669' }]}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filter Notice & Reset */}
      {selectedRiskFilter !== 'ALL' && (
        <View style={styles.filterNoticeRow}>
          <View style={styles.filterNoticeLeft}>
            <Ionicons name="funnel" size={13} color="#4338CA" />
            <Text style={styles.filterNoticeText}>
              Showing only <Text style={{ fontWeight: '800' }}>{selectedRiskFilter}</Text> risk patients
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => onSelectRiskFilter('ALL')}
            activeOpacity={0.7}
          >
            <Text style={styles.clearFilterBtnText}>Show All ({total})</Text>
            <Ionicons name="close-circle" size={13} color="#4338CA" />
          </TouchableOpacity>
        </View>
      )}

      {/* Flagged High-Risk Patient Attention Accordion */}
      {highCount > 0 && (
        <View style={styles.flaggedSection}>
          <TouchableOpacity
            style={styles.flaggedToggleRow}
            onPress={toggleDetails}
            activeOpacity={0.8}
          >
            <View style={styles.flaggedToggleLeft}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.flaggedToggleTitle}>
                {highCount} {highCount === 1 ? 'Patient Flagged' : 'Patients Flagged'} with Urgent Risk
              </Text>
            </View>
            <Ionicons
              name={showHighRiskDetails ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#DC2626"
            />
          </TouchableOpacity>

          {showHighRiskDetails && (
            <View style={styles.flaggedList}>
              {highRiskPatients.map((p) => {
                const reasons = p.riskInfo?.reasons || [];
                return (
                  <View key={p.id} style={styles.flaggedItem}>
                    <View style={styles.flaggedItemLeft}>
                      <View style={styles.flaggedItemAvatar}>
                        <Text style={styles.flaggedItemAvatarText}>
                          {(p.name || 'P').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.flaggedItemInfo}>
                        <Text style={styles.flaggedItemName}>{p.name}</Text>
                        <Text style={styles.flaggedItemMeta}>
                          ID: {p.id} • {p.condition || 'Dementia Patient'}
                        </Text>
                        {reasons.length > 0 && (
                          <View style={styles.flaggedReasonsWrap}>
                            {reasons.map((r, idx) => (
                              <View key={idx} style={styles.flaggedReasonBadge}>
                                <Text style={styles.flaggedReasonText}>{r}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>

                    {onSelectPatient && (
                      <TouchableOpacity
                        style={styles.flaggedViewChartBtn}
                        onPress={() => onSelectPatient(p)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.flaggedViewChartText}>Open Chart</Text>
                        <Ionicons name="arrow-forward" size={12} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  aiLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  aiLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
  },
  aiLiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    textTransform: 'uppercase',
  },
  stabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  stabilityScoreCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stabilityScoreVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1D4ED8',
    lineHeight: 18,
  },
  stabilityScoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  stabilityInfoCol: {
    flex: 1,
  },
  stabilityHeadline: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  stabilitySub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  chartSection: {
    marginBottom: 14,
  },
  barContainer: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
  },
  legendBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  breakdownCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  riskColCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    position: 'relative',
  },
  riskColCardHigh: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  riskColCardActiveHigh: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  riskColCardElevated: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  riskColCardActiveElevated: {
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  riskColCardLow: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  riskColCardActiveLow: {
    borderColor: '#059669',
    backgroundColor: '#D1FAE5',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  colCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  colCardIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colCardPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  colCardPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  colCardCount: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  colCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  colCardSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  activeFilterCheck: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  filterNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterNoticeText: {
    fontSize: 11,
    color: '#3730A3',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clearFilterBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
  },
  flaggedSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    overflow: 'hidden',
    marginTop: 4,
  },
  flaggedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  flaggedToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  flaggedToggleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  flaggedList: {
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    padding: 10,
    gap: 8,
  },
  flaggedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  flaggedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  flaggedItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flaggedItemAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  flaggedItemInfo: {
    flex: 1,
  },
  flaggedItemName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  flaggedItemMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  flaggedReasonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  flaggedReasonBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  flaggedReasonText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#991B1B',
  },
  flaggedViewChartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 6,
  },
  flaggedViewChartText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
});
