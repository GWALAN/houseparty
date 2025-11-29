import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';

type BadgeUnlockedToastProps = {
  visible: boolean;
  badge?: {
    name: string;
    description: string;
    icon: string;
    rarity: string;
  };
  onClose: () => void;
};

export default function BadgeUnlockedToast({ visible, badge, onClose }: BadgeUnlockedToastProps) {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (visible && badge) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
      rotate.value = withSequence(
        withSpring(10, { damping: 8 }),
        withSpring(-10, { damping: 8 }),
        withSpring(0, { damping: 10 })
      );

      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      scale.value = 0;
    }
  }, [visible, badge]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
  }));

  const getRarityColors = (rarity: string): string[] => {
    switch (rarity) {
      case 'common': return ['#6B7280', '#4B5563'];
      case 'uncommon': return ['#10B981', '#059669'];
      case 'rare': return ['#3B82F6', '#2563EB'];
      case 'epic': return ['#A855F7', '#9333EA'];
      case 'legendary': return ['#F59E0B', '#D97706'];
      default: return ['#6B7280', '#4B5563'];
    }
  };

  if (!visible || !badge) return null;

  const colors = getRarityColors(badge.rarity);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.gradient}
          >
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </Pressable>

            <View style={styles.content}>
              <View style={styles.header}>
                <Sparkles size={20} color="#F59E0B" />
                <Text style={styles.title}>Badge Unlocked!</Text>
                <Sparkles size={20} color="#F59E0B" />
              </View>

              <Animated.View style={[styles.badgeContainer, animatedStyle]}>
                <LinearGradient
                  colors={colors as [string, string, ...string[]]}
                  style={styles.badgeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                </LinearGradient>
              </Animated.View>

              <View style={styles.details}>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
                <View style={styles.rarityBadge}>
                  <Text style={styles.rarityText}>{badge.rarity.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.sparkles}>
                <Sparkles size={16} color="#F59E0B" style={styles.sparkle1} />
                <Sparkles size={20} color="#F59E0B" style={styles.sparkle2} />
                <Sparkles size={14} color="#F59E0B" style={styles.sparkle3} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  gradient: {
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  badgeContainer: {
    marginBottom: 24,
  },
  badgeGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  badgeIcon: {
    fontSize: 64,
  },
  details: {
    alignItems: 'center',
    gap: 8,
  },
  badgeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 8,
  },
  rarityBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  sparkles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  sparkle1: {
    position: 'absolute',
    top: 80,
    left: 20,
  },
  sparkle2: {
    position: 'absolute',
    top: 100,
    right: 30,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 100,
    left: 40,
  },
});
