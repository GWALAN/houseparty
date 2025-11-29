import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'expo-router';
import UserAvatar from './UserAvatar';
import { Colors } from '@/constants/Colors';

type GameInvitationCardProps = {
  invitation: {
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
  onResponse: () => void;
};

export default function GameInvitationCard({ invitation, onResponse }: GameInvitationCardProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_game_invitation', {
        invitation_id: invitation.id
      });

      if (error) {
        console.error('[GAME INVITATION] Error accepting:', error);
        showError('Failed to accept invitation');
        setLoading(false);
        return;
      }

      if (data && data.success) {
        const message = data.already_member
          ? `Ready to play ${data.game_name}!`
          : `Joined ${data.house_name}!`;
        showSuccess(message, 3000);

        // Note: Score entry is handled by realtime subscription in game-session screen
        // Navigate to game session
        router.push(`/game-session/${data.game_session_id}`);
        onResponse();
      } else {
        showError(data?.error || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('[GAME INVITATION] Exception:', err);
      showError('An error occurred');
    }
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('decline_game_invitation', {
        invitation_id: invitation.id
      });

      if (error) {
        console.error('[GAME INVITATION] Error declining:', error);
        showError('Failed to decline invitation');
        setLoading(false);
        return;
      }

      if (data && data.success) {
        showSuccess('Invitation declined', 2000);
        onResponse();
      } else {
        showError(data?.error || 'Failed to decline invitation');
      }
    } catch (err) {
      console.error('[GAME INVITATION] Exception:', err);
      showError('An error occurred');
    }
    setLoading(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.inviterInfo}>
          <UserAvatar
            userId={invitation.inviter_id}
            size={40}
            username={invitation.inviter?.username}
            avatarUrl={invitation.inviter?.avatar_url}
          />
          <View style={styles.headerText}>
            <Text style={styles.inviterName}>{invitation.inviter?.username || 'Someone'}</Text>
            <Text style={styles.inviteText}>invited you to play</Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.emoji}>{invitation.house?.house_emoji || '🏠'}</Text>
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>House</Text>
            <Text style={styles.detailValue}>{invitation.house?.name || 'Unknown House'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.emoji}>{invitation.game?.game_emoji || '🎮'}</Text>
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Game</Text>
            <Text style={styles.detailValue}>{invitation.game?.name || 'Unknown Game'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.declineButton,
            pressed && styles.buttonPressed
          ]}
          onPress={handleDecline}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <>
              <X size={20} color={Colors.error} />
              <Text style={styles.declineText}>Decline</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.acceptButtonContainer,
            pressed && styles.buttonPressed
          ]}
          onPress={handleAccept}
          disabled={loading}
        >
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.acceptButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={20} color="#fff" />
                <Text style={styles.acceptText}>Accept</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    marginBottom: 16,
  },
  inviterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  inviterName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  inviteText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  details: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 24,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  acceptButtonContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  declineText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  acceptText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});