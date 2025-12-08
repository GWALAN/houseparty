import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'expo-router';

type NotificationContextType = {
  requestPermissions: () => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Configure notification handler (only on native platforms)
if (typeof Platform !== 'undefined' && Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[Notifications] Could not set notification handler:', e);
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showInfo, showSuccess } = useToast();
  const router = useRouter();

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    // Skip on web platform
    if (Platform.OS === 'web') {
      console.log('[Notifications] Skipping permissions on web');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return false;
      }

      // Get push token for production builds
      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('[Notifications] Push token:', token);

        // Store token in database
        if (user) {
          await supabase
            .from('user_profile_settings')
            .update({ push_token: token })
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.log('[Notifications] Running in Expo Go or dev build');
      }

      return true;
    } catch (error) {
      console.error('[Notifications] Error requesting permissions:', error);
      return false;
    }
  }, [user]);

  // Helper function to send push notification (only on native)
  const sendPushNotification = useCallback(async (
    title: string,
    body: string,
    data: Record<string, any>
  ) => {
    // Skip on web platform
    if (Platform.OS === 'web') {
      console.log('[Notifications] Skipping push notification on web:', title);
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('[Notifications] Error sending push notification:', error);
    }
  }, []);

  // Set up realtime listeners for notifications
  useEffect(() => {
    if (!user) return;

    console.log('[Notifications] Setting up realtime listeners for user:', user.id);

    // Listen for friend requests
    const friendRequestChannel = supabase
      .channel(`friend-request-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[Notifications] New friend request received:', payload);

          // Fetch sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.sender_id)
            .maybeSingle();

          const senderName = sender?.username || 'Someone';

          // Show in-app notification
          showInfo(`${senderName} sent you a friend request!`, 5000);

          // Send push notification (only on native)
          await sendPushNotification(
            'New Friend Request',
            `${senderName} wants to be your friend!`,
            {
              type: 'friend_request',
              senderId: payload.new.sender_id,
              requestId: payload.new.id
            }
          );
        }
      )
      .subscribe();

    // Listen for friend request acceptances
    const friendshipChannel = supabase
      .channel(`friendship-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[Notifications] Friend request accepted:', payload);

          // Fetch friend info
          const { data: friend } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.friend_id)
            .maybeSingle();

          const friendName = friend?.username || 'Someone';

          // Show in-app notification
          showSuccess(`${friendName} accepted your friend request!`, 5000);

          // Send push notification (only on native)
          await sendPushNotification(
            'Friend Request Accepted',
            `${friendName} is now your friend!`,
            {
              type: 'friend_accepted',
              friendId: payload.new.friend_id
            }
          );
        }
      )
      .subscribe();

    // Listen for game invitations
    const gameInvitationChannel = supabase
      .channel(`game-invitation-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_invitations',
          filter: `invitee_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[Notifications] Game invitation received:', payload);

          // Check if user is already a member of THIS house
          const { data: membership } = await supabase
            .from('house_members')
            .select('id')
            .eq('house_id', payload.new.house_id)
            .eq('user_id', user.id)
            .maybeSingle();

          const isAlreadyMember = !!membership;

          // Check if user can join house (house limit check)
          // Pass house_id so function knows if user is already a member
          const { data: limitCheck } = await supabase.rpc('check_user_can_join_house', {
            user_id_param: user.id,
            house_id_param: payload.new.house_id
          });
          const canJoin = limitCheck?.can_join ?? false;

          // Show notification if user can join (function handles existing member check)
          if (canJoin) {
            // Fetch inviter, house, and game info
            const [inviterResult, houseResult, gameResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('username')
                .eq('id', payload.new.inviter_id)
                .maybeSingle(),
              supabase
                .from('houses')
                .select('name')
                .eq('id', payload.new.house_id)
                .maybeSingle(),
              supabase
                .from('games')
                .select('name')
                .eq('id', payload.new.game_id)
                .maybeSingle()
            ]);

            const inviterName = inviterResult.data?.username || 'Someone';
            const houseName = houseResult.data?.name || 'a house';
            const gameName = gameResult.data?.name || 'a game';

            // Show in-app notification with different message based on membership
            const message = isAlreadyMember
              ? `${inviterName} invited you to play ${gameName} in ${houseName}!`
              : `${inviterName} invited you to join ${houseName} and play ${gameName}!`;
            showInfo(message, 8000);

            // Send push notification (only on native)
            await sendPushNotification(
              'Game Invitation',
              `${inviterName} invited you to play ${gameName} in ${houseName}!`,
              {
                type: 'game_invite',
                inviterId: payload.new.inviter_id,
                invitationId: payload.new.id,
                gameSessionId: payload.new.game_session_id
              }
            );
          } else {
            console.log('[Notifications] Skipping notification - user has reached house limit');
          }
        }
      )
      .subscribe();

    // Listen for game invitation acceptances (notify the inviter)
    const invitationAcceptanceChannel = supabase
      .channel(`invitation-acceptance-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_invitations',
          filter: `inviter_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[Notifications] Game invitation updated:', payload);

          // Only notify if status changed to accepted
          if (payload.new.status === 'accepted' && payload.old.status === 'pending') {
            // Fetch invitee, house, and game info
            const [inviteeResult, houseResult, gameResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('username')
                .eq('id', payload.new.invitee_id)
                .maybeSingle(),
              supabase
                .from('houses')
                .select('name')
                .eq('id', payload.new.house_id)
                .maybeSingle(),
              supabase
                .from('games')
                .select('name')
                .eq('id', payload.new.game_id)
                .maybeSingle()
            ]);

            const inviteeName = inviteeResult.data?.username || 'Someone';
            const houseName = houseResult.data?.name || 'a house';
            const gameName = gameResult.data?.name || 'a game';

            // Show in-app notification
            showSuccess(`${inviteeName} accepted your invitation to play ${gameName}!`, 5000);

            // Send push notification (only on native)
            await sendPushNotification(
              'Invitation Accepted',
              `${inviteeName} has joined your game of ${gameName} in ${houseName}!`,
              {
                type: 'invitation_accepted',
                inviteeId: payload.new.invitee_id,
                gameSessionId: payload.new.game_session_id,
                houseId: payload.new.house_id
              }
            );
          }
        }
      )
      .subscribe();

    // Listen for game completions (notify all participants)
    const gameCompletionChannel = supabase
      .channel(`game-completion-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
        },
        async (payload) => {
          console.log('[Notifications] Game session updated:', payload);

          // Only notify if status changed to completed
          if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
            // Check if user was a participant in this game
            const { data: userScore } = await supabase
              .from('session_scores')
              .select('user_id, is_winner, placement')
              .eq('session_id', payload.new.id)
              .eq('user_id', user.id)
              .maybeSingle();

            // Only notify if user was a participant and they didn't complete the game themselves
            if (userScore && payload.new.created_by !== user.id) {
              // Fetch game and house info
              const [gameResult, houseResult] = await Promise.all([
                supabase
                  .from('games')
                  .select('name')
                  .eq('id', payload.new.game_id)
                  .maybeSingle(),
                supabase
                  .from('houses')
                  .select('name')
                  .eq('id', payload.new.house_id)
                  .maybeSingle()
              ]);

              const gameName = gameResult.data?.name || 'A game';
              const houseName = houseResult.data?.name || 'your house';

              // Create notification message based on result
              let message = `${gameName} in ${houseName} has ended`;
              if (userScore.is_winner) {
                message += ' - You won!';
              } else if (userScore.placement) {
                message += ` - You placed #${userScore.placement}`;
              }

              // Show in-app notification
              showInfo(message, 7000);

              // Send push notification (only on native)
              await sendPushNotification(
                'Game Completed',
                message,
                {
                  type: 'game_completed',
                  gameSessionId: payload.new.id,
                  houseId: payload.new.house_id,
                  isWinner: userScore.is_winner,
                  placement: userScore.placement
                }
              );
            }
          }
        }
      )
      .subscribe();

    // Clean up subscriptions
    return () => {
      console.log('[Notifications] Cleaning up notification listeners');
      supabase.removeChannel(friendRequestChannel);
      supabase.removeChannel(friendshipChannel);
      supabase.removeChannel(gameInvitationChannel);
      supabase.removeChannel(invitationAcceptanceChannel);
      supabase.removeChannel(gameCompletionChannel);
    };
  }, [user, showInfo, showSuccess, sendPushNotification]);

  // Handle notification responses (when user taps notification) - only on native
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[Notifications] Notification tapped:', data);

      if (data.type === 'friend_request') {
        router.push('/(tabs)/friends');
      } else if (data.type === 'friend_accepted') {
        router.push('/(tabs)/friends');
      } else if (data.type === 'game_invite') {
        router.push('/(tabs)/friends');
      } else if (data.type === 'invitation_accepted') {
        // Navigate to the game session if available
        if (data.gameSessionId) {
          router.push(`/game-session/${data.gameSessionId}?existingSessionId=${data.gameSessionId}`);
        } else if (data.houseId) {
          router.push(`/house/${data.houseId}`);
        } else {
          router.push('/(tabs)');
        }
      } else if (data.type === 'game_completed') {
        // Navigate to the house to see game history
        if (data.houseId) {
          router.push(`/house/${data.houseId}`);
        } else {
          router.push('/(tabs)');
        }
      }
    });

    return () => subscription.remove();
  }, [router]);

  // Request permissions on mount (only on native)
  useEffect(() => {
    if (user && Platform.OS !== 'web') {
      requestPermissions();
    }
  }, [user, requestPermissions]);

  return (
    <NotificationContext.Provider value={{ requestPermissions }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
