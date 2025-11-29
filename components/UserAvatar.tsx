import { View, Text, StyleSheet, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { safeSize, safeFontSize } from '@/lib/validation';

type UserAvatarProps = {
  profilePhotoUrl?: string | null;
  username?: string;
  size?: number;
  showUsername?: boolean;
  bannerImageUrl?: string | null;
  userId?: string;
  kitColors?: string[] | null;
};

export default function UserAvatar({
  profilePhotoUrl,
  username,
  size = 32,
  showUsername = true,
  bannerImageUrl,
  userId,
  kitColors,
}: UserAvatarProps) {
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(profilePhotoUrl || null);
  const [loadedUsername, setLoadedUsername] = useState<string | null>(username || null);

  const safeAvatarSize = safeSize(size, 16, 32);

  const isEmail = (loadedUsername || username)?.includes('@');
  const displayUsername = isEmail ? 'User' : (loadedUsername || username);
  const initial = displayUsername?.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    if (!userId) return;

    const [profileSettings, profile] = await Promise.all([
      supabase
        .from('user_profile_settings')
        .select('profile_photo_url, display_name')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle()
    ]);

    if (profileSettings.data) {
      setLoadedPhoto(profileSettings.data.profile_photo_url);
      if (profileSettings.data.display_name) {
        setLoadedUsername(profileSettings.data.display_name);
      } else if (profile.data?.username) {
        setLoadedUsername(profile.data.username);
      }
    } else if (profile.data?.username) {
      setLoadedUsername(profile.data.username);
    }
  };

  const displayPhoto = loadedPhoto || profilePhotoUrl;
  const borderColor = kitColors && kitColors.length > 0 ? kitColors[0] : '#10B981';

  return (
    <View style={styles.container}>
      <View style={styles.avatarRow}>
        {displayPhoto ? (
          <Image
            source={{ uri: displayPhoto }}
            style={[
              styles.avatar,
              {
                width: safeAvatarSize,
                height: safeAvatarSize,
                borderRadius: safeAvatarSize / 2,
                borderColor,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                width: safeAvatarSize,
                height: safeAvatarSize,
                borderRadius: safeAvatarSize / 2,
                borderColor,
                borderWidth: 2,
              },
            ]}
          >
            <Text style={[styles.initial, { fontSize: safeFontSize(safeAvatarSize * 0.5) }]}>
              {initial}
            </Text>
          </View>
        )}
        {showUsername && displayUsername && (
          <Text style={[styles.username, { fontSize: safeFontSize(safeAvatarSize * 0.45) }]} numberOfLines={1}>
            {displayUsername}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarPlaceholder: {
    backgroundColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  username: {
    color: '#FFFFFF',
    fontWeight: '600',
    maxWidth: 150,
  },
});
