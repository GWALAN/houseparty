/**
 * Banner Type Definitions
 *
 * Centralized type definitions for banner system.
 * Matches database schema from banners view exactly.
 *
 * Updated: 2025-10-15 - Aligned with actual database columns
 */

export type BannerRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type BannerColors = {
  primary: string;
  secondary: string;
  accent: string;
  tertiary: string;
  quaternary: string;
};

export type BannerDesignSpec = {
  rarity?: string;
  colors: BannerColors;
  gradient_type?: string;
  complexity_score?: number;
};

export type BannerItemData = {
  design_spec: BannerDesignSpec;
  image_url?: string;
};

/**
 * Full Banner type from database view
 * Matches the structure returned by the banners view after migration 20251015120000
 *
 * All fields are guaranteed to be present from the database.
 */
export type Banner = {
  id: string;
  name: string;
  rarity: BannerRarity;
  item_data: BannerItemData;
  is_animated: boolean;
  style_key: string;
  is_unlockable: boolean;
  is_earnable: boolean;
  kit_id: string;
  kit_name: string;
  created_at: string;
};

/**
 * Simplified Banner Data type for context/state management
 */
export type BannerData = {
  id: string;
  name: string;
  rarity: BannerRarity;
  style_key: string;
  is_unlockable: boolean;
  is_earnable: boolean;
  designSpec: {
    rarity: BannerRarity;
    colors: BannerColors;
  };
} | null;
