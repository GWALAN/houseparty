import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { BannerRarity } from '@/components/BannerRenderer';

type BannerData = {
  id: string;
  name: string;
  rarity: BannerRarity;
  colors: string[];
} | null;

type BannerContextType = {
  activeBanner: BannerData;
  loading: boolean;
  setBanner: (banner: BannerData) => void;
  refreshBanner: () => Promise<void>;
};

const BannerContext = createContext<BannerContextType>({
  activeBanner: null,
  loading: false,
  setBanner: () => {},
  refreshBanner: async () => {},
});

export const useBanner = () => useContext(BannerContext);

type BannerProviderProps = {
  children: ReactNode;
};

export function BannerProvider({ children }: BannerProviderProps) {
  const [activeBanner, setActiveBanner] = useState<BannerData>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const refreshBanner = async () => {
    if (!user) {
      setActiveBanner(null);
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('selected_banner_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.selected_banner_id) {
        const { data: banner } = await supabase
          .from('kit_items')
          .select(`
            id,
            item_name,
            item_data,
            rarity
          `)
          .eq('id', profile.selected_banner_id)
          .eq('item_type', 'banner')
          .maybeSingle();

        if (banner) {
          const bannerData = banner as any;
          const colors = bannerData.item_data?.design_spec?.colors || bannerData.item_data?.colors || ['#64748B'];
          setActiveBanner({
            id: bannerData.id,
            name: bannerData.item_name,
            rarity: bannerData.rarity as BannerRarity,
            colors: Array.isArray(colors) ? colors : Object.values(colors),
          });
        } else {
          setActiveBanner(null);
        }
      } else {
        setActiveBanner(null);
      }
    } catch (error) {
      console.error('[BANNER CONTEXT] Error refreshing banner:', error);
      setActiveBanner(null);
    }

    setLoading(false);
  };

  const setBanner = (banner: BannerData) => {
    setActiveBanner(banner);
  };

  useEffect(() => {
    refreshBanner();
  }, [user]);

  return (
    <BannerContext.Provider
      value={{
        activeBanner,
        loading,
        setBanner,
        refreshBanner,
      }}
    >
      {children}
    </BannerContext.Provider>
  );
}
