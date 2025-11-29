import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react-native';
import { logger, EventType, EventStatus } from '@/lib/logger';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [valid, setValid] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const parseTokensAndSetSession = async (url: string) => {
      console.log('[RESET] Parsing URL:', url);

      // Tokens come in hash fragment (#...)
      const hash = url.split('#')[1] || '';
      const urlParams = new URLSearchParams(hash);

      const access_token = urlParams.get('access_token');
      const refresh_token = urlParams.get('refresh_token');
      const type = urlParams.get('type');

      console.log('[RESET] Parsed tokens from URL:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        type,
      });

      if (!access_token || !refresh_token || type !== 'recovery') {
        setError('Reset link is missing or invalid. Please request a new one.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.log('[RESET] setSession error:', error);
        setError('Reset link has expired or is invalid. Please request a new one.');
        setLoading(false);
        return;
      }

      console.log('[RESET] Session set successfully');
      setValid(true);
      setLoading(false);
    };

    const init = async () => {
      try {
        console.log('[RESET] Init - checking params:', JSON.stringify(params));

        // First check if tokens were passed via router params (from deep link handler)
        if (params.access_token && params.refresh_token) {
          console.log('[RESET] Using tokens from router params');
          const access_token = params.access_token as string;
          const refresh_token = params.refresh_token as string;
          const type = (params.type as string) || 'recovery';

          console.log('[RESET] Params:', {
            hasAccessToken: !!access_token,
            hasRefreshToken: !!refresh_token,
            type,
          });

          if (type === 'recovery') {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              console.log('[RESET] setSession error from params:', error);
              setError('Reset link has expired or is invalid. Please request a new one.');
            } else {
              console.log('[RESET] Session set successfully from params');
              setValid(true);
            }
          } else {
            console.log('[RESET] Invalid type:', type);
            setError('Invalid reset link type.');
          }
          setLoading(false);
          return;
        }

        console.log('[RESET] No params, trying initial URL');

        // If no params, try getting the initial URL (app opened from closed state)
        const url = await Linking.getInitialURL();
        console.log('[RESET] Initial URL:', url);

        if (url && url.includes('reset-password')) {
          console.log('[RESET] Found reset-password URL, parsing it');
          await parseTokensAndSetSession(url);
          return;
        }

        console.log('[RESET] No valid URL found, waiting for URL event listener...');
        // Don't error immediately - wait for the URL event listener to fire
        // This handles the case where the deep link arrives after component mount
      } catch (e) {
        console.log('[RESET] Unexpected error:', e);
        setError('Something went wrong. Please request a new reset link.');
        setLoading(false);
      }
    };

    // Listen for URLs while app is running (handles deep links after navigation)
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[RESET] URL event received:', event.url);
      if (event.url.includes('reset-password')) {
        parseTokensAndSetSession(event.url);
      }
    });

    init();

    // Timeout fallback: if no tokens after 5 seconds, show error
    const timeout = setTimeout(() => {
      if (!valid && loading) {
        console.log('[RESET] Timeout - no tokens received');
        setError('Reset link is invalid or expired. Please request a new one.');
        setLoading(false);
      }
    }, 5000);

    return () => {
      subscription.remove();
      clearTimeout(timeout);
    };
  }, [params, valid, loading]);

  const handleResetPassword = async () => {
    if (!valid) {
      setError('Session is invalid. Please request a new reset link.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsUpdating(true);
    setError('');

    logger.event(EventType.AUTH, 'password_update', {
      status: EventStatus.START,
    });

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setIsUpdating(false);

    if (error) {
      console.error('[RESET_PASSWORD] Error updating password:', error);
      setError(error.message);

      logger.event(EventType.AUTH, 'password_update', {
        status: EventStatus.FAIL,
        metadata: { error: error.message },
      });
    } else {
      console.log('[RESET_PASSWORD] Password updated successfully');
      setSuccess(true);

      logger.event(EventType.AUTH, 'password_update', {
        status: EventStatus.SUCCESS,
      });

      setTimeout(() => {
        router.replace('/(auth)/signin');
      }, 2000);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#FFFFFF" />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password below</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Verifying reset link...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Password updated successfully! Redirecting to sign in...
            </Text>
          </View>
        ) : null}

        {!loading && valid && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!success && !isUpdating}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#64748B"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!success && !isUpdating}
            />

            {!success && (
              <Pressable
                style={[styles.button, isUpdating && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {error && (
          <Pressable
            style={styles.button}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.buttonText}>Request New Reset Link</Text>
          </Pressable>
        )}

        <Pressable onPress={() => router.push('/(auth)/signin')}>
          <Text style={styles.link}>
            Back to <Text style={styles.linkBold}>Sign In</Text>
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: typeof Platform !== 'undefined' && Platform.OS === 'android' ? 100 : 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  loadingBox: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  error: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successBox: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  linkBold: {
    color: '#10B981',
    fontWeight: '600',
  },
});
