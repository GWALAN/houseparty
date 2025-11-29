import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[SUPABASE] Missing environment variables. ' +
      'Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file and on expo.dev.'
  );
}

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];

  if (typeof message === 'string') {
    if (
      message.includes('session_not_found') ||
      message.includes('Session from session_id claim in JWT does not exist') ||
      message.includes('Supabase request failed')
    ) {
      return;
    }
  }

  if (typeof message === 'object' && message !== null) {
    const msgStr = JSON.stringify(message);
    if (
      message.code === 'session_not_found' ||
      message.message?.includes('session_not_found') ||
      message.message?.includes('Session from session_id claim in JWT does not exist') ||
      msgStr.includes('session_not_found') ||
      (message.url && message.url.includes('/auth/v1/logout') && message.status === 403)
    ) {
      return;
    }
  }

  originalConsoleError.apply(console, args);
};

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (typeof Platform !== 'undefined' && Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof Platform !== 'undefined' && Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (typeof Platform !== 'undefined' && Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// Only override window.fetch on web platform
if (typeof Platform !== 'undefined' && Platform.OS === 'web' && typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async (input, init?) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('/auth/v1/logout')) {
      try {
        const response = await originalFetch(input, init);

        if (!response.ok && response.status === 403) {
          const clonedResponse = response.clone();
          try {
            const body = await clonedResponse.text();
            if (body.includes('session_not_found')) {
              return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: response.headers,
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        return response;
      } catch (error) {
        if (url.includes('/auth/v1/logout')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        throw error;
      }
    }

    return originalFetch(input, init);
  };
}

const customFetch: typeof fetch = async (input, init?) => {
  try {
    const response = await fetch(input, init);

    if (
      !response.ok &&
      response.status === 403 &&
      typeof input === 'string' &&
      input.includes('/auth/v1/logout')
    ) {
      const clonedResponse = response.clone();
      try {
        const body = await clonedResponse.text();
        if (body.includes('session_not_found')) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: response.headers,
          });
        }
      } catch (e) {
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
};

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-react-native',
      },
      fetch: customFetch,
    },
  }
);
