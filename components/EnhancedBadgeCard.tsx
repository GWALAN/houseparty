import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Sparkles, Star } from 'lucide-react-native';
import Svg, { Path, Defs, RadialGradient, Stop, Polygon } from 'react-native-svg';
import { safeFontSize } from '@/lib/validation';

type RarityConfig = {
  colors: [string, string, ...string[]];
  accentColor: string;
  glowColor: string;
  shadowIntensity: number;
};

const RARITY_CONFIGS: Record<string, RarityConfig> = {
  common: {
    colors: ['#64748B', '#475569'],
    accentColor: '#94A3B8',
    glowColor: '#64748B',
    shadowIntensity: 0.2,
  },
  uncommon: {
    colors: ['#10B981', '#059669'],
    accentColor: '#34D399',
    glowColor: '#10B981',
    shadowIntensity: 0.3,
  },
  rare: {
    colors: ['#3B82F6', '#2563EB'],
    accentColor: '#60A5FA',
    glowColor: '#3B82F6',
    shadowIntensity: 0.4,
  },
  epic: {
    colors: ['#A855F7', '#9333EA'],
    accentColor: '#C084FC',
    glowColor: '#A855F7',
    shadowIntensity: 0.5,
  },
  legendary: {
    colors: ['#F59E0B', '#FBBF24'],
    accentColor: '#FCD34D',
    glowColor: '#F59E0B',
    shadowIntensity: 0.7,
  },
  mythic: {
    colors: ['#EC4899', '#DB2777'],
    accentColor: '#F472B6',
    glowColor: '#EC4899',
    shadowIntensity: 0.8,
  },
};

type BadgeProps = {
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
    requirement?: string;
  };
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onPress?: () => void;
};

function DiamondShape({ colors, size = 64, accentColor }: { colors: [string, string, ...string[]]; size?: number; accentColor: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id="gemGradient" cx="50%" cy="40%">
          <Stop offset="0%" stopColor={accentColor} stopOpacity="1" />
          <Stop offset="70%" stopColor={colors[0]} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors[1]} stopOpacity="1" />
        </RadialGradient>
      </Defs>

      <Polygon
        points="32,8 48,24 32,56 16,24"
        fill="url(#gemGradient)"
        stroke={accentColor}
        strokeWidth="2"
      />

      <Path
        d="M 32 8 L 32 24"
        stroke={accentColor}
        strokeWidth="1.5"
        opacity="0.4"
      />
      <Path
        d="M 16 24 L 32 24 L 48 24"
        stroke={accentColor}
        strokeWidth="1.5"
        opacity="0.6"
      />
      <Path
        d="M 16 24 L 32 56"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="1"
      />
      <Path
        d="M 48 24 L 32 56"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="1"
      />
      <Path
        d="M 24 18 L 32 24 L 40 18"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
        opacity="0.5"
      />
    </Svg>
  );
}

