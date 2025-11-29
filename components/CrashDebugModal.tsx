import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator, Share, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, AlertTriangle, AlertCircle, Info, Copy, Download, Trash2, ChevronRight, ChevronDown } from 'lucide-react-native';
import { crashDebugger, CrashLog, CrashStatistics } from '@/lib/crashDebugger';
import * as Clipboard from 'expo-clipboard';

type TabType = 'crashes' | 'logs' | 'stats';

interface CrashDebugModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CrashDebugModal({ visible, onClose }: CrashDebugModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('crashes');
  const [crashes, setCrashes] = useState<CrashLog[]>([]);
  const [allLogs, setAllLogs] = useState<CrashLog[]>([]);
  const [statistics, setStatistics] = useState<CrashStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCrashId, setExpandedCrashId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [crashData, statsData] = await Promise.all([
        crashDebugger.getRecentCrashes(20),
        crashDebugger.getCrashStatistics(),
      ]);

      setCrashes(crashData);
      setStatistics(statsData);

      if (activeTab === 'logs') {
        const logs = await crashDebugger.getAllLogs(
          logFilter === 'all' ? undefined : logFilter as any,
          undefined,
          50
        );
        setAllLogs(logs);
      }
    } catch (error) {
      console.error('[CRASH_DEBUG_MODAL] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const report = await crashDebugger.exportCrashReport('text');

      if (Platform.OS === 'web') {
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `houseparty-crash-report-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Crash report downloaded!');
      } else {
        await Share.share({
          message: report,
          title: 'HouseParty Crash Report',
        });
      }
    } catch (error) {
      console.error('[CRASH_DEBUG_MODAL] Error exporting:', error);
      if (Platform.OS === 'web') {
        alert('Failed to export crash report');
      } else {
        Alert.alert('Error', 'Failed to export crash report');
      }
    }
  };

  const handleClearLogs = () => {
    const confirmClear = Platform.OS === 'web'
      ? confirm('Are you sure you want to clear all logs? This cannot be undone.')
      : Alert.alert(
          'Clear All Logs',
          'Are you sure you want to clear all logs? This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: async () => {
                const success = await crashDebugger.clearAllLogs();
                if (success) {
                  setCrashes([]);
                  setAllLogs([]);
                  await loadData();
                  if (Platform.OS !== 'web') {
                    Alert.alert('Success', 'All logs cleared');
                  }
                } else {
                  if (Platform.OS === 'web') {
                    alert('Failed to clear logs');
                  } else {
                    Alert.alert('Error', 'Failed to clear logs');
                  }
                }
              },
            },
          ]
        );

    if (Platform.OS === 'web' && confirmClear) {
      (async () => {
        const success = await crashDebugger.clearAllLogs();
        if (success) {
          setCrashes([]);
          setAllLogs([]);
          await loadData();
          alert('All logs cleared');
        } else {
          alert('Failed to clear logs');
        }
      })();
    }
  };

  const handleCopyCrash = async (crash: CrashLog) => {
    try {
      const text = `Error: ${crash.message}\nTime: ${new Date(crash.timestamp).toLocaleString()}\n${crash.error_stack || ''}`;
      await Clipboard.setStringAsync(text);

      if (Platform.OS === 'web') {
        alert('Crash details copied to clipboard');
      } else {
        Alert.alert('Copied', 'Crash details copied to clipboard');
      }
    } catch (error) {
      console.error('[CRASH_DEBUG_MODAL] Error copying:', error);
    }
  };

  const toggleCrashExpansion = (crashId: string | undefined) => {
    if (!crashId) return;
    setExpandedCrashId(expandedCrashId === crashId ? null : crashId);
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#EF4444';
      case 'warn':
        return '#F59E0B';
      case 'info':
        return '#3B82F6';
      default:
        return '#64748B';
    }
  };

  const getSeverityIcon = (level: string) => {
    switch (level) {
      case 'error':
        return AlertTriangle;
      case 'warn':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderCrashItem = (crash: CrashLog) => {
    const isExpanded = expandedCrashId === crash.id;
    const SeverityIcon = getSeverityIcon(crash.level);
    const severityColor = getSeverityColor(crash.level);
    const redactedCrash = crashDebugger.redactSensitiveData(crash);

    return (
      <View key={crash.id || crash.timestamp} style={styles.crashCard}>
        <Pressable
          onPress={() => toggleCrashExpansion(crash.id)}
          style={[styles.crashHeader, { borderLeftColor: severityColor }]}
        >
          <View style={styles.crashHeaderLeft}>
            <SeverityIcon size={20} color={severityColor} />
            <View style={styles.crashHeaderInfo}>
              <Text style={styles.crashMessage} numberOfLines={isExpanded ? undefined : 2}>
                {crash.message}
              </Text>
              <View style={styles.crashMeta}>
                <Text style={styles.crashTime}>{formatTimestamp(crash.timestamp)}</Text>
                {crash.screen_name && (
                  <Text style={styles.crashScreen}>• {crash.screen_name}</Text>
                )}
              </View>
            </View>
          </View>
          {isExpanded ? (
            <ChevronDown size={20} color="#94A3B8" />
          ) : (
            <ChevronRight size={20} color="#94A3B8" />
          )}
        </Pressable>

        {isExpanded && (
          <View style={styles.crashDetails}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Timestamp</Text>
              <Text style={styles.detailValue}>
                {new Date(crash.timestamp).toLocaleString()}
              </Text>
            </View>

            {crash.screen_name && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Screen</Text>
                <Text style={styles.detailValue}>{crash.screen_name}</Text>
              </View>
            )}

            {crash.platform && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Platform</Text>
                <Text style={styles.detailValue}>{crash.platform}</Text>
              </View>
            )}

            {crash.app_version && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>App Version</Text>
                <Text style={styles.detailValue}>{crash.app_version}</Text>
              </View>
            )}

            {crash.error_stack && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Stack Trace</Text>
                <ScrollView style={styles.stackTraceContainer} horizontal>
                  <Text style={styles.stackTrace}>{crash.error_stack}</Text>
                </ScrollView>
              </View>
            )}

            {crash.breadcrumbs && crash.breadcrumbs.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Breadcrumbs</Text>
                {crash.breadcrumbs.slice(0, 5).map((breadcrumb: any, idx: number) => (
                  <Text key={idx} style={styles.breadcrumbItem}>
                    {breadcrumb.event_name} - {formatTimestamp(breadcrumb.timestamp)}
                  </Text>
                ))}
              </View>
            )}

            <Pressable style={styles.copyButton} onPress={() => handleCopyCrash(crash)}>
              <Copy size={16} color="#10B981" />
              <Text style={styles.copyButtonText}>Copy Details</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderCrashesTab = () => (
    <ScrollView style={styles.tabContent}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading crashes...</Text>
        </View>
      ) : crashes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Info size={48} color="#64748B" />
          <Text style={styles.emptyTitle}>No Crashes Recorded</Text>
          <Text style={styles.emptyText}>Your app is running smoothly!</Text>
        </View>
      ) : (
        <View style={styles.crashList}>
          {crashes.map(renderCrashItem)}
        </View>
      )}
    </ScrollView>
  );

  const renderLogsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.filterContainer}>
        {(['all', 'error', 'warn', 'info'] as const).map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterButton,
              logFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => {
              setLogFilter(filter);
              loadData();
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                logFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : allLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Info size={48} color="#64748B" />
          <Text style={styles.emptyTitle}>No Logs Found</Text>
        </View>
      ) : (
        <View style={styles.crashList}>
          {allLogs.map(renderCrashItem)}
        </View>
      )}
    </ScrollView>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.tabContent}>
      {loading || !statistics ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statistics.totalCrashes}</Text>
            <Text style={styles.statLabel}>Total Crashes</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statistics.last24HoursCrashes}</Text>
            <Text style={styles.statLabel}>Last 24 Hours</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {statistics.averageCrashesPerDay.toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Avg per Day</Text>
          </View>

          {statistics.lastCrashTimestamp && (
            <View style={[styles.statCard, styles.statCardWide]}>
              <Text style={styles.statLabel}>Last Crash</Text>
              <Text style={styles.statValueSmall}>
                {new Date(statistics.lastCrashTimestamp).toLocaleString()}
              </Text>
            </View>
          )}

          {statistics.mostCommonError && (
            <View style={[styles.statCard, styles.statCardWide]}>
              <Text style={styles.statLabel}>Most Common Error</Text>
              <Text style={styles.statValueSmall} numberOfLines={3}>
                {statistics.mostCommonError}
              </Text>
            </View>
          )}

          {Object.keys(statistics.crashesByScreen).length > 0 && (
            <View style={[styles.statCard, styles.statCardWide]}>
              <Text style={styles.statLabel}>Crashes by Screen</Text>
              {Object.entries(statistics.crashesByScreen)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([screen, count]) => (
                  <View key={screen} style={styles.screenStatRow}>
                    <Text style={styles.screenStatName}>{screen}</Text>
                    <Text style={styles.screenStatCount}>{count}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gradient}>
          <View style={styles.header}>
            <Text style={styles.title}>Debug Console</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tab, activeTab === 'crashes' && styles.tabActive]}
              onPress={() => setActiveTab('crashes')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'crashes' && styles.tabTextActive,
                ]}
              >
                Crashes
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tab, activeTab === 'logs' && styles.tabActive]}
              onPress={() => setActiveTab('logs')}
            >
              <Text
                style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}
              >
                All Logs
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
              onPress={() => setActiveTab('stats')}
            >
              <Text
                style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}
              >
                Stats
              </Text>
            </Pressable>
          </View>

          {activeTab === 'crashes' && renderCrashesTab()}
          {activeTab === 'logs' && renderLogsTab()}
          {activeTab === 'stats' && renderStatsTab()}

          <View style={styles.footer}>
            <Pressable style={styles.footerButton} onPress={handleRefresh}>
              <Text style={styles.footerButtonText}>Refresh</Text>
            </Pressable>

            <Pressable style={styles.footerButton} onPress={handleExport}>
              <Download size={16} color="#10B981" />
              <Text style={styles.footerButtonText}>Export</Text>
            </Pressable>

            <Pressable style={styles.footerButtonDanger} onPress={handleClearLogs}>
              <Trash2 size={16} color="#EF4444" />
              <Text style={styles.footerButtonDangerText}>Clear</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#10B981',
  },
  tabContent: {
    flex: 1,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  crashList: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  crashCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  crashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderLeftWidth: 3,
  },
  crashHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  crashHeaderInfo: {
    flex: 1,
  },
  crashMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  crashMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crashTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  crashScreen: {
    fontSize: 12,
    color: '#64748B',
  },
  crashDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  stackTraceContainer: {
    maxHeight: 200,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
  },
  stackTrace: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#CBD5E1',
    lineHeight: 16,
  },
  breadcrumbItem: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    marginTop: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterButtonTextActive: {
    color: '#10B981',
  },
  statsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statCardWide: {
    minWidth: '100%',
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
  },
  statValueSmall: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  screenStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  screenStatName: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  screenStatCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: typeof Platform !== 'undefined' && Platform.OS === 'android' ? 24 : 16,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  footerButtonDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  footerButtonDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
