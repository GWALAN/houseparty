import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy, Users, Calendar, Medal, Crown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import Emoji3D from '@/components/Emoji3D';

type Participant = {
  user_id: string;
  nickname: string;
  username: string;
  score: number;
  placement: number | null;
  is_winner: boolean;
  accuracy_hits?: number | null;
  accuracy_attempts?: number | null;
  ratio_numerator?: number | null;
  ratio_denominator?: number | null;
  input_metadata?: any;
  profile_photo_url?: string | null;
  equipped_kit_colors?: string[] | null;
};

type GameSession = {
  session_id: string;
  game_id: string;
  game_name: string;
  game_emoji: string | null;
  game_type: string;
  completed_at: string;
  participants: Participant[];
  winner_id: string | null;
  winner_name: string | null;
};

export default function HouseHistoryScreen() {
  const { houseId } = useLocalSearchParams<{ houseId: string }>();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [houseName, setHouseName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!houseId || !user) return;
      fetchHouseHistory();
      fetchHouseName();

      // Subscribe to game session updates
      const sessionChannel = supabase
        .channel(`house-sessions-${houseId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_sessions',
            filter: `house_id=eq.${houseId}`
          },
          (payload) => {
            console.log('[HOUSE HISTORY] Session updated:', payload.eventType);
            if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
              fetchHouseHistory(false);
            }
          }
        )
        .subscribe();

      return () => {
        sessionChannel.unsubscribe();
      };
    }, [houseId, user])
  );

  const fetchHouseName = async () => {
    if (!houseId) return;

    const { data } = await supabase
      .from('houses')
      .select('name')
      .eq('id', houseId)
      .maybeSingle();

    if (data) {
      setHouseName(data.name);
    }
  };

  const fetchHouseHistory = async (showLoading = true) => {
    if (!user || !houseId) return;

    if (showLoading) setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_house_game_history', {
        house_id_param: houseId
      });

      if (error) {
        console.error('[HOUSE HISTORY] Error fetching history:', error);
        setSessions([]);
      } else if (data) {
        // Parse participants from JSONB
        const parsedSessions: GameSession[] = data.map((session: any) => ({
          ...session,
          participants: Array.isArray(session.participants)
            ? session.participants
            : [],
        }));
        setSessions(parsedSessions);
      }
    } catch (error) {
      console.error('[HOUSE HISTORY] Exception:', error);
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHouseHistory(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getMedalColor = (placement: number | null) => {
    if (placement === 1) return '#FFD700';
    if (placement === 2) return '#C0C0C0';
    if (placement === 3) return '#CD7F32';
    return '#64748B';
  };

  const renderParticipant = (participant: Participant, index: number) => {
    const isWinner = participant.is_winner;
    const isCurrentUser = participant.user_id === user?.id;
    const placement = participant.placement ?? (index + 1);

    return (
      <Pressable
        key={participant.user_id}
        style={[
          styles.participantRow,
          isCurrentUser && styles.currentUserRow
        ]}
        onPress={() => router.push(`/player-stats/${participant.user_id}`)}
      >
        <View style={styles.participantLeft}>
          {placement <= 3 ? (
            <Medal size={18} color={getMedalColor(placement)} fill={getMedalColor(placement)} />
          ) : (
            <Text style={styles.placementNumber}>{placement}</Text>
          )}

          <UserAvatar
            profilePhotoUrl={participant.profile_photo_url}
            username={participant.username}
            size={32}
            kitColors={participant.equipped_kit_colors}
          />

          <Text style={[styles.participantName, isCurrentUser && styles.currentUserText]} numberOfLines={1}>
            {participant.nickname}
          </Text>
        </View>

        <View style={styles.participantRight}>
          {isWinner && (
            <Crown size={16} color="#FFD700" fill="#FFD700" />
          )}
          <Text style={[styles.participantScore, isWinner && styles.winnerScore]}>
            {participant.accuracy_hits !== null && participant.accuracy_attempts !== null
              ? `${participant.accuracy_hits}/${participant.accuracy_attempts}`
              : participant.ratio_numerator !== null && participant.ratio_denominator !== null
              ? `${participant.ratio_numerator}:${participant.ratio_denominator}`
              : participant.score}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderSession = ({ item }: { item: GameSession }) => (
    <View style={styles.sessionCard}>
      <LinearGradient
        colors={['#1E293B', '#0F172A']}
        style={styles.sessionGradient}
      >
        {/* Header */}
        <View style={styles.sessionHeader}>
          <View style={styles.gameInfo}>
            {item.game_emoji && (
              <Emoji3D emoji={item.game_emoji} size="medium" />
            )}
            <View style={styles.gameTitleContainer}>
              <Text style={styles.gameName}>{item.game_name}</Text>
              <View style={styles.sessionMeta}>
                <Calendar size={12} color="#64748B" />
                <Text style={styles.sessionDate}>{formatDate(item.completed_at)}</Text>
                <Users size={12} color="#64748B" style={{ marginLeft: 8 }} />
                <Text style={styles.sessionDate}>{item.participants.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Winner Highlight */}
        {item.winner_name && (
          <View style={styles.winnerBanner}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.winnerGradient}
            >
              <Trophy size={16} color="#FFD700" fill="#FFD700" />
              <Text style={styles.winnerText}>
                <Text style={styles.winnerName}>{item.winner_name}</Text>
                <Text style={styles.winnerLabel}> won</Text>
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Participants List */}
        <View style={styles.participantsList}>
          {item.participants.length > 0 ? (
            item.participants.map((participant, index) =>
              renderParticipant(participant, index)
            )
          ) : (
            <Text style={styles.noParticipants}>No score data available</Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Game History</Text>
            {houseName && (
              <Text style={styles.subtitle}>{houseName}</Text>
            )}
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Content */}
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Trophy size={64} color="#475569" />
            <Text style={styles.emptyTitle}>No Games Played Yet</Text>
            <Text style={styles.emptyText}>
              Complete some games to see the history here
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSession}
            keyExtractor={(item) => item.session_id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#10B981"
                colors={['#10B981']}
              />
            }
          />
        )}
      </SafeAreaView>
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
    padding: 20,
    paddingTop: 12,
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
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
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
    gap: 16,
    paddingBottom: 40,
  },
  sessionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sessionGradient: {
    padding: 16,
  },
  sessionHeader: {
    marginBottom: 12,
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameEmoji: {
    fontSize: 32,
  },
  gameTitleContainer: {
    flex: 1,
    gap: 4,
  },
  gameName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionDate: {
    fontSize: 12,
    color: '#64748B',
  },
  winnerBanner: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  winnerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  winnerText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  winnerName: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  winnerLabel: {
    color: '#E2E8F0',
  },
  participantsList: {
    gap: 8,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  currentUserRow: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  participantLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 12,
    minWidth: 0,
  },
  placementNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    width: 18,
    textAlign: 'center',
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
    flexShrink: 1,
  },
  currentUserText: {
    color: '#10B981',
  },
  participantRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  participantScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'right',
  },
  winnerScore: {
    color: '#FFD700',
  },
  noParticipants: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    padding: 12,
  },
});
