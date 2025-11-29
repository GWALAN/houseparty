import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users } from 'lucide-react-native';
import BannerRenderer from './BannerRenderer';
import { safeArrayFromColors, getContrastTextColor, isLightGradient } from '@/lib/colorUtils';

type HouseCardProps = {
  house: {
    id: string;
    name: string;
    house_emoji?: string;
    member_count: number;
    role?: string;
    creator_nickname?: string;
    custom_theme_colors?: string[];
    kit_rarity?: string;
    kit_name?: string;
  };
  hasPendingInvites?: boolean;
  isInvitedHouse?: boolean;
  pendingCount?: number;
  onPress: () => void;
};

export default function HouseCard({
  house,
  hasPendingInvites = false,
  isInvitedHouse = false,
  pendingCount = 0,
  onPress,
}: HouseCardProps) {
  const safeColors = React.useMemo(() => {
    return safeArrayFromColors(house.custom_theme_colors);
  }, [house.custom_theme_colors]);

  const hasAppliedKit = safeColors && safeColors.length > 0;
  const defaultGradient: [string, string] = ['#10B981', '#059669'];

  // Determine text color based on background brightness
  const textColor = React.useMemo(() => {
    if (!hasAppliedKit || !safeColors) return '#FFFFFF';
    return isLightGradient(safeColors) ? '#000000' : '#FFFFFF';
  }, [hasAppliedKit, safeColors]);

  const iconColor = textColor;

  const getGradientColors = (): [string, string] => {
    if (!hasAppliedKit || !safeColors) return defaultGradient;

    if (safeColors.length === 1) {
      return [safeColors[0], safeColors[0]];
    }
    return [safeColors[0], safeColors[1]];
  };

  const renderContent = () => (
    <View style={styles.contentWrapper}>
      <View style={styles.houseHeader}>
        <View style={styles.houseTitleRow}>
          {house.house_emoji && (
            <Text style={styles.houseEmoji}>{house.house_emoji}</Text>
          )}
          <Text style={[styles.houseName, { color: textColor }]} numberOfLines={1}>
            {house.name}
          </Text>
        </View>
        {hasPendingInvites && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>
              {isInvitedHouse
                ? 'PENDING INVITE'
                : pendingCount > 1
                ? `${pendingCount} NEW`
                : 'NEW'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.houseInfo}>
        <Users size={16} color={iconColor} />
        <Text style={[styles.memberCount, { color: textColor }]}>{house.member_count} members</Text>
      </View>

      {house.creator_nickname && (
        <Text style={[styles.creatorNickname, { color: textColor }]}>
          House Master: {house.creator_nickname}
        </Text>
      )}

      {house.role === 'admin' && (
        <View style={styles.adminBadge}>
          <Text style={[styles.adminText, { color: textColor }]}>Admin</Text>
        </View>
      )}
    </View>
  );

  return (
    <Pressable style={styles.houseCard} onPress={onPress}>
      <View style={styles.cardContainer}>
        {hasAppliedKit && safeColors ? (
          <>
            <BannerRenderer
              colors={safeColors}
              rarity={house.kit_rarity as any}
              kitName={house.kit_name || undefined}
              size="large"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.houseGradient}>
              {renderContent()}
            </View>
          </>
        ) : (
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.houseGradient}
          >
            {renderContent()}
          </LinearGradient>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  houseCard: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: Platform.OS === 'android' ? 200 : 140,
    height: Platform.OS === 'android' ? 200 : undefined,
  },
  cardContainer: {
    flex: 1,
    position: 'relative',
    minHeight: Platform.OS === 'android' ? 200 : 140,
    height: Platform.OS === 'android' ? 200 : undefined,
  },
  houseGradient: {
    paddingVertical: Platform.OS === 'android' ? 18 : 20,
    paddingHorizontal: 20,
    minHeight: Platform.OS === 'android' ? 200 : 140,
    height: Platform.OS === 'android' ? 200 : undefined,
    justifyContent: 'center',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  houseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  houseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  houseEmoji: {
    fontSize: 28,
  },
  houseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flexShrink: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  houseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberCount: {
    fontSize: 14,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  creatorNickname: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  adminBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
