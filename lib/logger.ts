import { supabase } from './supabase';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const isDev = __DEV__;
const ENABLE_REMOTE_LOGGING = true;
const BATCH_INTERVAL = 5000; // Send logs every 5 seconds
const MAX_BATCH_SIZE = 50; // Max logs per batch
const MAX_BREADCRUMBS = 50; // Keep last 50 events in memory
const MAX_LOGS_PER_MINUTE = 100; // Rate limit

// Event Types
export const EventType = {
  NAVIGATE: 'NAVIGATE',
  AUTH: 'AUTH',
  HOUSE: 'HOUSE',
  GAME: 'GAME',
  PURCHASE: 'PURCHASE',
  API_CALL: 'API_CALL',
  CRASH: 'CRASH',
  WARNING: 'WARNING',
  SYSTEM: 'SYSTEM',
} as const;

export type EventTypeKey = keyof typeof EventType;

// Event Status
export const EventStatus = {
  START: 'start',
  SUCCESS: 'success',
  FAIL: 'fail',
  INFO: 'info',
} as const;

export type EventStatusKey = keyof typeof EventStatus;

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  event_type?: string;
  event_name?: string;
  status?: string;
  user_id?: string;
  house_id?: string;
  game_id?: string;
  session_id?: string;
  screen_name?: string;
  app_version?: string;
  platform?: string;
  build_channel?: string;
  device_info?: any;
  metadata?: any;
  error_stack?: string;
  breadcrumbs?: any[];
  timestamp: string;
}

interface Breadcrumb {
  timestamp: string;
  event_type: string;
  event_name: string;
  screen_name?: string;
  metadata?: any;
}

// In-memory log queue and breadcrumbs
let logQueue: LogEntry[] = [];
let breadcrumbs: Breadcrumb[] = [];
let batchTimer: NodeJS.Timeout | null = null;
let logCount = 0;
let lastResetTime = Date.now();

// Get app info
const getAppInfo = () => {
  try {
    return {
      version: Application.nativeApplicationVersion || '1.0.0',
      buildNumber: Application.nativeBuildVersion || '1',
      platform: typeof Platform !== 'undefined' ? Platform.OS : 'web',
      osVersion: typeof Platform !== 'undefined' && Platform.Version ? Platform.Version.toString() : 'unknown',
      model: Device.modelName || 'unknown',
      buildChannel: __DEV__ ? 'dev' : 'prod',
    };
  } catch {
    return {
      version: '1.0.0',
      buildNumber: '1',
      platform: typeof Platform !== 'undefined' ? Platform.OS : 'web',
      osVersion: 'unknown',
      model: 'unknown',
      buildChannel: __DEV__ ? 'dev' : 'prod',
    };
  }
};

// Rate limiting
const checkRateLimit = (): boolean => {
  const now = Date.now();
  if (now - lastResetTime > 60000) {
    logCount = 0;
    lastResetTime = now;
  }

  if (logCount >= MAX_LOGS_PER_MINUTE) {
    if (isDev) {
      console.warn('[LOGGER] Rate limit exceeded, dropping log');
    }
    return false;
  }

  logCount++;
  return true;
};

// Add breadcrumb to circular buffer
const addBreadcrumb = (breadcrumb: Breadcrumb) => {
  breadcrumbs.push(breadcrumb);
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
};

// Flush logs to database
const flushLogs = async () => {
  if (logQueue.length === 0) return;

  const logsToSend = logQueue.splice(0, MAX_BATCH_SIZE);

  if (!ENABLE_REMOTE_LOGGING) return;

  try {
    // Try batch insert function first (most efficient)
    const { error } = await supabase.rpc('insert_app_logs_batch', {
      logs: logsToSend as any,
    });

    if (error) {
      console.error('[LOGGER] Failed to send log batch via RPC:', error);

      // Fallback: Try individual inserts
      console.log('[LOGGER] Attempting fallback: individual inserts');
      try {
        const { error: insertError } = await supabase
          .from('app_logs')
          .insert(logsToSend);

        if (insertError) {
          console.error('[LOGGER] Fallback insert also failed:', insertError);
          // Re-queue failed logs (max 100 to prevent memory issues)
          if (logQueue.length < 100) {
            logQueue.unshift(...logsToSend);
          }
        } else {
          console.log('[LOGGER] Fallback insert succeeded');
        }
      } catch (fallbackErr) {
        console.error('[LOGGER] Fallback exception:', fallbackErr);
        if (logQueue.length < 100) {
          logQueue.unshift(...logsToSend);
        }
      }
    }
  } catch (err) {
    console.error('[LOGGER] Exception sending logs:', err);
    // Try fallback
    try {
      const { error: insertError } = await supabase
        .from('app_logs')
        .insert(logsToSend);

      if (insertError) {
        console.error('[LOGGER] Fallback after exception failed:', insertError);
        if (logQueue.length < 100) {
          logQueue.unshift(...logsToSend);
        }
      } else {
        console.log('[LOGGER] Fallback after exception succeeded');
      }
    } catch (fallbackErr) {
      console.error('[LOGGER] Complete failure:', fallbackErr);
      if (logQueue.length < 100) {
        logQueue.unshift(...logsToSend);
      }
    }
  }
};

// Start batch timer
const startBatchTimer = () => {
  if (batchTimer) return;

  batchTimer = setInterval(() => {
    flushLogs();
  }, BATCH_INTERVAL);
};

