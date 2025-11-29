import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Hop as HouseIcon, Check, Sparkles, Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useToast } from '@/contexts/ToastContext';
import { logger } from '@/lib/logger';

type House = {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
  has_customization: boolean;
};

type Kit = {
  id: string;
  name: string;
  theme_data: any;
  price_cents?: number;
};

export default function ApplyKitScreen() {
  const { kitId } = useLocalSearchParams();
  const [kit, setKit] = useState<Kit | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouses, setSelectedHouses] = useState<Set<string>>(new Set());
  const [applyToProfile, setApplyToProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [kitId]);

  const fetchData = async () => {
    if (!user) {
      console.log('[APPLY KIT] ❌ No user found');
      return;
    }

    console.log('[APPLY KIT] 🔍 Starting fetch for user:', user.id);

    const { data: kitData, error: kitError } = await supabase
      .from('house_kits')
      .select(`
        *,
        kit_items!inner (
          item_data
        )
      `)
      .eq('id', kitId)
      .maybeSingle();

    console.log('[APPLY KIT] Kit fetch result:', { kitData: !!kitData, kitError });

    if (kitData) {
      setKit({
        id: kitData.id,
        name: kitData.name,
        theme_data: kitData.kit_items?.[0]?.item_data,
        price_cents: kitData.price_cents,
      });
      console.log('[APPLY KIT] ✅ Kit loaded:', kitData.name);
    }

    const { data: createdHouses, error: createdError } = await supabase
      .from('houses')
      .select('id, name, invite_code')
      .eq('creator_id', user.id);

    console.log('[APPLY KIT] Created houses fetch result:', {
      count: createdHouses?.length,
      error: createdError,
      houses: createdHouses?.map(h => ({ id: h.id, name: h.name }))
    });

    const { data: memberData, error: memberError } = await supabase
      .from('house_members')
      .select('house_id, role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    console.log('[APPLY KIT] Admin member houses fetch result:', {
      count: memberData?.length,
      error: memberError,
      roles: memberData?.map(m => ({ id: m.house_id, role: m.role }))
    });

    const allHouseIds = new Set<string>();

    if (createdHouses) {
      createdHouses.forEach(h => allHouseIds.add(h.id));
    }

    if (memberData) {
      memberData.forEach(m => allHouseIds.add(m.house_id));
    }

    console.log('[APPLY KIT] Total unique houses user can manage:', allHouseIds.size);

    if (allHouseIds.size === 0) {
      console.log('[APPLY KIT] ⚠️ User cannot manage any houses');
      setHouses([]);
      setLoading(false);
      return;
    }

    const houseIdsArray = Array.from(allHouseIds);
    console.log('[APPLY KIT] Fetching details for house IDs:', houseIdsArray);

    const { data: housesData, error: housesError } = await supabase
      .from('houses')
      .select('id, name, invite_code')
      .in('id', houseIdsArray);

    console.log('[APPLY KIT] Houses fetch result:', {
      count: housesData?.length,
      error: housesError,
      houses: housesData?.map(h => ({ id: h.id, name: h.name }))
    });

    // DEBUG: Show diagnostic alert
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Debug Info',
        `User ID: ${user.id.substring(0, 8)}...\n` +
        `Created Houses: ${createdHouses?.length || 0}\n` +
        `Admin Houses: ${memberData?.length || 0}\n` +
        `Total Houses: ${housesData?.length || 0}\n` +
        `Errors: ${createdError ? 'Created' : ''} ${memberError ? 'Member' : ''} ${housesError ? 'Houses' : ''}`,
        [{ text: 'OK' }]
      );
    }

    if (housesData && housesData.length > 0) {
      const enrichedHouses = await Promise.all(
        housesData.map(async (house) => {
          const { count } = await supabase
            .from('house_members')
            .select('*', { count: 'exact', head: true })
            .eq('house_id', house.id);

          const { data: customization } = await supabase
            .from('house_customizations')
            .select('house_id')
            .eq('house_id', house.id)
            .maybeSingle();

          return {
            ...house,
            member_count: count || 0,
            has_customization: !!customization,
          };
        })
      );

      console.log('[APPLY KIT] ✅ Final enriched houses:', enrichedHouses.length);
      setHouses(enrichedHouses);
    } else {
      console.log('[APPLY KIT] ⚠️ No house details found');
      setHouses([]);
    }

    setLoading(false);
  };

  const handleApply = async () => {
    if (Platform.OS === 'web') {
      if (applyToProfile) {
        await executeApplyToProfile();
      } else {
        await executeApplyToHouse();
      }
    } else {
      if (applyToProfile) {
        await handleApplyToProfile();
      } else {
        await handleApplyToHouse();
      }
    }
  };

  const executeApplyToProfile = async () => {
    if (!kit || !user) {
      console.log('[APPLY KIT] Missing required data:', { kit: !!kit, user: !!user });
      return;
    }

    const isFreeKit = kit.price_cents === 0;

    if (!isPremium && !isFreeKit) {
      showError('Premium Required: You need to purchase premium access to apply premium kits to your profile.');
      return;
    }

    try {
      console.log('[APPLY KIT] Starting profile kit application...');
      setApplying(true);

      const { data, error } = await supabase.rpc('equip_kit_for_testing', {
        p_kit_id: kitId as string,
      });

      console.log('[APPLY KIT] Profile equip result:', { data, error });

      setApplying(false);

      if (error) {
        console.error('[APPLY KIT] Error applying kit to profile:', error);
        showError(`Failed to apply kit: ${error.message}`);
        return;
      }

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        showError(result.error || 'Failed to equip kit');
        return;
      }

      console.log('[APPLY KIT] Kit applied to profile successfully!');
      showSuccess('Kit applied to your profile!');
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      console.error('[APPLY KIT] Unexpected error:', err);
      setApplying(false);
      showError(`An unexpected error occurred: ${err.message}`);
    }
  };

  const executeApplyToHouse = async () => {
    if (selectedHouses.size === 0 || !kit || !user) {
      console.log('[APPLY KIT] Missing required data:', { selectedHousesCount: selectedHouses.size, kit: !!kit, user: !!user });
      return;
    }

    const isFreeKit = kit.price_cents === 0;

    if (!isPremium && !isFreeKit) {
      showError('Premium Required: You need to purchase premium access to apply premium emoji packs to your houses.');
      return;
    }

    try {
      console.log('[APPLY KIT] Starting theme application to', selectedHouses.size, 'houses...');
      setApplying(true);

      // ✅ OPTIMISTIC UPDATE: Update React Query cache immediately
      const kitColors = kit.theme_data?.colors || kit.theme_data?.color_scheme || [];
      const kitRarity = kit.theme_data?.rarity || 'common';

      for (const houseId of Array.from(selectedHouses)) {
        queryClient.setQueryData(['houses', user?.id], (old: any[] | undefined) => {
          if (!old) return old;
          return old.map((house: any) =>
            house.id === houseId
              ? {
                  ...house,
                  house_customizations: {
                    applied_kit_id: kitId,
                    custom_banner_colors: kitColors,
                    rarity: kitRarity
                  }
                }
              : house
          );
        });
      }

      console.log('[APPLY KIT] ✅ Optimistic update applied, navigating back...');
      showSuccess(`Kit applied to ${selectedHouses.size} house${selectedHouses.size > 1 ? 's' : ''}!`);
      router.back();  // ✅ Navigate immediately

      // ✅ Apply kit in background
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const houseId of Array.from(selectedHouses)) {
        console.log('[APPLY KIT] 🎨 Applying kit to house in background:', houseId);
        logger.track('kit_application_attempt', { kitId, houseId, kitName: kit?.name });

        const { data, error } = await supabase.rpc('apply_kit_to_house', {
          p_house_id: houseId,
          p_kit_id: kitId as string,
        });

        if (error) {
          console.error('[APPLY KIT] ❌ Error applying kit to house:', houseId, error);
          console.error('[APPLY KIT] ❌ Full error:', JSON.stringify(error, null, 2));
          logger.error('kit_application_failed', { kitId, houseId, error: error.message, errorCode: error.code });
          failCount++;
          errors.push(error.message);

          // ✅ Revert optimistic update on error
          queryClient.invalidateQueries(['houses', user?.id]);
          continue;
        }

        logger.track('kit_application_success', { kitId, houseId, kitName: kit?.name });

        const result = data as { success: boolean; error?: string; message?: string };

        if (!result.success) {
          failCount++;
          errors.push(result.error || 'Unknown error');
          queryClient.invalidateQueries(['houses', user?.id]);
        } else {
          successCount++;
        }
      }

      setApplying(false);

      // Show error notification if any failed
      if (failCount > 0) {
        showError(`Failed to apply kit to ${failCount} house${failCount > 1 ? 's' : ''}`);
      }
    } catch (err: any) {
      console.error('[APPLY KIT] Unexpected error:', err);
      setApplying(false);
      showError(`An unexpected error occurred: ${err.message}`);
      queryClient.invalidateQueries(['houses', user?.id]);
    }
  };

  const handleApplyToProfile = async () => {
    if (!kit || !user) {
      console.log('[APPLY KIT] Missing required data:', { kit: !!kit, user: !!user });
      return;
    }

    const isFreeKit = kit.price_cents === 0;

    if (!isPremium && !isFreeKit) {
      Alert.alert(
        'Premium Required',
        'You need to purchase premium access to apply premium kits to your profile.\n\nFree kits (common rarity) are always available.\n\nGo to your profile to unlock premium for $4.99.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Premium',
            onPress: () => router.push('/profile'),
          },
        ]
      );
      return;
    }

    console.log('[APPLY KIT] Showing profile confirmation dialog');

    Alert.alert(
      'Apply Kit to Profile',
      `Apply "${kit.name}" to your player card?\n\nThis will change your player card appearance in all games.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              console.log('[APPLY KIT] Starting profile kit application...');
              setApplying(true);

              const { data, error } = await supabase.rpc('equip_kit_for_testing', {
                p_kit_id: kitId as string,
              });

              console.log('[APPLY KIT] Profile equip result:', { data, error });

              setApplying(false);

              if (error) {
                console.error('[APPLY KIT] Error applying kit to profile:', error);
                Alert.alert('Error', `Failed to apply kit: ${error.message}`);
                return;
              }

              const result = data as { success: boolean; error?: string; message?: string };

              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to equip kit');
                return;
              }

              console.log('[APPLY KIT] Kit applied to profile successfully!');
              Alert.alert('Success!', 'Kit applied to your profile! Your player card will now show this theme in games.', [
                {
                  text: 'Done',
                  onPress: () => router.back(),
                },
              ]);
            } catch (err: any) {
              console.error('[APPLY KIT] Unexpected error:', err);
              setApplying(false);
              Alert.alert('Error', `An unexpected error occurred: ${err.message}`);
            }
          },
        },
      ]
    );
  };

  const handleApplyToHouse = async () => {
    if (selectedHouses.size === 0 || !kit || !user) {
      console.log('[APPLY KIT] Missing required data:', { selectedHousesCount: selectedHouses.size, kit: !!kit, user: !!user });
      return;
    }

    const isFreeKit = kit.price_cents === 0;

    if (!isPremium && !isFreeKit) {
      Alert.alert(
        'Premium Required',
        'You need to purchase premium access to apply premium emoji packs to your houses.\n\nFree kits (common rarity) are always available.\n\nGo to your profile to unlock premium for $4.99.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Premium',
            onPress: () => router.push('/profile'),
          },
        ]
      );
      return;
    }

    const selectedHouseNames = houses
      .filter(h => selectedHouses.has(h.id))
      .map(h => h.name)
      .join(', ');

    console.log('[APPLY KIT] Showing confirmation dialog');

    Alert.alert(
      'Apply Theme',
      `Apply "${kit.name}" to ${selectedHouses.size} house${selectedHouses.size > 1 ? 's' : ''}?\n\n${selectedHouseNames}\n\nThis will replace any existing customization.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              console.log('[APPLY KIT] Starting kit application to', selectedHouses.size, 'houses...');
              setApplying(true);

              let successCount = 0;
              let failCount = 0;
              const errors: string[] = [];

              for (const houseId of Array.from(selectedHouses)) {
                console.log('[APPLY KIT] 🎨 Applying kit to house (mobile):', houseId);
                logger.track('kit_application_attempt_mobile', { kitId, houseId, kitName: kit?.name });

                const { data, error } = await supabase.rpc('apply_kit_to_house', {
                  p_house_id: houseId,
                  p_kit_id: kitId as string,
                });

                if (error) {
                  console.error('[APPLY KIT] ❌ Error applying kit to house:', houseId, error);
                  console.error('[APPLY KIT] ❌ Full error details:', JSON.stringify(error, null, 2));
                  logger.error('kit_application_failed_mobile', { kitId, houseId, error: error.message, errorCode: error.code, errorDetails: error.details, errorHint: error.hint });
                  failCount++;
                  errors.push(error.message);
                  continue;
                }

                logger.track('kit_application_success_mobile', { kitId, houseId, kitName: kit?.name });

                const result = data as { success: boolean; error?: string; message?: string };

                if (!result.success) {
                  failCount++;
                  errors.push(result.error || 'Unknown error');
                } else {
                  successCount++;
                }
              }

              setApplying(false);

              if (successCount > 0 && failCount === 0) {
                Alert.alert('Success!', `Kit applied to ${successCount} house${successCount > 1 ? 's' : ''} successfully!`, [
                  {
                    text: 'Done',
                    onPress: () => router.back(),
                  },
                ]);
              } else if (successCount > 0 && failCount > 0) {
                Alert.alert('Partial Success', `Applied to ${successCount} house${successCount > 1 ? 's' : ''}, but failed for ${failCount}.\n\nErrors: ${errors.join(', ')}`);
              } else {
                Alert.alert('Error', `Failed to apply kit.\n\n${errors.join(', ')}`);
              }
            } catch (err: any) {
              console.error('[APPLY KIT] Unexpected error:', err);
              setApplying(false);
              Alert.alert('Error', `An unexpected error occurred: ${err.message}`);
            }
          },
        },
      ]
    );
  };

  const renderHouse = ({ item }: { item: House }) => {
    const isSelected = selectedHouses.has(item.id);
    const themeColors = kit?.theme_data?.colors;

    const toggleHouseSelection = () => {
      setSelectedHouses(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    };

    return (
      <Pressable
        style={[
          styles.houseCard,
          isSelected && styles.selectedCard,
        ]}
        onPress={toggleHouseSelection}
      >
        {isSelected && themeColors && (
          <LinearGradient
            colors={themeColors.background || ['#10B981', '#059669']}
            style={styles.selectionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}

        <View style={styles.houseContent}>
          <View style={styles.houseIcon}>
            <HouseIcon size={24} color={isSelected ? '#10B981' : '#64748B'} />
          </View>

          <View style={styles.houseInfo}>
            <Text style={[styles.houseName, isSelected && styles.selectedText]}>
              {item.name}
            </Text>
            <Text style={styles.houseDetails}>
              {item.member_count} members • {item.has_customization ? 'Has theme' : 'No theme'}
            </Text>
          </View>

          {isSelected && (
            <View style={styles.checkMark}>
              <Check size={20} color="#10B981" />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  if (loading || premiumLoading) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </LinearGradient>
    );
  }

  const themeColors = kit?.theme_data?.colors;

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Apply Kit</Text>
        <View style={{ width: 44 }} />
      </View>

      {themeColors && (
        <View style={styles.previewSection}>
          <LinearGradient
            colors={themeColors.background || ['#10B981', '#059669']}
            style={styles.themePreview}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Sparkles size={32} color="#FFFFFF" opacity={0.5} />
            <Text style={styles.previewText}>{kit?.name}</Text>
            <Text style={styles.previewSubtext}>Theme Preview</Text>
          </LinearGradient>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, !applyToProfile && styles.toggleButtonActive]}
            onPress={() => setApplyToProfile(false)}
          >
            <Text style={[styles.toggleButtonText, !applyToProfile && styles.toggleButtonTextActive]}>
              Apply to House
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, applyToProfile && styles.toggleButtonActive]}
            onPress={() => setApplyToProfile(true)}
          >
            <Text style={[styles.toggleButtonText, applyToProfile && styles.toggleButtonTextActive]}>
              Apply to Profile
            </Text>
          </Pressable>
        </View>

        {!applyToProfile && (
          <>
            <Text style={styles.sectionTitle}>Select Houses</Text>
            <Text style={styles.sectionSubtitle}>
              Tap to select multiple houses. You can only apply themes to houses where you're an admin.
            </Text>
          </>
        )}

        {applyToProfile && (
          <>
            <Text style={styles.sectionTitle}>Apply to Your Profile</Text>
            <Text style={styles.sectionSubtitle}>
              This kit will be displayed on your player card in all games
            </Text>
          </>
        )}

        {!applyToProfile && houses.length === 0 ? (
          <View style={styles.emptyState}>
            <HouseIcon size={64} color="#475569" />
            <Text style={styles.emptyTitle}>No Houses Found</Text>
            <Text style={styles.emptyText}>
              You need to be an admin of a house to apply themes
            </Text>
          </View>
        ) : !applyToProfile ? (
          <FlatList
            data={houses}
            renderItem={renderHouse}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>

      {(selectedHouses.size > 0 || applyToProfile) && (
        <View style={styles.footer}>
          <Pressable
            style={styles.applyButton}
            onPress={handleApply}
            disabled={applying}
          >
            {applying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.applyButtonText}>
                  {applyToProfile ? 'Apply to Profile' : `Apply to ${selectedHouses.size} House${selectedHouses.size > 1 ? 's' : ''}`}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  previewSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  themePreview: {
    height: 140,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  previewText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  previewSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#10B981',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  houseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#10B981',
  },
  selectionGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  houseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
  houseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  houseInfo: {
    flex: 1,
  },
  houseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectedText: {
    color: '#10B981',
  },
  houseDetails: {
    fontSize: 13,
    color: '#94A3B8',
  },
  checkMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
  },
  lockedText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 48,
    marginBottom: 32,
    lineHeight: 24,
  },
  unlockButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  unlockButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
