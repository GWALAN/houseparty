import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, RefreshControl, Modal } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Crown, Users, ChevronDown, X, Clock, Medal } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import { formatScore, getScoringTypeConfig, type ScoringType } from '@/constants/ScoringTypes';

type House = {
  id: string;
  name: string;
  house_emoji: string;
  creator_id: string;
};

type Participant = {
  user_id: string;
  nickname: string;
  username: string;
  score: number;
  placement: number;
  is_winner: boolean;
  profile_photo_url?: string | null;
  equipped_kit_colors?: string[] | null;
  accuracy_hits?: number | null;
  accuracy_attempts?: number | null;
  ratio_numerator?: number | null;
  ratio_denominator?: number | null;
};

type GameSession = {
  session_id: string;
  game_id: string;
  game_name: string;
  game_emoji: string;
  game_type: string;
  scoring_type: ScoringType;
  scoring_unit: string;
  lower_is_better: boolean;
  distance_unit?: string;
  weight_unit?: string;
  max_attempts?: number;
  completed_at: string;
  participants: Participant[];
  winner_id: string;
  winner_name: string;
};

export default function LeaderboardScreen() {
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: myHouses = [], isLoading: housesLoading } = useQuery({
    queryKey: ['userHouses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await fetchMyHousesData(user.id);
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: gameHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ['gameHistory', selectedHouseId],
    queryFn: async () => {
      if (!selectedHouseId || !user) return null;
      return await fetchGameHistoryData(selectedHouseId);
    },
    enabled: !!selectedHouseId && !!user,
    staleTime: 15000, // Cache for 15 seconds
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const loading = housesLoading || historyLoading;
  const gameHistory = gameHistoryData?.sessions || [];
  const selectedHouse = myHouses.find(h => h.id === selectedHouseId) || (myHouses.length > 0 ? myHouses[0] : null);
  const memberCount = gameHistoryData?.memberCount || 0;
  const houseMasterName = gameHistoryData?.masterName || '';

  useEffect(() => {
    if (myHouses.length > 0 && !selectedHouseId) {
      setSelectedHouseId(myHouses[0].id);
    }
  }, [myHouses, selectedHouseId]);

  useFocusEffect(
    useCallback(() => {
      console.log('[LEADERBOARD] Screen focused - refreshing data');
      queryClient.invalidateQueries(['userHouses', user?.id]);
      if (selectedHouseId) {
        queryClient.invalidateQueries(['gameHistory', selectedHouseId]);
      }
    }, [user, selectedHouseId])
  );

  useEffect(() => {
    if (!user) return;

    console.log('[LEADERBOARD] Setting up realtime subscriptions');

    const subscription = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'house_members',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[LEADERBOARD] House membership changed:', payload.eventType);
          queryClient.invalidateQueries(['userHouses', user?.id]);

          if (payload.eventType === 'DELETE' && payload.old?.house_id === selectedHouseId) {
            console.log('[LEADERBOARD] User left current house, switching to another');
            setSelectedHouseId(null);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: selectedHouseId ? `house_id=eq.${selectedHouseId}` : undefined
        },
        (payload) => {
          if (payload.new && payload.new.status === 'completed' && selectedHouseId) {
            console.log('[LEADERBOARD] Game session completed, refreshing history');
            queryClient.invalidateQueries(['gameHistory', selectedHouseId]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_sessions',
          filter: selectedHouseId ? `house_id=eq.${selectedHouseId}` : undefined
        },
        (payload) => {
          if (payload.new && payload.new.status === 'completed' && selectedHouseId) {
            console.log('[LEADERBOARD] New completed game, refreshing history');
            queryClient.invalidateQueries(['gameHistory', selectedHouseId]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, selectedHouseId]);

  const fetchMyHousesData = async (userId: string): Promise<House[]> => {
    const { data, error } = await supabase
      .from('house_members')
      .select(`
        house_id,
        houses!inner (
          id,
          name,
          house_emoji,
          creator_id
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('[LEADERBOARD] Error fetching houses:', error);
      return [];
    }

    if (data && data.length > 0) {
      return data.map(d => ({
        id: d.houses.id,
        name: d.houses.name,
        house_emoji: d.houses.house_emoji,
        creator_id: d.houses.creator_id,
      }));
    }

    return [];
  };

  const fetchGameHistoryData = async (houseId: string) => {
    console.log('[LEADERBOARD] Fetching game history for house:', houseId);
    const house = myHouses.find(h => h.id === houseId);

    const [masterProfileResult, membersResult, gameHistoryResult] = await Promise.all([
      house ? supabase.from('profiles').select('username').eq('id', house.creator_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('house_members').select('user_id').eq('house_id', houseId),
      supabase.rpc('get_house_game_history', { house_id_param: houseId })
    ]);

    const masterName = masterProfileResult.data?.username || 'Unknown';
    const memberCount = membersResult.data?.length || 0;

    const { data, error } = gameHistoryResult;

    console.log('[LEADERBOARD] RPC Response:', {
      hasData: !!data,
      dataLength: data?.length || 0,
      hasError: !!error,
      houseId,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('[LEADERBOARD] Error fetching game history:', error);
      console.error('[LEADERBOARD] Error details:', JSON.stringify(error, null, 2));
      return { sessions: [], memberCount, masterName };
    }

    if (!data || data.length === 0) {
      console.warn('[LEADERBOARD] No data returned from get_house_game_history', {
        hasData: !!data,
        dataLength: data?.length || 0
      });
      return { sessions: [], memberCount, masterName };
    }

    console.log('[LEADERBOARD] Processing game data:', {
      sessionCount: data.length,
      firstSession: data[0] ? {
        id: data[0].session_id,
        gameName: data[0].game_name,
        participantCount: data[0].participants?.length || 0
      } : null
    });

    const sessions: GameSession[] = (data || []).map((row: any) => ({
      session_id: row.session_id,
      game_id: row.game_id,
      game_name: row.game_name,
      game_emoji: row.game_emoji,
      game_type: row.game_type,
      scoring_type: row.scoring_type || 'points',
      scoring_unit: row.scoring_unit || 'pts',
      lower_is_better: row.lower_is_better || false,
      distance_unit: row.distance_unit,
      weight_unit: row.weight_unit,
      max_attempts: row.max_attempts,
      completed_at: row.completed_at,
      participants: row.participants || [],
      winner_id: row.winner_id,
      winner_name: row.winner_name,
    }));

    console.log('[LEADERBOARD] Returning game history:', sessions.length, 'sessions');
    return { sessions, memberCount, masterName };
  };

  const onRefresh = () => {
    if (!selectedHouseId) return;
    queryClient.invalidateQueries(['gameHistory', selectedHouseId]);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMedalIcon = (placement: number) => {
    if (placement === 1) return { color: '#FFD700', filled: true };
    if (placement === 2) return { color: '#C0C0C0', filled: true };
    if (placement === 3) return { color: '#CD7F32', filled: true };
    return null;
  };

  const renderGameSession = ({ item }: { item: GameSession }) => {
    const scoringConfig = getScoringTypeConfig(item.scoring_type);

    return (
      <View style={styles.gameCard}>
        <View style={styles.gameHeader}>
          <View style={styles.gameHeaderLeft}>
            <Text style={styles.gameEmoji}>{item.game_emoji || '🎮'}</Text>
            <View style={styles.gameHeaderInfo}>
              <Text style={styles.gameName}>{item.game_name}</Text>
              <View style={styles.timeRow}>
                <Clock size={12} color="#64748B" />
                <Text style={styles.gameTime}>{formatTimeAgo(item.completed_at)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.scoringTypeTag}>
            <Text style={styles.scoringTypeEmoji}>{scoringConfig.emoji}</Text>
            <Text style={styles.scoringTypeLabel}>{scoringConfig.unit}</Text>
          </View>
        </View>

        <View style={styles.participantsContainer}>
          {item.participants.map((participant, index) => {
            const medal = getMedalIcon(participant.placement);
            const isWinner = participant.is_winner || participant.placement === 1;

            // Debug logging
            if (index === 0) {
              console.log('[LEADERBOARD] First participant:', {
                name: participant.nickname,
                placement: participant.placement,
                is_winner: participant.is_winner,
                calculated_isWinner: isWinner,
                game: item.game_name
              });
            }

            return (
              <Pressable
                key={participant.user_id}
                style={styles.participantRowContainer}
                onPress={() => router.push(`/player-stats/${participant.user_id}`)}
              >
                {isWinner && (
                  <LinearGradient
                    colors={['#FFD700', '#FFA500', '#FF8C00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.winnerGradient}
                  />
                )}
                <View style={[
                  styles.participantRow,
                  isWinner && styles.participantRowWinner
                ]}>
                <View style={styles.participantLeft}>
                  <View style={styles.rankContainer}>
                    {medal ? (
                      <Medal size={18} color={medal.color} fill={medal.filled ? medal.color : 'none'} />
                    ) : participant.placement ? (
                      <Text style={[styles.rankText, isWinner && styles.winnerRankText]}>#{participant.placement}</Text>
                    ) : (
                      <Text style={styles.rankText}>-</Text>
                    )}
                  </View>

                  <UserAvatar
                    profilePhotoUrl={participant.profile_photo_url}
                    username={participant.username}
                    size={32}
                    kitColors={participant.equipped_kit_colors}
                    showUsername={false}
                  />

                  <Text style={[styles.participantName, isWinner && styles.winnerName]}>
                    {participant.nickname}
                  </Text>

                  {isWinner && (
                    <View style={styles.winnerBadge}>
                      <Trophy size={10} color="#1E293B" fill="#1E293B" />
                    </View>
                  )}
                </View>

                <Text style={[styles.scoreText, isWinner && styles.winnerScore]}>
                  {formatScore(participant.score, item.scoring_type, {
                    unit: item.scoring_type === 'distance' ? item.distance_unit : item.weight_unit,
                    hits: participant.accuracy_hits,
                    attempts: participant.accuracy_attempts,
                    numerator: participant.ratio_numerator,
                    denominator: participant.ratio_denominator
                  })}
                </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderHouseSelector = () => {
    if (!selectedHouse) return null;

    return (
      <Pressable style={styles.houseSelectorButton} onPress={() => setShowHouseModal(true)}>
        <View style={styles.houseSelectorContent}>
          <Text style={styles.houseEmoji}>{selectedHouse.house_emoji}</Text>
          <View style={styles.houseInfo}>
            <Text style={styles.houseName}>{selectedHouse.name}</Text>
            <View style={styles.houseMetaRow}>
              <Crown size={12} color="#10B981" />
              <Text style={styles.houseMetaText}>{houseMasterName}</Text>
              <Users size={12} color="#64748B" style={{ marginLeft: 8 }} />
              <Text style={styles.houseMetaText}>{memberCount}</Text>
            </View>
          </View>
          <ChevronDown size={20} color="#94A3B8" />
        </View>
      </Pressable>
    );
  };

  const renderHouseModal = () => (
    <Modal
      visible={showHouseModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowHouseModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowHouseModal(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select House</Text>
            <Pressable onPress={() => setShowHouseModal(false)}>
              <X size={24} color="#94A3B8" />
            </Pressable>
          </View>
          {myHouses.map(house => (
            <Pressable
              key={house.id}
              style={[
                styles.houseModalItem,
                selectedHouseId === house.id && styles.houseModalItemSelected
              ]}
              onPress={() => {
                setSelectedHouseId(house.id);
                setShowHouseModal(false);
              }}
            >
              <Text style={styles.houseModalEmoji}>{house.house_emoji}</Text>
              <Text style={styles.houseModalName}>{house.name}</Text>
              {selectedHouseId === house.id && (
                <View style={styles.selectedIndicator} />
              )}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Trophy size={28} color="#10B981" />
          <Text style={styles.title}>Game History</Text>
        </View>
        {renderHouseSelector()}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : myHouses.length === 0 ? (
        <View style={styles.emptyState}>
          <Trophy size={64} color="#475569" />
          <Text style={styles.emptyTitle}>No Houses Yet</Text>
          <Text style={styles.emptyText}>
            Join or create a house to see game history
          </Text>
        </View>
      ) : gameHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Trophy size={64} color="#475569" />
          <Text style={styles.emptyTitle}>No Games Played</Text>
          <Text style={styles.emptyText}>
            Start playing games in this house to see history here
          </Text>
        </View>
      ) : (
        <FlatList
          data={gameHistory}
          renderItem={renderGameSession}
          keyExtractor={(item) => item.session_id}
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

      {renderHouseModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  houseSelectorButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  houseSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  houseEmoji: {
    fontSize: 40,
  },
  houseInfo: {
    flex: 1,
    gap: 4,
  },
  houseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  houseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  houseMetaText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
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
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 16,
  },
  gameCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#475569',
    overflow: 'hidden',
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  gameHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  gameEmoji: {
    fontSize: 28,
  },
  gameHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  gameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gameTime: {
    fontSize: 12,
    color: '#64748B',
  },
  participantsContainer: {
    padding: 8,
    gap: 6,
  },
  participantRowContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  winnerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    position: 'relative',
    zIndex: 1,
  },
  participantRowWinner: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  winnerRankText: {
    color: '#1E293B',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  winnerName: {
    color: '#1E293B',
    fontWeight: 'bold',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  winnerBadge: {
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    padding: 4,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'right',
  },
  winnerScore: {
    color: '#1E293B',
    fontSize: 18,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scoringTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scoringTypeEmoji: {
    fontSize: 14,
  },
  scoringTypeLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  houseModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  houseModalItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  houseModalEmoji: {
    fontSize: 32,
  },
  houseModalName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
});
