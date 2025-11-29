import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Platform, StatusBar } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, QrCode, Hop as Home, Scan, LogIn } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import HouseCard from '@/components/HouseCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useBannerUnlock } from '@/contexts/BannerUnlockContext';
import BannerUnlockModal from '@/components/BannerUnlockModal';
import { safeArrayFromColors } from '@/lib/colorUtils';

type House = {
  id: string;
  name: string;
  banner_id: string | null;
  member_count: number;
  role: string;
  nickname?: string | null;
  creator_nickname?: string | null;
  premium_tier?: string | null;
  house_emoji?: string | null;
  custom_theme_colors?: string[] | null;
  kit_rarity?: string | null;
  kit_name?: string | null;
  isInvitedHouse?: boolean;
};

export default function HousesScreen() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [unlockedBanner, setUnlockedBanner] = useState<{ id: string; name: string; rarity: 'legendary' | 'mythic'; colors: string[]; glowColor?: string } | null>(null);
  const [fetchDebounceTimer, setFetchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { tryRandomUnlock } = useBannerUnlock();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: houses = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['houses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await fetchHousesData(user.id);
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds - realtime updates will invalidate when needed
    refetchOnMount: false, // Don't refetch on mount, use cached data
    refetchOnWindowFocus: false, // Don't refetch on focus, use realtime updates
  });

  const { data: pendingInvitations = new Map(), refetch: refetchInvitations } = useQuery({
    queryKey: ['pendingInvitations', user?.id],
    queryFn: async () => {
      if (!user) return new Map();
      return await fetchPendingInvitationsData(user.id);
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const ownedHouseCount = houses.filter((h: House) => h.role === 'admin').length;

  useFocusEffect(
    useCallback(() => {
      console.log('[HOME] Screen focused');
      // OPTIMIZED: Don't refetch on every focus, realtime updates handle changes
      // Only refetch invitations which are less critical
      refetchInvitations();

      if (!isNavigating) {
        checkRandomUnlock();
      } else {
        setIsNavigating(false);
      }
    }, [user, isNavigating, refetchInvitations])
  );

  useEffect(() => {
    console.log('[HOME] Component mounted');

    if (!user) return;

    console.log('[HOME] Setting up real-time subscription for house changes');

    const debouncedFetch = () => {
      if (fetchDebounceTimer) {
        clearTimeout(fetchDebounceTimer);
      }
      const timer = setTimeout(() => {
        queryClient.invalidateQueries(['houses', user?.id]);
      }, 500);
      setFetchDebounceTimer(timer);
    };

    const subscription = supabase
      .channel('house-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'houses'
        },
        (payload) => {
          console.log('[HOME] House change detected:', payload.eventType);
          debouncedFetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'house_members',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[HOME] House membership change detected:', payload.eventType);
          debouncedFetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'house_customizations'
        },
        (payload) => {
          console.log('[HOME] ✅ House customization change detected, updating cache directly');
          // ✅ Update cache directly instead of full refetch
          const customization = payload.new as any;
          queryClient.setQueryData(['houses', user?.id], (old: any[] | undefined) => {
            if (!old) return old;
            return old.map((house: any) =>
              house.id === customization.house_id
                ? { ...house, house_customizations: customization }
                : house
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `invitee_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[HOME] Game invitation change detected:', payload.eventType);
          // Refresh pending invitations AND houses (to show newly invited houses)
          queryClient.invalidateQueries(['pendingInvitations', user?.id]);
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      console.log('[HOME] Cleaning up real-time subscription');
      if (fetchDebounceTimer) {
        clearTimeout(fetchDebounceTimer);
      }
      subscription.unsubscribe();
    };
  }, [user]);

  const checkRandomUnlock = async () => {
    if (!user) return;

    try {
      const result = await tryRandomUnlock();
      if (result.unlocked && result.bannerId && result.rarity && result.bannerName) {
        const { data: bannerData } = await supabase
          .from('kit_items')
          .select('item_data')
          .eq('id', result.bannerId)
          .maybeSingle();

        if (bannerData) {
          setUnlockedBanner({
            id: result.bannerId,
            name: result.bannerName,
            rarity: result.rarity as 'legendary' | 'mythic',
            colors: bannerData.item_data?.design_spec?.colors || ['#64748B'],
            glowColor: bannerData.item_data?.design_spec?.glow_color,
          });
          setUnlockModalVisible(true);
        }
      }
    } catch (error) {
      console.error('[HOME] Error checking random unlock:', error);
    }
  };

  const fetchPendingInvitationsData = async (userId: string): Promise<Map<string, number>> => {
    try {
      const { data: invitations, error } = await supabase
        .from('game_invitations')
        .select(`
          id,
          game_session_id,
          status,
          game_sessions!inner(
            id,
            house_id,
            game_id,
            games(name, game_emoji)
          )
        `)
        .eq('invitee_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('[HOME] Error fetching pending invitations:', error);
        return new Map();
      }

      const invitationsMap = new Map<string, number>();
      invitations?.forEach(invitation => {
        const houseId = invitation.game_sessions?.house_id;
        if (houseId) {
          invitationsMap.set(houseId, (invitationsMap.get(houseId) || 0) + 1);
        }
      });

      console.log('[HOME] Pending invitations:', Array.from(invitationsMap.entries()));
      return invitationsMap;
    } catch (error) {
      console.error('[HOME] Error fetching pending invitations:', error);
      return new Map();
    }
  };

  const fetchHousesData = async (userId: string): Promise<House[]> => {
    console.log('[HOME] Fetching houses for user:', userId);

    try {
      const { data, error } = await supabase
        .from('house_members')
        .select(`
          house_id,
          role,
          nickname,
          houses (
            id,
            name,
            banner_id,
            house_emoji,
            creator_id
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('[HOME] Error fetching houses:', error);
        console.error('[HOME] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return [];
      }

    if (data) {
      // Filter out any entries where the house no longer exists (deleted or null)
      const validData = data.filter((item: any) => item.houses && item.houses.id);
      console.log('[HOME] Found', validData.length, 'valid houses (filtered', data.length - validData.length, 'null/deleted)');

      const houseIds = validData.map((item: any) => item.houses.id);
      const creatorIds = validData.map((item: any) => item.houses.creator_id).filter(Boolean);

      const [memberCounts, premiumStatuses, creatorMembers, customizations] = await Promise.all([
        supabase
          .from('house_members')
          .select('house_id')
          .in('house_id', houseIds),
        supabase
          .from('house_premium_status')
          .select('house_id, highest_kit_tier')
          .in('house_id', houseIds),
        creatorIds.length > 0
          ? supabase
              .from('house_members')
              .select('house_id, user_id, nickname')
              .in('house_id', houseIds)
              .in('user_id', creatorIds)
          : { data: [] },
        supabase
          .from('house_customizations')
          .select(`
            house_id,
            theme_data,
            equipped_house_kit_id,
            applied_kit_id,
            kit_rarity,
            kit_color_scheme,
            custom_banner_colors,
            rarity
          `)
          .in('house_id', houseIds)
      ]);

      const memberCountMap = memberCounts.data?.reduce((acc: any, member: any) => {
        acc[member.house_id] = (acc[member.house_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const premiumMap = premiumStatuses.data?.reduce((acc: any, status: any) => {
        acc[status.house_id] = status.highest_kit_tier;
        return acc;
      }, {}) || {};

      // Create a map of creator_id -> nickname for each house
      const creatorNicknameMap = creatorMembers.data?.reduce((acc: any, member: any) => {
        acc[member.user_id] = member.nickname;
        return acc;
      }, {}) || {};

      // Now map house_id to creator nickname using creator_id
      const creatorMap: Record<string, string> = {};
      validData.forEach((item: any) => {
        if (item.houses?.creator_id) {
          creatorMap[item.houses.id] = creatorNicknameMap[item.houses.creator_id];
        }
      });

      // Fetch kit names for applied kits
      const appliedKitIds = customizations.data
        ?.filter((c: any) => c.applied_kit_id)
        .map((c: any) => c.applied_kit_id) || [];

      let kitNamesMap: Record<string, string> = {};
      if (appliedKitIds.length > 0) {
        const { data: kitsData } = await supabase
          .from('house_kits')
          .select('id, name')
          .in('id', appliedKitIds);

        kitNamesMap = (kitsData || []).reduce((acc: any, kit: any) => {
          acc[kit.id] = kit.name;
          return acc;
        }, {});
      }

      const customizationMap = customizations.data?.reduce((acc: any, custom: any) => {
        // Prioritize applied kit colors over custom theme colors
        if (custom.applied_kit_id) {
          const kitColors = safeArrayFromColors(custom.custom_banner_colors);
          const kitRarity = custom.rarity;

          if (kitColors && kitColors.length > 0) {
            acc[custom.house_id] = {
              colors: kitColors,
              rarity: kitRarity || 'common',
              kitName: kitNamesMap[custom.applied_kit_id] || null
            };
            return acc;
          }
        }

        // Legacy: Check for equipped_house_kit_id (old field)
        if (custom.equipped_house_kit_id) {
          const kitColors = safeArrayFromColors(custom.kit_color_scheme);
          const kitRarity = custom.kit_rarity;

          if (kitColors && kitColors.length > 0) {
            acc[custom.house_id] = {
              colors: kitColors,
              rarity: kitRarity || 'common',
              kitName: null
            };
            return acc;
          }
        }

        const backgroundColors = safeArrayFromColors(custom.theme_data?.colors?.background);
        if (backgroundColors && backgroundColors.length > 0) {
          acc[custom.house_id] = {
            colors: backgroundColors,
            rarity: null,
            kitName: null
          };
        }
        return acc;
      }, {}) || {};

      const housesWithCounts = validData.map((item: any) => {
        const customization = customizationMap[item.houses.id];
        return {
          id: item.houses.id,
          name: item.houses.name,
          banner_id: item.houses.banner_id,
          member_count: memberCountMap[item.houses.id] || 0,
          role: item.role,
          nickname: item.nickname,
          creator_nickname: creatorMap[item.houses.id],
          premium_tier: premiumMap[item.houses.id],
          house_emoji: item.houses.house_emoji,
          custom_theme_colors: customization?.colors || null,
          kit_rarity: customization?.rarity || null,
          kit_name: customization?.kitName || null,
        };
      });

      console.log('[HOME] Houses loaded in optimized batch');

      // Fetch houses with pending invitations (not yet a member)
      const { data: invitedHouses, error: invitedError } = await supabase
        .from('game_invitations')
        .select(`
          house_id,
          houses!game_invitations_house_id_fkey(
            id,
            name,
            house_emoji,
            banner_id,
            creator_id
          )
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending');

      if (invitedError) {
        console.error('[HOME] Error fetching invited houses:', invitedError);
      } else {
        console.log('[HOME] Found invited houses:', invitedHouses?.length || 0);
      }

      // Filter out houses where user is already a member
      const existingHouseIds = new Set(housesWithCounts.map((h: House) => h.id));
      const newInvitedHouses = invitedHouses
        ?.filter(inv => inv.houses && !existingHouseIds.has(inv.house_id))
        .reduce((acc: any[], inv: any) => {
          // Only add each house once (could have multiple game invites)
          if (!acc.find(h => h.id === inv.house_id)) {
            console.log('[HOME] Adding invited house:', inv.houses.name);
            acc.push({
              id: inv.houses.id,
              name: inv.houses.name,
              house_emoji: inv.houses.house_emoji,
              banner_id: inv.houses.banner_id,
              member_count: 0, // Will be fetched if needed
              role: 'invited', // Special role for invited users
              isInvitedHouse: true, // Flag to indicate this is an invitation-only house
              nickname: null,
              creator_nickname: null,
              premium_tier: null,
              custom_theme_colors: null,
              kit_rarity: null,
              kit_name: null,
            });
          }
          return acc;
        }, []) || [];

      console.log('[HOME] New invited houses count:', newInvitedHouses.length);

      // Combine member houses and invited houses
      const allHouses = [...housesWithCounts, ...newInvitedHouses];
      return allHouses;
    }

    return [];
    } catch (err) {
      console.error('[HOME] Unexpected error fetching houses:', err);
      return [];
    }
  };

  const onRefresh = () => {
    refetch();
    refetchInvitations();
  };

  const handleCreateHousePress = () => {
    // Allow navigation without restrictions
    console.log('[HOME] Create house button pressed');
    setIsNavigating(true);
    setTimeout(() => router.push('/create-house'), 10);
  };

  const renderHouse = ({ item }: { item: House }) => {
    const pendingCount = pendingInvitations.get(item.id) || 0;
    const isInvitedHouse = item.isInvitedHouse || item.role === 'invited';
    const hasPendingInvites = pendingCount > 0 || isInvitedHouse;

    return (
      <HouseCard
        house={item}
        hasPendingInvites={hasPendingInvites}
        isInvitedHouse={isInvitedHouse}
        pendingCount={pendingCount}
        onPress={() => {
          console.log('[HOME] House card pressed:', item.name, item.id);
          setIsNavigating(true);
          setTimeout(() => router.push(`/house/${item.id}`), 10);
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Houses</Text>
          {!isPremium && (
            <Text style={styles.houseLimitText}>
              {ownedHouseCount} / 2 houses created
            </Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              console.log('[HOME] Scan QR button pressed');
              setIsNavigating(true);
              setTimeout(() => router.push('/scan-qr'), 10);
            }}
          >
            <Scan size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              console.log('[HOME] Join house button pressed');
              setIsNavigating(true);
              setTimeout(() => router.push('/join-house'), 10);
            }}
          >
            <LogIn size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={handleCreateHousePress}
          >
            <Plus size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : houses.length === 0 ? (
        <View style={styles.emptyState}>
          <Home size={64} color="#475569" />
          <Text style={styles.emptyTitle}>No Houses Yet</Text>
          <Text style={styles.emptyText}>
            Get started by creating your own house or joining an existing one
          </Text>
          <View style={styles.emptyActions}>
            <Pressable
              style={styles.emptyActionButton}
              onPress={handleCreateHousePress}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.emptyActionText}>Create House</Text>
            </Pressable>
            <Pressable
              style={[styles.emptyActionButton, styles.emptyActionButtonSecondary]}
              onPress={() => {
                console.log('[HOME] Empty state join house button pressed');
                setIsNavigating(true);
                setTimeout(() => router.push('/join-house'), 10);
              }}
            >
              <LogIn size={20} color="#10B981" />
              <Text style={styles.emptyActionTextSecondary}>Join House</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={houses}
          renderItem={renderHouse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        />
      )}

      {unlockedBanner && (
        <BannerUnlockModal
          visible={unlockModalVisible}
          bannerId={unlockedBanner.id}
          bannerName={unlockedBanner.name}
          rarity={unlockedBanner.rarity}
          colors={unlockedBanner.colors}
          glowColor={unlockedBanner.glowColor}
          onClose={() => {
            setUnlockModalVisible(false);
            setUnlockedBanner(null);
          }}
        />
      )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 64 : 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  houseLimitText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    backgroundColor: '#334155',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  emptyActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyActionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyActionTextSecondary: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    padding: 24,
    gap: 16,
  },
});