// Queue a log entry
const queueLog = async (entry: Partial<LogEntry>) => {
  try {
    if (!checkRateLimit()) return;

    const appInfo = getAppInfo();
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    const logEntry: LogEntry = {
      level: entry.level || 'info',
      message: entry.message || '',
      event_type: entry.event_type,
      event_name: entry.event_name,
      status: entry.status,
      user_id: entry.user_id || user?.id,
      house_id: entry.house_id,
      game_id: entry.game_id,
      session_id: entry.session_id,
      screen_name: entry.screen_name,
      app_version: appInfo.version,
      platform: appInfo.platform,
      build_channel: appInfo.buildChannel,
      device_info: {
        platform: appInfo.platform,
        model: appInfo.model,
        osVersion: appInfo.osVersion,
        buildNumber: appInfo.buildNumber,
      },
      metadata: entry.metadata,
      error_stack: entry.error_stack,
      breadcrumbs: entry.breadcrumbs,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    logQueue.push(logEntry);
    startBatchTimer();

    // Add to breadcrumbs if it's an event
    if (entry.event_type && entry.event_name) {
      addBreadcrumb({
        timestamp: logEntry.timestamp,
        event_type: entry.event_type,
        event_name: entry.event_name,
        screen_name: entry.screen_name,
        metadata: entry.metadata,
      });
    }

    // Flush immediately for errors and crashes
    if (entry.level === 'error' || entry.event_type === EventType.CRASH) {
      await flushLogs();
    }
  } catch (err) {
    // NEVER let the logger crash the app
    console.error('[LOGGER] CRITICAL: queueLog failed:', err);
  }
};

// Main logger API
export const logger = {
  // Basic logging
  debug: (...args: any[]) => {
    try {
      if (isDev) {
        console.log(...args);
      }
      const message = args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');

      queueLog({
        level: 'debug',
        message,
        metadata: args.length > 1 ? args.slice(1) : undefined,
      });
    } catch (err) {
      console.error('[LOGGER] debug() failed:', err);
    }
  },

  info: (...args: any[]) => {
    try {
      if (isDev) {
        console.info(...args);
      }
      const message = args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');

      queueLog({
        level: 'info',
        message,
        metadata: args.length > 1 ? args.slice(1) : undefined,
      });
    } catch (err) {
      console.error('[LOGGER] info() failed:', err);
    }
  },

  warn: (...args: any[]) => {
    try {
      console.warn(...args);
      const message = args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');

      queueLog({
        level: 'warn',
        message,
        event_type: EventType.WARNING,
        metadata: args.length > 1 ? args.slice(1) : undefined,
      });
    } catch (err) {
      console.error('[LOGGER] warn() failed:', err);
    }
  },

  error: (...args: any[]) => {
    try {
      console.error(...args);
      const message = args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');

      queueLog({
        level: 'error',
        message,
        metadata: args.length > 1 ? args.slice(1) : undefined,
      });
    } catch (err) {
      console.error('[LOGGER] error() failed:', err);
    }
  },

  // Event tracking
  event: (eventType: string, eventName: string, data?: {
    status?: string;
    house_id?: string;
    game_id?: string;
    session_id?: string;
    screen_name?: string;
    metadata?: any;
  }) => {
    const message = `[${eventType}] ${eventName}`;

    if (isDev) {
      console.log(message, data?.metadata);
    }

    queueLog({
      level: 'info',
      message,
      event_type: eventType,
      event_name: eventName,
      status: data?.status || EventStatus.INFO,
      house_id: data?.house_id,
      game_id: data?.game_id,
      session_id: data?.session_id,
      screen_name: data?.screen_name,
      metadata: data?.metadata,
    });
  },

  // Navigation tracking
  navigate: (screenName: string, params?: any) => {
    logger.event(EventType.NAVIGATE, 'screen_view', {
      status: EventStatus.SUCCESS,
      screen_name: screenName,
      metadata: { params },
    });
  },

  // API call tracking
  apiStart: (endpoint: string, params?: any) => {
    logger.event(EventType.API_CALL, endpoint, {
      status: EventStatus.START,
      metadata: { params },
    });
  },

  apiSuccess: (endpoint: string, duration?: number) => {
    logger.event(EventType.API_CALL, endpoint, {
      status: EventStatus.SUCCESS,
      metadata: { duration },
    });
  },

  apiError: (endpoint: string, error: any, duration?: number) => {
    logger.event(EventType.API_CALL, endpoint, {
      status: EventStatus.FAIL,
      metadata: {
        error: error?.message || String(error),
        code: error?.code,
        duration,
      },
    });
  },

  // Crash logging
  crash: (error: Error, componentStack?: string) => {
    queueLog({
      level: 'error',
      message: `CRASH: ${error.message}`,
      event_type: EventType.CRASH,
      event_name: 'app_crash',
      status: EventStatus.FAIL,
      error_stack: error.stack || componentStack,
      breadcrumbs: [...breadcrumbs],
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
      },
    });

    // Force immediate flush
    flushLogs();
  },

  // Legacy track method for backward compatibility
  track: (action: string, metadata?: any) => {
    logger.event(EventType.SYSTEM, action, {
      status: EventStatus.INFO,
      metadata,
    });
  },

  // Get breadcrumbs for debugging
  getBreadcrumbs: () => [...breadcrumbs],

  // Force flush (useful before app close)
  flush: () => flushLogs(),
};

// Auto-flush on app background/close
if (typeof Platform !== 'undefined' && Platform.OS !== 'web') {
  try {
    const AppState = require('react-native').AppState;
    AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        flushLogs();
      }
    });
  } catch (e) {
    console.warn('[LOGGER] Could not set up AppState listener:', e);
  }
}
