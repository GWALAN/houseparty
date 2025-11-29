import { Modal, View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { BlurView } from 'expo-blur';
import BannerRenderer from './BannerRenderer';
import { Sparkles, X } from 'lucide-react-native';

type BannerUnlockModalProps = {
  visible: boolean;
  bannerId: string;
  bannerName: string;
  rarity: 'legendary' | 'mythic';
  colors: string[];
  glowColor?: string;
  onClose: () => void;
};

export default function BannerUnlockModal({
  visible,
  bannerId,
  bannerName,
  rarity,
  colors,
  glowColor,
  onClose,
}: BannerUnlockModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      sparkleAnim.setValue(0);
    }
  }, [visible]);

  const rarityColor = rarity === 'mythic' ? '#EC4899' : '#F59E0B';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.content}>
            <Animated.View
              style={[
                styles.sparkleContainer,
                {
                  opacity: sparkleAnim,
                },
              ]}
            >
              <Sparkles size={32} color={rarityColor} fill={rarityColor} />
            </Animated.View>

            <Text style={styles.title}>Congratulations!</Text>
            <Text style={styles.subtitle}>
              You've unlocked a {rarity} banner!
            </Text>

            <View style={styles.bannerContainer}>
              <BannerRenderer
                colors={colors}
                rarity={rarity}
                glowColor={glowColor}
                size="large"
              />
            </View>

            <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
              <Text style={styles.rarityText}>{rarity.toUpperCase()}</Text>
            </View>

            <Text style={styles.bannerName}>{bannerName}</Text>

            <Text style={styles.description}>
              This exclusive banner is now available in your collection and can be equipped from the shop.
            </Text>

            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Awesome!</Text>
            </Pressable>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  sparkleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 24,
  },
  bannerContainer: {
    marginVertical: 24,
  },
  rarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  rarityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bannerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
