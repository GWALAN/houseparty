import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type UnlockedBanner = {
  id: string;
  bannerId: string;
  unlockedAt: string;
  unlockMethod: 'premium_purchase' | 'random_drop' | 'special_event';
};

type BannerUnlockContextType = {
  unlockedBanners: Set<string>;
  loading: boolean;
  checkBannerUnlocked: (bannerId: string) => boolean;
  unlockBanner: (bannerId: string, method: string) => Promise<boolean>;
  refreshUnlocks: () => Promise<void>;
  tryRandomUnlock: () => Promise<{ unlocked: boolean; bannerId?: string; rarity?: string; bannerName?: string }>;
};

const BannerUnlockContext = createContext<BannerUnlockContextType | undefined>(undefined);

export function BannerUnlockProvider({ children }: { children: ReactNode }) {
  const [unlockedBanners, setUnlockedBanners] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadUnlockedBanners = async () => {
    if (!user) {
      setUnlockedBanners(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_unlocked_banners')
        .select('banner_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('[BANNER_UNLOCK] Error loading unlocked banners:', error);
      } else {
        const bannerIds = new Set<string>(data.map(item => item.banner_id));
        setUnlockedBanners(bannerIds);
      }
    } catch (error) {
      console.error('[BANNER_UNLOCK] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBannerUnlocked = (bannerId: string): boolean => {
    return unlockedBanners.has(bannerId);
  };

  const unlockBanner = async (bannerId: string, method: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_unlocked_banners')
        .insert({
          user_id: user.id,
          banner_id: bannerId,
          unlock_method: method
        });

      if (error) {
        console.error('[BANNER_UNLOCK] Error unlocking banner:', error);
        return false;
      }

      setUnlockedBanners(prev => {
        const newSet = new Set<string>(prev);
        newSet.add(bannerId);
        return newSet;
      });
      return true;
    } catch (error) {
      console.error('[BANNER_UNLOCK] Error:', error);
      return false;
    }
  };

  const tryRandomUnlock = async (): Promise<{ unlocked: boolean; bannerId?: string; rarity?: string; bannerName?: string }> => {
    if (!user) return { unlocked: false };

    try {
      const legendaryChance = 0.00025;
      const mythicChance = 0.00012;
      const roll = Math.random();

      let targetRarity: string | null = null;

      if (roll < mythicChance) {
        targetRarity = 'mythic';
      } else if (roll < (mythicChance + legendaryChance)) {
        targetRarity = 'legendary';
      }

      if (!targetRarity) {
        return { unlocked: false };
      }

      const { data: availableBanners, error: fetchError } = await supabase
        .from('kit_items')
        .select('id, item_name, rarity')
        .eq('item_type', 'banner')
        .eq('rarity', targetRarity);

      if (fetchError || !availableBanners || availableBanners.length === 0) {
        console.error('[BANNER_UNLOCK] Error fetching banners:', fetchError);
        return { unlocked: false };
      }

      const { data: alreadyUnlocked } = await supabase
        .from('user_unlocked_banners')
        .select('banner_id')
        .eq('user_id', user.id)
        .in('banner_id', availableBanners.map(b => b.id));

      const unlockedIds = new Set((alreadyUnlocked || []).map(u => u.banner_id));
      const lockedBanners = availableBanners.filter(b => !unlockedIds.has(b.id));

      if (lockedBanners.length === 0) {
        return { unlocked: false };
      }

      const randomBanner = lockedBanners[Math.floor(Math.random() * lockedBanners.length)];
      const success = await unlockBanner(randomBanner.id, 'random_drop');

      if (success) {
        return {
          unlocked: true,
          bannerId: randomBanner.id,
          rarity: randomBanner.rarity,
          bannerName: randomBanner.item_name
        };
      }

      return { unlocked: false };
    } catch (error) {
      console.error('[BANNER_UNLOCK] Error in tryRandomUnlock:', error);
      return { unlocked: false };
    }
  };

  const refreshUnlocks = async () => {
    setLoading(true);
    await loadUnlockedBanners();
  };

  useEffect(() => {
    loadUnlockedBanners();
  }, [user]);

  return (
    <BannerUnlockContext.Provider
      value={{
        unlockedBanners,
        loading,
        checkBannerUnlocked,
        unlockBanner,
        refreshUnlocks,
        tryRandomUnlock,
      }}
    >
      {children}
    </BannerUnlockContext.Provider>
  );
}

export function useBannerUnlock() {
  const context = useContext(BannerUnlockContext);
  if (context === undefined) {
    throw new Error('useBannerUnlock must be used within a BannerUnlockProvider');
  }
  return context;
}
