import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Minus, Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBadge } from '@/contexts/BadgeContext';
import UserAvatar from '@/components/UserAvatar';
import EnhancedPlayerCard from '@/components/EnhancedPlayerCard';
import WinnerCelebrationModal from '@/components/WinnerCelebrationModal';
import KitUnlockCelebration from '@/components/KitUnlockCelebration';
import { getScoringTypeConfig, determineWinner, formatScore, type ScoringType } from '@/constants/ScoringTypes';
import { ScoreInputTimer } from '@/components/ScoreInputTimer';
import { ScoreInputQuickTally } from '@/components/ScoreInputQuickTally';
import { ScoreInputMeasurement } from '@/components/ScoreInputMeasurement';
import { ScoreInputAccuracy } from '@/components/ScoreInputAccuracy';
import { ScoreInputAccuracySimple } from '@/components/ScoreInputAccuracySimple';
import { ScoreInputRatio } from '@/components/ScoreInputRatio';
import { ScoreInputPosition } from '@/components/ScoreInputPosition';
import { ScoreInputUnit } from '@/components/ScoreInputUnit';
import { type DistanceUnit, type WeightUnit } from '@/lib/unitConversions';

type Player = {
  id: string; // For UI reference (could be house_member id or temp id)
  user_id: string; // ALWAYS the actual user's UUID from auth.users
  nickname: string;
  score: number;
  accuracy_hits?: number;
  accuracy_attempts?: number;
  ratio_numerator?: number;
  ratio_denominator?: number;
  input_metadata?: any; // Stores displayValue, unit, etc. for distance/weight
};

type Winner = {
  id: string;
  nickname: string;
  score: number;
};

type PlayerCardProps = {
  player: Player;
  scoringType: ScoringType;
  scoringUnit: string;
  distanceUnit?: DistanceUnit;
  weightUnit?: WeightUnit;
  maxAttempts?: number;
  totalPlayers: number;
  onUpdateScore: (playerId: string, change: number) => void;
  onSetDirectScore: (playerId: string, score: number, metadata?: any) => void;
};

