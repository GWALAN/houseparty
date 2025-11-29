import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isResetPassword = segments[1] === 'reset-password';

    console.log('[AUTH GUARD] Segments:', segments, 'inAuthGroup:', inAuthGroup, 'session:', !!session);

    // Allow reset-password screen even with active session
    if (session && inAuthGroup && !isResetPassword) {
      console.log('[AUTH GUARD] Logged in user in auth screen, redirecting to tabs');
      router.replace('/(tabs)');
    } else if (!session && !inAuthGroup && !inTabsGroup) {
      console.log('[AUTH GUARD] Not logged in, attempting to access protected route, redirecting to welcome');
      router.replace('/(auth)/welcome');
    }
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
