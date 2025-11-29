import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import BadgeUnlockedToast from '@/components/BadgeUnlockedToast';
import { notifications } from '@/lib/notifications';

type Badge = {
  name: string;
  description: string;
  icon: string;
  rarity: string;
};

type BadgeContextType = {
  checkBadge: (badgeKey: string) => Promise<void>;
  checkAllBadges: () => Promise<void>;
};

const BadgeContext = createContext<BadgeContextType>({
  checkBadge: async () => {},
  checkAllBadges: async () => {},
});

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);
  const [showToast, setShowToast] = useState(false);
  const { user } = useAuth();

  const checkBadge = async (badgeKey: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_and_award_badge', {
        p_user_id: user.id,
        p_badge_key: badgeKey,
      });

      if (error) {
        console.error('[BADGE] Error checking badge:', error);
        return;
      }

      if (data === true) {
        const { data: badgeData } = await supabase
          .from('badge_definitions')
          .select('id, name, description, icon, rarity')
          .eq('badge_key', badgeKey)
          .single();

        if (badgeData) {
          notifications.notifyBadgeUnlocked(badgeData.name, badgeData.id);
          setUnlockedBadge(badgeData);
          setShowToast(true);
        }
      }
    } catch (error) {
      console.error('[BADGE] Exception checking badge:', error);
    }
  };

  const checkAllBadges = async () => {
    if (!user) return;

    const commonBadges = [
      'first_win',
      'five_wins',
      'ten_wins',
      'twenty_five_wins',
      'fifty_wins',
      'games_played_10',
      'games_played_25',
      'games_played_50',
      'games_played_100',
      'first_house',
      'house_creator',
      'first_friend',
      'five_friends',
      'ten_friends',
    ];

    for (const badgeKey of commonBadges) {
      await checkBadge(badgeKey);
    }
  };

  const handleCloseToast = () => {
    setShowToast(false);
    setTimeout(() => {
      setUnlockedBadge(null);
    }, 300);
  };

  return (
    <BadgeContext.Provider value={{ checkBadge, checkAllBadges }}>
      {children}
      <BadgeUnlockedToast
        visible={showToast}
        badge={unlockedBadge || undefined}
        onClose={handleCloseToast}
      />
    </BadgeContext.Provider>
  );
}

export const useBadge = () => {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadge must be used within a BadgeProvider');
  }
  return context;
};
