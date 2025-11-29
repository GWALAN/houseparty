/**
 * Safe Platform utility with fallbacks for web builds
 * Prevents "Platform is not defined" errors during bundling
 */

import { Platform } from 'react-native';

export const safePlatform = {
  get OS() {
    try {
      return typeof Platform !== 'undefined' ? Platform.OS : 'web';
    } catch {
      return 'web';
    }
  },

  get Version() {
    try {
      return typeof Platform !== 'undefined' ? Platform.Version : 'unknown';
    } catch {
      return 'unknown';
    }
  },

  select<T>(specifics: { [platform: string]: T; default?: T }): T {
    try {
      if (typeof Platform !== 'undefined' && Platform.select) {
        return Platform.select(specifics);
      }
      // Fallback: use web or default
      return specifics.web ?? specifics.default ?? (specifics as any).default;
    } catch {
      return specifics.web ?? specifics.default ?? (specifics as any).default;
    }
  },

  get isPad() {
    try {
      return typeof Platform !== 'undefined' ? Platform.isPad : false;
    } catch {
      return false;
    }
  },

  get isTV() {
    try {
      return typeof Platform !== 'undefined' ? Platform.isTV : false;
    } catch {
      return false;
    }
  },

  isWeb(): boolean {
    return this.OS === 'web';
  },

  isAndroid(): boolean {
    return this.OS === 'android';
  },

  isIOS(): boolean {
    return this.OS === 'ios';
  },
};
