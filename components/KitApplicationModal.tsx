import { View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { X, User, Home, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BannerRenderer from './BannerRenderer';

type House = {
  id: string;
  name: string;
  emoji: string;
  role: string;
};

type Kit = {
  id: string;
  name: string;
  rarity: string;
  color_scheme: string[];
};

type UserHouse = {
  id: string;
  name: string;
  emoji: string;
};

type Props = {
  visible: boolean;
  kit: Kit | null;
  userHouses?: UserHouse[];
  loadingHouses?: boolean;
  onClose: () => void;
  onApply: (target: 'profile' | 'house', houseIds?: string[]) => void;
};

function KitApplicationModal({ visible, kit, userHouses = [], loadingHouses: externalLoadingHouses = false, onClose, onApply }: Props) {
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouses, setSelectedHouses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [internalLoadingHouses, setInternalLoadingHouses] = useState(false);
  const [step, setStep] = useState<'choice' | 'house-select'>('choice');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { user } = useAuth();

  const loadingHouses = externalLoadingHouses || internalLoadingHouses;

  useEffect(() => {
    if (visible && user) {
      const startTime = performance.now();
      console.log('[KIT_APPLICATION] Modal opened');

      if (userHouses && userHouses.length > 0) {
        console.log('[KIT_APPLICATION] Using pre-loaded houses:', userHouses.length);
        const houseList = userHouses.map(house => ({
          id: house.id,
          name: house.name,
          emoji: house.emoji,
          role: 'creator',
        }));
        setHouses(houseList);
        const endTime = performance.now();
        console.log(`[PERFORMANCE] Modal open to houses ready: ${(endTime - startTime).toFixed(0)}ms`);
      } else {
        console.log('[KIT_APPLICATION] No pre-loaded houses, loading from database');
        console.time('[PERFORMANCE] loadUserHouses');
        loadUserHouses().then(() => {
          console.timeEnd('[PERFORMANCE] loadUserHouses');
          const endTime = performance.now();
          console.log(`[PERFORMANCE] Modal open to houses loaded: ${(endTime - startTime).toFixed(0)}ms`);
        });
      }

      setStep('choice');
      setSelectedHouses(new Set());
    } else if (!visible) {
      console.log('[KIT_APPLICATION] Modal closed, clearing state');
      setHouses([]);
      setStep('choice');
      setSelectedHouses(new Set());
      setLoading(false);
      setInternalLoadingHouses(false);
    }
  }, [visible, user, userHouses]);

  const loadUserHouses = async () => {
    if (!user) {
      console.log('[KIT_APPLICATION] No user found');
      return;
    }

    try {
      console.log('[KIT_APPLICATION] Loading houses where user is admin:', user.id);
      const startTime = performance.now();
      setInternalLoadingHouses(true);

      // Optimized query: Direct join for better performance
      const { data: adminHouses, error } = await supabase
        .from('house_members')
        .select(`
          houses!inner (
            id,
            name,
            house_emoji
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .order('joined_at', { ascending: false })
        .limit(50);

      const endTime = performance.now();
      console.log(`[PERFORMANCE] House query took ${(endTime - startTime).toFixed(0)}ms`);

      if (error) {
        console.error('[KIT_APPLICATION] Error loading houses:', error.message);
        setHouses([]);
        return;
      }

      if (!adminHouses || adminHouses.length === 0) {
        console.log('[KIT_APPLICATION] No admin houses found');
        setHouses([]);
        return;
      }

      console.log('[KIT_APPLICATION] Found', adminHouses.length, 'admin houses');

      const houseList = adminHouses
        .filter(member => member.houses)
        .map(member => {
          const house = member.houses as any;
          return {
            id: house.id,
            name: house.name,
            emoji: house.house_emoji || '🏠',
            role: 'admin',
          };
        });

      setHouses(houseList);
    } catch (err) {
      console.error('[KIT_APPLICATION] Exception:', err);
      setHouses([]);
    } finally {
      setInternalLoadingHouses(false);
    }
  };

  const handleProfileApply = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onApply('profile');
  }, [onApply]);

  const handleHouseChoice = useCallback(() => {
    console.log('[KIT_APPLICATION] handleHouseChoice called, houses.length:', houses.length);
    console.log('[KIT_APPLICATION] houses array:', JSON.stringify(houses, null, 2));
    if (houses.length === 0) {
      console.log('[KIT_APPLICATION] Blocked: No houses to select');
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    console.log('[KIT_APPLICATION] Transitioning to house-select step');
    setIsTransitioning(true);
    setStep('house-select');
    setTimeout(() => {
      setIsTransitioning(false);
      console.log('[KIT_APPLICATION] Transition complete, modal unlocked');
    }, 300);
  }, [houses.length]);

  const handleHouseApply = useCallback(() => {
    if (selectedHouses.size === 0) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onApply('house', Array.from(selectedHouses));
  }, [selectedHouses, onApply]);

  const handleModalClose = useCallback(() => {
    if (isTransitioning) {
      console.log('[KIT_APPLICATION] Close blocked: transition in progress');
      return;
    }
    console.log('[KIT_APPLICATION] Modal closing (user initiated)');
    onClose();
  }, [isTransitioning, onClose]);

  const handleBackButton = useCallback(() => {
    console.log('[KIT_APPLICATION] Back button pressed');
    setStep('choice');
  }, []);

  if (!kit) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleModalClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleModalClose}
        />
        <View style={styles.modal}>
          <Pressable style={styles.closeButton} onPress={handleModalClose}>
            <X size={24} color="#94A3B8" />
          </Pressable>

          {step === 'choice' ? (
            <>
              <View style={styles.header}>
                <Sparkles size={32} color="#10B981" />
                <Text style={styles.title}>Apply Kit</Text>
                <Text style={styles.subtitle}>Where would you like to apply {kit.name}?</Text>
              </View>

              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                updateCellsBatchingPeriod={50}
                windowSize={5}
              >
                <View style={styles.kitPreview}>
                  <BannerRenderer
                    colors={kit.color_scheme}
                    rarity={kit.rarity as any}
                    style={{ width: '100%', height: 100 }}
                    size="large"
                  />
                  <Text style={styles.kitName}>{kit.name}</Text>
                </View>

                <View style={styles.options}>
                  <Pressable
                    style={styles.optionButton}
                    onPress={handleProfileApply}
                    disabled={loading}
                  >
                    <View style={styles.optionIcon}>
                      <User size={32} color="#3B82F6" />
                    </View>
                    <Text style={styles.optionTitle}>Apply to Profile</Text>
                    <Text style={styles.optionDescription}>
                      Your player card, leaderboard entry, and profile will show this kit
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.optionButton,
                      (houses.length === 0 || loadingHouses) && styles.optionButtonDisabled
                    ]}
                    onPress={handleHouseChoice}
                    disabled={houses.length === 0 || loadingHouses}
                  >
                    <View style={styles.optionIcon}>
                      {loadingHouses ? (
                        <ActivityIndicator size={32} color="#10B981" />
                      ) : (
                        <Home size={32} color="#10B981" />
                      )}
                    </View>
                    <Text style={styles.optionTitle}>Apply to House</Text>
                    <Text style={styles.optionDescription}>
                      {loadingHouses
                        ? 'Loading your houses...'
                        : houses.length === 0
                        ? 'You need to create a house first'
                        : 'Apply to houses you created. Everyone in the house will see this theme'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Home size={32} color="#10B981" />
                <Text style={styles.title}>Select Houses</Text>
                <Text style={styles.subtitle}>Select houses you created. This will apply {kit.name} to all selected houses.</Text>
              </View>

              {console.log('[KIT_APPLICATION] RENDER house-select step, houses.length:', houses.length, 'loadingHouses:', loadingHouses)}

              <ScrollView
                style={styles.houseList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.houseListContent}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                windowSize={10}
              >
                {loadingHouses ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={styles.loadingText}>Loading houses...</Text>
                  </View>
                ) : houses.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>You haven't created any houses yet</Text>
                  </View>
                ) : (
                  houses.map((house) => {
                  const isSelected = selectedHouses.has(house.id);
                  const handlePress = () => {
                    console.log('[KIT_APPLICATION] House card pressed:', house.name, house.id);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedHouses(prev => {
                      const newSet = new Set(prev);
                      console.log('[KIT_APPLICATION] Current selected houses:', Array.from(prev));
                      if (newSet.has(house.id)) {
                        console.log('[KIT_APPLICATION] Deselecting house:', house.id);
                        newSet.delete(house.id);
                      } else {
                        console.log('[KIT_APPLICATION] Selecting house:', house.id);
                        newSet.add(house.id);
                      }
                      console.log('[KIT_APPLICATION] New selected houses:', Array.from(newSet));
                      return newSet;
                    });
                  };

                  return (
                    <Pressable
                      key={house.id}
                      style={[
                        styles.houseCard,
                        isSelected && styles.houseCardSelected
                      ]}
                      onPress={handlePress}
                    >
                      <Text style={styles.houseEmoji}>{house.emoji}</Text>
                      <View style={styles.houseInfo}>
                        <Text style={styles.houseName}>{house.name}</Text>
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>CREATOR</Text>
                        </View>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedText}>✓</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                  })
                )}
              </ScrollView>

              <View style={styles.actions}>
                <Pressable
                  style={styles.actionBackButton}
                  onPress={handleBackButton}
                  disabled={loading || isTransitioning}
                >
                  <Text style={styles.actionBackButtonText}>Back</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.applyButton,
                    selectedHouses.size === 0 && styles.applyButtonDisabled
                  ]}
                  onPress={handleHouseApply}
                  disabled={selectedHouses.size === 0 || loading || isTransitioning}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.applyButtonText}>
                      Apply to {selectedHouses.size} House{selectedHouses.size !== 1 ? 's' : ''}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: '#334155',
    zIndex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    flexShrink: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  kitPreview: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
  },
  kitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
  },
  options: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  houseList: {
    flexGrow: 1,
    flexShrink: 1,
    marginBottom: 16,
  },
  houseListContent: {
    paddingBottom: 8,
  },
  houseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  houseCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  houseEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  houseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  houseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  adminBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBackButton: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionBackButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});

export default memo(KitApplicationModal);
