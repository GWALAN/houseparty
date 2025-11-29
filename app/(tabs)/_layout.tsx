import { Tabs, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hop as Home, Trophy, User, Package, Users } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const { session, loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthGroup = segments[0] === '(auth)';

    console.log('[TABS GUARD] Segments:', segments, 'inTabsGroup:', inTabsGroup, 'session:', !!session);

    // Only redirect if user is NOT logged in and trying to access tabs
    if (!session && inTabsGroup) {
      console.log('[TABS GUARD] Not logged in, redirecting to welcome');
      router.replace('/(auth)/welcome');
    }
    // Remove the aggressive redirect that was preventing navigation!
    // Users should be able to navigate to create-house, join-house, etc.
  }, [session, loading, segments]);

  useEffect(() => {
    if (!user) return;

    const fetchPendingRequests = async () => {
      const { count } = await supabase
        .from('friend_requests')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      setPendingRequestsCount(count || 0);
    };

    const fetchPendingInvitations = async () => {
      const { count } = await supabase
        .from('game_invitations')
        .select('id', { count: 'exact', head: true })
        .eq('invitee_id', user.id)
        .eq('status', 'pending');

      setPendingInvitationsCount(count || 0);
    };

    fetchPendingRequests();
    fetchPendingInvitations();

    const subscription = supabase
      .channel('friend_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `recipient_id=eq.${user.id}`,
      }, () => {
        console.log('[TABS] Friend request changed, refreshing count');
        fetchPendingRequests();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        console.log('[TABS] Friendship changed, refreshing count');
        fetchPendingRequests();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_invitations',
        filter: `invitee_id=eq.${user.id}`,
      }, () => {
        console.log('[TABS] Game invitation changed, refreshing count');
        fetchPendingInvitations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 60 + insets.bottom : 85,
          paddingBottom: Platform.OS === 'android' ? insets.bottom : 15,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          lineHeight: 16,
          ...(Platform.OS === 'android' && { includeFontPadding: false }),
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Houses',
          tabBarIcon: ({ size, color }) => (
            <View>
              <Home size={22} color={color} />
              {pendingInvitationsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ size, color }) => <Trophy size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'House Kits',
          tabBarIcon: ({ size, color }) => <Package size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ size, color }) => (
            <View>
              <Users size={22} color={color} />
              {pendingRequestsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
