import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { usePremium } from './PremiumContext';

type ProfileContextType = {
  profilePhotoUrl: string | null;
  displayName: string | null;
  selectedBannerId: string | null;
  loading: boolean;
  updateProfilePhoto: (url: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateSelectedBanner: (bannerId: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  profilePhotoUrl: null,
  displayName: null,
  selectedBannerId: null,
  loading: false,
  updateProfilePhoto: async () => {},
  updateDisplayName: async () => {},
  updateSelectedBanner: async () => {},
  refreshProfile: async () => {},
});

export const useProfile = () => useContext(ProfileContext);

type ProfileProviderProps = {
  children: ReactNode;
};

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { isPremium } = usePremium();

  const refreshProfile = async () => {
    if (!user) {
      setProfilePhotoUrl(null);
      setDisplayName(null);
      setSelectedBannerId(null);
      return;
    }

    setLoading(true);

    const [settingsResult, profileResult] = await Promise.all([
      supabase
        .from('user_profile_settings')
        .select('profile_photo_url, display_name, selected_banner_id')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()
    ]);

    const settings = settingsResult.data;
    const profile = profileResult.data;

    if (settings || profile) {
      let photoUrl = settings?.profile_photo_url || profile?.avatar_url || null;

      // Clear invalid old-format URLs (profiles/ path)
      if (photoUrl && photoUrl.includes('/profiles/')) {
        photoUrl = null;
        // Clean up database
        await supabase
          .from('user_profile_settings')
          .update({ profile_photo_url: null })
          .eq('user_id', user.id);
      }

      setProfilePhotoUrl(photoUrl);
      setDisplayName(settings?.display_name || null);
      setSelectedBannerId(settings?.selected_banner_id || null);
    }

    setLoading(false);
  };

  const updateProfilePhoto = async (url: string) => {
    if (!user) return;

    if (!isPremium) {
      throw new Error('Photo uploads require Premium subscription');
    }

    const previousUrl = profilePhotoUrl;
    setProfilePhotoUrl(url);

    try {
      const { data: existing } = await supabase
        .from('user_profile_settings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('user_profile_settings')
          .update({
            profile_photo_url: url,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_profile_settings')
          .insert({
            user_id: user.id,
            profile_photo_url: url,
          });
        error = result.error;
      }

      if (error) {
        setProfilePhotoUrl(previousUrl);
        throw error;
      }
    } catch (error) {
      setProfilePhotoUrl(previousUrl);
      throw error;
    }
  };

  const updateDisplayName = async (name: string) => {
    if (!user) return;

    const previousName = displayName;
    setDisplayName(name);

    try {
      const { data: existing } = await supabase
        .from('user_profile_settings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('user_profile_settings')
          .update({
            display_name: name,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_profile_settings')
          .insert({
            user_id: user.id,
            display_name: name,
          });
        error = result.error;
      }

      if (error) {
        setDisplayName(previousName);
        throw error;
      }
    } catch (error) {
      setDisplayName(previousName);
      throw error;
    }
  };

  const updateSelectedBanner = async (bannerId: string | null) => {
    if (!user) return;

    const previousBannerId = selectedBannerId;
    setSelectedBannerId(bannerId);

    try {
      const { data: existing } = await supabase
        .from('user_profile_settings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('user_profile_settings')
          .update({
            selected_banner_id: bannerId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_profile_settings')
          .insert({
            user_id: user.id,
            selected_banner_id: bannerId,
          });
        error = result.error;
      }

      if (error) {
        setSelectedBannerId(previousBannerId);
        throw error;
      }
    } catch (error) {
      setSelectedBannerId(previousBannerId);
      throw error;
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [user]);

  return (
    <ProfileContext.Provider
      value={{
        profilePhotoUrl,
        displayName,
        selectedBannerId,
        loading,
        updateProfilePhoto,
        updateDisplayName,
        updateSelectedBanner,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
