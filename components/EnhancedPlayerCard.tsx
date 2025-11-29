import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Target, TrendingUp, Zap, Crown } from 'lucide-react-native';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import UserAvatar from './UserAvatar';
import BannerRenderer, { BannerRarity } from './BannerRenderer';
import { isLightGradient } from '@/lib/colorUtils';

type PlayerStats = {
  total_games: number;
  total_wins: number;
  win_rate: number;
  avg_score: number;
  last_played: string | null;
};

type EnhancedPlayerCardProps = {
  userId: string;
  nickname: string;
  isSelected: boolean;
  onPress: () => void;
  isCreator?: boolean;
};

export default function EnhancedPlayerCard({
  userId,
  nickname,
  isSelected,
  onPress,
  isCreator = false,
}: EnhancedPlayerCardProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [bannerColors, setBannerColors] = useState<string[] | null>(null);
  const [bannerRarity, setBannerRarity] = useState<BannerRarity>('common');
  const [kitName, setKitName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayerData();
  }, [userId]);

  const getKitColors = (kit: { rarity: string; color_scheme?: string[] }): string[] => {
    if (kit.color_scheme && Array.isArray(kit.color_scheme) && kit.color_scheme.length > 0) {
      return kit.color_scheme;
    }

    switch (kit.rarity) {
      case 'mythic':
        return ['#EC4899', '#DB2777', '#F472B6'];
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

  const loadPlayerData = async () => {
    try {
      const [statsResult, profileResult] = await Promise.all([
        supabase.rpc('get_player_stats', { player_id: userId }),
        supabase
          .from('user_profile_settings')
          .select('equipped_house_kit_id')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (statsResult.error) {
        console.error('[ENHANCED PLAYER CARD] Stats RPC error:', statsResult.error);
        setStats({
          total_games: 0,
          total_wins: 0,
          win_rate: 0,
          avg_score: 0,
          last_played: null,
        });
      } else if (statsResult.data && Array.isArray(statsResult.data) && statsResult.data.length > 0) {
        const statData = statsResult.data[0];
        setStats({
          total_games: statData.total_games || 0,
          total_wins: statData.total_wins || 0,
          win_rate: statData.win_rate || 0,
          avg_score: statData.avg_score || 0,
          last_played: statData.last_played || null,
        });
      } else {
        setStats({
          total_games: 0,
          total_wins: 0,
          win_rate: 0,
          avg_score: 0,
          last_played: null,
        });
      }

      let displayColors: string[] | null = null;
      let displayRarity: BannerRarity = 'common';
      let displayKitName: string | null = null;

      console.log('[ENHANCED PLAYER CARD] Profile result for user', userId, ':', profileResult.data);

      if (profileResult.data?.equipped_house_kit_id) {
        console.log('[ENHANCED PLAYER CARD] Fetching kit:', profileResult.data.equipped_house_kit_id);
        const { data: kit, error: kitError } = await supabase
          .from('house_kits')
          .select('color_scheme, name, rarity')
          .eq('id', profileResult.data.equipped_house_kit_id)
          .maybeSingle();

        if (kitError) {
          console.error('[ENHANCED PLAYER CARD] Error fetching kit:', kitError);
        } else if (kit && kit.color_scheme) {
          console.log('[ENHANCED PLAYER CARD] Kit found:', kit.name, 'Color scheme:', kit.color_scheme, 'Rarity:', kit.rarity);
          let colors = Array.isArray(kit.color_scheme) && kit.color_scheme.length > 0
            ? kit.color_scheme
            : ['#10B981', '#059669'];

          // LinearGradient requires at least 2 colors, so duplicate if only 1
          if (colors.length === 1) {
            colors = [colors[0], colors[0]];
          }

          displayColors = colors;
          displayRarity = (kit.rarity || 'common') as BannerRarity;
          displayKitName = kit.name || null;
          console.log('[ENHANCED PLAYER CARD] Display colors:', displayColors, 'Display rarity:', displayRarity, 'Kit name:', displayKitName);
        } else {
          console.log('[ENHANCED PLAYER CARD] No kit found for ID:', profileResult.data.equipped_house_kit_id);
        }
      } else {
        console.log('[ENHANCED PLAYER CARD] No equipped kit for user:', userId);
      }

      // Always update the state, even if null (to clear previous colors)
      setBannerColors(displayColors);
      setBannerRarity(displayRarity);
      setKitName(displayKitName);
      console.log('[ENHANCED PLAYER CARD] Banner state updated - colors:', displayColors, 'rarity:', displayRarity);
    } catch (error) {
      console.error('[ENHANCED PLAYER CARD] Error loading data:', error);
      setStats({
        total_games: 0,
        total_wins: 0,
        win_rate: 0,
        avg_score: 0,
        last_played: null,
      });
    }

    setLoading(false);
  };

  const getActivityStatus = () => {
    if (!stats?.last_played) return 'New Player';

    const lastPlayed = new Date(stats.last_played);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) return 'Active Today';
    if (hoursDiff < 168) return 'Active This Week';
    return 'Inactive';
  };

  const activityStatus = getActivityStatus();
  const isActive = activityStatus === 'Active Today' || activityStatus === 'Active This Week';

  // Determine text color based on background brightness
  const textColor = useMemo(() => {
    if (!bannerColors || bannerColors.length === 0) return '#FFFFFF';
    return isLightGradient(bannerColors) ? '#000000' : '#FFFFFF';
  }, [bannerColors]);

  const isDarkText = textColor === '#000000';
  const statIconColors = {
    target: isDarkText ? '#059669' : '#10B981',
    trophy: isDarkText ? '#D97706' : '#FFD700',
    trending: isDarkText ? '#2563EB' : '#3B82F6',
  };

  return (
    <Pressable
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
      onPress={onPress}
    >
      {bannerColors && (
        <View style={styles.bannerBackground}>
          <BannerRenderer
            colors={bannerColors}
            rarity={bannerRarity}
            kitName={kitName || undefined}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <UserAvatar
                userId={userId}
                username={nickname}
                size={48}
                showUsername={false}
              />
            </View>
            {isActive && <View style={styles.activeIndicator} />}
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nicknameRow}>
            <Text style={[styles.nickname, { color: textColor }]} numberOfLines={1}>
              {nickname}
            </Text>
            {isCreator && (
              <View style={styles.creatorBadge}>
                <Crown size={12} color="#FFD700" fill="#FFD700" />
                <Text style={styles.creatorText}>Creator</Text>
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#64748B" />
          ) : stats && stats.total_games > 0 ? (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Target size={12} color={statIconColors.target} />
                <Text style={[styles.statText, { color: isDarkText ? '#475569' : '#94A3B8' }]}>{stats.total_games}</Text>
              </View>
              <View style={styles.statItem}>
                <Trophy size={12} color={statIconColors.trophy} />
                <Text style={[styles.statText, { color: isDarkText ? '#475569' : '#94A3B8' }]}>{stats.total_wins}</Text>
              </View>
              <View style={styles.statItem}>
                <TrendingUp size={12} color={statIconColors.trending} />
                <Text style={[styles.statText, { color: isDarkText ? '#475569' : '#94A3B8' }]}>{stats.win_rate.toFixed(0)}%</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.newPlayerText, { color: isDarkText ? '#64748B' : '#64748B' }]}>New Player</Text>
          )}
        </View>

        <View style={styles.scoreSection}>
          {stats && stats.total_games > 0 ? (
            <>
              <Text style={[styles.scoreValue, { color: isDarkText ? '#059669' : '#10B981' }]}>{stats.avg_score.toFixed(0)}</Text>
              <Text style={[styles.scoreLabel, { color: isDarkText ? '#64748B' : '#64748B' }]}>Avg Score</Text>
            </>
          ) : (
            <Text style={[styles.noScoreText, { color: isDarkText ? '#94A3B8' : '#334155' }]}>-</Text>
          )}
        </View>

        {isSelected && (
          <View style={styles.selectedOverlay}>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    minHeight: 80,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: {
    borderColor: '#10B981',
  },
  bannerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  cardContent: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    minHeight: 80,
  },
  avatarSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  avatarContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 24,
    padding: 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingRight: 12,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flex: 1,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  creatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  newPlayerText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  scoreSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 16,
    minWidth: 60,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scoreLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  noScoreText: {
    fontSize: 24,
    color: '#334155',
    fontWeight: 'bold',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});