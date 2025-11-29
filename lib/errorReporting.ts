/**
 * Centralized Error Reporting and Logging
 *
 * Provides consistent error logging across the app, especially important
 * for mobile devices where console access is limited.
 */

export interface ErrorDetails {
  context: string;
  message: string;
  stack?: string;
  code?: string;
  details?: any;
  hint?: string;
  timestamp: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Log an error with full context and details
 */
export const logError = (
  context: string,
  error: any,
  additionalData?: Record<string, any>
): ErrorDetails => {
  const errorDetails: ErrorDetails = {
    context,
    message: error?.message || String(error),
    stack: error?.stack,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  // Log to console (visible in Expo Go, dev builds, or via adb/Xcode)
  console.error(`[ERROR ${context}]`, JSON.stringify(errorDetails, null, 2));

  // TODO: Send to remote logging service (Sentry, LogRocket, etc.)
  // Example:
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, {
  //     contexts: { custom: errorDetails }
  //   });
  // }

  return errorDetails;
};

/**
 * Log a warning
 */
export const logWarning = (
  context: string,
  message: string,
  data?: Record<string, any>
): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.warn(`[WARNING ${context}]`, message, logData);
};

/**
 * Log informational message
 */
export const logInfo = (
  context: string,
  message: string,
  data?: Record<string, any>
): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.log(`[INFO ${context}]`, message, logData);
};

/**
 * Log debug information (only in development)
 */
export const logDebug = (
  context: string,
  message: string,
  data?: Record<string, any>
): void => {
  if (__DEV__) {
    const logData = {
      timestamp: new Date().toISOString(),
      ...data,
    };
    console.log(`[DEBUG ${context}]`, message, logData);
  }
};

/**
 * Wrapper for async operations with error logging
 */
export const withErrorLogging = async <T>(
  context: string,
  operation: () => Promise<T>,
  additionalData?: Record<string, any>
): Promise<{ data: T | null; error: ErrorDetails | null }> => {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (err) {
    const error = logError(context, err, additionalData);
    return { data: null, error };
  }
};

/**
 * Format Supabase error for display to user
 */
export const formatSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred';

  // Supabase-specific error formatting
  if (error.code) {
    switch (error.code) {
      case '23505':
        return 'This item already exists. Please try a different value.';
      case '23503':
        return 'Unable to complete operation due to related data.';
      case 'PGRST116':
        return 'No data found.';
      case '42501':
        return 'You do not have permission to perform this action.';
      default:
        return error.message || 'A database error occurred';
    }
  }

  return error.message || 'An error occurred';
};
