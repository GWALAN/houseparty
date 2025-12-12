import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Linking, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

export default function AuthRedirectScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [showManualButton, setShowManualButton] = useState(false);
  const [tokens, setTokens] = useState<{ access_token: string; refresh_token: string; type: string } | null>(null);

  useEffect(() => {
    const handleAuthRedirect = async () => {
      console.log('[AUTH_REDIRECT] Starting auth redirect handler');
      console.log('[AUTH_REDIRECT] Platform:', Platform.OS);

      // On web, params come from URL query/hash
      // Extract from hash if present
      let access_token = params.access_token as string;
      let refresh_token = params.refresh_token as string;
      let type = params.type as string;

      // Try to get from URL hash if not in params
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1); // Remove #
        const hashParams = new URLSearchParams(hash);

        access_token = access_token || hashParams.get('access_token') || '';
        refresh_token = refresh_token || hashParams.get('refresh_token') || '';
        type = type || hashParams.get('type') || '';

        console.log('[AUTH_REDIRECT] Extracted from hash:', {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          type
        });
      }

      console.log('[AUTH_REDIRECT] Final params:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        type
      });

      if (!access_token || !refresh_token) {
        console.log('[AUTH_REDIRECT] Missing tokens, redirecting to forgot password');
        router.replace('/(auth)/forgot-password');
        return;
      }

      if (type === 'signup') {
        console.log('[AUTH_REDIRECT] Processing email confirmation');

        // Set the session to confirm the user's email
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error('[AUTH_REDIRECT] Error confirming email:', error);
          router.replace('/(auth)/signin');
          return;
        }

        console.log('[AUTH_REDIRECT] Email confirmed successfully, redirecting to app');
        // Redirect to home which will check onboarding status
        router.replace('/');
      } else if (type === 'recovery') {
        console.log('[AUTH_REDIRECT] Processing password recovery');

        // Store tokens for manual button
        setTokens({ access_token, refresh_token, type });

        // Set the session first
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error('[AUTH_REDIRECT] Error setting session:', error);
          router.replace('/(auth)/forgot-password');
          return;
        }

        console.log('[AUTH_REDIRECT] Session set successfully');

        // If on web, attempt to open app and show manual button
        if (Platform.OS === 'web') {
          console.log('[AUTH_REDIRECT] Web platform - attempting to open native app');

          const deepLinkUrl = `houseparty://reset-password?access_token=${access_token}&refresh_token=${refresh_token}&type=${type}`;

          // Try to open the native app
          try {
            window.location.href = deepLinkUrl;
          } catch (e) {
            console.log('[AUTH_REDIRECT] Failed to open deep link:', e);
          }

          // Show manual button after a short delay
          setTimeout(() => {
            setShowManualButton(true);
          }, 1500);
        } else {
          // On native, route to reset password
          router.replace(`/(auth)/reset-password?access_token=${access_token}&refresh_token=${refresh_token}&type=${type}`);
        }
      } else {
        console.log('[AUTH_REDIRECT] Unknown type, redirecting to sign in');
        router.replace('/(auth)/signin');
      }
    };

    handleAuthRedirect();
  }, [params, router]);

  const handleOpenApp = () => {
    if (tokens && Platform.OS === 'web') {
      const deepLinkUrl = `houseparty://reset-password?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}&type=${tokens.type}`;
      window.location.href = deepLinkUrl;
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <View style={styles.content}>
        {!showManualButton ? (
          <>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.text}>Redirecting...</Text>
            <Text style={styles.subtext}>Please wait while we verify your reset link</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Open HouseParty App</Text>
            <Text style={styles.description}>
              To reset your password, you need to open the HouseParty app.
            </Text>
            <Text style={styles.description}>
              Tap the button below to open the app, or manually open HouseParty from your device.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleOpenApp}
            >
              <Text style={styles.buttonText}>Open HouseParty App</Text>
            </TouchableOpacity>

            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>If the app doesn't open:</Text>
              <Text style={styles.instructionsText}>1. Manually open the HouseParty app</Text>
              <Text style={styles.instructionsText}>2. Your password reset is already prepared</Text>
              <Text style={styles.instructionsText}>3. You'll be taken to the reset screen automatically</Text>
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    minWidth: 250,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionsBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    maxWidth: 400,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 20,
  },
});
