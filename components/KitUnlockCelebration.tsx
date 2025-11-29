import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Sparkles, X } from 'lucide-react-native';
import BannerRenderer from './BannerRenderer';
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';

type Props = {
  visible: boolean;
  kitName: string;
  kitRarity: 'legendary' | 'mythic';
  onClose: () => void;
};

export default function KitUnlockCelebration({ visible, kitName, kitRarity, onClose }: Props) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setShowContent(true), 100);
    } else {
      setShowContent(false);
    }
  }, [visible]);

  const getKitColors = (): string[] => {
    return kitRarity === 'mythic'
      ? ['#EC4899', '#DB2777', '#BE185D']
      : ['#F59E0B', '#FBBF24', '#F59E0B'];
  };

  const getRarityColor = () => {
    return kitRarity === 'mythic' ? '#EC4899' : '#F59E0B';
  };

  const getRarityGradient = () => {
    return kitRarity === 'mythic'
      ? ['#EC4899', '#8B5CF6', '#EC4899']
      : ['#F59E0B', '#FBBF24', '#F59E0B'];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} style={styles.container}>
        <View style={styles.backdrop} />

        <View style={styles.contentWrapper}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </Pressable>

          {showContent && (
            <>
              <View style={styles.iconContainer}>
                {kitRarity === 'mythic' ? (
                  <Sparkles size={64} color={getRarityColor()} fill={getRarityColor()} />
                ) : (
                  <Crown size={64} color={getRarityColor()} fill={getRarityColor()} />
                )}
              </View>

              <Text style={styles.congratsText}>CONGRATULATIONS!</Text>

              <View style={styles.rarityBadge}>
                <LinearGradient
                  colors={getRarityGradient() as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.rarityGradient}
                >
                  <Text style={styles.rarityText}>{kitRarity.toUpperCase()}</Text>
                </LinearGradient>
              </View>

              <Text style={styles.unlockText}>You unlocked a rare kit!</Text>

              <View style={styles.bannerPreview}>
                <BannerRenderer
                  colors={getKitColors()}
                  rarity={kitRarity}
                  size="large"
                  style={{ width: '100%', height: 140 }}
                />
              </View>

              <Text style={styles.kitName}>{kitName}</Text>

              <View style={styles.descriptionBox}>
                <Text style={styles.description}>
                  {kitRarity === 'mythic'
                    ? 'An ultra-rare kit awarded to the most fortunate winners. Only 0.015% of wins unlock this treasure!'
                    : 'A legendary kit that appears to the lucky few. Only 0.025% of games reveal this prize!'}
                </Text>
              </View>

              <Pressable style={styles.actionButton} onPress={onClose}>
                <LinearGradient
                  colors={getRarityGradient() as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>View Collection</Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.particles}>
                {[...Array(20)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.particle,
                      {
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        backgroundColor: getRarityColor(),
                        opacity: Math.random() * 0.6 + 0.2,
                      },
                    ]}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  congratsText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  rarityBadge: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rarityGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  rarityText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  unlockText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  bannerPreview: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  kitName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  descriptionBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  description: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  particles: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
