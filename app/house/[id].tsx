import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Share, RefreshControl, Alert, Platform, StatusBar } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Users, Share2, Play, QrCode, Trash2, Settings, MoveVertical as MoreVertical, History, LogOut } from 'lucide-react-native';
import BannerRenderer from '@/components/BannerRenderer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import HouseLimitModal from '@/components/HouseLimitModal';
import { safeArrayFromColors, isLightGradient } from '@/lib/colorUtils';
import { useQueryClient } from '@tanstack/react-query';

type Game = {
  id: string;
  name: string;
  game_type: string;
};

type GameSession = {
  id: string;
  game_id: string;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
  games: {
    name: string;
    game_emoji?: string;
  };
  pending_count?: number;
  accepted_count?: number;
  declined_count?: number;
  total_invites?: number;
  invited_users?: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    status: 'pending' | 'accepted' | 'declined';
  }>;
};

type Member = {
  id: string;
  nickname: string;
  role: string;
};

export default function HouseDetailScreen() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [house, setHouse] = useState<any>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [themeColors, setThemeColors] = useState<string[]>(['#0F172A', '#1E293B']);
  const [kitRarity, setKitRarity] = useState<string | null>(null);
  const [kitName, setKitName] = useState<string | null>(null);
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Calculate text color dynamically based on theme colors
  const dynamicTextColor = React.useMemo(() => {
    return isLightGradient(themeColors) ? '#000000' : '#FFFFFF';
  }, [themeColors]);

  useFocusEffect(
    useCallback(() => {
      if (!id || !user) return;

      // ✅ Only fetch if data doesn't exist (not on every focus)
      if (!house) {
        fetchHouseData();
      }
      if (pendingInvitations.length === 0) {
        fetchPendingInvitations();
      }
      if (gameSessions.length === 0) {
        fetchGameSessions();
      }

      // Set up real-time subscription for house customizations
      const customizationChannel = supabase
        .channel(`house-customization-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'house_customizations',
            filter: `house_id=eq.${id}`
          },
          (payload) => {
            console.log('[HOUSE DETAIL] ✅ House customization changed, updating local state...');
            // ✅ Update local state directly instead of full refetch
            const customization = payload.new as any;
            setThemeColors(safeArrayFromColors(customization.custom_banner_colors) || ['#0F172A', '#1E293B']);
            setKitRarity(customization.rarity || null);

            // Update house object with new customization
            setHouse((prev: any) => prev ? {
              ...prev,
              house_customizations: customization
            } : prev);
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
          () => {
            console.log('[HOUSE DETAIL] Game invitation received, refreshing...');
            fetchPendingInvitations();
            fetchGameSessions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_invitations',
            filter: `inviter_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[HOUSE DETAIL] Game invitation status updated (as inviter):', payload.new);
            // Refresh game sessions to show updated accept/decline counts
            fetchGameSessions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_sessions',
            filter: `house_id=eq.${id}`
          },
          () => {
            console.log('[HOUSE DETAIL] Game session changed, refreshing...');
            fetchGameSessions();
          }
        )
        .subscribe();

      return () => {
        customizationChannel.unsubscribe();
      };
    }, [id, user])
  );

  const fetchHouseData = async (isRefreshing = false) => {
    if (!user || !id) {
      console.log('[HOUSE DETAIL] Missing user or house ID');
      return;
    }

    console.log('[HOUSE DETAIL] Fetching house data...', { houseId: id, userId: user.id, isRefreshing });

    if (!isRefreshing) setLoading(true);

    // OPTIMIZED: Fetch all data in parallel
    const [
      { data: houseData, error: houseError },
      { data: memberData, error: memberError },
      { data: gamesData, error: gamesError },
      { data: customization, error: customError }
    ] = await Promise.all([
      supabase.from('houses').select('*').eq('id', id).maybeSingle(),
      supabase.from('house_members').select('id, nickname, role, user_id').eq('house_id', id),
      supabase.from('games').select('*').eq('house_id', id).is('deleted_at', null),
      supabase.from('house_customizations').select(`
        theme_data,
        equipped_house_kit_id,
        applied_kit_id,
        kit_rarity,
        kit_color_scheme,
        custom_banner_colors,
        rarity
      `).eq('house_id', id).maybeSingle()
    ]);

    // Process house data
    if (houseError) {
      console.error('[HOUSE DETAIL] Error fetching house:', houseError);
    } else if (houseData) {
      console.log('[HOUSE DETAIL] House data loaded:', houseData.name);
      setHouse(houseData);
      const userIsCreator = houseData.creator_id === user?.id;
      console.log('[HOUSE DETAIL] Is creator:', userIsCreator);
      setIsCreator(userIsCreator);
    } else {
      console.log('[HOUSE DETAIL] No house found with ID:', id);
    }

    // Process members
    if (memberError) {
      console.error('[HOUSE DETAIL] Error fetching members:', memberError);
    } else if (memberData) {
      console.log('[HOUSE DETAIL] Members loaded:', memberData.length);
      setMembers(memberData);
      const currentMember = memberData.find((m: any) => m.user_id === user.id);
      const isUserAdmin = currentMember?.role === 'admin';
      console.log('[HOUSE DETAIL] User role:', currentMember?.role, 'Is admin:', isUserAdmin);
      setIsAdmin(isUserAdmin);
    }

    // Process games
    if (gamesError) {
      console.error('[HOUSE DETAIL] Error fetching games:', gamesError);
    } else if (gamesData) {
      console.log('[HOUSE DETAIL] Games loaded:', gamesData.length);
      setGames(gamesData);
    }

    // Process customization
    if (customError) {
      console.error('[HOUSE DETAIL] Error fetching customization:', customError);
    }

    // Handle kit details if needed
    let kitData = null;
    if (customization?.applied_kit_id) {
      const { data } = await supabase
        .from('house_kits')
        .select('name, color_scheme, rarity')
        .eq('id', customization.applied_kit_id)
        .maybeSingle();
      kitData = data;
    }

    // Set theme colors
    if (customization?.applied_kit_id) {
      const kitColors = safeArrayFromColors(customization.custom_banner_colors);
      const rarity = customization.rarity;

      if (kitColors && kitColors.length > 0) {
        console.log('[HOUSE DETAIL] House kit theme loaded:', kitColors, rarity, kitData?.name);
        setThemeColors(kitColors);
        setKitRarity(rarity || 'common');
        setKitName(kitData?.name || null);
      } else {
        console.log('[HOUSE DETAIL] Kit has no color scheme, using default');
        setThemeColors(['#0F172A', '#1E293B']);
        setKitRarity(null);
        setKitName(null);
      }
    } else if (customization?.equipped_house_kit_id) {
      const kitColors = safeArrayFromColors(customization.kit_color_scheme);
      const rarity = customization.kit_rarity;

      if (kitColors && kitColors.length > 0) {
        console.log('[HOUSE DETAIL] House kit theme loaded (legacy):', kitColors, rarity);
        setThemeColors(kitColors);
        setKitRarity(rarity || 'common');
        setKitName(null);
      } else {
        console.log('[HOUSE DETAIL] Kit has no color scheme, using default');
        setThemeColors(['#0F172A', '#1E293B']);
        setKitRarity(null);
        setKitName(null);
      }
    } else if (customization?.theme_data?.colors?.background) {
      const backgroundColors = safeArrayFromColors(customization.theme_data.colors.background);
      if (backgroundColors && backgroundColors.length > 0) {
        console.log('[HOUSE DETAIL] Theme loaded:', backgroundColors);
        setThemeColors(backgroundColors);
        setKitRarity(null);
        setKitName(null);
      } else {
        console.log('[HOUSE DETAIL] No valid theme colors, using default');
        setThemeColors(['#0F172A', '#1E293B']);
        setKitRarity(null);
        setKitName(null);
      }
    } else {
      console.log('[HOUSE DETAIL] No theme customization found, using default colors');
      setThemeColors(['#0F172A', '#1E293B']);
      setKitRarity(null);
      setKitName(null);
    }

    // Determine text color based on gradient brightness
    const finalColors = themeColors;
    const shouldUseDarkText = isLightGradient(finalColors);
    setTextColor(shouldUseDarkText ? '#000000' : '#FFFFFF');
    console.log('[HOUSE DETAIL] Text color set to:', shouldUseDarkText ? 'black' : 'white');

    console.log('[HOUSE DETAIL] Data fetch complete');
    setLoading(false);
    if (isRefreshing) setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHouseData(true);
  };

  const fetchPendingInvitations = async () => {
    if (!user || !id) {
      console.log('[HOUSE DETAIL] Cannot fetch invitations - missing user or house ID');
      return;
    }

    console.log('[HOUSE DETAIL] ===== FETCHING PENDING INVITATIONS =====');
    console.log('[HOUSE DETAIL] User ID:', user.id);
    console.log('[HOUSE DETAIL] House ID:', id);

    try {
      // Get all pending invitations for this user with game_sessions data
      const { data: invitations, error } = await supabase
        .from('game_invitations')
        .select(`
          id,
          game_session_id,
          inviter_id,
          status,
          created_at,
          profiles!game_invitations_inviter_id_fkey(
            username,
            avatar_url
          ),
          game_sessions(
            id,
            house_id,
            game_id
          )
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending');

      console.log('[HOUSE DETAIL] Raw invitations count:', invitations?.length || 0);
      console.log('[HOUSE DETAIL] Raw invitations data:', JSON.stringify(invitations, null, 2));
      console.log('[HOUSE DETAIL] Query error:', error);

      if (error) {
        console.error('[HOUSE DETAIL] Error fetching pending invitations:', error);
        return;
      }

      if (!invitations || invitations.length === 0) {
        console.log('[HOUSE DETAIL] No pending invitations found');
        setPendingInvitations([]);
        return;
      }

      // Filter for this house only
      const houseInvitations = invitations.filter(
        inv => {
          console.log('[HOUSE DETAIL] Checking invitation:', inv.id, 'session house_id:', inv.game_sessions?.house_id, 'current house:', id);
          return inv.game_sessions?.house_id === id;
        }
      );

      console.log('[HOUSE DETAIL] Filtered invitations for this house:', houseInvitations.length);

      if (houseInvitations.length === 0) {
        console.log('[HOUSE DETAIL] No invitations for this specific house');
        setPendingInvitations([]);
        return;
      }

      // For each invitation, get house and game details
      const invitationsWithDetails = await Promise.all(
        houseInvitations.map(async (inv) => {
          console.log('[HOUSE DETAIL] Fetching details for invitation:', inv.id);

          const { data: house, error: houseError } = await supabase
            .from('houses')
            .select('name, house_emoji')
            .eq('id', inv.game_sessions.house_id)
            .maybeSingle();

          if (houseError) {
            console.error('[HOUSE DETAIL] Error fetching house:', houseError);
          }

          const { data: game, error: gameError } = await supabase
            .from('games')
            .select('name, game_emoji')
            .eq('id', inv.game_sessions.game_id)
            .maybeSingle();

          if (gameError) {
            console.error('[HOUSE DETAIL] Error fetching game:', gameError);
          }

          const invitationWithDetails = {
            id: inv.id,
            inviter_id: inv.inviter_id,
            house_id: inv.game_sessions.house_id,
            game_id: inv.game_sessions.game_id,
            game_session_id: inv.game_session_id,
            created_at: inv.created_at,
            inviter: inv.profiles,
            house: house,
            game: game,
          };

          console.log('[HOUSE DETAIL] Invitation with details:', invitationWithDetails);
          return invitationWithDetails;
        })
      );

      console.log('[HOUSE DETAIL] ===== SETTING PENDING INVITATIONS =====');
      console.log('[HOUSE DETAIL] Total invitations to display:', invitationsWithDetails.length);
      setPendingInvitations(invitationsWithDetails);
    } catch (error) {
      console.error('[HOUSE DETAIL] EXCEPTION while fetching pending invitations:', error);
    }
  };

  const fetchGameSessions = async () => {
    if (!user || !id) return;

    try {
      // Get sessions where user is an invitee (accepted OR pending)
      const { data: userInvitations } = await supabase
        .from('game_invitations')
        .select('game_session_id, status')
        .eq('invitee_id', user.id)
        .in('status', ['accepted', 'pending']);

      const invitedSessionIds = new Set(
        userInvitations
          ?.map(inv => inv.game_session_id)
          .filter(id => id != null) || []
      );

      // Get sessions where user is the inviter (creator)
      const { data: createdInvitations } = await supabase
        .from('game_invitations')
        .select('game_session_id, status')
        .eq('inviter_id', user.id);

      // Add created session IDs to the set
      createdInvitations?.forEach(inv => {
        if (inv.game_session_id) {
          invitedSessionIds.add(inv.game_session_id);
        }
      });

      if (invitedSessionIds.size === 0) {
        setGameSessions([]);
        return;
      }

      // Fetch game sessions the user is involved with
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select(`
          id,
          game_id,
          status,
          created_at,
          games!inner(
            name,
            game_emoji
          )
        `)
        .eq('house_id', id)
        .in('id', Array.from(invitedSessionIds))
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[HOUSE DETAIL] Error fetching game sessions:', error);
        return;
      }

      // For each session, get invitation stats and invited users
      const sessionsWithStats = await Promise.all(
        (sessions || []).map(async (session) => {
          const { data: invitations } = await supabase
            .from('game_invitations')
            .select(`
              status,
              invitee_id,
              profiles:invitee_id (
                username,
                avatar_url
              )
            `)
            .eq('game_session_id', session.id);

          const total = invitations?.length || 0;
          const accepted = invitations?.filter(i => i.status === 'accepted').length || 0;
          const pending = invitations?.filter(i => i.status === 'pending').length || 0;
          const declined = invitations?.filter(i => i.status === 'declined').length || 0;

          // Group invitations by status
          const invitedUsers = invitations?.map((inv: any) => ({
            id: inv.invitee_id,
            username: inv.profiles?.username,
            avatar_url: inv.profiles?.avatar_url,
            status: inv.status,
          })) || [];

          return {
            ...session,
            total_invites: total,
            accepted_count: accepted,
            pending_count: pending,
            declined_count: declined,
            invited_users: invitedUsers,
          };
        })
      );

      setGameSessions(sessionsWithStats);
      console.log('[HOUSE DETAIL] Game sessions loaded:', sessionsWithStats);
    } catch (error) {
      console.error('[HOUSE DETAIL] Error fetching game sessions:', error);
    }
  };

  const handleAcceptInvitation = async (invitationId: string, sessionId: string) => {
    if (!user) return;

    try {
      // Check house limit before accepting (pass house_id to check if already a member)
      const { data: limitCheck, error: limitError } = await supabase
        .rpc('check_user_can_join_house', {
          user_id_param: user.id,
          house_id_param: id // Pass the current house ID
        });

      if (limitError) {
        console.error('[HOUSE DETAIL] Error checking house limit:', limitError);
        Alert.alert('Error', 'Failed to check house limit');
        return;
      }

      if (limitCheck && !limitCheck.can_join) {
        console.log('[HOUSE DETAIL] House limit reached, showing upgrade modal');
        setShowLimitModal(true);
        return;
      }

      // Call the accept_game_invitation RPC function
      // This handles: joining house (if not member), updating invitation status, and creating session score
      const { data, error } = await supabase.rpc('accept_game_invitation', {
        invitation_id: invitationId
      });

      if (error) {
        console.error('[HOUSE DETAIL] Error accepting invitation:', error);
        Alert.alert('Error', 'Failed to accept invitation');
        return;
      }

      if (data && !data.success) {
        Alert.alert('Error', data.error || 'Failed to accept invitation');
        return;
      }

      Alert.alert('Success', 'Game invitation accepted! The host can now start the game.');

      // Refresh data
      fetchPendingInvitations();
      fetchHouseData(true);
      fetchGameSessions();
    } catch (error) {
      console.error('[HOUSE DETAIL] Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (invitationId: string, houseId: string) => {
    if (!user) return;

    try {
      // Check if user is a member of this house
      const { data: memberData } = await supabase
        .from('house_members')
        .select('id')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isMember = !!memberData;

      // Check if user has any OTHER accepted invitations in this house
      const { data: otherInvitations } = await supabase
        .from('game_invitations')
        .select('id')
        .eq('invitee_id', user.id)
        .eq('house_id', houseId)
        .eq('status', 'accepted')
        .neq('id', invitationId);

      const hasOtherGames = (otherInvitations?.length || 0) > 0;

      // Call the decline_game_invitation RPC function
      const { data, error } = await supabase.rpc('decline_game_invitation', {
        invitation_id: invitationId
      });

      if (error) {
        console.error('[HOUSE DETAIL] Error declining invitation:', error);
        Alert.alert('Error', 'Failed to decline invitation');
        return;
      }

      if (data && !data.success) {
        Alert.alert('Error', data.error || 'Failed to decline invitation');
        return;
      }

      // If user is a member ONLY because of this one game invite, remove them
      if (isMember && !hasOtherGames) {
        console.log('[HOUSE DETAIL] User has no other games, removing from house');
        const { error: leaveError } = await supabase
          .from('house_members')
          .delete()
          .eq('house_id', houseId)
          .eq('user_id', user.id);

        if (leaveError) {
          console.error('[HOUSE DETAIL] Error leaving house:', leaveError);
        } else {
          Alert.alert('Declined', 'Game invitation declined. You have been removed from the house.');
          // Navigate back to home since user is no longer in this house
          router.replace('/(tabs)');
          return;
        }
      }

      Alert.alert('Declined', 'Game invitation declined');

      // Refresh data
      fetchPendingInvitations();
      fetchGameSessions();
    } catch (error) {
      console.error('[HOUSE DETAIL] Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    }
  };

  const handleDeleteGameSession = async (sessionId: string, gameName: string) => {
    if (!user) return;

    const confirmDelete = () => {
      Alert.alert(
        'Delete Game Session',
        `Are you sure you want to delete "${gameName}"? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('[HOUSE DETAIL] Deleting game session:', sessionId);

                // Update game session status to 'cancelled'
                const { error: sessionError } = await supabase
                  .from('game_sessions')
                  .update({ status: 'cancelled' })
                  .eq('id', sessionId);

                if (sessionError) {
                  console.error('[HOUSE DETAIL] Error cancelling game session:', sessionError);
                  Alert.alert('Error', 'Failed to delete game session');
                  return;
                }

                // Delete all game invitations for this session
                const { error: invitationsError } = await supabase
                  .from('game_invitations')
                  .delete()
                  .eq('game_session_id', sessionId);

                if (invitationsError) {
                  console.error('[HOUSE DETAIL] Error deleting invitations:', invitationsError);
                }

                // Delete all session scores for this session
                const { error: scoresError } = await supabase
                  .from('session_scores')
                  .delete()
                  .eq('session_id', sessionId);

                if (scoresError) {
                  console.error('[HOUSE DETAIL] Error deleting scores:', scoresError);
                }

                Alert.alert('Success', 'Game session deleted successfully');
                fetchGameSessions();
                fetchPendingInvitations();
              } catch (error) {
                console.error('[HOUSE DETAIL] Error deleting game session:', error);
                Alert.alert('Error', 'Failed to delete game session');
              }
            },
          },
        ]
      );
    };

    if (Platform.OS === 'web') {
      const confirmed = confirm(`Are you sure you want to delete "${gameName}"? This action cannot be undone.`);
      if (confirmed) {
        try {
          console.log('[HOUSE DETAIL] Deleting game session:', sessionId);

          const { error: sessionError } = await supabase
            .from('game_sessions')
            .update({ status: 'cancelled' })
            .eq('id', sessionId);

          if (sessionError) {
            console.error('[HOUSE DETAIL] Error cancelling game session:', sessionError);
            alert('Failed to delete game session');
            return;
          }

          const { error: invitationsError } = await supabase
            .from('game_invitations')
            .delete()
            .eq('game_session_id', sessionId);

          if (invitationsError) {
            console.error('[HOUSE DETAIL] Error deleting invitations:', invitationsError);
          }

          const { error: scoresError } = await supabase
            .from('session_scores')
            .delete()
            .eq('session_id', sessionId);

          if (scoresError) {
            console.error('[HOUSE DETAIL] Error deleting scores:', scoresError);
          }

          alert('Game session deleted successfully');
          fetchGameSessions();
          fetchPendingInvitations();
        } catch (error) {
          console.error('[HOUSE DETAIL] Error deleting game session:', error);
          alert('Failed to delete game session');
        }
      }
    } else {
      confirmDelete();
    }
  };

  const handleShare = async () => {
    console.log('[HOUSE DETAIL] Share button pressed');

    if (!house) {
      console.log('[HOUSE DETAIL] No house data available');
      Alert.alert('Error', 'House data not loaded');
      return;
    }

    try {
      console.log('[HOUSE DETAIL] Sharing house:', house.name, house.invite_code);

      if (Platform.OS === 'web') {
        // Web: Copy to clipboard
        const shareText = `Join my house "${house.name}" on HouseParty! Use code: ${house.invite_code}`;

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          Alert.alert('Copied!', 'Invite code copied to clipboard');
        } else {
          // Fallback for older browsers
          Alert.alert(
            'Share House',
            `Share this invite code: ${house.invite_code}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Native: Use share dialog
        await Share.share({
          message: `Join my house "${house.name}" on HouseParty! Use code: ${house.invite_code}`,
        });
      }

      console.log('[HOUSE DETAIL] Share completed');
    } catch (error: any) {
      console.error('[HOUSE DETAIL] Error sharing:', error);
      Alert.alert('Share Failed', error.message || 'Could not share');
    }
  };

  const handleDeleteHouse = () => {
    console.log('[HOUSE DETAIL] Delete button pressed', {
      houseId: id,
      houseName: house?.name,
      isCreator,
      isAdmin,
      userId: user?.id,
      houseCreatorId: house?.creator_id,
      platform: Platform.OS
    });

    if (!house) {
      Alert.alert('Error', 'House data not loaded. Please try again.');
      return;
    }

    if (Platform.OS === 'web') {
      // Web: Use window.confirm
      const confirmed = window.confirm(
        `Are you sure you want to delete "${house.name}"?\n\n` +
        `This will permanently delete:\n` +
        `• All house members\n` +
        `• All games\n` +
        `• All game sessions\n` +
        `• All scores and stats\n` +
        `• All customizations\n\n` +
        `This action cannot be undone.`
      );

      if (confirmed) {
        console.log('[HOUSE DETAIL] Web delete confirmed');
        confirmDeleteHouse();
      } else {
        console.log('[HOUSE DETAIL] Web delete cancelled');
      }
    } else {
      // Native: Use Alert.alert
      Alert.alert(
        'Delete House',
        `Are you sure you want to delete "${house.name}"?\n\nThis will permanently delete:\n• All house members\n• All games\n• All game sessions\n• All scores and stats\n• All customizations\n\nThis action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('[HOUSE DETAIL] Delete cancelled');
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: confirmDeleteHouse,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleLeaveHouse = async () => {
    if (!user || !id || !house) return;

    console.log('[HOUSE DETAIL] Leave house requested');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to leave "${house.name}"?\n\n` +
        `You will lose access to all games and content in this house.`
      );

      if (confirmed) {
        confirmLeaveHouse();
      }
    } else {
      Alert.alert(
        'Leave House',
        `Are you sure you want to leave "${house.name}"?\n\nYou will lose access to all games and content in this house.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: confirmLeaveHouse,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const confirmLeaveHouse = async () => {
    try {
      console.log('[HOUSE DETAIL] Leaving house:', id);
      setLoading(true);

      const { error } = await supabase
        .from('house_members')
        .delete()
        .eq('house_id', id)
        .eq('user_id', user?.id);

      if (error) {
        console.error('[HOUSE DETAIL] Error leaving house:', error);
        Alert.alert('Error', 'Failed to leave house. Please try again.');
        setLoading(false);
        return;
      }

      console.log('[HOUSE DETAIL] Successfully left house');
      console.log('[HOUSE DETAIL] Invalidating React Query cache...');

      // ✅ FIX: Invalidate React Query cache immediately
      queryClient.invalidateQueries({
        queryKey: ['houses', user?.id],
        refetchType: 'active' // Force immediate refetch on active queries
      });

      console.log('[HOUSE DETAIL] Cache invalidated, navigating back...');

      if (Platform.OS === 'web') {
        alert(`You have left "${house?.name}"`);
      } else {
        Alert.alert('Left House', `You have left "${house?.name}"`);
      }

      // Navigate back - the cache is already invalidated so home will refetch
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[HOUSE DETAIL] Error leaving house:', error);
      Alert.alert('Error', `Failed to leave house: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const confirmDeleteHouse = async () => {
    try {
      console.log('[HOUSE DETAIL] ===== STARTING DELETE PROCESS =====');
      console.log('[HOUSE DETAIL] House ID:', id);
      console.log('[HOUSE DETAIL] User ID:', user?.id);
      console.log('[HOUSE DETAIL] Is Creator:', isCreator);
      console.log('[HOUSE DETAIL] Is Admin:', isAdmin);
      console.log('[HOUSE DETAIL] House creator ID:', house?.creator_id);

      setLoading(true);

      if (!user) {
        console.error('[HOUSE DETAIL] ERROR: No user logged in');
        Alert.alert('Error', 'You must be logged in to delete a house');
        setLoading(false);
        return;
      }

      if (!id) {
        console.error('[HOUSE DETAIL] ERROR: No house ID');
        Alert.alert('Error', 'Invalid house ID');
        setLoading(false);
        return;
      }

      console.log('[HOUSE DETAIL] Executing delete query...');

      const { data, error } = await supabase
        .from('houses')
        .delete()
        .eq('id', id)
        .select();

      console.log('[HOUSE DETAIL] Delete query completed');
      console.log('[HOUSE DETAIL] Data returned:', data);
      console.log('[HOUSE DETAIL] Error:', error);

      if (error) {
        console.error('[HOUSE DETAIL] DELETE ERROR:', JSON.stringify(error, null, 2));
        Alert.alert(
          'Delete Failed',
          `Database error: ${error.message}\n\nCode: ${error.code}\n\nDetails: ${error.details}\n\nHint: ${error.hint}`
        );
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.error('[HOUSE DETAIL] DELETE FAILED: No rows returned');
        console.error('[HOUSE DETAIL] This usually means RLS blocked the operation');

        Alert.alert(
          'Permission Denied',
          `You don't have permission to delete this house.\n\n` +
          `Only the creator or an admin can delete houses.\n\n` +
          `Debug info:\n` +
          `- You are creator: ${isCreator}\n` +
          `- You are admin: ${isAdmin}\n` +
          `- Your ID: ${user.id}\n` +
          `- Creator ID: ${house?.creator_id}`
        );
        setLoading(false);
        return;
      }

      console.log('[HOUSE DETAIL] ===== DELETE SUCCESSFUL =====');
      console.log('[HOUSE DETAIL] Deleted house:', data);
      console.log('[HOUSE DETAIL] Invalidating React Query cache...');

      // ✅ FIX: Invalidate React Query cache immediately
      queryClient.invalidateQueries({
        queryKey: ['houses', user?.id],
        refetchType: 'active' // Force immediate refetch on active queries
      });

      console.log('[HOUSE DETAIL] Cache invalidated, navigating back...');

      if (Platform.OS === 'web') {
        alert(`"${house?.name}" and all associated data have been permanently removed.`);
      } else {
        Alert.alert(
          'House Deleted',
          `"${house?.name}" and all associated data have been permanently removed.`
        );
      }

      // Navigate back - the cache is already invalidated so home will refetch
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[HOUSE DETAIL] UNEXPECTED ERROR:', error);
      console.error('[HOUSE DETAIL] Error stack:', error.stack);
      Alert.alert('Error', `An unexpected error occurred: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };


  const renderGameSession = ({ item }: { item: GameSession }) => {
    const allAccepted = item.total_invites === item.accepted_count && item.total_invites > 0;
    const hasPending = (item.pending_count || 0) > 0;

    return (
      <Pressable
        style={[styles.gameCard, styles.sessionCard]}
        onPress={() => router.push(`/game-session/${item.game_id}?sessionId=${item.id}`)}
      >
        <View style={styles.gameInfo}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionEmoji}>{item.games?.game_emoji || '🎮'}</Text>
            <View style={styles.sessionInfo}>
              <Text style={styles.gameName}>{item.games?.name}</Text>
              <Text style={styles.sessionStatus}>
                {item.status === 'pending' && hasPending
                  ? `Waiting: ${item.accepted_count}/${item.total_invites} accepted`
                  : item.status === 'pending' && allAccepted
                  ? 'Ready to start!'
                  : item.status === 'active'
                  ? 'In Progress'
                  : 'Pending'}
              </Text>
              {item.invited_users && item.invited_users.length > 0 && (
                <View style={styles.invitedUsersContainer}>
                  {item.invited_users.map((invitedUser) => (
                    <View key={invitedUser.id} style={styles.invitedUserChip}>
                      <Text style={styles.invitedUserName}>
                        {invitedUser.username || 'Unknown'}
                      </Text>
                      <View style={[
                        styles.statusDot,
                        invitedUser.status === 'accepted' && styles.statusAccepted,
                        invitedUser.status === 'pending' && styles.statusPending,
                        invitedUser.status === 'declined' && styles.statusDeclined,
                      ]} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.sessionActions}>
          {(isAdmin || isCreator) && (
            <Pressable
              style={styles.sessionDeleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteGameSession(item.id, item.games?.name || 'this game');
              }}
            >
              <Trash2 size={18} color="#EF4444" />
            </Pressable>
          )}
          <View style={styles.sessionIndicator}>
            {allAccepted ? (
              <View style={styles.readyIndicator}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            ) : hasPending ? (
              <View style={styles.pendingIndicator}>
                <Text style={styles.pendingText}>!</Text>
              </View>
            ) : (
              <Play size={24} color="#10B981" />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderGame = ({ item }: { item: Game }) => (
    <Pressable
      style={styles.gameCard}
      onPress={() => router.push(`/game-session/${item.id}`)}
    >
      <View style={styles.gameInfo}>
        <Text style={styles.gameName}>{item.name}</Text>
        <Text style={styles.gameType}>{item.game_type}</Text>
      </View>
      <Play size={24} color="#10B981" />
    </Pressable>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </LinearGradient>
    );
  }

  const hasKitEffects = kitRarity && ['legendary', 'mythic'].includes(kitRarity);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {hasKitEffects && themeColors && themeColors.length > 0 ? (
        <BannerRenderer
          colors={themeColors}
          rarity={kitRarity as any}
          kitName={kitName || undefined}
          size="large"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          colors={themeColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={{ flex: 1, position: 'relative', zIndex: 1 }}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => {
              console.log('[HOUSE DETAIL] QR button pressed');
              router.push(`/qr-code/${id}`);
            }}
          >
            <QrCode size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => {
              console.log('[HOUSE DETAIL] Share button physically pressed!');
              handleShare();
            }}
          >
            <Share2 size={24} color="#FFFFFF" />
          </Pressable>
          {(isCreator || isAdmin) ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.deleteButton,
                pressed && { opacity: 0.7, backgroundColor: '#B91C1C' }
              ]}
              onPress={() => {
                console.log('[HOUSE DETAIL] Trash button physically pressed!');
                handleDeleteHouse();
              }}
            >
              <Trash2 size={24} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.leaveButton,
                pressed && { opacity: 0.7, backgroundColor: '#F59E0B' }
              ]}
              onPress={() => {
                console.log('[HOUSE DETAIL] Leave button pressed!');
                handleLeaveHouse();
              }}
            >
              <LogOut size={24} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>


      <View style={styles.houseHeaderWrapper}>
        <View style={styles.houseHeader}>
          <Text style={[styles.houseName, { color: dynamicTextColor }]}>{house?.name}</Text>
          <View style={styles.inviteCodeContainer}>
            <Text style={[styles.inviteCodeLabel, { color: dynamicTextColor, opacity: 0.8 }]}>Invite Code:</Text>
            <Text style={styles.inviteCode}>{house?.invite_code}</Text>
          </View>
          <View style={styles.membersInfo}>
            <Users size={16} color={dynamicTextColor} />
            <Text style={[styles.membersCount, { color: dynamicTextColor, opacity: 0.8 }]}>{members.length} members</Text>
          </View>
        </View>
      </View>

      {pendingInvitations.length > 0 && (
        <View style={styles.invitationsSection}>
          <Text style={styles.invitationsSectionTitle}>Pending Game Invitations</Text>
          {pendingInvitations.map((invitation) => (
            <View key={invitation.id} style={styles.invitationCard}>
              <View style={styles.invitationInfo}>
                <Text style={styles.invitationGameEmoji}>
                  {invitation.game?.game_emoji || '🎮'}
                </Text>
                <View style={styles.invitationText}>
                  <Text style={styles.invitationGameName}>
                    {invitation.game?.name || 'Unknown Game'}
                  </Text>
                  <Text style={styles.invitationDescription}>
                    {invitation.inviter?.username || 'Someone'} invited you to play in {invitation.house?.name || 'this house'}
                  </Text>
                </View>
              </View>
              <View style={styles.invitationActions}>
                <Pressable
                  style={[styles.invitationButton, styles.declineButton]}
                  onPress={() => handleDeclineInvitation(invitation.id, invitation.house_id)}
                >
                  <Text style={styles.invitationButtonText}>Decline</Text>
                </Pressable>
                <Pressable
                  style={[styles.invitationButton, styles.acceptButton]}
                  onPress={() => handleAcceptInvitation(invitation.id, invitation.game_session_id)}
                >
                  <Text style={styles.invitationButtonText}>Accept</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {gameSessions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: dynamicTextColor }]}>Active & Pending Games</Text>
          </View>
          <FlatList
            data={gameSessions}
            renderItem={renderGameSession}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gamesList}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: dynamicTextColor }]}>Games</Text>
          <View style={styles.headerButtonGroup}>
            <Pressable
              style={styles.historyButton}
              onPress={() => router.push(`/house-history/${id}`)}
            >
              <History size={18} color="#FFFFFF" />
            </Pressable>
            {isAdmin && games.length > 0 && (
              <Pressable
                style={styles.manageButton}
                onPress={() => router.push(`/house-settings/${id}`)}
              >
                <Settings size={18} color="#FFFFFF" />
              </Pressable>
            )}
            {isAdmin && (
              <Pressable
                style={styles.addButton}
                onPress={() => router.push(`/add-game/${id}`)}
              >
                <Plus size={20} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>

        {games.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No games yet</Text>
            {isAdmin && (
              <Text style={styles.emptySubtext}>Add a game to get started</Text>
            )}
          </View>
        ) : (
          <FlatList
            data={games}
            renderItem={renderGame}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gamesList}
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
      </View>
      </View>

      <HouseLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          router.push('/(tabs)/profile');
        }}
        context="join"
        houseName={house?.name}
      />
    </SafeAreaView>
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
    padding: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 72 : 60,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  leaveButton: {
    backgroundColor: '#F97316',
  },
  houseHeaderWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  houseHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 20,
    borderRadius: 16,
  },
  houseName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    letterSpacing: 2,
  },
  membersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membersCount: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  section: {
    flex: 1,
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  gamesList: {
    gap: 12,
  },
  gameCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gameType: {
    fontSize: 14,
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  invitationsSection: {
    padding: 16,
    paddingBottom: 0,
  },
  invitationsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  invitationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  invitationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invitationGameEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  invitationText: {
    flex: 1,
  },
  invitationGameName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  invitationDescription: {
    fontSize: 13,
    color: '#94A3B8',
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  invitationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#64748B',
  },
  invitationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionStatus: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  sessionIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pendingIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  invitedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  invitedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  invitedUserName: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusAccepted: {
    backgroundColor: '#10B981',
  },
  statusPending: {
    backgroundColor: '#F59E0B',
  },
  statusDeclined: {
    backgroundColor: '#EF4444',
  },
});
