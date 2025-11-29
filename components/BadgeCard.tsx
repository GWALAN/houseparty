import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Sparkles } from 'lucide-react-native';
import AnimatedGlow from './AnimatedGlow';

type RarityConfig = {
  colors: string[];
  borderWidth: number;
  borderColor: string | null;
  borderRadius: number;
  hasGradient: boolean;
  glowColor: string | null;
  glowIntensity: number;
  shadowRadius: number;
  shadowOpacity: number;
  hasAnimation: boolean;
};

const RARITY_STYLES: Record<string, RarityConfig> = {
  common: {
    colors: ['#64748B'],
    borderWidth: 0,
    borderColor: null,
    borderRadius: 16,
    hasGradient: false,
    glowColor: null,
    glowIntensity: 0,
    shadowRadius: 0,
    shadowOpacity: 0,
    hasAnimation: false,
  },
  uncommon: {
    colors: ['#10B981', '#059669'],
    borderWidth: 0,
    borderColor: null,
    borderRadius: 16,
    hasGradient: true,
    glowColor: null,
    glowIntensity: 0,
    shadowRadius: 0,
    shadowOpacity: 0,
    hasAnimation: false,
  },
  rare: {
    colors: ['#60A5FA', '#3B82F6', '#2563EB'],
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 18,
    hasGradient: true,
    glowColor: '#3B82F6',
    glowIntensity: 0.3,
    shadowRadius: 6,
    shadowOpacity: 0.4,
    hasAnimation: false,
  },
  epic: {
    colors: ['#A855F7', '#9333EA'],
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    borderRadius: 18,
    hasGradient: true,
    glowColor: '#A855F7',
    glowIntensity: 0.5,
    shadowRadius: 8,
    shadowOpacity: 0.6,
    hasAnimation: false,
  },
  legendary: {
    colors: ['#F59E0B', '#FBBF24'],
    borderWidth: 3,
    borderColor: '#F59E0B',
    borderRadius: 18,
    hasGradient: true,
    glowColor: '#F59E0B',
    glowIntensity: 0.8,
    shadowRadius: 12,
    shadowOpacity: 0.8,
    hasAnimation: true,
  },
  mythic: {
    colors: ['#EC4899', '#DB2777'],
    borderWidth: 4,
    borderColor: '#EC4899',
    borderRadius: 20,
    hasGradient: true,
    glowColor: '#EC4899',
    glowIntensity: 1,
    shadowRadius: 14,
    shadowOpacity: 0.9,
    hasAnimation: true,
  },
};

function getRarityStyle(rarity: string): RarityConfig {
  return RARITY_STYLES[rarity.toLowerCase()] || RARITY_STYLES.common;
}

function getRarityColors(rarity: string): string[] {
  return getRarityStyle(rarity).colors;
}

function getRarityBorderStyle(rarity: string) {
  const config = getRarityStyle(rarity);
  return {
    borderWidth: config.borderWidth,
    borderColor: config.borderColor || 'transparent',
    borderRadius: config.borderRadius,
  };
}

function getRarityGlowStyle(rarity: string) {
  const config = getRarityStyle(rarity);
  if (!config.glowColor) return {};
  return {
    shadowColor: config.glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: config.shadowOpacity,
    shadowRadius: config.shadowRadius,
    elevation: config.shadowRadius,
  };
}

type BadgeCardProps = {
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
    category: string;
    isUnlocked?: boolean;
    progress?: number;
    progressTarget?: number;
    earnedAt?: string;
  };
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
};

export default function BadgeCard({ badge, size = 'medium', onPress }: BadgeCardProps) {
  const rarityConfig = getRarityStyle(badge.rarity);
  const colors = getRarityColors(badge.rarity);
  const borderStyle = getRarityBorderStyle(badge.rarity);
  const glowStyle = getRarityGlowStyle(badge.rarity);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          icon: styles.iconSmall,
          name: styles.nameSmall,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          icon: styles.iconLarge,
          name: styles.nameLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          icon: styles.iconMedium,
          name: styles.nameMedium,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const isLocked = !badge.isUnlocked;

  const cardContent = (
    <View
      style={[
        styles.cardContainer,
        borderStyle,
        !rarityConfig.hasAnimation && glowStyle,
      ]}
    >
      {rarityConfig.hasGradient && !isLocked ? (
        <LinearGradient
          colors={colors as [string, string, ...string[]]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {renderContent()}
        </LinearGradient>
      ) : (
        <View style={[styles.gradient, { backgroundColor: isLocked ? '#1E293B' : colors[0] }]}>
          {renderContent()}
        </View>
      )}
    </View>
  );

  function renderContent() {
    return (
      <View style={styles.content}>
        {isLocked && (
          <View style={styles.lockOverlay}>
            <Lock size={24} color="#64748B" />
          </View>
        )}

        <View style={styles.iconContainer}>
          <Text style={[sizeStyles.icon, isLocked && styles.lockedIcon]}>
            {isLocked ? '🔒' : badge.icon}
          </Text>
        </View>

        {size !== 'small' && (
          <>
            <Text style={[sizeStyles.name, isLocked && styles.lockedText]}>
              {isLocked ? '???' : badge.name}
            </Text>

            {size === 'large' && (
              <>
                <Text style={[styles.description, isLocked && styles.lockedText]}>
                  {isLocked ? 'Keep playing to unlock!' : badge.description}
                </Text>

                {badge.progress !== undefined && badge.progressTarget && !badge.isUnlocked && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${(badge.progress / badge.progressTarget) * 100}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {badge.progress} / {badge.progressTarget}
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {!isLocked && size === 'large' && (
          <View style={styles.rarityBadge}>
            <Sparkles size={12} color="#FFFFFF" />
            <Text style={styles.rarityText}>{badge.rarity.toUpperCase()}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.wrapper,
        sizeStyles.container,
        isLocked && styles.locked,
      ]}
    >
      {rarityConfig.hasAnimation && !isLocked ? (
        <AnimatedGlow
          glowColor={rarityConfig.glowColor || '#FFD700'}
          intensity={rarityConfig.glowIntensity}
          shadowRadius={rarityConfig.shadowRadius}
          enabled={true}
          style={{ flex: 1 }}
        >
          {cardContent}
        </AnimatedGlow>
      ) : (
        cardContent
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  cardContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  containerSmall: {
    width: 60,
    height: 60,
  },
  containerMedium: {
    width: 100,
    height: 120,
  },
  containerLarge: {
    width: '100%',
    minHeight: 160,
  },
  gradient: {
    flex: 1,
    padding: 12,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  locked: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconSmall: {
    fontSize: 32,
  },
  iconMedium: {
    fontSize: 40,
  },
  iconLarge: {
    fontSize: 56,
  },
  lockedIcon: {
    opacity: 0.3,
  },
  nameSmall: {
    display: 'none',
  },
  nameMedium: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  nameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 12,
  },
  lockedText: {
    color: '#94A3B8',
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