function PlayerCard({ player, scoringType, scoringUnit, distanceUnit, weightUnit, maxAttempts, totalPlayers, onUpdateScore, onSetDirectScore }: PlayerCardProps) {
  const scoringConfig = getScoringTypeConfig(scoringType);

  // Get the actual display unit based on the scoring type
  const getDisplayUnit = () => {
    if (scoringType === 'distance' && distanceUnit) {
      return distanceUnit;
    }
    if (scoringType === 'weight' && weightUnit) {
      return weightUnit;
    }
    return scoringConfig.unit;
  };

  const displayUnit = getDisplayUnit();

  const handleScoreChange = useCallback((newScore: number, metadata?: any) => {
    onSetDirectScore(player.id, newScore, metadata);
  }, [player.id, onSetDirectScore]);

  const renderScoreInput = () => {
    switch (scoringConfig.inputMode) {
      case 'timer':
        return (
          <ScoreInputTimer
            initialValue={player.score}
            unit={scoringConfig.unit}
            onValueChange={handleScoreChange}
            allowDecimals={scoringConfig.allowDecimals}
          />
        );
      case 'quick_tally':
        return (
          <ScoreInputQuickTally
            initialValue={player.score}
            unit={scoringConfig.unit}
            step={scoringConfig.step}
            allowDecimals={scoringConfig.allowDecimals}
            onValueChange={handleScoreChange}
          />
        );
      case 'accuracy_dual':
        if (maxAttempts && maxAttempts > 0) {
          return (
            <ScoreInputAccuracySimple
              initialHits={player.accuracy_hits || 0}
              maxAttempts={maxAttempts}
              onValueChange={(score, hits, attempts) => {
                handleScoreChange(score, { hits, attempts });
              }}
            />
          );
        }
        return (
          <ScoreInputAccuracy
            initialHits={player.accuracy_hits || 0}
            initialAttempts={player.accuracy_attempts || 0}
            onValueChange={(score, hits, attempts) => {
              handleScoreChange(score, { hits, attempts });
            }}
          />
        );
      case 'ratio_dual':
        return (
          <ScoreInputRatio
            initialNumerator={player.ratio_numerator || 0}
            initialDenominator={player.ratio_denominator || 1}
            onValueChange={(score, numerator, denominator) => {
              handleScoreChange(score, { numerator, denominator });
            }}
          />
        );
      case 'position_selector':
        return (
          <ScoreInputPosition
            initialPosition={player.score || 1}
            totalPlayers={totalPlayers}
            onValueChange={handleScoreChange}
          />
        );
      case 'unit_measurement':
        const unit = scoringType === 'distance' ? distanceUnit : weightUnit;
        return (
          <ScoreInputUnit
            initialValue={player.score}
            measurementType={scoringType === 'distance' ? 'distance' : 'weight'}
            unit={unit as any}
            allowDecimals={scoringConfig.allowDecimals}
            onValueChange={(canonical, display) => {
              handleScoreChange(canonical, { displayValue: display, unit });
            }}
          />
        );
      case 'measurement':
        return (
          <ScoreInputMeasurement
            initialValue={player.score}
            unit={scoringConfig.unit}
            allowDecimals={scoringConfig.allowDecimals}
            quickPresets={scoringConfig.quickPresets}
            onValueChange={handleScoreChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.playerCard}>
      <View style={styles.playerHeader}>
        <Text style={styles.playerName}>{player.nickname}</Text>
        <View style={styles.scoringTypeIndicator}>
          <Text style={styles.scoringEmoji}>{scoringConfig.emoji}</Text>
          <Text style={styles.scoringLabel}>{displayUnit}</Text>
        </View>
      </View>
      {renderScoreInput()}
    </View>
  );
}

export default function GameSessionScreen() {
  const { gameId, sessionId: existingSessionId } = useLocalSearchParams();
  const [game, setGame] = useState<any>(null);
  const [houseMembers, setHouseMembers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [invitationStatuses, setInvitationStatuses] = useState<Map<string, string>>(new Map());
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [houseCreatorId, setHouseCreatorId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isTie, setIsTie] = useState(false);
  const [badgeAwarded, setBadgeAwarded] = useState<{ name: string; icon: string } | undefined>();
  const [showKitUnlock, setShowKitUnlock] = useState(false);
  const [unlockedKit, setUnlockedKit] = useState<{ name: string; rarity: 'legendary' | 'mythic' } | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [scoringType, setScoringType] = useState<ScoringType>('points');
  const [scoringUnit, setScoringUnit] = useState<string>('points');
  const [lowerIsBetter, setLowerIsBetter] = useState<boolean>(false);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('meters');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [maxAttempts, setMaxAttempts] = useState<number>(10);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const { user } = useAuth();
  const { checkBadge } = useBadge();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Debounce timers to prevent database deadlocks
  const scoreUpdateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    fetchGameData();
  }, []);

  const checkInvitationStatus = useCallback(async () => {
    if (!sessionId) return;

    const { data: invites } = await supabase
      .from('game_invitations')
      .select('invitee_id, status')
      .eq('game_session_id', sessionId);

    if (invites) {
      // Update pending invitations
      setPendingInvitations(invites.filter(inv => inv.status === 'pending'));

      // Update invitation statuses map
      const statusMap = new Map<string, string>();
      invites.forEach(invite => {
        statusMap.set(invite.invitee_id, invite.status);
      });
      setInvitationStatuses(statusMap);

      console.log('[GAME SESSION] Invitation statuses updated:', Array.from(statusMap.entries()));
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to invitation changes
    const channel = supabase
      .channel(`invitations-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `game_session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[GAME SESSION] Invitation changed:', payload);
          checkInvitationStatus();
        }
      )
      .subscribe();

    checkInvitationStatus();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, checkInvitationStatus]);

  useFocusEffect(
    useCallback(() => {
      // Refetch game data when screen gains focus
      // This ensures removed friends don't appear in player list
      if (gameId && user) {
        fetchGameData();
      }
    }, [gameId, user])
  );

  const fetchGameData = async () => {
    if (!gameId || !user) return;

    const { data: gameData } = await supabase
      .from('games')
      .select('*, houses(id, name, creator_id)')
      .eq('id', gameId)
      .is('deleted_at', null)
      .maybeSingle();

    if (gameData) {
      setGame(gameData);
      setScoringType(gameData.scoring_type || 'points');
      setScoringUnit(gameData.scoring_unit || 'points');
      setLowerIsBetter(gameData.lower_is_better || false);
      setDistanceUnit(gameData.distance_unit || 'meters');
      setWeightUnit(gameData.weight_unit || 'kg');
      setMaxAttempts(gameData.max_attempts || 10);

      // Store house creator ID
      const creatorId = gameData.houses?.creator_id;
      setHouseCreatorId(creatorId);

      // Check if current user is admin or creator
      const isCreator = creatorId === user.id;

      // Check if user is an admin in house_members
      const { data: memberData } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', gameData.houses.id)
        .eq('user_id', user.id)
        .maybeSingle();

      const isMemberAdmin = memberData?.role === 'admin';
      const userIsAdmin = isCreator || isMemberAdmin;
      setIsUserAdmin(userIsAdmin);

      console.log('[GAME SESSION] Admin check:', { isCreator, isMemberAdmin, userIsAdmin });

      // Fetch current friendships with bidirectional validation
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          profiles!friendships_friend_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      if (friendshipsError) {
        console.error('[GAME SESSION] Error fetching friendships:', friendshipsError);
      }

      // Get blocked users to filter them out
      const { data: blockedUsers } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      const blockedIds = new Set(blockedUsers?.map(b => b.blocked_id) || []);

      // Add the creator to available players (needed for both branches)
      const [creatorHouseMemberResult, creatorSettingsResult, creatorProfileResult] = await Promise.all([
        supabase
          .from('house_members')
          .select('id, nickname, role')
          .eq('house_id', gameData.houses.id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_profile_settings')
          .select('display_name, equipped_house_kit_id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .maybeSingle()
      ]);

      const creatorHouseMember = creatorHouseMemberResult.data;
      const creatorSettings = creatorSettingsResult.data;
      const creatorProfile = creatorProfileResult.data;
      const creatorIsAdmin = creatorHouseMember?.role === 'admin' || user.id === creatorId;

      const creatorPlayer = {
        id: creatorHouseMember?.id || `friend-${user.id}`,
        user_id: user.id,
        nickname: creatorHouseMember?.nickname || creatorSettings?.display_name || creatorProfile?.username || 'You',
        username: creatorProfile?.username || 'You',
        avatar_url: creatorProfile?.avatar_url || null,
        is_house_member: !!creatorHouseMember,
        is_admin: creatorIsAdmin,
        equipped_house_kit_id: creatorSettings?.equipped_house_kit_id || null,
      };

      if (friendships && friendships.length > 0) {
        // Verify bidirectional friendships (both users must have each other as friends)
        const friendIds = friendships.map(f => f.friend_id);
        const { data: reverseFriendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .in('user_id', friendIds)
          .eq('friend_id', user.id);

        // Create a Set of validated friend IDs (friends who also have you as a friend)
        const validFriendIds = new Set(
          reverseFriendships?.map(rf => rf.user_id) || []
        );

        // Filter to only include bidirectional friendships that aren't blocked
        const activeFriendships = friendships.filter(
          f => validFriendIds.has(f.friend_id) && !blockedIds.has(f.friend_id)
        );

        console.log('[GAME SESSION] Validated friendships:', {
          total: friendships.length,
          bidirectional: activeFriendships.length,
          blocked: blockedIds.size
        });

        const friendsWithSettings = await Promise.all(
          activeFriendships.map(async (f: any) => {
            const [settingsResult, houseMemberResult] = await Promise.all([
              supabase
                .from('user_profile_settings')
                .select('display_name, equipped_house_kit_id')
                .eq('user_id', f.friend_id)
                .maybeSingle(),
              supabase
                .from('house_members')
                .select('id, nickname, role')
                .eq('house_id', gameData.houses.id)
                .eq('user_id', f.friend_id)
                .maybeSingle()
            ]);

            const settings = settingsResult.data;
            const houseMember = houseMemberResult.data;
            const isAdmin = houseMember?.role === 'admin';
            const isCreator = f.friend_id === creatorId;

            return {
              id: houseMember?.id || `friend-${f.friend_id}`,
              user_id: f.friend_id,
              nickname: houseMember?.nickname || settings?.display_name || f.profiles?.username || 'Friend',
              username: f.profiles?.username || 'Friend',
              avatar_url: f.profiles?.avatar_url || null,
              is_house_member: !!houseMember,
              is_admin: isAdmin || isCreator,
              equipped_house_kit_id: settings?.equipped_house_kit_id || null,
            };
          })
        );

        const allPlayers = [creatorPlayer, ...friendsWithSettings];
        setFriends(allPlayers);
        setAvailablePlayers(allPlayers);

        // Auto-select the creator as a participant (they can add others but creator is always included)
        setSelectedPlayers([{
          id: creatorPlayer.user_id,
          user_id: creatorPlayer.user_id,
          nickname: creatorPlayer.nickname,
          score: 0,
        }]);

        // Check for existing pending or active game session for this game
        await loadExistingSession(gameData.houses.id, allPlayers);
      } else {
        // No friends, but still check for existing session
        // Auto-select the creator even if they have no friends
        setSelectedPlayers([{
          id: creatorPlayer.user_id,
          user_id: creatorPlayer.user_id,
          nickname: creatorPlayer.nickname,
          score: 0,
        }]);
        await loadExistingSession(gameData.houses.id, [creatorPlayer]);
      }
    }

    setLoading(false);
  };

  const loadExistingSession = async (houseId: string, allPlayers: any[]) => {
    if (!user || !gameId) return;

    // If we have an existingSessionId from URL params, use that
    let session: any = null;

    if (existingSessionId && typeof existingSessionId === 'string') {
      const { data: specificSession } = await supabase
        .from('game_sessions')
        .select('id, status')
        .eq('id', existingSessionId)
        .maybeSingle();

      if (specificSession) {
        session = specificSession;
        console.log('[GAME SESSION] Loading specific session from URL:', session.id);
      }
    }

    // Otherwise, check for existing pending or active game session for this game
    if (!session) {
      const { data: existingSessions } = await supabase
        .from('game_sessions')
        .select('id, status')
        .eq('game_id', gameId)
        .eq('created_by', user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingSessions && existingSessions.length > 0) {
        session = existingSessions[0];
      }
    }

    if (session) {
      console.log('[GAME SESSION] Found existing session:', session.id, 'Status:', session.status);
      setSessionId(session.id);

      // Load invitation data for this session
      const { data: invitations } = await supabase
        .from('game_invitations')
        .select(`
          id,
          invitee_id,
          status,
          profiles!game_invitations_invitee_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('game_session_id', session.id);

      if (invitations && invitations.length > 0) {
        console.log('[GAME SESSION] Loaded invitations:', invitations);
        setPendingInvitations(invitations);

        // Build invitation statuses map
        const statusMap = new Map<string, string>();
        invitations.forEach(invite => {
          statusMap.set(invite.invitee_id, invite.status);
        });
        setInvitationStatuses(statusMap);
      }

      // Load all players (both house members and invited) for this session
      const { data: sessionScores } = await supabase
        .from('session_scores')
        .select('user_id, score, accuracy_hits, accuracy_attempts, ratio_numerator, ratio_denominator')
        .eq('session_id', session.id);

      // Build a Set of all unique player IDs (from scores + invitations)
      const allPlayerIds = new Set<string>();

      // Add players who have score entries
      sessionScores?.forEach(score => allPlayerIds.add(score.user_id));

      // Add invited players who may not have scores yet
      invitations?.forEach(invite => allPlayerIds.add(invite.invitee_id));

      if (allPlayerIds.size > 0) {
        const players = await Promise.all(
          Array.from(allPlayerIds).map(async (userId) => {
            const score = sessionScores?.find(s => s.user_id === userId);
            const playerData = allPlayers.find(p => p.user_id === userId);

            // If player data not in allPlayers, fetch it
            if (!playerData) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .maybeSingle();

              const { data: settings } = await supabase
                .from('user_profile_settings')
                .select('display_name')
                .eq('user_id', userId)
                .maybeSingle();

              return {
                id: userId,
                user_id: userId,
                nickname: settings?.display_name || profile?.username || 'Player',
                score: score?.score || 0,
                accuracy_hits: score?.accuracy_hits,
                accuracy_attempts: score?.accuracy_attempts,
                ratio_numerator: score?.ratio_numerator,
                ratio_denominator: score?.ratio_denominator,
              };
            }

            return {
              id: userId,
              user_id: userId,
              nickname: playerData.nickname || 'Player',
              score: score?.score || 0,
              accuracy_hits: score?.accuracy_hits,
              accuracy_attempts: score?.accuracy_attempts,
              ratio_numerator: score?.ratio_numerator,
              ratio_denominator: score?.ratio_denominator,
            };
          })
        );
        setSelectedPlayers(players);
        console.log('[GAME SESSION] Loaded session players (scores + invites):', players);
      }

      // Check if game has started (status is active)
      if (session.status === 'active') {
        setGameStarted(true);
      }
    }
  };

  const togglePlayer = (member: any) => {
    const existingPlayer = selectedPlayers.find((p) => p.user_id === member.user_id);
    if (existingPlayer) {
      // Prevent creator from being deselected - they must always be included
      if (member.user_id === user?.id) {
        console.log('[GAME SESSION] Cannot deselect creator - they must always be included');
        return;
      }
      setSelectedPlayers(selectedPlayers.filter((p) => p.user_id !== member.user_id));
    } else {
      setSelectedPlayers([
        ...selectedPlayers,
        // ALWAYS use user_id for both id and user_id to ensure consistency
        // id field is used for UI operations, user_id for database operations
        { id: member.user_id, user_id: member.user_id, nickname: member.nickname, score: 0 },
      ]);
    }
  };

  const startGame = async () => {
    try {
      console.log('[GAME SESSION] Start game button pressed');

      if (!user) {
        console.error('[GAME SESSION] No authenticated user');
        return;
      }

      if (selectedPlayers.length < 1) {
        console.log('[GAME SESSION] No players selected');
        return;
      }

      // Validate all players have user_id
      const invalidPlayers = selectedPlayers.filter(p => !p.user_id);
      if (invalidPlayers.length > 0) {
        console.error('[GAME SESSION] Invalid players without user_id:', invalidPlayers);
        return;
      }

      console.log('[GAME SESSION] Starting game with', selectedPlayers.length, 'player(s):', selectedPlayers);
      setLoading(true);

      console.log('[GAME SESSION] Creating game session...');

      // Separate house members from non-members to determine initial status
      // IMPORTANT: Always treat the game creator (admin) as a house member
      const houseMemberIds = selectedPlayers
        .filter(p => {
          const isCreator = p.user_id === user.id;
          const isHouseMember = availablePlayers.find(ap => ap.user_id === p.user_id)?.is_house_member;
          return isCreator || isHouseMember;
        })
        .map(p => p.user_id);

      const nonMemberIds = selectedPlayers
        .filter(p => !houseMemberIds.includes(p.user_id))
        .map(p => p.user_id);

      // Set status to 'pending' if there are non-members who need to accept invitations
      const initialStatus = nonMemberIds.length > 0 ? 'pending' : 'active';

      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          game_id: gameId,
          house_id: game.houses.id,
          status: initialStatus,
          created_by: user?.id,
          is_solo_game: selectedPlayers.length === 1,
        })
        .select()
        .single();

      if (error || !session) {
        console.error('[GAME SESSION] Error creating game session:', error);
        setLoading(false);
        return;
      }

      console.log('[GAME SESSION] Session created:', session.id, 'Status:', initialStatus);
      setSessionId(session.id);

      // IMPORTANT: Only create score entries when game actually starts (status = 'active')
      // Do NOT create scores during 'pending' status - they will be created when game starts
      if (initialStatus === 'active' && houseMemberIds.length > 0) {
        const scoreInserts = houseMemberIds.map((userId) => ({
          session_id: session.id,
          user_id: userId,
          score: 0,
          is_winner: false,
        }));

        console.log('[GAME SESSION] Creating score entries for house members (game starting immediately)...');
        const { error: scoresError } = await supabase.from('session_scores').insert(scoreInserts);

        if (scoresError) {
          console.error('[GAME SESSION] Error creating scores:', scoresError);
        }
      } else {
        console.log('[GAME SESSION] Skipping score creation - game status is pending, scores will be created when game starts');
      }

      // Create invitations for non-members
      if (nonMemberIds.length > 0) {
        const invitations = nonMemberIds.map((playerId) => ({
          inviter_id: user.id,
          invitee_id: playerId,
          house_id: game.houses.id,
          game_id: gameId,
          game_session_id: session.id,
          status: 'pending',
        }));

        console.log('[GAME SESSION] Creating invitations for non-members...');
        const { data: createdInvites, error: inviteError } = await supabase
          .from('game_invitations')
          .insert(invitations)
          .select();

        if (inviteError) {
          console.error('[GAME SESSION] Error creating invitations:', inviteError);
        } else {
          console.log('[GAME SESSION] Invitations sent to', nonMemberIds.length, 'players');
          setPendingInvitations(createdInvites || []);

          const initialStatuses = new Map();
          createdInvites?.forEach(invite => {
            initialStatuses.set(invite.invitee_id, 'pending');
          });
          setInvitationStatuses(initialStatuses);

          console.log('[GAME SESSION] Game invitations created successfully for house:', game.houses.name);
        }
      }

      // If all players are house members (no invitations), start game immediately
      if (initialStatus === 'active') {
        console.log('[GAME SESSION] All players are house members, starting game immediately...');
        setGameStarted(true);
        setLoading(false);
        return;
      }

      console.log('[GAME SESSION] Invitations created, waiting for acceptance...');
      setGameStarted(false);
      setLoading(false);

      // Set up realtime subscription for invitation responses
      const channel = supabase
        .channel(`game-invitations-${session.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_invitations',
            filter: `game_session_id=eq.${session.id}`
          },
          (payload) => {
            console.log('[GAME SESSION] Invitation updated:', payload);
            const updated = payload.new as any;

            setInvitationStatuses(prev => {
              const newMap = new Map(prev);
              newMap.set(updated.invitee_id, updated.status);
              return newMap;
            });

            setPendingInvitations(prev =>
              prev.map(invite =>
                invite.id === updated.id ? updated : invite
              )
            );

            // If someone accepted, add them to session_scores
            if (updated.status === 'accepted') {
              supabase
                .from('session_scores')
                .insert({
                  session_id: session.id,
                  user_id: updated.invitee_id,
                  score: 0,
                  is_winner: false,
                })
                .then(({ error }) => {
                  if (error) {
                    console.error('[GAME SESSION] Error adding accepted player to scores:', error);
                  }
                });
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } catch (err) {
      console.error('[GAME SESSION] Unexpected error starting game:', err);
      setLoading(false);
    }
  };

  const updateScore = useCallback(async (playerId: string, change: number) => {
    try {
      console.log('[GAME SESSION] Updating score for player:', playerId, 'change:', change);
      const scoringConfig = getScoringTypeConfig(scoringType);

      setSelectedPlayers((players) =>
        players.map((p) => {
          if (p.id === playerId) {
            const newScore = p.score + (change * scoringConfig.step);
            return { ...p, score: Math.max(0, newScore) };
          }
          return p;
        })
      );

      if (sessionId) {
        const player = selectedPlayers.find((p) => p.id === playerId);
        if (player) {
          const newScore = Math.max(0, player.score + (change * scoringConfig.step));
          console.log('[GAME SESSION] New score:', newScore, 'for user_id:', player.user_id);

          // Use UPSERT to avoid conflicts
          const { error } = await supabase
            .from('session_scores')
            .upsert({
              session_id: sessionId,
              user_id: player.user_id,
              score: newScore
            }, {
              onConflict: 'session_id,user_id'
            });

          if (error) {
            console.error('[GAME SESSION] Error updating score in database:', error);
          } else {
            console.log('[GAME SESSION] Score updated successfully in database');
          }
        }
      }
    } catch (err) {
      console.error('[GAME SESSION] Unexpected error updating score:', err);
    }
  }, [sessionId, scoringType, selectedPlayers]);

  const setDirectScore = useCallback(async (playerId: string, newScore: number, metadata?: any) => {
    try {
      console.log('[GAME SESSION] Setting direct score for player:', playerId, 'score:', newScore, 'metadata:', metadata);

      // Update UI immediately for responsive feel
      setSelectedPlayers((players) =>
        players.map((p) => {
          if (p.id === playerId) {
            const updated: Player = { ...p, score: Math.max(0, newScore) };
            if (metadata?.hits !== undefined) updated.accuracy_hits = metadata.hits;
            if (metadata?.attempts !== undefined) updated.accuracy_attempts = metadata.attempts;
            if (metadata?.numerator !== undefined) updated.ratio_numerator = metadata.numerator;
            if (metadata?.denominator !== undefined) updated.ratio_denominator = metadata.denominator;
            // Store input_metadata for distance/weight units
            if (metadata?.displayValue !== undefined || metadata?.unit !== undefined) {
              updated.input_metadata = { displayValue: metadata.displayValue, unit: metadata.unit };
            }
            return updated;
          }
          return p;
        })
      );

      if (sessionId) {
        // Clear existing timer for this player
        const existingTimer = scoreUpdateTimersRef.current.get(playerId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Store update data for batching
        const updateData: any = {
          score: Math.max(0, newScore),
          session_id: sessionId
        };
        if (metadata?.hits !== undefined) updateData.accuracy_hits = metadata.hits;
        if (metadata?.attempts !== undefined) updateData.accuracy_attempts = metadata.attempts;
        if (metadata?.numerator !== undefined) updateData.ratio_numerator = metadata.numerator;
        if (metadata?.denominator !== undefined) updateData.ratio_denominator = metadata.denominator;
        if (metadata?.displayValue !== undefined || metadata?.unit !== undefined) {
          updateData.input_metadata = { displayValue: metadata.displayValue, unit: metadata.unit };
        }

        pendingUpdatesRef.current.set(playerId, updateData);

        // Debounce database update to prevent deadlocks (500ms delay)
        const timer = setTimeout(async () => {
          const pendingUpdate = pendingUpdatesRef.current.get(playerId);
          if (!pendingUpdate) return;

          // Find current player data
          const player = selectedPlayers.find((p) => p.id === playerId);
          if (!player) {
            console.error('[GAME SESSION] Player not found for id:', playerId);
            pendingUpdatesRef.current.delete(playerId);
            scoreUpdateTimersRef.current.delete(playerId);
            return;
          }

          pendingUpdate.user_id = player.user_id;

          // Use UPSERT to avoid conflicts
          const { error } = await supabase
            .from('session_scores')
            .upsert(pendingUpdate, {
              onConflict: 'session_id,user_id'
            });

          if (error) {
            console.error('[GAME SESSION] Error updating score in database:', error);
            // Retry once on deadlock
            if (error.code === '40P01') {
              console.log('[GAME SESSION] Deadlock detected, retrying in 1s...');
              setTimeout(async () => {
                const { error: retryError } = await supabase
                  .from('session_scores')
                  .upsert(pendingUpdate, {
                    onConflict: 'session_id,user_id'
                  });
                if (retryError) {
                  console.error('[GAME SESSION] Retry failed:', retryError);
                }
              }, 1000);
            }
          } else {
            console.log('[GAME SESSION] Score updated successfully');
          }

          pendingUpdatesRef.current.delete(playerId);
          scoreUpdateTimersRef.current.delete(playerId);
        }, 500);

        scoreUpdateTimersRef.current.set(playerId, timer);
      }
    } catch (err) {
      console.error('[GAME SESSION] Unexpected error setting score:', err);
    }
  }, [sessionId, selectedPlayers]);

  const handleEndGamePress = () => {
    setShowEndGameConfirm(true);
  };

  const endGame = async () => {
    setShowEndGameConfirm(false);
    try {
      console.log('[GAME SESSION] End game button pressed');

      if (!sessionId) {
        console.log('[GAME SESSION] No session ID, navigating back');
        router.back();
        return;
      }

      setLoading(true);
      console.log('[GAME SESSION] Finalizing game results...');

      // Use determineWinner which respects lowerIsBetter
      // CRITICAL: Use user_id for winner determination to match database records
      const winnerIds = determineWinner(
        selectedPlayers.map(p => ({ id: p.user_id, score: p.score })),
        scoringType,
        lowerIsBetter
      );

      const gameWinners = selectedPlayers.filter(p => winnerIds.includes(p.user_id));
      const isSoloGame = selectedPlayers.length === 1;
      const soloPlayerHasScore = isSoloGame && gameWinners.length > 0;
      const isGameTie = !isSoloGame && gameWinners.length > 1;

      // Sort players based on lowerIsBetter for placement
      const sortedPlayers = [...selectedPlayers].sort((a, b) => {
        if (lowerIsBetter) {
          return a.score - b.score;
        }
        return b.score - a.score;
      });

      const winningScore = sortedPlayers[0]?.score || 0;

      console.log('[GAME SESSION] Final standings:', sortedPlayers.map(p => `${p.nickname}: ${p.score}`));
      console.log('[GAME SESSION] Winners:', gameWinners.map(w => w.nickname).join(', '));
      console.log('[GAME SESSION] Scoring type:', scoringType, 'Lower is better:', lowerIsBetter);

      if (isSoloGame) {
        if (soloPlayerHasScore) {
          console.log('[GAME SESSION] SOLO GAME - Player wins with', winningScore, scoringUnit);
        } else {
          console.log('[GAME SESSION] SOLO GAME - No winner (score is 0)');
        }
      } else if (isGameTie) {
        console.log('[GAME SESSION] TIE GAME - Multiple winners with', winningScore, scoringUnit);
      }

      // Prepare player data for atomic completion
      // Validate all players have user_id before proceeding
      const invalidPlayers = selectedPlayers.filter(p => !p.user_id);
      if (invalidPlayers.length > 0) {
        console.error('[GAME SESSION] Cannot complete game - players missing user_id:', invalidPlayers);
        setLoading(false);
        return;
      }

      const playersData = selectedPlayers.map(player => ({
        user_id: player.user_id,
        score: player.score,
        accuracy_hits: player.accuracy_hits,
        accuracy_attempts: player.accuracy_attempts,
        ratio_numerator: player.ratio_numerator,
        ratio_denominator: player.ratio_denominator,
        input_metadata: player.input_metadata || {}
      }));

      console.log('[GAME SESSION] Atomically completing game session with players:', playersData.map(p => ({ user_id: p.user_id, score: p.score })));

      // Use atomic function to complete game - all scores updated and session marked complete in one transaction
      const { data: completionResult, error: completionError } = await supabase.rpc('complete_game_session', {
        p_session_id: sessionId,
        p_players: playersData
      });

      if (completionError) {
        console.error('[GAME SESSION] RPC Error ending game:', completionError);
        setLoading(false);
        return;
      }

      if (!completionResult || !completionResult.success) {
        console.error('[GAME SESSION] Function returned error:', completionResult?.error || 'Unknown error');
        setLoading(false);
        return;
      }

      console.log('[GAME SESSION] Game completed successfully:', completionResult);

      // OPTIMIZED: Run badge checks in parallel instead of sequentially
      for (const winner of gameWinners) {
        if (winner.id === user?.id) {
          console.log('[GAME SESSION] Current user won! Checking badges...');
          await Promise.all([
            checkBadge('first_win'),
            checkBadge('five_wins'),
            checkBadge('ten_wins'),
            checkBadge('twenty_five_wins'),
            checkBadge('fifty_wins')
          ]);
        }
      }

      // OPTIMIZED: Check for kit unlocks in parallel (non-blocking)
      if (user) {
        try {
          console.log('[GAME SESSION] Checking for kit unlocks...');

          const currentUserWon = gameWinners.some(w => w.user_id === user.id);

          // Run both checks in parallel
          const checks = [
            supabase.rpc('check_chance_based_kit_unlock', {
              p_user_id: user.id,
              p_condition: 'game_finish',
            })
          ];

          // Only check mythic if user won
          if (currentUserWon) {
            checks.push(
              supabase.rpc('check_chance_based_kit_unlock', {
                p_user_id: user.id,
                p_condition: 'game_win',
              })
            );
          }

          const results = await Promise.all(checks);

          // Check legendary unlock (first result)
          const { data: legendaryUnlock, error: legendaryError } = results[0];
          if (!legendaryError && legendaryUnlock && Array.isArray(legendaryUnlock) && legendaryUnlock.length > 0 && legendaryUnlock[0].unlocked) {
            console.log('[GAME SESSION] Legendary kit unlocked!', legendaryUnlock[0]);
            setUnlockedKit({
              name: legendaryUnlock[0].kit_name,
              rarity: 'legendary'
            });
            setShowKitUnlock(true);
            return;
          }

          // Check mythic unlock (second result, if checked)
          if (currentUserWon && results[1]) {
            const { data: mythicUnlock, error: mythicError } = results[1];
            if (!mythicError && mythicUnlock && Array.isArray(mythicUnlock) && mythicUnlock.length > 0 && mythicUnlock[0].unlocked) {
              console.log('[GAME SESSION] Mythic kit unlocked!', mythicUnlock[0]);
              setUnlockedKit({
                name: mythicUnlock[0].kit_name,
                rarity: 'mythic'
              });
              setShowKitUnlock(true);
              return;
            }
          }
        } catch (kitUnlockError) {
          console.error('[GAME SESSION] Kit unlock check failed, continuing game completion:', kitUnlockError);
          // Don't block game completion if kit unlock check fails
        }
      }

      setWinners(gameWinners);
      setIsTie(isGameTie);
      setLoading(false);
      setShowCelebration(true);
    } catch (err) {
      console.error('[GAME SESSION] Unexpected error ending game:', err);
      setLoading(false);
      router.back();
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  const handleKitUnlockClose = () => {
    setShowKitUnlock(false);
    setUnlockedKit(null);
    // Show winner celebration after kit unlock
    setWinners(winners);
    setIsTie(isTie);
    setLoading(false);
    setShowCelebration(true);
  };

  const cancelGame = async () => {
    try {
      console.log('[GAME SESSION] Cancel game button pressed');

      if (sessionId) {
        console.log('[GAME SESSION] Marking session as cancelled...');
        const { error } = await supabase
          .from('game_sessions')
          .update({ status: 'cancelled' })
          .eq('id', sessionId);

        if (error) {
          console.error('[GAME SESSION] Error cancelling game:', error);
        } else {
          console.log('[GAME SESSION] Game cancelled successfully');
        }
      }

      console.log('[GAME SESSION] Navigating back after cancel...');
      router.back();
    } catch (err) {
      console.error('[GAME SESSION] Unexpected error cancelling game:', err);
      router.back();
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <PlayerCard
      player={item}
      scoringType={scoringType}
      scoringUnit={scoringUnit}
      distanceUnit={distanceUnit}
      weightUnit={weightUnit}
      maxAttempts={maxAttempts}
      totalPlayers={selectedPlayers.length}
      onUpdateScore={updateScore}
      onSetDirectScore={setDirectScore}
    />
  );

  const allInvitationsAccepted = () => {
    // If no session ID or no players selected, can't start
    if (!sessionId || selectedPlayers.length === 0) return false;

    // If no invitations were sent (all house members including creator), can start immediately
    if (invitationStatuses.size === 0) return true;

    // Check if all pending invitations have been responded to with acceptance
    // Only check players who actually have invitation status (non-members)
    const pendingInvites = Array.from(invitationStatuses.values()).filter(status => status === 'pending');
    const declinedInvites = Array.from(invitationStatuses.values()).filter(status => status === 'declined');

    // Can't start if anyone declined or still pending
    return pendingInvites.length === 0 && declinedInvites.length === 0;
  };

  const getInvitationStatusText = () => {
    // Count admins as auto-accepted
    const adminCount = selectedPlayers.filter(p => {
      const playerInfo = availablePlayers.find(ap => ap.user_id === p.id);
      return p.id === user?.id || playerInfo?.is_admin;
    }).length;

    const pending = Array.from(invitationStatuses.values()).filter(status => status === 'pending').length;
    const accepted = Array.from(invitationStatuses.values()).filter(status => status === 'accepted').length;
    const declined = Array.from(invitationStatuses.values()).filter(status => status === 'declined').length;
    const totalInvites = invitationStatuses.size;
    const totalAccepted = accepted + adminCount;

    // No external invitations - all house members/admins
    if (totalInvites === 0) {
      return `All players are ready! Press "Begin Game" to start`;
    }

    // All invitations responded and none declined
    if (pending === 0 && declined === 0 && accepted > 0) {
      return `All players accepted! Press "Begin Game" to start`;
    }

    // Some declined
    if (declined > 0) {
      return `Cannot start: ${declined} player${declined > 1 ? 's' : ''} declined`;
    }

    return `Waiting for responses: ${totalAccepted} accepted, ${pending} pending`;
  };

  const beginGameplay = async () => {
    console.log('[GAME SESSION] Beginning gameplay...');

    if (!sessionId) {
      console.error('[GAME SESSION] No session ID - cannot begin');
      return;
    }

    // Get all selected players who should have scores
    // Filter out any declined invitations
    const acceptedPlayerIds = selectedPlayers
      .filter(p => {
        const inviteStatus = invitationStatuses.get(p.id);
        // Include if: no invite status (house member) OR invite was accepted
        return !inviteStatus || inviteStatus === 'accepted';
      })
      .map(p => p.id);

    console.log('[GAME SESSION] Creating score entries for', acceptedPlayerIds.length, 'players');

    // Create score entries for all active players
    if (acceptedPlayerIds.length > 0) {
      const scoreInserts = acceptedPlayerIds.map((playerId) => ({
        session_id: sessionId,
        user_id: playerId,
        score: 0,
        is_winner: false,
      }));

      const { error: scoresError } = await supabase
        .from('session_scores')
        .insert(scoreInserts)
        .select();

      if (scoresError) {
        // If error is duplicate, that's okay - scores already exist
        if (scoresError.code !== '23505') {
          console.error('[GAME SESSION] Error creating scores:', scoresError);
        } else {
          console.log('[GAME SESSION] Scores already exist, continuing...');
        }
      } else {
        console.log('[GAME SESSION] Score entries created successfully');
      }
    }

    // Update game session status from pending to active
    const { error } = await supabase
      .from('game_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('[GAME SESSION] Error updating session status:', error);
    } else {
      console.log('[GAME SESSION] Session status updated to active');
    }

    setGameStarted(true);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>{game?.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      {!gameStarted ? (
        <View style={styles.setup}>
          {!sessionId ? (
            <>
              <Text style={styles.setupTitle}>Select Players</Text>
              <Text style={styles.setupSubtitle}>
                Choose players for this game. Tap to select or deselect.
              </Text>
              <FlatList
                data={availablePlayers}
                renderItem={({ item }) => (
                  <EnhancedPlayerCard
                    key={`${item.user_id}-${refreshKey}`}
                    userId={item.user_id}
                    nickname={item.nickname}
                    isSelected={!!selectedPlayers.find((p) => p.user_id === item.user_id)}
                    isCreator={item.user_id === user?.id}
                    onPress={() => togglePlayer(item)}
                  />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.membersList}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No friends available</Text>
                    <Text style={styles.emptyStateSubtext}>Add friends to play with them!</Text>
                  </View>
                }
              />
              <Pressable
                style={[
                  styles.startButton,
                  selectedPlayers.length < 1 && styles.buttonDisabled,
                  { bottom: Math.max(insets.bottom, 16) + 8 }
                ]}
                onPress={startGame}
                disabled={selectedPlayers.length < 1}
              >
                <Text style={styles.buttonText}>
                  {(() => {
                    if (selectedPlayers.length === 0) return 'Select at least 1 player';
                    if (selectedPlayers.length === 1) return 'Start Solo Game';

                    // Check if any non-members are selected
                    const nonMembers = selectedPlayers.filter(p => {
                      const isCreator = p.id === user?.id;
                      const isHouseMember = availablePlayers.find(ap => ap.user_id === p.id)?.is_house_member;
                      return !isCreator && !isHouseMember;
                    });

                    if (nonMembers.length === 0) {
                      return `Start Game (${selectedPlayers.length} players)`;
                    }

                    return `Send Invitations (${nonMembers.length} invite${nonMembers.length > 1 ? 's' : ''})`;
                  })()}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.setupTitle}>Waiting for Players</Text>
              <Text style={styles.setupSubtitle}>
                {getInvitationStatusText()}
              </Text>

              <View style={styles.invitationsList}>
                {selectedPlayers.map((player) => {
                  const status = invitationStatuses.get(player.user_id);
                  const playerInfo = availablePlayers.find(p => p.user_id === player.user_id);
                  const isCreator = player.user_id === user?.id;
                  const isHouseMember = playerInfo?.is_house_member;
                  const isPlayerAdmin = playerInfo?.is_admin || false;
                  // Admins (including house creator) are always auto-approved
                  const isAutoApproved = isCreator || isPlayerAdmin || (isHouseMember && status === undefined);

                  return (
                    <View key={player.id} style={styles.invitationCard}>
                      <View style={styles.invitationPlayerInfo}>
                        <UserAvatar userId={player.user_id} size={40} showUsername={false} />
                        <View>
                          <Text style={styles.invitationPlayerName}>{player.nickname}</Text>
                          {isCreator && <Text style={styles.playerRoleText}>Creator</Text>}
                          {!isCreator && isPlayerAdmin && (
                            <Text style={styles.playerRoleText}>Admin</Text>
                          )}
                          {!isCreator && !isPlayerAdmin && isHouseMember && status === undefined && (
                            <Text style={styles.playerRoleText}>House Member</Text>
                          )}
                        </View>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        (isAutoApproved || status === 'accepted') && styles.statusAccepted,
                        (status === 'pending' || (!isAutoApproved && status === undefined)) && styles.statusPending,
                        status === 'declined' && styles.statusDeclined,
                      ]}>
                        <Text style={styles.statusText}>
                          {isAutoApproved ? 'Ready' : status === 'accepted' ? 'Accepted' : status === 'declined' ? 'Declined' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {isUserAdmin ? (
                <Pressable
                  style={[
                    styles.startButton,
                    !allInvitationsAccepted() && styles.buttonDisabled,
                    { bottom: Math.max(insets.bottom, 16) + 8 }
                  ]}
                  onPress={beginGameplay}
                  disabled={!allInvitationsAccepted()}
                >
                  <Text style={styles.buttonText}>
                    {allInvitationsAccepted() ? 'Begin Game' : 'Waiting for players to accept...'}
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.startButton, styles.buttonDisabled, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
                  <Text style={styles.buttonText}>
                    Waiting for admin to start the game...
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.gameplay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <FlatList
            data={selectedPlayers}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.playersList}
          />
          <View style={[styles.actions, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
            <Pressable style={styles.cancelButton} onPress={cancelGame}>
              <X size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.endButton} onPress={handleEndGamePress}>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>End Game</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal
        visible={showEndGameConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndGameConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>End Game?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to end this game? Final scores will be saved and this action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setShowEndGameConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmEndButton}
                onPress={endGame}
              >
                <Text style={styles.confirmEndText}>End Game</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {unlockedKit && (
        <KitUnlockCelebration
          visible={showKitUnlock}
          kitName={unlockedKit.name}
          kitRarity={unlockedKit.rarity}
          onClose={handleKitUnlockClose}
        />
      )}

      <WinnerCelebrationModal
        visible={showCelebration}
        winners={winners}
        isTie={isTie}
        onClose={handleCelebrationClose}
        badgeAwarded={badgeAwarded}
      />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  setup: {
    flex: 1,
    padding: 24,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  membersList: {
    gap: 16,
    paddingBottom: 120,
  },
  memberCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  memberCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#10B98120',
  },
  memberName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  startButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  gameplay: {
    flex: 1,
    padding: 16,
  },
  playersList: {
    gap: 12,
    paddingBottom: 90,
  },
  playerCard: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoringTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoringEmoji: {
    fontSize: 14,
  },
  scoringLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  scoreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10B981',
    minWidth: 80,
    textAlign: 'center',
  },
  scoreInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10B981',
    minWidth: 80,
    textAlign: 'center',
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  scoreUnit: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  actions: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModal: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmEndButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmEndText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  invitationsList: {
    flex: 1,
    paddingVertical: 16,
    gap: 12,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  invitationPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invitationPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerRoleText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusAccepted: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusPending: {
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusDeclined: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
