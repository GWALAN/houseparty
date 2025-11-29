/**
 * Global Error Handler
 *
 * Sets up global error and promise rejection handlers for the entire app.
 * Captures all unhandled errors and logs them with breadcrumbs.
 */

import { logger } from './logger';

let isHandlerInstalled = false;
let currentScreen = 'unknown';

// Track current screen for crash context
export const setCurrentScreen = (screenName: string) => {
  currentScreen = screenName;
};

// Get current screen
export const getCurrentScreen = () => currentScreen;

/**
 * Install global error handlers
 * Should be called once at app startup in the root layout
 */
export const installGlobalErrorHandlers = () => {
  if (isHandlerInstalled) {
    console.warn('[GLOBAL_ERROR_HANDLER] Handlers already installed');
    return;
  }

  // Setup ErrorUtils for React Native
  if (typeof ErrorUtils !== 'undefined') {
    const defaultHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      // Log the crash with breadcrumbs
      logger.crash(error);

      // Log crash details
      logger.error('[GLOBAL_ERROR_HANDLER] Fatal error caught', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        isFatal,
        currentScreen,
        breadcrumbs: logger.getBreadcrumbs(),
      });

      // Call original handler
      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });

    console.log('[GLOBAL_ERROR_HANDLER] ErrorUtils handler installed');
  }

  // Setup global unhandled promise rejection handler
  const handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || 'No stack trace';

    logger.error('[GLOBAL_ERROR_HANDLER] Unhandled promise rejection', {
      errorMessage,
      errorStack,
      currentScreen,
      breadcrumbs: logger.getBreadcrumbs(),
    });

    // Log as crash if it looks serious
    if (error instanceof Error) {
      logger.crash(error);
    }
  };

  // For web and newer RN versions
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    try {
      window.addEventListener('unhandledrejection', handlePromiseRejection as any);
      console.log('[GLOBAL_ERROR_HANDLER] Promise rejection handler installed (window)');
    } catch (e) {
      console.log('[GLOBAL_ERROR_HANDLER] Could not install window rejection handler:', e);
    }
  }

  // For React Native only (not web)
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    try {
      // FIXED: Use public API instead of deprecated internal path
      // Note: Promise rejection tracking is now handled by default in React Native
      // The internal Libraries/Promise path is deprecated
      // We rely on the window.unhandledrejection handler above which works on RN
      console.log('[GLOBAL_ERROR_HANDLER] Using standard promise rejection handling (RN)');
    } catch (e) {
      // Not available on web, that's fine - using window.unhandledrejection instead
      console.log('[GLOBAL_ERROR_HANDLER] React Native Promise tracking not available (using window handler)');
    }
  }

  isHandlerInstalled = true;
  console.log('[GLOBAL_ERROR_HANDLER] All global error handlers installed successfully');
};

/**
 * Manually log an error (for try/catch blocks)
 */
export const logCaughtError = (
  context: string,
  error: any,
  additionalData?: Record<string, any>
) => {
  const errorMessage = error?.message || String(error);
  const errorStack = error?.stack;

  logger.error(`[${context}] ${errorMessage}`, {
    errorName: error?.name,
    errorStack,
    currentScreen,
    ...additionalData,
  });
};

/**
 * Wrap async functions with error logging
 */
export const withErrorLogging = async <T>(
  context: string,
  operation: () => Promise<T>,
  additionalData?: Record<string, any>
): Promise<{ data: T | null; error: any }> => {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    logCaughtError(context, error, additionalData);
    return { data: null, error };
  }
};
