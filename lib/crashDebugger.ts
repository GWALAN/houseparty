import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CRASH_STORAGE_KEY = '@houseparty_crashes';
const MAX_LOCAL_CRASHES = 20;

export interface CrashLog {
  id?: string;
  timestamp: string;
  level: string;
  message: string;
  event_type?: string;
  event_name?: string;
  screen_name?: string;
  error_stack?: string;
  breadcrumbs?: any[];
  metadata?: any;
  device_info?: any;
  app_version?: string;
  platform?: string;
  user_id?: string;
}

export interface CrashStatistics {
  totalCrashes: number;
  last24HoursCrashes: number;
  mostCommonError: string | null;
  lastCrashTimestamp: string | null;
  crashesByScreen: Record<string, number>;
  averageCrashesPerDay: number;
}

export const crashDebugger = {
  async getRecentCrashes(limit: number = 10): Promise<CrashLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('app_logs')
        .select('*')
        .eq('level', 'error')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[CRASH_DEBUGGER] Error fetching crashes:', error);
        return await this.getLocalCrashes();
      }

      return data || [];
    } catch (err) {
      console.error('[CRASH_DEBUGGER] Exception fetching crashes:', err);
      return await this.getLocalCrashes();
    }
  },

  async getAllLogs(
    logLevel?: 'debug' | 'info' | 'warn' | 'error',
    dateRange?: { start: Date; end: Date },
    limit: number = 50,
    offset: number = 0
  ): Promise<CrashLog[]> {
    try {
      let query = supabase
        .from('app_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (logLevel) {
        query = query.eq('level', logLevel);
      }

      if (dateRange) {
        query = query
          .gte('timestamp', dateRange.start.toISOString())
          .lte('timestamp', dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[CRASH_DEBUGGER] Error fetching logs:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[CRASH_DEBUGGER] Exception fetching logs:', err);
      return [];
    }
  },

  async getCrashStatistics(): Promise<CrashStatistics> {
    try {
      const allCrashes = await this.getRecentCrashes(1000);

      const now = Date.now();
      const last24Hours = allCrashes.filter(crash => {
        const crashTime = new Date(crash.timestamp).getTime();
        return now - crashTime < 24 * 60 * 60 * 1000;
      });

      const crashesByScreen: Record<string, number> = {};
      const errorMessages: Record<string, number> = {};

      allCrashes.forEach(crash => {
        if (crash.screen_name) {
          crashesByScreen[crash.screen_name] = (crashesByScreen[crash.screen_name] || 0) + 1;
        }
        if (crash.message) {
          errorMessages[crash.message] = (errorMessages[crash.message] || 0) + 1;
        }
      });

      const mostCommonError = Object.keys(errorMessages).length > 0
        ? Object.keys(errorMessages).reduce((a, b) =>
            errorMessages[a] > errorMessages[b] ? a : b
          )
        : null;

      const oldestCrash = allCrashes[allCrashes.length - 1];
      const daysSinceFirst = oldestCrash
        ? (now - new Date(oldestCrash.timestamp).getTime()) / (24 * 60 * 60 * 1000)
        : 1;

      return {
        totalCrashes: allCrashes.length,
        last24HoursCrashes: last24Hours.length,
        mostCommonError,
        lastCrashTimestamp: allCrashes[0]?.timestamp || null,
        crashesByScreen,
        averageCrashesPerDay: allCrashes.length / Math.max(daysSinceFirst, 1),
      };
    } catch (err) {
      console.error('[CRASH_DEBUGGER] Error calculating statistics:', err);
      return {
        totalCrashes: 0,
        last24HoursCrashes: 0,
        mostCommonError: null,
        lastCrashTimestamp: null,
        crashesByScreen: {},
        averageCrashesPerDay: 0,
      };
    }
  },

  async exportCrashReport(format: 'text' | 'json' | 'markdown' = 'text'): Promise<string> {
    try {
      const crashes = await this.getRecentCrashes(100);
      const stats = await this.getCrashStatistics();

      if (format === 'json') {
        return JSON.stringify({ crashes, statistics: stats }, null, 2);
      }

      if (format === 'markdown') {
        let report = '# HouseParty Crash Report\n\n';
        report += `Generated: ${new Date().toLocaleString()}\n\n`;
        report += `## Statistics\n`;
        report += `- Total Crashes: ${stats.totalCrashes}\n`;
        report += `- Last 24 Hours: ${stats.last24HoursCrashes}\n`;
        report += `- Average per Day: ${stats.averageCrashesPerDay.toFixed(2)}\n`;
        if (stats.mostCommonError) {
          report += `- Most Common: ${stats.mostCommonError}\n`;
        }
        report += `\n## Recent Crashes\n\n`;

        crashes.forEach((crash, index) => {
          report += `### ${index + 1}. ${crash.message}\n`;
          report += `- Time: ${new Date(crash.timestamp).toLocaleString()}\n`;
          if (crash.screen_name) report += `- Screen: ${crash.screen_name}\n`;
          if (crash.error_stack) report += `- Stack: \`\`\`\n${crash.error_stack}\n\`\`\`\n`;
          report += `\n`;
        });

        return report;
      }

      let report = 'HOUSEPARTY CRASH REPORT\n';
      report += '='.repeat(60) + '\n\n';
      report += `Generated: ${new Date().toLocaleString()}\n\n`;
      report += 'STATISTICS\n';
      report += '-'.repeat(60) + '\n';
      report += `Total Crashes: ${stats.totalCrashes}\n`;
      report += `Last 24 Hours: ${stats.last24HoursCrashes}\n`;
      report += `Average per Day: ${stats.averageCrashesPerDay.toFixed(2)}\n`;
      if (stats.mostCommonError) {
        report += `Most Common Error: ${stats.mostCommonError}\n`;
      }
      report += '\n\nRECENT CRASHES\n';
      report += '-'.repeat(60) + '\n\n';

      crashes.forEach((crash, index) => {
        report += `${index + 1}. ${crash.message}\n`;
        report += `   Time: ${new Date(crash.timestamp).toLocaleString()}\n`;
        if (crash.screen_name) report += `   Screen: ${crash.screen_name}\n`;
        if (crash.platform) report += `   Platform: ${crash.platform}\n`;
        if (crash.app_version) report += `   Version: ${crash.app_version}\n`;
        if (crash.error_stack) {
          report += `   Stack:\n${crash.error_stack.split('\n').map(line => '     ' + line).join('\n')}\n`;
        }
        report += '\n';
      });

      return report;
    } catch (err) {
      console.error('[CRASH_DEBUGGER] Error exporting report:', err);
      return 'Error generating crash report';
    }
  },

  async clearAllLogs(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return false;

      const { error } = await supabase
        .from('app_logs')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('[CRASH_DEBUGGER] Error clearing logs:', error);
        return false;
      }

      await AsyncStorage.removeItem(CRASH_STORAGE_KEY);
      return true;
    } catch (err) {
      console.error('[CRASH_DEBUGGER] Exception clearing logs:', err);
      return false;
    }
  },

  async deleteCrashLog(logId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('app_logs')
        .delete()
        .eq('id', logId);

      if (error) {
        console.error('[CRASH_DEBUGGER] Error deleting log:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[CRASH_DEBUGGER] Exception deleting log:', err);
      return false;
    }
  },

  async getLocalCrashes(): Promise<CrashLog[]> {
    try {
      const stored = await AsyncStorage.getItem(CRASH_STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (err) {
      console.error('[CRASH_DEBUGGER] Error reading local crashes:', err);
      return [];
    }
  },

  async saveLocalCrash(crash: CrashLog): Promise<void> {
    try {
      const crashes = await this.getLocalCrashes();
      crashes.unshift(crash);

      if (crashes.length > MAX_LOCAL_CRASHES) {
        crashes.splice(MAX_LOCAL_CRASHES);
      }

      await AsyncStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(crashes));
    } catch (err) {
      console.error('[CRASH_DEBUGGER] Error saving local crash:', err);
    }
  },

  redactSensitiveData(log: CrashLog): CrashLog {
    const redacted = { ...log };

    if (redacted.user_id && redacted.user_id.length > 4) {
      redacted.user_id = '***' + redacted.user_id.slice(-4);
    }

    if (redacted.metadata) {
      const meta = { ...redacted.metadata };
      if (meta.email) meta.email = '***@***';
      if (meta.token) meta.token = '***';
      if (meta.apiKey) meta.apiKey = '***';
      redacted.metadata = meta;
    }

    return redacted;
  },
};
