import React, { useState } from 'react';
import { Image, Text, View, StyleSheet, ImageStyle, TextStyle } from 'react-native';
import { getEmojiAsset, hasEmojiAsset } from '@/lib/emojiMap';

export type EmojiSize = 'small' | 'medium' | 'large' | 'xlarge' | number;

type Emoji3DProps = {
  /** The Unicode emoji character to display */
  emoji: string;
  /** Size preset or custom number */
  size?: EmojiSize;
  /** Optional custom style for the image */
  style?: ImageStyle;
  /** Optional fallback behavior: 'text' (default) or 'hidden' */
  fallback?: 'text' | 'hidden';
  /** Enable/disable 3D rendering (for debugging) */
  use3D?: boolean;
};

/**
 * Emoji3D Component
 *
 * Renders Unicode emojis as Microsoft Fluent 3D PNG images with automatic fallback.
 *
 * Features:
 * - Automatically loads 3D PNG for supported emojis
 * - Falls back to native Unicode emoji if no 3D asset found
 * - Handles loading and error states gracefully
 * - Supports preset sizes (small, medium, large) and custom pixel sizes
 * - Optimized with React Native's require() for better bundling
 *
 * @example
 * ```tsx
 * <Emoji3D emoji="🏠" size="large" />
 * <Emoji3D emoji="🎮" size={40} />
 * <Emoji3D emoji="❤️" size="medium" fallback="hidden" />
 * ```
 */
export default function Emoji3D({
  emoji,
  size = 'medium',
  style,
  fallback = 'text',
  use3D = true,
}: Emoji3DProps) {
  const [imageError, setImageError] = useState(false);

  // Convert size preset to pixel value
  const getPixelSize = (): number => {
    if (typeof size === 'number') return size;

    switch (size) {
      case 'small': return 20;
      case 'medium': return 28;
      case 'large': return 40;
      case 'xlarge': return 56;
      default: return 28;
    }
  };

  const pixelSize = getPixelSize();

  // Check if 3D asset exists and we should use it
  const has3DAsset = hasEmojiAsset(emoji);
  const should3D = use3D && has3DAsset && !imageError;

  // If we should render 3D
  if (should3D) {
    try {
      const assetSource = getEmojiAsset(emoji);

      if (!assetSource) {
        throw new Error('Asset not found');
      }

      return (
        <Image
          source={assetSource}
          style={[
            styles.emoji3D,
            { width: pixelSize, height: pixelSize },
            style,
          ]}
          onError={() => setImageError(true)}
          resizeMode="contain"
        />
      );
    } catch (error) {
      // If require() fails, fall through to fallback
      console.warn(`[Emoji3D] Failed to load 3D asset for ${emoji}:`, error);
    }
  }

  // Fallback rendering
  if (fallback === 'hidden') {
    return null;
  }

  // Fallback to native Unicode emoji
  return (
    <Text
      style={[
        styles.emojiText,
        { fontSize: pixelSize * 0.9 }, // Slightly smaller to match 3D size
        style as TextStyle,
      ]}
    >
      {emoji}
    </Text>
  );
}

/**
 * Helper component for rendering multiple emojis in a row
 */
export function Emoji3DGroup({
  emojis,
  size = 'medium',
  spacing = 4,
}: {
  emojis: string[];
  size?: EmojiSize;
  spacing?: number;
}) {
  return (
    <View style={[styles.emojiGroup, { gap: spacing }]}>
      {emojis.map((emoji, index) => (
        <Emoji3D key={`${emoji}-${index}`} emoji={emoji} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emoji3D: {
    // Image will handle its own sizing
  },
  emojiText: {
    // Unicode emoji rendering
    textAlign: 'center',
  },
  emojiGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
