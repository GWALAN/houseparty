import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform, StatusBar, Image } from 'react-native';
import { useEffect, useState } from 'react';

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
}
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy, Target, TrendingUp, Calendar, Award, Hop as HouseIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BannerRenderer from '@/components/BannerRenderer';

type PlayerStats = {
  user_id: string;
  username: string;
  profile_photo_url?: string | null;
  total_games: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  best_placement_count: number;
  average_score: number;
  total_score: number;
  houses_played: number;
};

type HouseStats = {
  house_id: string;
  house_name: string;
  games_played: number;
  wins: number;
  win_rate: number;
};

type RecentGame = {
  session_id: string;
  game_name: string;
  house_name: string;
  score: number;
  placement: number;
  is_winner: boolean;
  played_at: string;
};

export default function PlayerStatsScreen() {
  const { userId } = useLocalSearchParams();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [houseStats, setHouseStats] = useState<HouseStats[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKitTheme, setActiveKitTheme] = useState<{colors: string[], name: string, rarity: string} | null>(null);
  const [gamesDisplayLimit, setGamesDisplayLimit] = useState(10);
  const [allGames, setAllGames] = useState<RecentGame[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchPlayerStats();
    fetchActiveKitTheme();

    if (!userId) return;

    const subscription = supabase
      .channel(`player-stats-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_scores',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('[PLAYER STATS] Score updated, refreshing stats...');
          fetchPlayerStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions'
        },
        () => {
          console.log('[PLAYER STATS] Game session updated, refreshing stats...');
          fetchPlayerStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profile_settings',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('[PLAYER STATS] Profile settings updated, refreshing...');
          fetchPlayerStats();
          fetchActiveKitTheme();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // Update displayed games when limit changes
  useEffect(() => {
    setRecentGames(allGames.slice(0, gamesDisplayLimit));
  }, [gamesDisplayLimit, allGames]);

  const fetchActiveKitTheme = async () => {
    if (!userId) {
      console.log('[PLAYER STATS] No userId provided');
      return;
    }

    console.log('[PLAYER STATS] Fetching kit theme for user:', userId);

    const { data: profileSettings, error: settingsError } = await supabase
      .from('user_profile_settings')
      .select('equipped_house_kit_id')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[PLAYER STATS] Profile settings:', { profileSettings, settingsError });

    if (settingsError || !profileSettings?.equipped_house_kit_id) {
      console.log('[PLAYER STATS] No equipped kit found');
      setActiveKitTheme(null);
      return;
    }

    const { data: houseKit, error: kitError } = await supabase
      .from('house_kits')
      .select('name, color_scheme, rarity')
      .eq('id', profileSettings.equipped_house_kit_id)
      .maybeSingle();

    console.log('[PLAYER STATS] House kit data:', { houseKit, kitError });

    if (!kitError && houseKit && houseKit.color_scheme) {
      let colors = Array.isArray(houseKit.color_scheme) && houseKit.color_scheme.length > 0
        ? houseKit.color_scheme
        : ['#10B981', '#059669'];

      if (colors.length === 1) {
        colors = [colors[0], colors[0]];
      }

      console.log('[PLAYER STATS] Setting active kit theme:', { colors, name: houseKit.name, rarity: houseKit.rarity });

      setActiveKitTheme({
        colors,
        name: houseKit.name,
        rarity: houseKit.rarity || 'common'
      });
    } else {
      console.log('[PLAYER STATS] Failed to load kit or no color scheme');
      setActiveKitTheme(null);
    }
  };

  const fetchPlayerStats = async () => {
    if (!userId) return;

    try {
      console.log('[PLAYER STATS] Fetching stats for user:', userId);

      const { data: profileSettings } = await supabase
        .from('user_profile_settings')
        .select('is_private, profile_photo_url')
        .eq('user_id', userId)
        .maybeSingle();

      const isPrivate = profileSettings?.is_private === true;
      const isOwnProfile = user?.id === userId;

      if (isPrivate && !isOwnProfile) {
        setStats(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      const { data: scores, error: scoresError } = await supabase
        .from('session_scores')
        .select(`
          score,
          placement,
          is_winner,
          session_id,
          game_sessions!inner (
            house_id,
            status,
            started_at,
            game_id,
            is_solo_game,
            games (
              name
            ),
            houses (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('game_sessions.status', 'completed')
        .eq('game_sessions.is_solo_game', false);

      if (scoresError) {
        console.error('[PLAYER STATS] Query error:', scoresError);
      }

      if (!scores || scores.length === 0) {
        console.log('[PLAYER STATS] No scores returned for user:', userId);
        setStats({
          user_id: userId as string,
          username: profile?.username || 'Unknown',
          profile_photo_url: profileSettings?.profile_photo_url || profile?.avatar_url || null,
          total_games: 0,
          total_wins: 0,
          total_losses: 0,
          win_rate: 0,
          best_placement_count: 0,
          average_score: 0,
          total_score: 0,
          houses_played: 0,
        });
        setLoading(false);
        return;
      }

      // Sort scores by game session start time (client-side since PostgREST can't order by foreign columns)
      const sortedScores = scores.sort((a, b) => {
        const sessionA = Array.isArray(a.game_sessions) ? a.game_sessions[0] : a.game_sessions;
        const sessionB = Array.isArray(b.game_sessions) ? b.game_sessions[0] : b.game_sessions;
        const dateA = new Date(sessionA?.started_at || 0);
        const dateB = new Date(sessionB?.started_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Count unique game sessions, not score entries
      const uniqueSessions = new Set(sortedScores.map(s => s.session_id));
      const totalGames = uniqueSessions.size;

      // Count wins by checking unique sessions where user won
      const winningSessionIds = new Set(sortedScores.filter(s => s.is_winner).map(s => s.session_id));
      const totalWins = winningSessionIds.size;

      const totalLosses = totalGames - totalWins;
      const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
      const bestPlacementCount = sortedScores.filter(s => s.placement === 1).length;
      const totalScore = sortedScores.reduce((sum, s) => sum + (s.score || 0), 0);
      const averageScore = totalGames > 0 ? totalScore / totalGames : 0;

      const uniqueHouses = new Set(sortedScores.map(s => {
        const session = Array.isArray(s.game_sessions) ? s.game_sessions[0] : s.game_sessions;
        return session?.house_id;
      }).filter(Boolean));
      const housesPlayed = uniqueHouses.size;

      setStats({
        user_id: userId as string,
        username: profile?.username || 'Unknown',
        profile_photo_url: profileSettings?.profile_photo_url || profile?.avatar_url || null,
        total_games: totalGames,
        total_wins: totalWins,
        total_losses: totalLosses,
        win_rate: winRate,
        best_placement_count: bestPlacementCount,
        average_score: Math.round(averageScore),
        total_score: totalScore,
        houses_played: housesPlayed,
      });

      const houseStatsMap = new Map<string, any>();
      sortedScores.forEach(score => {
        const session = Array.isArray(score.game_sessions) ? score.game_sessions[0] : score.game_sessions;
        const house = Array.isArray(session?.houses) ? session.houses[0] : session?.houses;
        const houseId = session?.house_id;
        const houseName = house?.name;

        if (!houseStatsMap.has(houseId)) {
          houseStatsMap.set(houseId, {
            house_id: houseId,
            house_name: houseName,
            games_played: 0,
            wins: 0,
          });
        }

        const hStat = houseStatsMap.get(houseId);
        hStat.games_played += 1;
        if (score.is_winner) {
          hStat.wins += 1;
        }
      });

      const houseStatsArray = Array.from(houseStatsMap.values()).map(h => ({
        ...h,
        win_rate: (h.wins / h.games_played) * 100,
      }));
      houseStatsArray.sort((a, b) => b.games_played - a.games_played);
      setHouseStats(houseStatsArray);

      const allGamesData = sortedScores.map(s => {
        const session = Array.isArray(s.game_sessions) ? s.game_sessions[0] : s.game_sessions;
        const game = Array.isArray(session?.games) ? session.games[0] : session?.games;
        const house = Array.isArray(session?.houses) ? session.houses[0] : session?.houses;
        return {
          session_id: s.session_id,
          game_name: game?.name || 'Unknown Game',
          house_name: house?.name || 'Unknown House',
          score: s.score || 0,
          placement: s.placement || 1,  // Default to 1st place if null
          is_winner: s.is_winner,
          played_at: session?.started_at || '',
        };
      });
      setAllGames(allGamesData);
      setRecentGames(allGamesData.slice(0, gamesDisplayLimit));

      console.log('[PLAYER STATS] Stats loaded successfully');
    } catch (error) {
      console.error('[PLAYER STATS] Error fetching stats:', error);
    }

    setLoading(false);
  };

  const headerColors = activeKitTheme?.colors || ['#0F172A', '#1E293B'];
  const hasKitEffects = activeKitTheme && ['legendary', 'mythic'].includes(activeKitTheme.rarity);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <LinearGradient colors={headerColors as [string, string, ...string[]]} style={styles.container}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <LinearGradient colors={headerColors as [string, string, ...string[]]} style={styles.container}>
          <View style={styles.privateHeader}>
            <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.privateHeaderTitle}>Player Stats</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.centered}>
            <View style={styles.privateProfileContainer}>
              <View style={styles.lockIcon}>
                <Text style={styles.lockEmoji}>🔒</Text>
              </View>
              <Text style={styles.privateProfileTitle}>Private Profile</Text>
              <Text style={styles.privateProfileText}>
                This user has set their profile to private
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.headerGradient}>
            <View style={styles.header}>
              {hasKitEffects ? (
                <BannerRenderer
                  colors={activeKitTheme.colors}
                  rarity={activeKitTheme.rarity as any}
                  kitName={activeKitTheme.name}
                  size="large"
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <LinearGradient
                  colors={activeKitTheme ? activeKitTheme.colors as [string, string, ...string[]] : headerColors as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View style={styles.headerContentWrapper}>
                <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => router.back()}>
                  <ArrowLeft size={24} color="#FFFFFF" />
                </Pressable>
                <View style={styles.usernameContainer}>
                  <Text style={styles.username}>{stats.username}</Text>
                </View>
                <View style={styles.avatarContainer}>
                  {activeKitTheme && (
                    <LinearGradient
                      colors={activeKitTheme.colors as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.avatarBorder}
                    />
                  )}
                  <View style={styles.avatarInner}>
                    {stats.profile_photo_url ? (
                      <Image
                        source={{ uri: stats.profile_photo_url }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {stats.username[0].toUpperCase()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

        <View style={styles.statsContainer}>
          <LinearGradient
            colors={activeKitTheme ? activeKitTheme.colors as [string, string, ...string[]] : ['#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statCardOverlay}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🎮</Text>
              </View>
              <Text style={styles.statValue}>{stats.total_games}</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={activeKitTheme ? activeKitTheme.colors as [string, string, ...string[]] : ['#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statCardOverlay}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>⭐</Text>
              </View>
              <Text style={styles.statValue}>{stats.total_wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={activeKitTheme ? activeKitTheme.colors as [string, string, ...string[]] : ['#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statCardOverlay}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>💰</Text>
              </View>
              <Text style={styles.statValue}>{stats.win_rate.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </LinearGradient>

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance by House</Text>
          {houseStats.length === 0 ? (
            <Text style={styles.emptyText}>No house stats available</Text>
          ) : (
            houseStats.map((houseStat, index) => (
              <View key={houseStat.house_id} style={styles.houseStatCard}>
                <View style={styles.houseStatHeader}>
                  <HouseIcon size={20} color="#10B981" />
                  <Text style={styles.houseStatName}>{houseStat.house_name}</Text>
                </View>
                <View style={styles.houseStatDetails}>
                  <Text style={styles.houseStatText}>
                    {houseStat.games_played} games • {houseStat.wins} wins • {houseStat.win_rate.toFixed(0)}% win rate
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Games</Text>
          {recentGames.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>🎮</Text>
              <Text style={styles.emptyStateTitle}>No games played yet</Text>
              <Text style={styles.emptyStateText}>Start playing to see your game history here!</Text>
            </View>
          ) : (
            <>
            {recentGames.map((game, index) => (
              <View
                key={`${game.session_id}-${index}`}
                style={[styles.gameCard, game.is_winner && styles.gameCardWinner]}
              >
                <View style={styles.gameCardHeader}>
                  <Text style={styles.gameName}>{game.game_name}</Text>
                  {game.is_winner && (
                    <View style={styles.winnerBadge}>
                      <Trophy size={12} color="#FFFFFF" />
                      <Text style={styles.winnerText}>Winner</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.gameHouse}>{game.house_name}</Text>
                <View style={styles.gameStats}>
                  <Text style={styles.gameStatText}>Score: {game.score}</Text>
                  <Text style={styles.gameStatText}>{getOrdinalSuffix(game.placement)} place</Text>
                </View>
                <Text style={styles.gameDate}>{formatRelativeDate(game.played_at)}</Text>
              </View>
            ))}
            {allGames.length > recentGames.length && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => setGamesDisplayLimit(prev => prev + 10)}
              >
                <Text style={styles.loadMoreText}>Load More Games</Text>
                <Text style={styles.loadMoreSubtext}>
                  Showing {recentGames.length} of {allGames.length}
                </Text>
              </Pressable>
            )}
            </>
          )}
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  headerGradient: {
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    position: 'relative',
    minHeight: 350,
  },
  headerContentWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 64 : 60,
    paddingBottom: 24,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 0,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  avatarBorder: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    zIndex: 1,
    overflow: 'hidden',
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 10,
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    width: 112,
    height: 112,
    lineHeight: 112,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 120,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardOverlay: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 32,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  section: {
    padding: 24,
  },
  equippedKitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  equippedKitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 24,
  },
  privateProfileContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 20,
    margin: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockEmoji: {
    fontSize: 40,
  },
  privateProfileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  privateProfileText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  houseStatCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  houseStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  houseStatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  houseStatDetails: {
    marginLeft: 28,
  },
  houseStatText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  gameCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gameCardWinner: {
    borderColor: '#10B981',
    backgroundColor: '#10B98110',
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  winnerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gameHouse: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  gameStats: {
    flexDirection: 'row',
    gap: 16,
  },
  gameStatText: {
    fontSize: 14,
    color: '#64748B',
  },
  gameDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  loadMoreSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  privateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  privateHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
