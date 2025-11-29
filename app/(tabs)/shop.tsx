import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { Package, Lock, Crown, HelpCircle, X } from 'lucide-react-native';
import BannerRenderer from '@/components/BannerRenderer';
import Toast from '@/components/Toast';
import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import KitApplicationModal from '@/components/KitApplicationModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logError, logInfo, logWarning, formatSupabaseError } from '@/lib/errorReporting';
import { notifications } from '@/lib/notifications';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

type HouseKit = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  is_unlockable: boolean;
  is_earnable: boolean;
  is_active: boolean;
  color_scheme?: string[];
  unlock_type: 'free' | 'purchasable' | 'chance_based';
  price_cents?: number;
  unlock_chance?: number;
  unlock_condition?: string;
  owned_by_user?: boolean;
};

type UserHouse = {
  id: string;
  name: string;
  emoji: string;
};

export default function HouseKitsScreen() {
  const [applyingKitId, setApplyingKitId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedKit, setSelectedKit] = useState<HouseKit | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState({ title: '', description: '', rarity: '' });

  const { user } = useAuth();
  const { isPremium } = usePremium();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: kits = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['houseKits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await loadKitsData(user.id);
    },
    enabled: !!user,
    staleTime: 300000,
  });

  const { data: userHouses = [], isLoading: loadingHouses } = useQuery({
    queryKey: ['userHousesForKits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await loadUserHouses(user.id);
    },
    enabled: !!user,
    staleTime: 300000,
  });

  const loadUserHouses = async (userId: string): Promise<UserHouse[]> => {
    try {
      console.log('[SHOP] Pre-loading houses where user is admin:', userId);
      const startTime = performance.now();

      // Optimized query: Direct join instead of nested select for better performance
      const { data: adminHouses, error } = await supabase
        .from('house_members')
        .select(`
          houses!inner (
            id,
            name,
            house_emoji
          )
        `)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .order('joined_at', { ascending: false })
        .limit(50); // Reasonable limit for performance

      const endTime = performance.now();
      console.log(`[SHOP] Houses pre-loaded in ${(endTime - startTime).toFixed(0)}ms`);

      if (error) {
        console.error('[SHOP] Error loading houses:', error);
        return [];
      }

      if (!adminHouses || adminHouses.length === 0) {
        console.log('[SHOP] No admin houses found for user');
        return [];
      }

      // Simplified mapping with type safety
      const houseList = adminHouses
        .filter(member => member.houses)
        .map(member => {
          const house = member.houses as any;
          return {
            id: house.id,
            name: house.name,
            emoji: house.house_emoji || '🏠',
          };
        });

      console.log('[SHOP] Pre-loaded', houseList.length, 'admin houses');
      return houseList;
    } catch (err) {
      console.error('[SHOP] Exception loading houses:', err);
      return [];
    }
  };

  const loadKitsData = async (userId: string): Promise<HouseKit[]> => {
    try {
      logInfo('HOUSE_KITS', 'Loading kits for user', { userId });

      const { data, error } = await supabase
        .from('house_kits')
        .select(`
          *,
          kit_items!house_kit_id (
            item_data
          )
        `);

      // Check both user_kit_purchases and user_house_kits for owned kits
      const { data: purchases } = await supabase
        .from('user_kit_purchases')
        .select('house_kit_id')
        .eq('user_id', userId)
        .eq('payment_status', 'completed');

      const { data: userKits } = await supabase
        .from('user_house_kits')
        .select('house_kit_id')
        .eq('user_id', userId);

      const purchasedKitIds = new Set([
        ...(purchases || []).map(p => p.house_kit_id),
        ...(userKits || []).map(k => k.house_kit_id)
      ]);

      if (error) {
        logError('HOUSE_KITS', error, {
          userId,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint
        });
        setToast({
          visible: true,
          message: formatSupabaseError(error),
          type: 'error'
        });
        return [];
      }

      if (!data || data.length === 0) {
        logWarning('HOUSE_KITS', 'No kits returned from database', { userId });
        setToast({
          visible: true,
          message: 'No house kits available. This may be a data issue - please contact support.',
          type: 'error'
        });
        return [];
      }

      logInfo('HOUSE_KITS', `Loaded ${data.length} kits successfully`);
      return (data || []).map(kit => {
          let unlockType: 'free' | 'purchasable' | 'chance_based' = 'free';
          let isUnlockable = false;
          let isEarnable = false;
          // Check if user owns this kit (either free common or in their purchased/unlocked kits)
          let ownedByUser = purchasedKitIds.has(kit.id);

          if (kit.price_cents > 0) {
            unlockType = 'purchasable';
          } else if (kit.rarity === 'legendary' || kit.rarity === 'mythic') {
            unlockType = 'chance_based';
            isEarnable = true;
            isUnlockable = true;
          }

          return {
            id: kit.id,
            name: kit.name,
            description: kit.description,
            rarity: kit.rarity,
            is_unlockable: isUnlockable,
            is_earnable: isEarnable,
            is_active: kit.is_active,
            color_scheme: kit.color_scheme,
            unlock_type: unlockType,
            price_cents: kit.price_cents,
            unlock_condition: isEarnable ? 'game_win' : undefined,
            owned_by_user: ownedByUser
          };
        }) as any;
    } catch (err) {
      logError('HOUSE_KITS', err, { userId });
      setToast({
        visible: true,
        message: 'An unexpected error occurred loading kits',
        type: 'error'
      });
      return [];
    }
  };

  const getKitColors = (kit: HouseKit): string[] => {
    if (kit.color_scheme && Array.isArray(kit.color_scheme) && kit.color_scheme.length > 0) {
      return kit.color_scheme;
    }

    switch (kit.rarity) {
      case 'mythic':
        return ['#EC4899', '#DB2777', '#BE185D'];
      case 'legendary':
        return ['#F59E0B', '#FBBF24', '#F59E0B'];
      case 'epic':
        return ['#A855F7', '#9333EA', '#7E22CE'];
      case 'rare':
        return ['#3B82F6', '#2563EB', '#1D4ED8'];
      case 'uncommon':
        return ['#10B981', '#059669', '#047857'];
      default:
        return ['#64748B', '#475569'];
    }
  };

  const handleOpenApplicationModal = (kit: HouseKit) => {
    setSelectedKit(kit);
    setShowApplicationModal(true);
  };

  const handleApplyKit = async (target: 'profile' | 'house', houseIds?: string[]) => {
    if (!user || !selectedKit) return;

    const kitName = selectedKit.name;
    const kitId = selectedKit.id;
    setApplyingKitId(kitId);

    try {
      // Close modal immediately - apply happens in background
      setShowApplicationModal(false);
      setSelectedKit(null);

      if (target === 'profile') {
        // Show optimistic success immediately
        setToast({
          visible: true,
          message: `Applying ${kitName}...`,
          type: 'success'
        });

        const startTime = performance.now();
        const { data, error } = await supabase.rpc('equip_kit_for_testing', {
          p_kit_id: kitId,
        });
        const endTime = performance.now();
        console.log(`[PERFORMANCE] equip_kit_for_testing took ${(endTime - startTime).toFixed(0)}ms`);

        if (error) throw error;

        const result = data as { success: boolean; error?: string; message?: string };

        if (!result.success) {
          throw new Error(result.error || 'Failed to equip kit');
        }

        // Update success message
        setToast({
          visible: true,
          message: `${kitName} equipped to your profile!`,
          type: 'success'
        });

        // Invalidate profile query to show new kit - don't refetch all kits
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      } else if (target === 'house' && houseIds && houseIds.length > 0) {
        console.log('[HOUSE KITS] Applying kit to houses:', {
          kitId,
          kitName,
          houseIds,
          houseCount: houseIds.length
        });

        // Show optimistic success immediately
        setToast({
          visible: true,
          message: `Applying ${kitName} to ${houseIds.length} house${houseIds.length > 1 ? 's' : ''}...`,
          type: 'success'
        });

        const startTime = performance.now();

        // PARALLEL EXECUTION: Apply to all houses simultaneously for massive speed boost
        const results = await Promise.allSettled(
          houseIds.map(houseId =>
            supabase.rpc('apply_kit_to_house', {
              p_kit_id: kitId,
              p_house_id: houseId,
            })
          )
        );

        const endTime = performance.now();
        console.log(`[PERFORMANCE] Parallel kit application took ${(endTime - startTime).toFixed(0)}ms`);

        // Process results
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        results.forEach((result, index) => {
          const houseId = houseIds[index];

          if (result.status === 'fulfilled') {
            const { data, error } = result.value;

            if (error) {
              console.error('[HOUSE KITS] RPC Error:', error, 'for house:', houseId);
              failCount++;
              errors.push(error.message);
            } else {
              const rpcResult = data as { success: boolean; error?: string; message?: string };

              if (!rpcResult.success) {
                console.error('[HOUSE KITS] Function returned failure:', rpcResult, 'for house:', houseId);
                failCount++;
                errors.push(rpcResult.error || 'Unknown error');
              } else {
                console.log('[HOUSE KITS] Successfully applied kit to house:', houseId);
                successCount++;
              }
            }
          } else {
            console.error('[HOUSE KITS] Promise rejected:', result.reason, 'for house:', houseId);
            failCount++;
            errors.push(result.reason?.message || 'Request failed');
          }
        });

        if (successCount > 0 && failCount === 0) {
          setToast({
            visible: true,
            message: `${kitName} applied to ${successCount} house${successCount > 1 ? 's' : ''}!`,
            type: 'success'
          });
          // Invalidate house queries to show new kit
          queryClient.invalidateQueries({ queryKey: ['houses'] });
        } else if (successCount > 0 && failCount > 0) {
          setToast({
            visible: true,
            message: `Applied to ${successCount} house${successCount > 1 ? 's' : ''}, but ${failCount} failed`,
            type: 'error'
          });
          // Still invalidate for partial success
          queryClient.invalidateQueries({ queryKey: ['houses'] });
        } else {
          throw new Error(`Failed to apply kit: ${errors.join(', ')}`);
        }
      }
    } catch (e: any) {
      console.error('[HOUSE KITS] Apply error:', e);
      setToast({
        visible: true,
        message: e.message || 'Failed to apply kit',
        type: 'error'
      });
    } finally {
      setApplyingKitId(null);
    }
  };

  const handlePurchaseKit = async (kit: HouseKit) => {
    if (!user) return;

    if (!kit.price_cents || kit.price_cents <= 0) {
      setToast({
        visible: true,
        message: 'This kit is not available for purchase',
        type: 'error'
      });
      return;
    }

    setApplyingKitId(kit.id);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      logInfo('SHOP', 'Creating PayPal order', { kitId: kit.id, kitName: kit.name });

      // Use the deployed function name from Supabase
      const createOrderUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-kit-paypal-order`;
      const createResponse = await fetch(createOrderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ kitId: kit.id }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        logError('SHOP', new Error('Create order failed'), { errorData });
        throw new Error(errorData.error || 'Failed to create PayPal order');
      }

      const { orderId, approvalUrl } = await createResponse.json();

      if (!approvalUrl) {
        throw new Error('No approval URL returned from PayPal');
      }

      logInfo('SHOP', 'PayPal order created', { orderId, approvalUrl });

      // On web, use direct navigation. On native, use auth session
      if (Platform.OS === 'web') {
        // Store order info for when user returns
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pendingPayPalOrder', JSON.stringify({ orderId, kitId: kit.id }));
        }

        // Redirect directly to PayPal (avoids popup blocker)
        window.location.href = approvalUrl;
      } else {
        logInfo('SHOP', 'Opening PayPal auth session', { approvalUrl });

        // Show instructions to user
        setToast({
          visible: true,
          message: 'Opening PayPal checkout...',
          type: 'success'
        });

        // Create redirect URI that matches our deep link route
        const redirectUri = Linking.createURL('paypal/success');
        logInfo('SHOP', 'Redirect URI created', { redirectUri });

        // Open PayPal in auth session (captures redirect + closes browser automatically)
        const result = await WebBrowser.openAuthSessionAsync(approvalUrl, redirectUri);

        logInfo('SHOP', 'Auth session result', { type: result.type });

        if (result.type === 'success') {
          setToast({
            visible: true,
            message: 'Payment completed! Processing...',
            type: 'success'
          });
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          setToast({
            visible: true,
            message: 'Payment cancelled',
            type: 'error'
          });
        }
      }
    } catch (error: any) {
      logError('SHOP', error, { kitId: kit.id });
      setToast({
        visible: true,
        message: error.message || 'Failed to process payment',
        type: 'error'
      });
    } finally {
      setApplyingKitId(null);
    }
  };

  const handleClaimFree = async (kit: HouseKit) => {
    if (!user) return;

    setApplyingKitId(kit.id);
    try {
      const { data, error } = await supabase
        .from('user_house_kits')
        .insert({
          user_id: user.id,
          house_kit_id: kit.id,
        });

      if (error) throw error;

      setToast({
        visible: true,
        message: `${kit.name} unlocked!`,
        type: 'success'
      });

      // Optimistically update the cache instead of full refetch
      queryClient.setQueryData(['houseKits', user.id], (oldData: HouseKit[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(k =>
          k.id === kit.id ? { ...k, is_unlocked: true } : k
        );
      });
    } catch (e: any) {
      console.error('[HOUSE KITS] Claim error:', e);
      setToast({
        visible: true,
        message: e.message || 'Failed to claim kit',
        type: 'error'
      });
    } finally {
      setApplyingKitId(null);
    }
  };

  const canEquipKit = (kit: HouseKit): boolean => {
    return kit.owned_by_user === true;
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <View style={styles.container}>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading house kits...</Text>
          </View>
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      logError('HOUSE_KITS_SCREEN', error, {
        componentStack: errorInfo.componentStack,
        userId: user?.id
      });
    }}>
      <View style={styles.container}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowInfoModal(false)}
        >
          <View style={styles.infoModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.infoModalHeader}>
              <View style={styles.infoModalTitleRow}>
                <Text style={styles.infoModalTitle}>{infoModalContent.title}</Text>
                <View style={[
                  styles.infoModalRarityBadge,
                  infoModalContent.rarity === 'mythic' && styles.mythicBadge,
                  infoModalContent.rarity === 'legendary' && styles.legendaryBadge
                ]}>
                  <Text style={styles.infoModalRarityText}>{infoModalContent.rarity.toUpperCase()}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowInfoModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#94A3B8" />
              </Pressable>
            </View>
            <Text style={styles.infoModalDescription}>{infoModalContent.description}</Text>
          </View>
        </Pressable>
      </Modal>

      <KitApplicationModal
        visible={showApplicationModal}
        kit={selectedKit ? {
          id: selectedKit.id,
          name: selectedKit.name,
          rarity: selectedKit.rarity,
          color_scheme: selectedKit.color_scheme || [],
        } : null}
        userHouses={userHouses}
        loadingHouses={loadingHouses}
        onClose={() => {
          setShowApplicationModal(false);
          setSelectedKit(null);
        }}
        onApply={handleApplyKit}
      />

      <View style={styles.header}>
        <Package size={32} color="#10B981" />
        <Text style={styles.title}>House Kits</Text>
        <Text style={styles.subtitle}>Equip house kits to your profile. Visible in-game and when creating houses.</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {kits.length === 0 ? (
          <View style={styles.empty}>
            <Package size={48} color="#64748B" />
            <Text style={styles.emptyTitle}>No Kits Available</Text>
            <Text style={styles.emptyText}>Check back later for new house kits!</Text>
          </View>
        ) : (
          kits.map((kit) => {
            const canEquip = canEquipKit(kit);
            const isApplying = applyingKitId === kit.id;
            const colors = getKitColors(kit);

            return (
              <View
                key={kit.id}
                style={styles.kitCard}
              >
                <View style={styles.kitBanner}>
                  <BannerRenderer
                    colors={colors}
                    rarity={kit.rarity as any}
                    style={{ width: '100%', height: '100%' }}
                    size="large"
                    kitName={kit.name}
                  />
                </View>

                <View style={styles.kitInfo}>
                  <View style={styles.kitHeader}>
                    <View style={styles.kitTitleRow}>
                      <Text style={styles.kitName}>{kit.name}</Text>
                      {kit.is_unlockable && (
                        <View style={styles.premiumBadge}>
                          <Crown size={12} color="#F59E0B" />
                        </View>
                      )}
                    </View>
                    <View style={styles.rarityBadge}>
                      <Text style={styles.rarityText}>{kit.rarity.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.kitDescription}>{kit.description}</Text>

                  <View style={styles.kitFooter}>
                    <View style={styles.priceContainer}>
                      {canEquip ? (
                        <Text style={styles.kitPriceUnlocked}>Unlocked</Text>
                      ) : kit.unlock_type === 'free' ? (
                        <Text style={styles.kitPrice}>Free</Text>
                      ) : kit.unlock_type === 'purchasable' && kit.price_cents ? (
                        <Text style={styles.kitPrice}>${(kit.price_cents / 100).toFixed(2)}</Text>
                      ) : kit.unlock_type === 'chance_based' ? (
                        <>
                          <Text style={styles.kitPriceSpecial}>
                            {kit.unlock_condition === 'game_win' ? 'Win to Unlock' : 'Play to Unlock'}
                          </Text>
                          <Pressable
                            onPress={() => {
                              setInfoModalContent({
                                title: kit.name,
                                description: kit.rarity === 'mythic'
                                  ? 'This ultra-rare kit has a 0.015% chance (1 in 6,667) to unlock every time you WIN a game. Keep playing and winning to unlock this exclusive kit!'
                                  : 'This rare kit has a 0.025% chance (1 in 4,000) to unlock every time you FINISH a game. Keep playing to unlock this exclusive kit!',
                                rarity: kit.rarity
                              });
                              setShowInfoModal(true);
                            }}
                            style={styles.infoButton}
                          >
                            <HelpCircle size={16} color="#F59E0B" />
                          </Pressable>
                        </>
                      ) : null}
                    </View>

                    {canEquip ? (
                      <Pressable
                        style={[styles.purchaseBtn, styles.claimBtn]}
                        onPress={() => handleOpenApplicationModal(kit)}
                        disabled={isApplying}
                      >
                        {isApplying ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.purchaseText}>Apply Kit</Text>
                        )}
                      </Pressable>
                    ) : kit.unlock_type === 'free' ? (
                      <Pressable
                        style={[styles.purchaseBtn, styles.claimBtn]}
                        onPress={() => handleClaimFree(kit)}
                        disabled={isApplying}
                      >
                        {isApplying ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.purchaseText}>Claim Free</Text>
                        )}
                      </Pressable>
                    ) : kit.unlock_type === 'purchasable' ? (
                      <Pressable
                        style={styles.purchaseBtn}
                        onPress={() => handlePurchaseKit(kit)}
                        disabled={isApplying}
                      >
                        {isApplying ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.purchaseText}>Purchase</Text>
                        )}
                      </Pressable>
                    ) : (
                      <View style={styles.lockedBtn}>
                        <Lock size={14} color="#94A3B8" />
                        <Text style={styles.lockedText}>Locked</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 100,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  kitCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#334155',
  },
  kitCardLocked: {
    opacity: 0.7,
  },
  kitBanner: {
    width: '100%',
    height: 120,
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  kitInfo: {
    padding: 16,
  },
  kitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  kitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  kitName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  premiumBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rarityBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  kitDescription: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  kitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kitPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  kitPriceSpecial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  kitPriceUnlocked: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  applyBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockedBtn: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#64748B',
  },
  lockedText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
  },
  purchaseBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  purchaseText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  claimBtn: {
    backgroundColor: '#3B82F6',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#334155',
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoModalTitleRow: {
    flex: 1,
    gap: 8,
  },
  infoModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoModalRarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  legendaryBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  mythicBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    borderColor: '#EC4899',
  },
  infoModalRarityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#F59E0B',
  },
  infoModalDescription: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