export default function EnhancedBadgeCard({ badge, size = 'medium', showDetails = false, onPress }: BadgeProps) {
  const config = RARITY_CONFIGS[badge.rarity.toLowerCase()] || RARITY_CONFIGS.common;
  const isLocked = !badge.isUnlocked;

  const rawDimensions = {
    small: { width: 80, height: 80, iconSize: 48, fontSize: 10 },
    medium: { width: 100, height: 120, iconSize: 56, fontSize: 12 },
    large: { width: 140, height: 180, iconSize: 72, fontSize: 14 },
  }[size];

  const dimensions = {
    width: Math.max(rawDimensions.width, 60),
    height: Math.max(rawDimensions.height, 60),
    iconSize: Math.max(rawDimensions.iconSize, 24),
    fontSize: Math.max(rawDimensions.fontSize, 10),
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        {
          width: showDetails ? '100%' : dimensions.width,
          minHeight: showDetails ? 140 : dimensions.height,
        },
        isLocked && styles.locked,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            shadowColor: config.glowColor,
            shadowOpacity: isLocked ? 0 : config.shadowIntensity,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: isLocked ? 0 : 8,
          },
        ]}
      >
        <LinearGradient
          colors={isLocked ? ['#1E293B', '#0F172A'] : config.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {!showDetails ? (
            <View style={styles.compactContent}>
              {isLocked ? (
                <View style={styles.lockedContainer}>
                  <View style={styles.lockedIconBadge}>
                    <Text style={[styles.badgeIcon, { fontSize: safeFontSize(dimensions.iconSize * 0.45), opacity: 0.3 }]}>
                      {badge.icon}
                    </Text>
                    <View style={styles.lockOverlay}>
                      <Lock size={dimensions.iconSize * 0.4} color="#64748B" />
                    </View>
                  </View>
                  <Text style={[styles.lockedText, { fontSize: safeFontSize(dimensions.fontSize) }]}>Locked</Text>
                </View>
              ) : (
                <>
                  <View style={styles.diamondContainer}>
                    <DiamondShape
                      colors={config.colors}
                      size={dimensions.iconSize}
                      accentColor={config.accentColor}
                    />
                    <View style={styles.iconOverlay}>
                      <Text style={[styles.badgeIcon, { fontSize: safeFontSize(dimensions.iconSize * 0.45) }]}>
                        {badge.icon}
                      </Text>
                    </View>
                  </View>

                  {size !== 'small' && (
                    <Text style={[styles.badgeName, { fontSize: safeFontSize(dimensions.fontSize) }]} numberOfLines={2}>
                      {badge.name}
                    </Text>
                  )}
                </>
              )}
            </View>
          ) : (
            <View style={styles.detailedContent}>
              <View style={styles.detailedLeft}>
                {isLocked ? (
                  <View style={[styles.lockedContainer, styles.detailedIcon]}>
                    <Lock size={32} color="#64748B" />
                  </View>
                ) : (
                  <View style={styles.detailedIcon}>
                    <DiamondShape
                      colors={config.colors}
                      size={64}
                      accentColor={config.accentColor}
                    />
                    <View style={styles.iconOverlay}>
                      <Text style={styles.detailedIconText}>{badge.icon}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.detailedRight}>
                <Text style={[styles.detailedName, isLocked && styles.lockedTextColor]}>
                  {badge.name}
                </Text>
                <Text style={[styles.detailedDescription, isLocked && styles.lockedTextColor]}>
                  {badge.description}
                </Text>

                {badge.requirement && (
                  <View style={styles.requirementContainer}>
                    <Star size={12} color={config.accentColor} />
                    <Text style={styles.requirementText}>{badge.requirement}</Text>
                  </View>
                )}

                {badge.progress !== undefined && badge.progressTarget && !badge.isUnlocked && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <LinearGradient
                        colors={config.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.progressFill,
                          { width: `${Math.min((badge.progress / badge.progressTarget) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {badge.progress} / {badge.progressTarget}
                    </Text>
                  </View>
                )}

                {!isLocked && (
                  <View style={[styles.rarityBadge, { backgroundColor: config.glowColor + '33' }]}>
                    <Sparkles size={10} color={config.accentColor} />
                    <Text style={[styles.rarityText, { color: config.accentColor }]}>
                      {badge.rarity.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {!isLocked && !showDetails && (
            <View style={[styles.rarityDot, { backgroundColor: config.accentColor }]} />
          )}
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  locked: {
    opacity: 0.6,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  gradient: {
    flex: 1,
    padding: 12,
  },
  compactContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontWeight: '700',
  },
  badgeName: {
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lockedText: {
    fontWeight: '600',
    color: '#64748B',
  },
  lockedTextColor: {
    color: '#94A3B8',
  },
  lockedIconBadge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailedContent: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  detailedLeft: {
    width: 80,
    alignItems: 'center',
  },
  detailedIcon: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailedIconText: {
    fontSize: 32,
  },
  detailedRight: {
    flex: 1,
    gap: 6,
  },
  detailedName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailedDescription: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  requirementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
    gap: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
