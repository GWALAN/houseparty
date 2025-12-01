import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, FlatList, TextInput, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Users, Lock, Crown, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logError, logInfo, logWarning, formatSupabaseError } from '@/lib/errorReporting';
import HouseLimitModal from '@/components/HouseLimitModal';
import Emoji3D from '@/components/Emoji3D';

type EmojiPack = {
  id: string;
  name: string;
  emojis: string[];
  preview_emoji: string;
  price_cents: number;
  is_free: boolean;
  theme_color?: string;
  secondary_color?: string;
};

export default function CreateHouseScreen() {
  const [houseName, setHouseName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emojiPacks, setEmojiPacks] = useState<EmojiPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const router = useRouter();

  useEffect(() => {
    loadEmojiPacks();
  }, [user]);


  const loadEmojiPacks = async () => {
    try {
      console.log('[CREATE HOUSE] Loading emoji packs...');
      console.log('[CREATE HOUSE] Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);

      const { data, error } = await supabase
        .from('emoji_packs')
        .select('*')
        .order('is_free', { ascending: false })
        .order('price_cents', { ascending: true });

      if (error) {
        console.error('[CREATE HOUSE] Error loading emoji packs:', error);
        console.error('[CREATE HOUSE] Error details:', JSON.stringify(error, null, 2));
        setError('Failed to load emoji packs. Please check your connection.');
        return;
      }

      if (data) {
        console.log('[CREATE HOUSE] Loaded emoji packs:', data.length);
        console.log('[CREATE HOUSE] First pack:', data[0]);
        setEmojiPacks(data);

        // Auto-select first free pack
        const freePack = data.find(p => p.is_free);
        if (freePack) {
          console.log('[CREATE HOUSE] Auto-selected free pack:', freePack.name);
          setSelectedPackId(freePack.id);
        } else {
          console.warn('[CREATE HOUSE] No free pack found!');
        }
      } else {
        console.warn('[CREATE HOUSE] No emoji packs data returned');
      }
    } catch (err) {
      console.error('[CREATE HOUSE] Exception loading emoji packs:', err);
      setError('Failed to load emoji packs. Please try again.');
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreate = async () => {
    try {
      logInfo('CREATE_HOUSE', 'Button pressed');

      if (!houseName.trim() || !nickname.trim()) {
        logWarning('CREATE_HOUSE', 'Validation failed: empty fields');
        setError('Please fill in all fields');
        return;
      }

      if (!user) {
        logWarning('CREATE_HOUSE', 'No authenticated user');
        setError('You must be signed in to create a house');
        return;
      }

      logInfo('CREATE_HOUSE', 'Starting creation process', {
        houseName,
        nickname,
        userId: user.id,
        selectedEmoji,
        selectedPackId
      });
      setLoading(true);
      setError('');

      // Check house limit for free users
      const { data: limitCheck, error: limitError } = await supabase
        .rpc('check_user_can_join_house', { user_id_param: user.id });

      if (limitError) {
        logError('CREATE_HOUSE', limitError, { userId: user.id });
        throw new Error('Failed to check house limit');
      }

      if (limitCheck && !limitCheck.can_join) {
        logWarning('CREATE_HOUSE', 'House limit reached', {
          userId: user.id,
          currentCount: limitCheck.current_house_count,
          isPremium: limitCheck.is_premium
        });
        setLoading(false);
        setShowLimitModal(true);
        return;
      }

      let house = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!house && attempts < maxAttempts) {
        attempts++;
        const inviteCode = generateInviteCode();
        logInfo('CREATE_HOUSE', `Generated invite code (attempt ${attempts})`, { inviteCode });

        const { data: houseId, error: createError } = await supabase.rpc('create_house_with_admin', {
          house_name: houseName.trim(),
          house_description: '',
          house_emoji: selectedEmoji,
          invite_code: inviteCode,
          creator_id: user.id,
        });

        if (!createError && houseId) {
          // Update house member with nickname and emoji pack
          if (nickname.trim()) {
            await supabase
              .from('house_members')
              .update({
                nickname: nickname.trim(),
                emoji_pack_id: selectedPackId
              })
              .eq('house_id', houseId)
              .eq('user_id', user.id);
          }

          house = { id: houseId };
          logInfo('CREATE_HOUSE', 'House created successfully', { houseId });
          break;
        }

        if (createError && createError.code === '23505' && attempts < maxAttempts) {
          logWarning('CREATE_HOUSE', 'Invite code collision, retrying', { attempt: attempts });
          continue;
        }

        if (createError) {
          logError('CREATE_HOUSE', createError, {
            houseName,
            userId: user.id,
            attempt: attempts
          });

          let errorMessage = formatSupabaseError(createError);

          // Add more helpful context for common errors
          if (createError.code === '42501') {
            errorMessage = 'Permission denied. You may have reached your house limit. Upgrade to Premium for unlimited houses!';
          } else if (createError.message?.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else if (createError.message?.includes('timeout')) {
            errorMessage = 'Request timed out. Please check your connection and try again.';
          }

          setError(errorMessage);
          setLoading(false);
          return;
        }
      }

      if (!house) {
        logError('CREATE_HOUSE', new Error('No house data returned'), {
          userId: user.id,
          attempts
        });
        setError('Failed to create house. Please try again or contact support.');
        setLoading(false);
        return;
      }
      logInfo('CREATE_HOUSE', 'House created, navigating to home with refresh flag');

      setLoading(false);

      // Navigate to the newly created house's detail page
      router.replace(`/house/${house.id}`);
    } catch (err) {
      logError('CREATE_HOUSE', err, {
        houseName,
        userId: user?.id,
        selectedEmoji,
        selectedPackId
      });
      setError(`An unexpected error occurred. Please try again.`);
      setLoading(false);
    }
  };

  const selectedPack = emojiPacks.find(p => p.id === selectedPackId);

  const getPackGradient = (): [string, string] => {
    // Always return green gradient - emoji packs only affect emoji selection
    return ['#10B981', '#059669'];
  };

  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      logError('CREATE_HOUSE_SCREEN', error, {
        componentStack: errorInfo.componentStack,
        userId: user?.id
      });
    }}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#FFFFFF" />
      </Pressable>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Create a House</Text>
          <Text style={styles.subtitle}>Start your own game community</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.form}>
            <View style={styles.previewCardContainer}>
              <Text style={styles.previewLabel}>HOUSE PREVIEW</Text>
              <View style={styles.previewCard}>
                <LinearGradient
                  colors={getPackGradient()}
                  style={styles.previewGradient}
                >
                  <View style={styles.previewHeader}>
                    <View style={styles.previewTitleRow}>
                      <Emoji3D emoji={selectedEmoji} size="xlarge" />
                      <Text style={styles.previewName}>{houseName || 'Your House Name'}</Text>
                    </View>
                    <View style={styles.previewAdminBadge}>
                      <Text style={styles.previewAdminText}>Admin</Text>
                    </View>
                  </View>
                  <View style={styles.previewInfo}>
                    <Users size={16} color="#FFFFFF" />
                    <Text style={styles.previewMemberCount}>1 members</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>House Name</Text>
            <TextInput
              style={styles.input}
              placeholder="The Gaming Den"
              placeholderTextColor="#64748B"
              value={houseName}
              onChangeText={setHouseName}
              returnKeyType="next"
              blurOnSubmit={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Your Nickname</Text>
            <TextInput
              style={styles.input}
              placeholder="GameMaster"
              placeholderTextColor="#64748B"
              value={nickname}
              onChangeText={setNickname}
              returnKeyType="done"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Choose Emoji Pack</Text>
              {emojiPacks.length > 3 && (
                <Text style={styles.scrollHint}>Scroll for more →</Text>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.packList}
              contentContainerStyle={styles.packListContent}
            >
              {emojiPacks.map(pack => {
                const canAccess = pack.is_free || isPremium;
                return (
                  <Pressable
                    key={pack.id}
                    style={[
                      styles.packCard,
                      selectedPackId === pack.id && styles.packCardSelected
                    ]}
                    onPress={() => {
                      if (canAccess) {
                        setSelectedPackId(pack.id);
                        setSelectedEmoji(pack.emojis[0]);
                      }
                    }}
                  >
                    {!canAccess && (
                      <View style={styles.lockBadge}>
                        <Lock size={16} color="#FFFFFF" />
                      </View>
                    )}
                    <Emoji3D emoji={pack.preview_emoji} size="large" style={!canAccess ? { opacity: 0.5 } : undefined} />
                    <Text style={[styles.packName, !canAccess && styles.packNameLocked]}>{pack.name}</Text>
                    <Text style={[styles.packPrice, !canAccess && styles.packPriceLocked]}>
                      {pack.is_free ? 'Free' : 'Premium'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {selectedPack && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Emoji</Text>
              <View style={styles.emojiGrid}>
                {selectedPack.emojis.map((emoji, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.emojiButton,
                      selectedEmoji === emoji && styles.emojiButtonSelected
                    ]}
                    onPress={() => setSelectedEmoji(emoji)}
                  >
                    <Emoji3D emoji={emoji} size="large" />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create House</Text>
            )}
          </Pressable>
        </View>
      </View>
      </ScrollView>

      <HouseLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          router.push('/(tabs)/profile');
        }}
        context="create"
      />
    </LinearGradient>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  error: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  form: {
    gap: 24,
  },
  previewCardContainer: {
    gap: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewGradient: {
    padding: 24,
    position: 'relative',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  previewName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  previewAdminBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewAdminText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewMemberCount: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  packList: {
    marginTop: 8,
  },
  packListContent: {
    paddingRight: 24,
  },
  packCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 100,
    borderWidth: 2,
    borderColor: '#334155',
  },
  packCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#065F46',
  },
  packName: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  packPrice: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  packCardLocked: {
    opacity: 0.6,
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  packEmojiLocked: {
    opacity: 0.5,
  },
  packNameLocked: {
    opacity: 0.5,
  },
  packPriceLocked: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  emojiButton: {
    width: 56,
    height: 56,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  emojiButtonSelected: {
    borderColor: '#10B981',
    backgroundColor: '#065F46',
  },
  inputContainer: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  scrollHint: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
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
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  limitBannerText: {
    flex: 1,
  },
  limitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  limitSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  upgradePrompt: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});
