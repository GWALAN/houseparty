import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Alert, Platform, Image, FlatList } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { UserPlus, Users, Check, X, Search, UserCheck, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useError, formatSupabaseError } from '@/contexts/ErrorContext';
import { useToast } from '@/contexts/ToastContext';
import { notifications } from '@/lib/notifications';
import GameInvitationCard from '@/components/GameInvitationCard';

type SearchUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_friend: boolean;
  has_pending_request: boolean;
  is_blocked?: boolean;
};

type FriendRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

type Friend = {
  id: string;
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type GameInvitation = {
  id: string;
  inviter_id: string;
  house_id: string;
  game_id: string;
  game_session_id: string;
  created_at: string;
  inviter?: {
    username: string;
    avatar_url?: string;
  };
  house?: {
    name: string;
    house_emoji: string;
  };
  game?: {
    name: string;
    game_emoji: string;
  };
};

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [gameInvitations, setGameInvitations] = useState<GameInvitation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const { user } = useAuth();
  const { showError } = useError();
  const { showSuccess, showInfo } = useToast();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      fetchFriends();
      fetchPendingRequests();
      fetchSentRequests();
      fetchGameInvitations();

      // Set up real-time subscriptions
      const friendRequestsChannel = supabase
        .channel(`friend-requests-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friend_requests',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[FRIENDS] Received request updated:', payload.eventType);
            // Immediate refetch on DELETE to clear stale requests
            if (payload.eventType === 'DELETE') {
              fetchPendingRequests();
            } else {
              // Small delay for INSERT/UPDATE to ensure DB consistency
              setTimeout(() => fetchPendingRequests(), 100);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friend_requests',
            filter: `sender_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[FRIENDS] Sent request updated:', payload.eventType);
            if (payload.eventType === 'DELETE') {
              fetchSentRequests();
            } else {
              setTimeout(() => fetchSentRequests(), 100);
            }
          }
        )
        .subscribe();

      const friendshipsChannel = supabase
        .channel(`friendships-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friendships',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[FRIENDS] New friendship added:', payload);
            fetchFriends();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'friendships',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[FRIENDS] Friendship deleted (my side):', payload);
            const deletedFriendId = payload.old?.friend_id;
            if (deletedFriendId) {
              console.log('[FRIENDS] Removing friend from UI:', deletedFriendId);
              setFriends(prev => prev.filter(f => f.friend_id !== deletedFriendId));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'friendships',
            filter: `friend_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[FRIENDS] Friendship deleted (other side):', payload);
            const deletedByUserId = payload.old?.user_id;
            if (deletedByUserId) {
              console.log('[FRIENDS] Removing friend who unfriended me:', deletedByUserId);
              setFriends(prev => prev.filter(f => f.friend_id !== deletedByUserId));
            }
          }
        )
        .subscribe((status) => {
          console.log('[FRIENDS] Friendships subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[FRIENDS] Successfully subscribed to friendship changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[FRIENDS] Channel error, attempting to reconnect');
          }
        });

      // Set up game invitations subscription
      const gameInvitationsChannel = supabase
        .channel(`game-invitations-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_invitations',
            filter: `invitee_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[FRIENDS] Game invitation updated:', payload.eventType);
            setTimeout(() => fetchGameInvitations(), 100);
          }
        )
        .subscribe();

      return () => {
        console.log('[FRIENDS] Cleaning up subscriptions');
        supabase.removeChannel(friendRequestsChannel);
        supabase.removeChannel(friendshipsChannel);
        supabase.removeChannel(gameInvitationsChannel);
      };
    }, [user])
  );

  const fetchFriends = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        friend_id,
        profiles!friendships_friend_id_fkey(
          username,
          avatar_url
        )
      `)
      .eq('user_id', user.id);

    if (!error && data && data.length > 0) {
      // OPTIMIZED: Batch query for display names AND profile photos
      const friendIds = data.map(f => f.friend_id);
      const { data: settings } = await supabase
        .from('user_profile_settings')
        .select('user_id, display_name, profile_photo_url')
        .in('user_id', friendIds);

      const displayNameMap = new Map(settings?.map(s => [s.user_id, s.display_name]) || []);
      const profilePhotoMap = new Map(settings?.map(s => [s.user_id, s.profile_photo_url]) || []);

      const friendsWithSettings = data.map((f: any) => ({
        id: f.id,
        friend_id: f.friend_id,
        username: f.profiles?.username || 'Unknown',
        display_name: displayNameMap.get(f.friend_id) || f.profiles?.username || 'Unknown',
        avatar_url: profilePhotoMap.get(f.friend_id) || f.profiles?.avatar_url || null,
      }));

      setFriends(friendsWithSettings);
    } else {
      setFriends([]);
    }
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        recipient_id,
        status,
        created_at,
        profiles!friend_requests_sender_id_fkey(
          id,
          username,
          avatar_url
        )
      `)
      .eq('recipient_id', user.id)
      .eq('status', 'pending');

    if (!error && data && data.length > 0) {
      // OPTIMIZED: Batch query for display names AND profile photos
      const senderIds = data.map(r => r.sender_id);
      const { data: settings } = await supabase
        .from('user_profile_settings')
        .select('user_id, display_name, profile_photo_url')
        .in('user_id', senderIds);

      const displayNameMap = new Map(settings?.map(s => [s.user_id, s.display_name]) || []);
      const profilePhotoMap = new Map(settings?.map(s => [s.user_id, s.profile_photo_url]) || []);

      const requestsWithSettings = data.map((r: any) => ({
        id: r.id,
        sender_id: r.sender_id,
        recipient_id: r.recipient_id,
        status: r.status,
        created_at: r.created_at,
        sender: {
          id: r.profiles?.id || r.sender_id,
          username: r.profiles?.username || 'Unknown',
          display_name: displayNameMap.get(r.sender_id) || r.profiles?.username || 'Unknown',
          avatar_url: profilePhotoMap.get(r.sender_id) || r.profiles?.avatar_url || null,
        },
      }));
      setPendingRequests(requestsWithSettings);
    }
  };

  const fetchSentRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        recipient_id,
        status,
        created_at,
        profiles!friend_requests_recipient_id_fkey(
          id,
          username,
          avatar_url
        )
      `)
      .eq('sender_id', user.id)
      .eq('status', 'pending');

    if (!error && data && data.length > 0) {
      // OPTIMIZED: Batch query for display names AND profile photos
      const recipientIds = data.map(r => r.recipient_id);
      const { data: settings } = await supabase
        .from('user_profile_settings')
        .select('user_id, display_name, profile_photo_url')
        .in('user_id', recipientIds);

      const displayNameMap = new Map(settings?.map(s => [s.user_id, s.display_name]) || []);
      const profilePhotoMap = new Map(settings?.map(s => [s.user_id, s.profile_photo_url]) || []);

      const requestsWithSettings = data.map((r: any) => ({
        id: r.id,
        sender_id: r.sender_id,
        recipient_id: r.recipient_id,
        status: r.status,
        created_at: r.created_at,
        sender: {
          id: r.profiles?.id || r.recipient_id,
          username: r.profiles?.username || 'Unknown',
          display_name: displayNameMap.get(r.recipient_id) || r.profiles?.username || 'Unknown',
          avatar_url: profilePhotoMap.get(r.recipient_id) || r.profiles?.avatar_url || null,
        },
      }));

      setSentRequests(requestsWithSettings);
    }
  };

  const fetchGameInvitations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('game_invitations')
      .select(`
        id,
        inviter_id,
        house_id,
        game_id,
        game_session_id,
        created_at,
        profiles!game_invitations_inviter_id_fkey(
          username,
          avatar_url
        ),
        houses(
          name,
          house_emoji
        ),
        games(
          name,
          game_emoji
        )
      `)
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const invitations = data.map((inv: any) => ({
        id: inv.id,
        inviter_id: inv.inviter_id,
        house_id: inv.house_id,
        game_id: inv.game_id,
        game_session_id: inv.game_session_id,
        created_at: inv.created_at,
        inviter: {
          username: inv.profiles?.username || 'Unknown',
          avatar_url: inv.profiles?.avatar_url || null,
        },
        house: {
          name: inv.houses?.name || 'Unknown House',
          house_emoji: inv.houses?.house_emoji || '🏠',
        },
        game: {
          name: inv.games?.name || 'Unknown Game',
          game_emoji: inv.games?.game_emoji || '🎮',
        },
      }));
      setGameInvitations(invitations);
    }
  };

  const searchUsers = async (query: string) => {
    if (!user || query.trim().length < 1) {
      setSearchResults([]);
      setSelectedUser(null);
      return;
    }

    setSearching(true);
    const { data, error } = await supabase.rpc('search_users_by_username', {
      search_term: query.trim(),
      limit_count: 10,
    });

    if (error) {
      console.error('[FRIENDS] Search error:', error);
      showError('Failed to search users. Please try again.');
      setSearchResults([]);
    } else if (data) {
      console.log('[FRIENDS] Search results:', data);
      setSearchResults(data);
    } else {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const sendFriendRequest = async () => {
    if (!user || !selectedUser) return;

    setSendingRequest(true);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          recipient_id: selectedUser.id,
          status: 'pending',
        });

      if (error) {
        showError(formatSupabaseError(error));
      } else {
        // Get sender's display name
        const { data: senderSettings } = await supabase
          .from('user_profile_settings')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const senderName = senderSettings?.display_name || user.email?.split('@')[0] || 'Someone';

        // Send notification to recipient
        notifications.notifyFriendRequest(senderName, selectedUser.id);

        // Show confirmation to sender
        showSuccess(`Friend request sent to ${selectedUser.display_name}`);

        // Clear search and refetch to update "has_pending_request" flag
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUser(null);
        await fetchSentRequests();
      }
    } catch {
      showError('Failed to send friend request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const request = pendingRequests.find(r => r.id === requestId);

      if (!request) {
        showError('Friend request not found. It may have been cancelled.');
        await fetchPendingRequests();
        return;
      }

      // Optimistically update UI
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));

      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId,
      });

      if (error) {
        console.error('[FRIENDS] Accept error:', error);

        // Check if it's a "not found" error - request may have been cancelled and resent
        if (error.message?.includes('not found') || error.message?.includes('already processed')) {
          showError('This friend request is no longer valid. Please refresh.');
          // Force refresh to get the latest state
          await Promise.all([
            fetchPendingRequests(),
            fetchFriends()
          ]);
        } else {
          // Rollback optimistic update
          await fetchPendingRequests();
          showError(formatSupabaseError(error));
        }
      } else {
        if (request && user) {
          // Get accepter's display name
          const { data: accepterSettings } = await supabase
            .from('user_profile_settings')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle();

          const accepterName = accepterSettings?.display_name || user.email?.split('@')[0] || 'Someone';

          // Send notification to the original sender
          notifications.notifyFriendAccepted(accepterName, request.sender_id);

          // Show confirmation to current user (accepter)
          showSuccess(`You are now friends with ${request.sender.display_name}`);
        }

        // Refresh friends list - realtime will handle the insert notification
        // We manually fetch to ensure immediate UI update
        await fetchFriends();

        // Clear search if the accepted user was in search results
        if (request.sender_id) {
          setSearchResults(prev => prev.filter(u => u.id !== request.sender_id));
        }
      }
    } catch (err) {
      console.error('[FRIENDS] Accept exception:', err);
      // Rollback and refresh
      await fetchPendingRequests();
      showError('Failed to accept friend request. Please try again.');
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    try {
      const request = pendingRequests.find(r => r.id === requestId);

      const { error } = await supabase.rpc('reject_friend_request', {
        request_id: requestId,
      });

      if (error) {
        showError(formatSupabaseError(error));
      } else {
        if (request && user) {
          const { data: declinerSettings } = await supabase
            .from('user_profile_settings')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle();

          const declinerName = declinerSettings?.display_name || user.email?.split('@')[0] || 'Someone';
          notifications.notifyFriendRequestDeclined(declinerName);
        }

        if (request) {
          await notifications.cancelFriendRequestNotification(request.sender_id);
          showInfo(`Friend request from ${request.sender.display_name} declined`);
        }

        await Promise.all([
          fetchPendingRequests(),
          fetchSentRequests()
        ]);
      }
    } catch {
      showError('Failed to decline friend request. Please try again.');
    }
  };

  const cancelSentRequest = async (requestId: string) => {
    try {
      const request = sentRequests.find(r => r.id === requestId);

      // Optimistically update UI
      setSentRequests(prev => prev.filter(r => r.id !== requestId));

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        // Rollback on error
        await fetchSentRequests();
        showError(formatSupabaseError(error));
      } else {
        if (request) {
          await notifications.cancelFriendRequestNotification(request.recipient_id);
        }

        showInfo('Friend request cancelled');
        // Don't refetch - realtime will handle it for recipient
      }
    } catch {
      // Rollback on exception
      await fetchSentRequests();
      showError('Failed to cancel friend request. Please try again.');
    }
  };

  const removeFriend = async (friendId: string) => {
    if (Platform.OS === 'web') {
      if (!confirm('Are you sure you want to remove this friend?')) return;
    } else {
      Alert.alert(
        'Remove Friend',
        'Are you sure you want to remove this friend?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await performRemoveFriend(friendId);
            },
          },
        ]
      );
      return;
    }

    await performRemoveFriend(friendId);
  };

  const performRemoveFriend = async (friendId: string) => {
    if (!user) return;

    try {
      console.log('[FRIENDS] Starting friend removal:', friendId);

      const friendToRemove = friends.find(f => f.friend_id === friendId);
      const friendDisplayName = friendToRemove?.display_name || 'Unknown';

      setFriends(prevFriends => prevFriends.filter(f => f.friend_id !== friendId));

      const { error } = await supabase.rpc('remove_friendship', {
        target_friend_id: friendId
      });

      if (error) {
        console.error('[FRIENDS] Remove friendship error:', error);
        if (friendToRemove) {
          setFriends(prev => [...prev, friendToRemove]);
        }
        showError('Failed to remove friend. Please try again.');
      } else {
        console.log('[FRIENDS] Friend removed successfully');
        showInfo(`${friendDisplayName} has been removed from your friends list`);
      }
    } catch (error) {
      console.error('[FRIENDS] Exception in performRemoveFriend:', error);
      await fetchFriends();
      showError('Failed to remove friend. Please try again.');
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <Pressable
      style={({ pressed }) => [
        styles.friendCard,
        pressed && styles.friendCardPressed
      ]}
      onPress={() => router.push(`/player-stats/${item.friend_id}`)}
    >
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.friendCardGradient}
      >
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatarContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.friendAvatarGradient}
            >
              <View style={styles.friendAvatar}>
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Users size={24} color="#FFFFFF" />
                )}
              </View>
            </LinearGradient>
          </View>
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.display_name}</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.actionButtonPressed
          ]}
          onPress={(e) => {
            e.stopPropagation();
            removeFriend(item.friend_id);
          }}
        >
          <X size={18} color="#EF4444" />
        </Pressable>
      </LinearGradient>
    </Pressable>
  );

  const renderPendingRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatar}>
          {item.sender.avatar_url ? (
            <Image
              source={{ uri: item.sender.avatar_url }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Users size={24} color="#F59E0B" />
          )}
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{item.sender.display_name}</Text>
          <Text style={styles.friendEmail}>@{item.sender.username}</Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={styles.acceptButton}
          onPress={() => acceptFriendRequest(item.id)}
        >
          <Check size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          style={styles.declineButton}
          onPress={() => declineFriendRequest(item.id)}
        >
          <X size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );

  const renderSentRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.sentRequestCard}>
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatar}>
          {item.sender.avatar_url ? (
            <Image
              source={{ uri: item.sender.avatar_url }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Users size={24} color="#94A3B8" />
          )}
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{item.sender.display_name}</Text>
          <Text style={styles.friendEmail}>@{item.sender.username}</Text>
        </View>
      </View>
      <View style={styles.sentRequestActions}>
        <View style={styles.pendingBadge}>
          <Clock size={16} color="#94A3B8" />
          <Text style={styles.pendingText}>Pending</Text>
        </View>
        <Pressable
          style={styles.cancelButton}
          onPress={() => cancelSentRequest(item.id)}
        >
          <X size={16} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: SearchUser }) => {
    const isDisabled = item.is_friend || item.has_pending_request;
    const isSelected = selectedUser?.id === item.id;

    return (
      <Pressable
        style={[
          styles.searchResultCard,
          isSelected && styles.searchResultCardSelected,
          isDisabled && styles.searchResultCardDisabled,
        ]}
        onPress={() => !isDisabled && setSelectedUser(item)}
        disabled={isDisabled}
      >
        <View style={styles.friendInfo}>
          <View style={styles.friendAvatar}>
            {item.avatar_url ? (
              <Image
                source={{ uri: item.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Users size={24} color={isDisabled ? "#64748B" : "#10B981"} />
            )}
          </View>
          <View style={styles.friendDetails}>
            <Text style={[styles.friendName, isDisabled && styles.disabledText]}>
              {item.display_name}
            </Text>
            <Text style={[styles.friendEmail, isDisabled && styles.disabledText]}>
              @{item.username}
            </Text>
          </View>
        </View>
        {item.is_friend && (
          <View style={styles.friendBadge}>
            <UserCheck size={16} color="#10B981" />
            <Text style={styles.friendBadgeText}>Friend</Text>
          </View>
        )}
        {item.has_pending_request && (
          <View style={styles.pendingBadge}>
            <Clock size={16} color="#94A3B8" />
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        )}
        {!isDisabled && isSelected && (
          <View style={styles.selectedIndicator}>
            <Check size={20} color="#10B981" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchUsers(text);
            }}
          />
        </View>

        {searching && (
          <ActivityIndicator size="small" color="#10B981" style={styles.searchLoader} />
        )}

        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              scrollEnabled={true}
              style={styles.searchResultsList}
              showsVerticalScrollIndicator={true}
            />
            {selectedUser && (
              <Pressable
                style={[styles.sendRequestButton, sendingRequest && styles.sendRequestButtonDisabled]}
                onPress={sendFriendRequest}
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <UserPlus size={20} color="#FFFFFF" />
                    <Text style={styles.sendRequestButtonText}>Send Friend Request</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {searchQuery.length > 0 && !searching && searchResults.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No users found</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Game Invitations */}
          {gameInvitations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <UserCheck size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>Game Invitations ({gameInvitations.length})</Text>
              </View>
              {gameInvitations.map((invitation) => (
                <GameInvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onResponse={() => {
                    fetchGameInvitations();
                    fetchFriends();
                  }}
                />
              ))}
            </View>
          )}

          {/* Pending Friend Requests */}
          {pendingRequests.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <UserPlus size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Friend Requests ({pendingRequests.length})</Text>
              </View>
              {pendingRequests.map((request) => (
                <View key={request.id}>
                  {renderPendingRequest({ item: request })}
                </View>
              ))}
            </View>
          )}

          {/* Sent Friend Requests */}
          {sentRequests.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={20} color="#94A3B8" />
                <Text style={styles.sectionTitle}>Sent Requests ({sentRequests.length})</Text>
              </View>
              {sentRequests.map((request) => (
                <View key={request.id}>
                  {renderSentRequest({ item: request })}
                </View>
              ))}
            </View>
          )}

          {/* Friends List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <UserCheck size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>My Friends ({friends.length})</Text>
            </View>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No Friends Yet</Text>
                <Text style={styles.emptyText}>
                  Search for users above to send friend requests
                </Text>
              </View>
            ) : (
              friends.map((friend) => (
                <View key={friend.id}>
                  {renderFriend({ item: friend })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchSection: {
    padding: 24,
    paddingTop: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  searchLoader: {
    marginTop: 12,
  },
  searchResults: {
    marginTop: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 400,
  },
  searchResultsList: {
    flexGrow: 0,
    maxHeight: 300,
  },
  searchResultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchResultCardSelected: {
    backgroundColor: '#10B98120',
  },
  searchResultCardDisabled: {
    opacity: 0.5,
  },
  selectedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  friendBadgeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  sendRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    padding: 16,
    margin: 12,
    borderRadius: 12,
  },
  sendRequestButtonDisabled: {
    opacity: 0.5,
  },
  sendRequestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#64748B',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  friendCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  friendCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  friendCardGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  friendAvatarContainer: {
    padding: 3,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  friendAvatarGradient: {
    borderRadius: 26,
    padding: 2,
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  sentRequestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#64748B',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  friendEmail: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  declineButton: {
    backgroundColor: '#EF4444',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: '#EF4444',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sentRequestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 2,
    borderColor: '#F59E0B',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.92 }],
  },
});
