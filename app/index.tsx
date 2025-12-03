import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const { session, loading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  useEffect(() => {
    if (loading) {
      console.log('[INDEX] Auth still loading...');
      return;
    }

    console.log('[INDEX] Auth loaded, session:', !!session, 'user:', !!user);

    const checkOnboarding = async () => {
      if (session && user) {
        console.log('[INDEX] User authenticated, checking onboarding status for user:', user.id);
        setCheckingOnboarding(true);
        try {
          const { data, error } = await supabase
            .from('user_profile_settings')
            .select('has_completed_onboarding')
            .eq('user_id', user.id)
            .maybeSingle();

          console.log('[INDEX] Onboarding check result:', {
            data,
            error,
            hasCompleted: data?.has_completed_onboarding
          });

          if (error) {
            console.error('[INDEX] Error checking onboarding:', error);
            router.replace('/(tabs)');
          } else if (!data) {
            console.log('[INDEX] No profile settings found, needs onboarding');
            router.replace('/(auth)/onboarding');
          } else if (data.has_completed_onboarding === false) {
            console.log('[INDEX] User needs onboarding (flag is false), redirecting to onboarding');
            router.replace('/(auth)/onboarding');
          } else {
            console.log('[INDEX] User logged in and onboarded, redirecting to tabs');
            router.replace('/(tabs)');
          }
        } catch (error) {
          console.error('[INDEX] Exception checking onboarding:', error);
          router.replace('/(tabs)');
        } finally {
          setCheckingOnboarding(false);
        }
      } else {
        console.log('[INDEX] No session, redirecting to welcome');
        router.replace('/(auth)/welcome');
      }
    };

    checkOnboarding();
  }, [session, loading, user]);

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B']}
      style={styles.container}
    >
      <ActivityIndicator size="large" color="#10B981" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
