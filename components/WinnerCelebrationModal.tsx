import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Crown, Star, X, Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';

type Winner = {
  id: string;
  nickname: string;
  score: number;
};

function formatDisplayScore(score: number): string {
  if (score >= 1000000) {
    return (score / 1000000).toFixed(2) + 'M';
  }
  if (score >= 1000) {
    return (score / 1000).toFixed(2) + 'K';
  }
  if (score % 1 === 0) {
    return score.toString();
  }
  return score.toFixed(2);
}

type WinnerCelebrationModalProps = {
  visible: boolean;
  winners: Winner[];
  isTie: boolean;
  onClose: () => void;
  badgeAwarded?: {
    name: string;
    icon: string;
  };
};

export default function WinnerCelebrationModal({
  visible,
  winners,
  isTie,
  onClose,
  badgeAwarded,
}: WinnerCelebrationModalProps) {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );

      rotate.value = withRepeat(
        withSequence(
          withTiming(10, { duration: 300, easing: Easing.ease }),
          withTiming(-10, { duration: 300, easing: Easing.ease }),
          withTiming(0, { duration: 300, easing: Easing.ease })
        ),
        3,
        false
      );

      sparkleOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.3, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      scale.value = 0;
      sparkleOpacity.value = 0;
    }
  }, [visible]);

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  if (!visible || winners.length === 0) return null;

  const winner = winners[0];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#0F172A', '#1E293B', '#0F172A']}
            style={styles.gradient}
          >
            <View style={styles.content}>
              <Animated.View style={[styles.trophyContainer, trophyStyle]}>
                <LinearGradient
                  colors={isTie ? ['#3B82F6', '#2563EB'] : ['#F59E0B', '#D97706']}
                  style={styles.trophyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isTie ? (
                    <Star size={72} color="#FFFFFF" fill="#FFFFFF" />
                  ) : (
                    <Trophy size={72} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </LinearGradient>
              </Animated.View>

              <View style={styles.details}>
                {isTie ? (
                  <>
                    <Text style={styles.tieTitle}>It's a Tie!</Text>
                    <Text style={styles.subtitle}>Amazing performance by all winners</Text>
                    <View style={styles.winnersContainer}>
                      {winners.map((w, index) => (
                        <View key={w.id} style={styles.winnerCard}>
                          <Crown size={24} color="#F59E0B" fill="#F59E0B" />
                          <View style={styles.winnerInfo}>
                            <Text style={styles.winnerName}>{w.nickname}</Text>
                            <Text style={styles.winnerScore}>{formatDisplayScore(w.score)} points</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.title}>Victory!</Text>
                    <View style={styles.winnerCard}>
                      <Crown size={32} color="#F59E0B" fill="#F59E0B" />
                      <View style={styles.winnerInfo}>
                        <Text style={styles.winnerName}>{winner.nickname}</Text>
                        <Text style={styles.winnerSubtitle}>Champion</Text>
                      </View>
                    </View>
                    <View style={styles.scoreContainer}>
                      <Text style={styles.scoreLabel}>Final Score</Text>
                      <Text style={styles.scoreHighlight} numberOfLines={1} adjustsFontSizeToFit>{formatDisplayScore(winner.score)}</Text>
                      <Text style={styles.scoreUnit}>points</Text>
                    </View>
                  </>
                )}

                {badgeAwarded && (
                  <View style={styles.badgeAward}>
                    <View style={styles.badgeIcon}>
                      <Text style={styles.badgeEmoji}>{badgeAwarded.icon}</Text>
                    </View>
                    <View style={styles.badgeInfo}>
                      <Text style={styles.badgeLabel}>Badge Unlocked!</Text>
                      <Text style={styles.badgeText}>{badgeAwarded.name}</Text>
                    </View>
                  </View>
                )}
              </View>

              <Pressable style={styles.continueButton} onPress={onClose}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                </LinearGradient>
              </Pressable>
            </View>

            <Animated.View style={[styles.sparkle, styles.sparkle1, sparkleStyle]}>
              <Sparkles size={24} color="#F59E0B" />
            </Animated.View>
            <Animated.View style={[styles.sparkle, styles.sparkle2, sparkleStyle]}>
              <Sparkles size={28} color="#F59E0B" />
            </Animated.View>
            <Animated.View style={[styles.sparkle, styles.sparkle3, sparkleStyle]}>
              <Sparkles size={22} color="#F59E0B" />
            </Animated.View>
            <Animated.View style={[styles.sparkle, styles.sparkle4, sparkleStyle]}>
              <Sparkles size={20} color="#F59E0B" />
            </Animated.View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  gradient: {
    padding: 40,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  trophyContainer: {
    marginBottom: 12,
  },
  trophyGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  details: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(245, 158, 11, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tieTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#3B82F6',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 8,
  },
  winnersContainer: {
    width: '100%',
    gap: 12,
  },
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    width: '100%',
  },
  winnerInfo: {
    flex: 1,
    gap: 4,
  },
  winnerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  winnerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  winnerScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: 8,
    gap: 4,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreHighlight: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F59E0B',
    textShadowColor: 'rgba(245, 158, 11, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    maxWidth: '100%',
  },
  scoreUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  badgeAward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginTop: 12,
    width: '100%',
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeInfo: {
    flex: 1,
    gap: 2,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    width: '100%',
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 80,
    left: 40,
  },
  sparkle2: {
    top: 120,
    right: 50,
  },
  sparkle3: {
    bottom: 140,
    left: 50,
  },
  sparkle4: {
    bottom: 100,
    right: 40,
  },
});
