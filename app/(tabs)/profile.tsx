import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Alert, Platform, Image, StatusBar } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Award, LogOut, Camera, Users, Crown, Sparkles, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useBanner } from '@/contexts/BannerContext';
import { usePremium } from '@/contexts/PremiumContext';
import BannerRenderer from '@/components/BannerRenderer';
import PremiumPurchaseModal from '@/components/PremiumPurchaseModal';
import EnhancedBadgeCard from '@/components/EnhancedBadgeCard';
import { formatScore, type ScoringType } from '@/constants/ScoringTypes';

type UserStats = {
  totalGames: number;
  totalWins: number;
  winRate: number;
  housesCount: number;
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity?: string;
  earnedAt?: string;
};

type GameHistory = {
  id: string;
  gameName: string;
  gameEmoji: string;
  houseName: string;
  score: number;
  scoringType: ScoringType;
  accuracyHits?: number;
  accuracyAttempts?: number;
  ratioNumerator?: number;
  ratioDenominator?: number;
  isWinner: boolean;
  playedAt: string;
  playerCount: number;
};

type LeaderboardEntry = {
  id: string;
  username: string;
  profilePhotoUrl: string | null;
  wins: number;
  gamesPlayed: number;
  winRate: number;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<UserStats>({
    totalGames: 0,
    totalWins: 0,
    winRate: 0,
    housesCount: 0,
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [latestBadge, setLatestBadge] = useState<Badge | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [activeKitTheme, setActiveKitTheme] = useState<{colors: string[], name: string, rarity: string} | null>(null);
  const { user, signOut } = useAuth();
  const { profilePhotoUrl, displayName: profileDisplayName, updateProfilePhoto, refreshProfile } = useProfile();
  const { activeBanner } = useBanner();
  const { isPremium, loading: premiumLoading } = usePremium();
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    fetchActiveKitTheme();
  }, []);


  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      fetchProfile();
      refreshProfile();
      fetchActiveKitTheme();

      // Set up real-time subscription for user profile settings (kit changes)
      const profileSettingsChannel = supabase
        .channel(`profile-settings-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profile_settings',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('[PROFILE] Profile settings changed, refreshing kit...');
            fetchActiveKitTheme();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'session_scores',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('[PROFILE] New game score recorded, refreshing profile...');
            fetchProfile();
          }
        )
        .subscribe();

      return () => {
        profileSettingsChannel.unsubscribe();
      };
    }, [user])
  );

  useEffect(() => {
    if (user) {
      fetchGameHistory();
    }
  }, [showAllHistory]);

  const fetchActiveKitTheme = async () => {
    if (!user) return;

    const { data: profileSettings, error: settingsError } = await supabase
      .from('user_profile_settings')
      .select('equipped_house_kit_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !profileSettings?.equipped_house_kit_id) {
      setActiveKitTheme(null);
      return;
    }

    const { data: houseKit, error: kitError } = await supabase
      .from('house_kits')
      .select('name, color_scheme, rarity')
      .eq('id', profileSettings.equipped_house_kit_id)
      .maybeSingle();

    if (!kitError && houseKit && houseKit.color_scheme) {
      let colors = Array.isArray(houseKit.color_scheme) && houseKit.color_scheme.length > 0
        ? houseKit.color_scheme
        : ['#10B981', '#059669'];

      // LinearGradient requires at least 2 colors, so duplicate if only 1
      if (colors.length === 1) {
        colors = [colors[0], colors[0]];
      }

      setActiveKitTheme({
        colors,
        name: houseKit.name,
        rarity: houseKit.rarity || 'common'
      });
    } else {
      setActiveKitTheme(null);
    }
  };

  const getKitColorsFromRarity = (rarity: string): string[] => {
    switch (rarity) {
      case 'mythic':
        return ['#EC4899', '#DB2777', '#F472B6'];
      case 'legendary':
        return ['#F59E0B', '#FBBF24', '#F59E0B'];
      case 'epic':
        return ['#A855F7', '#9333EA', '#7E22CE'];
      case 'rare':
        return ['#3B82F6', '#2563EB', '#1D4ED8'];
      case 'uncommon':
        return ['#10B981', '#059669', '#047857'];
      default:
        return ['#64748B', '#475569'];
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    const [profileResult, scoresResult, housesResult, badgesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('session_scores').select(`
        is_winner,
        game_sessions!inner (
          is_solo_game,
          status
        )
      `).eq('user_id', user.id).eq('game_sessions.is_solo_game', false).eq('game_sessions.status', 'completed'),
      supabase.from('house_members').select('house_id').eq('user_id', user.id),
      supabase.from('user_badges').select(`
        id,
        badge_type,
        badge_data,
        earned_at,
        is_unlocked,
        badge_definitions (
          name,
          description,
          icon,
          rarity
        )
      `).eq('user_id', user.id).eq('is_unlocked', true).order('earned_at', { ascending: false })
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data);
    }

    const totalGames = scoresResult.data?.length || 0;
    const totalWins = scoresResult.data?.filter((s) => s.is_winner).length || 0;

    setStats({
      totalGames,
      totalWins,
      winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      housesCount: housesResult.data?.length || 0,
    });

    if (badgesResult.data && badgesResult.data.length > 0) {
      const badgeList = badgesResult.data.map((ub: any) => ({
        id: ub.id,
        name: ub.badge_definitions?.name || ub.badge_data?.name || ub.badge_type,
        description: ub.badge_definitions?.description || ub.badge_data?.description || '',
        icon: ub.badge_definitions?.icon || ub.badge_data?.icon || '🏆',
        rarity: ub.badge_definitions?.rarity || 'common',
        earnedAt: ub.earned_at
      }));
      setBadges(badgeList);
      setLatestBadge(badgeList[0]);
    }

    await Promise.all([fetchGameHistory(), fetchLeaderboard()]);

    setLoading(false);
  };


  const fetchGameHistory = async () => {
    if (!user) return;

    const limit = showAllHistory ? 100 : 10;
    // OPTIMIZED: Single query with joins instead of N+1 queries
    const { data: sessions } = await supabase
      .from('session_scores')
      .select(`
        id,
        score,
        is_winner,
        session_id,
        accuracy_hits,
        accuracy_attempts,
        ratio_numerator,
        ratio_denominator,
        game_sessions!inner (
          id,
          started_at,
          game_id,
          house_id,
          is_solo_game,
          status,
          games (
            name,
            game_emoji,
            scoring_type
          ),
          houses (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('game_sessions.is_solo_game', false)
      .eq('game_sessions.status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessions) {
      // Get player counts in a single batch query
      const sessionIds = sessions.map(s => s.session_id);
      const { data: playerCounts } = await supabase
        .from('session_scores')
        .select('session_id')
        .in('session_id', sessionIds);

      const countMap = new Map<string, number>();
      playerCounts?.forEach(pc => {
        countMap.set(pc.session_id, (countMap.get(pc.session_id) || 0) + 1);
      });

      const history = sessions.map((session: any) => {
        const gameSession = session.game_sessions;
        if (!gameSession) return null;

        return {
          id: session.id,
          gameName: gameSession.games?.name || 'Unknown Game',
          gameEmoji: gameSession.games?.game_emoji || '🎮',
          houseName: gameSession.houses?.name || 'Unknown House',
          score: session.score || 0,
          scoringType: (gameSession.games?.scoring_type as ScoringType) || 'points',
          accuracyHits: session.accuracy_hits,
          accuracyAttempts: session.accuracy_attempts,
          ratioNumerator: session.ratio_numerator,
          ratioDenominator: session.ratio_denominator,
          isWinner: session.is_winner || false,
          playedAt: gameSession.started_at || '',
          playerCount: countMap.get(session.session_id) || 0,
        };
      });

      setGameHistory(history.filter(h => h !== null && h.gameName !== 'Unknown Game') as GameHistory[]);
    }
  };

  const fetchLeaderboard = async () => {
    if (!user) return;

    const { data: houseMemberships } = await supabase
      .from('house_members')
      .select('house_id')
      .eq('user_id', user.id);

    if (!houseMemberships || houseMemberships.length === 0) {
      setLeaderboard([]);
      return;
    }

    const houseIds = houseMemberships.map(h => h.house_id);

    const { data: friendMembers } = await supabase
      .from('house_members')
      .select('user_id')
      .in('house_id', houseIds)
      .neq('user_id', user.id)
      .limit(50);

    if (!friendMembers || friendMembers.length === 0) {
      setLeaderboard([]);
      return;
    }

    const friendIds = [...new Set(friendMembers.map(m => m.user_id))].slice(0, 10);

    // OPTIMIZED: Batch queries instead of N+1
    const [profilesResult, settingsResult, scoresResult] = await Promise.all([
      supabase.from('profiles').select('id, username').in('id', friendIds),
      supabase.from('user_profile_settings').select('user_id, profile_photo_url').in('user_id', friendIds),
      supabase.from('session_scores').select(`
        user_id,
        is_winner,
        game_sessions!inner (
          is_solo_game
        )
      `).in('user_id', friendIds).eq('game_sessions.is_solo_game', false)
    ]);

    const profilesMap = new Map(profilesResult.data?.map(p => [p.id, p.username]) || []);
    const photosMap = new Map(settingsResult.data?.map(s => [s.user_id, s.profile_photo_url]) || []);

    // Group scores by user
    const scoresMap = new Map<string, any[]>();
    scoresResult.data?.forEach(score => {
      if (!scoresMap.has(score.user_id)) {
        scoresMap.set(score.user_id, []);
      }
      scoresMap.get(score.user_id)!.push(score);
    });

    const friendStats = friendIds.map(friendId => {
      const scores = scoresMap.get(friendId) || [];
      const totalGames = scores.length;
      const totalWins = scores.filter(s => s.is_winner).length;

      return {
        id: friendId,
        username: profilesMap.get(friendId) || 'Unknown',
        profilePhotoUrl: photosMap.get(friendId) || null,
        wins: totalWins,
        gamesPlayed: totalGames,
        winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      };
    });

    setLeaderboard(friendStats.sort((a, b) => b.wins - a.wins));
  };

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);
    try {
      console.log('[PROFILE] Sign out initiated');
      await signOut();
      console.log('[PROFILE] Sign out successful - auth guards will handle navigation');
    } catch (error) {
      console.error('[PROFILE] Error signing out:', error);
      if (Platform.OS === 'web') {
        alert('Failed to sign out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
      setSigningOut(false);
    }
  };

  const pickImageFromDevice = async () => {
    if (!isPremium) {
      if (Platform.OS === 'web') {
        alert('Photo uploads are a Premium feature. Upgrade to upload custom photos!');
      } else {
        Alert.alert(
          'Premium Feature',
          'Photo uploads are available with Premium. Upgrade to upload custom photos!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => setShowPremiumModal(true) }
          ]
        );
      }
      return;
    }

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          await uploadProfilePhotoWeb(file);
        }
      };
      input.click();
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery permission is needed to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: false,
        exif: false,
      });

      console.log('[PROFILE] ImagePicker result:', { canceled: result.canceled, hasAssets: !!result.assets });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('[PROFILE] Selected image URI:', selectedImage.uri);

        // Show confirmation dialog with more detail
        Alert.alert(
          'Confirm Upload',
          'Do you want to use this photo as your profile picture?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                console.log('[PROFILE] User cancelled upload');
              }
            },
            {
              text: 'Yes, Upload',
              onPress: async () => {
                console.log('[PROFILE] User confirmed upload, starting...');
                await uploadProfilePhoto(selectedImage.uri);
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        console.log('[PROFILE] No image selected or picker was cancelled');
      }
    } catch (error) {
      console.error('[PROFILE] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfilePhotoWeb = async (file: File) => {
    if (!user) return;

    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `profile_${timestamp}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithTimestamp = `${publicUrl}?t=${timestamp}`;

      await updateProfilePhoto(urlWithTimestamp);
      await refreshProfile();
      await fetchProfile();
      alert('Photo uploaded successfully!');
    } catch (error: any) {
      alert('Upload Failed: ' + (error.message || 'Could not upload photo'));
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    if (!user) return;

    setUploadingPhoto(true);

    try {
      console.log('[PROFILE] Starting upload for URI:', uri);

      // Use the proper image upload utility that handles platform differences
      const { uploadProfilePhoto: uploadUtil } = await import('@/lib/imageUpload');
      const result = await uploadUtil(uri, user.id);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('[PROFILE] Upload successful, URL:', result.url);

      // Add timestamp to bust cache
      const timestamp = Date.now();
      const urlWithTimestamp = `${result.url}?t=${timestamp}`;

      // Update profile with new photo URL
      console.log('[PROFILE] Updating profile with new URL...');
      await updateProfilePhoto(urlWithTimestamp);
      await refreshProfile();
      await fetchProfile();

      console.log('[PROFILE] Profile updated successfully');

      if (Platform.OS === 'web') {
        alert('Photo uploaded successfully!');
      } else {
        Alert.alert('Success', 'Your profile photo has been updated!');
      }
    } catch (error: any) {
      console.error('[PROFILE] Profile photo upload error:', error);
      const errorMessage = error.message || 'Could not upload photo. Please check your network connection.';

      if (Platform.OS === 'web') {
        alert('Upload Failed: ' + errorMessage);
      } else {
        Alert.alert('Upload Failed', errorMessage);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeProfilePhoto = async () => {
    if (!user || !isPremium) return;

    const confirmRemove = Platform.OS === 'web'
      ? confirm('Remove profile photo?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove your profile photo?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Remove', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmRemove) return;

    try {
      await supabase
        .from('user_profile_settings')
        .update({ profile_photo_url: null })
        .eq('user_id', user.id);

      await refreshProfile();
      await fetchProfile();

      if (Platform.OS === 'web') {
        alert('Photo removed successfully');
      } else {
        Alert.alert('Success', 'Photo removed successfully');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not remove photo');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const headerColors = activeKitTheme?.colors || ['#0F172A', '#1E293B'];

  const hasKitEffects = activeKitTheme && ['legendary', 'mythic'].includes(activeKitTheme.rarity);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <ScrollView>
          <View style={styles.header}>
            <View style={styles.bannerBackgroundContainer}>
              {hasKitEffects ? (
                <BannerRenderer
                  colors={activeKitTheme.colors}
                  rarity={activeKitTheme.rarity as any}
                  kitName={activeKitTheme.name}
                  size="large"
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <LinearGradient
                  colors={activeKitTheme ? activeKitTheme.colors as [string, string, ...string[]] : headerColors as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </View>
            <View style={styles.headerContentWrapper}>
              <View style={styles.usernameContainer}>
                <Text style={styles.username}>{profileDisplayName || profile?.username}</Text>
                {!isPremium && (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Free Plan</Text>
                  </View>
                )}
              </View>
              <View style={styles.avatarContainer}>
                {(activeBanner || activeKitTheme) && (
                  <LinearGradient
                    colors={(activeBanner?.colors || activeKitTheme?.colors || ['#64748B', '#475569']) as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarBorder}
                  />
                )}
                <View style={styles.avatarInner}>
                  {profilePhotoUrl ? (
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  )}
                </View>
              </View>
              <Pressable
                style={[styles.cameraButton, uploadingPhoto && styles.cameraButtonDisabled]}
                onPress={uploadingPhoto ? undefined : pickImageFromDevice}
                onLongPress={profilePhotoUrl && isPremium && !uploadingPhoto ? removeProfilePhoto : undefined}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={18} color="#FFFFFF" />
                )}
              </Pressable>
              {profilePhotoUrl && isPremium && (
                <Pressable
                  style={styles.removePhotoButton}
                  onPress={removeProfilePhoto}
                >
                  <X size={14} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </View>

        <View style={styles.statsContainer}>
          <LinearGradient
            colors={activeKitTheme ? activeKitTheme.colors as [string, string, ...string[]] : ['#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statCardOverlay}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🎮</Text>
              </View>
              <Text style={styles.statNumber}>{stats.totalGames}</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
          </LinearGradient>
          <LinearGradient
            colors={activeKitTheme ? activeKitTheme.colors as [string, string, ...string[]] : ['#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statCardOverlay}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>⭐</Text>
              </View>
              <Text style={styles.statNumber}>{stats.totalWins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
          </LinearGradient>
          <LinearGradient
            colors={activeKitTheme ? activeKitTheme.colors as [string, string, ...string[]] : ['#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statCardOverlay}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>💰</Text>
              </View>
              <Text style={styles.statNumber}>{stats.winRate.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </LinearGradient>
        </View>

        {!premiumLoading && (
          <View style={styles.premiumSection}>
            {isPremium ? (
              <View style={styles.premiumBadgeContainer}>
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.premiumBadgeLarge}
                >
                  <Crown size={24} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.premiumBadgeLargeText}>Premium Member</Text>
                  <Sparkles size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.premiumDescription}>
                  You have full access to customization features
                </Text>
              </View>
            ) : (
              <Pressable
                style={styles.unlockButton}
                onPress={() => setShowPremiumModal(true)}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.unlockGradient}
                >
                  <Crown size={24} color="#FFFFFF" />
                  <View style={styles.unlockTextContainer}>
                    <Text style={styles.unlockTitle}>Subscribe to Premium</Text>
                    <Text style={styles.unlockSubtitle}>
                      Get all features for $4.99
                    </Text>
                  </View>
                  <Sparkles size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            )}
          </View>
        )}


        {gameHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Award size={24} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Game History</Text>
              {gameHistory.length >= 10 && (
                <Pressable
                  onPress={() => setShowAllHistory(!showAllHistory)}
                  style={styles.filterButton}
                >
                  <Text style={styles.filterButtonText}>
                    {showAllHistory ? 'Show Recent' : 'Show All'}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.historyContainer}>
              {gameHistory.map((game) => (
                <View key={game.id} style={styles.historyCard}>
                  <LinearGradient
                    colors={game.isWinner
                      ? ['rgba(245, 158, 11, 0.2)', 'rgba(217, 119, 6, 0.1)']
                      : ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']
                    }
                    style={styles.historyGradient}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyEmoji}>{game.gameEmoji}</Text>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyGameName}>{game.gameName}</Text>
                        <Text style={styles.historyHouseName}>{game.houseName}</Text>
                        <Text style={styles.historyDate}>
                          {new Date(game.playedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyRight}>
                      {game.isWinner && (
                        <View style={styles.winnerBadge}>
                          <Trophy size={16} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.winnerText}>Winner</Text>
                        </View>
                      )}
                      <View style={styles.historyStats}>
                        <Text style={styles.historyScore}>
                          {formatScore(game.score, game.scoringType, {
                            hits: game.accuracyHits,
                            attempts: game.accuracyAttempts,
                            numerator: game.ratioNumerator,
                            denominator: game.ratioDenominator,
                          })}
                        </Text>
                        <Text style={styles.historyPlacement}>
                          {game.playerCount} {game.playerCount === 1 ? 'player' : 'players'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </View>
          </View>
        )}

        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={24} color="#10B981" />
              <Text style={styles.sectionTitle}>Friends Leaderboard</Text>
            </View>

            <View style={styles.leaderboardContainer}>
              {leaderboard.map((entry, index) => (
                <View key={entry.id} style={styles.leaderboardCard}>
                  <LinearGradient
                    colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
                    style={styles.leaderboardGradient}
                  >
                    <View style={styles.leaderboardRank}>
                      <Text style={styles.rankNumber}>#{index + 1}</Text>
                    </View>
                    <View style={styles.leaderboardAvatar}>
                      {entry.profilePhotoUrl ? (
                        <Image
                          source={{ uri: entry.profilePhotoUrl }}
                          style={styles.leaderboardAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.leaderboardAvatarPlaceholder}>
                          <Text style={styles.leaderboardAvatarText}>
                            {entry.username.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardUsername} numberOfLines={1}>{entry.username}</Text>
                      <View style={styles.leaderboardStats}>
                        <View style={styles.leaderboardStatItem}>
                          <Trophy size={12} color="#10B981" />
                          <Text style={styles.leaderboardStatText}>{entry.wins}</Text>
                        </View>
                        <View style={styles.leaderboardStatItem}>
                          <Text style={styles.leaderboardStatLabel}>WR:</Text>
                          <Text style={styles.leaderboardStatText}>{entry.winRate.toFixed(0)}%</Text>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </View>
          </View>
        )}


        <Pressable
          style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <LogOut size={20} color="#FFFFFF" />
          )}
          <Text style={styles.signOutText}>{signingOut ? 'Signing Out...' : 'Sign Out'}</Text>
        </Pressable>
      </ScrollView>

      <PremiumPurchaseModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    width: '100%',
    overflow: 'hidden',
  },
  headerContentWrapper: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 48 : 40,
    paddingBottom: 24,
    minHeight: 280,
  },
  avatarBorder: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 999,
    zIndex: 1,
    overflow: 'hidden',
  },
  bannerGlass: {
    display: 'none',
  },
  avatarContainer: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 10,
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 2,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarText: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#FFFFFF',
    width: 120,
    height: 120,
    lineHeight: 120,
    textAlign: 'center',
  },
  cameraButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginTop: 8,
    zIndex: 10,
  },
  cameraButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#64748B',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 130,
    right: '50%',
    marginRight: -75,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 24,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flexShrink: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  freeBadge: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#64748B',
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  equippedKitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  equippedKitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  latestBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  latestBadgeIcon: {
    fontSize: 24,
  },
  latestBadgeInfo: {
    flex: 1,
  },
  latestBadgeLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  latestBadgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  upgradeBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginTop: 8,
    elevation: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  upgradeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  upgradeBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 100,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  statCardOverlay: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statIcon: {
    fontSize: 16,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyBadges: {
    padding: 32,
    alignItems: 'center',
  },
  emptyBadgesText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: 100,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  oldBadgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  oldBadgeName: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#DC2626',
    margin: 24,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#991B1B',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  badgesScroll: {
    paddingHorizontal: 4,
    gap: 12,
  },
  badgeItem: {
    width: 80,
    height: 100,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeIcon: {
    fontSize: 32,
  },
  badgeName: {
    fontSize: 10,
    color: '#CBD5E1',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7280',
    marginTop: 4,
  },
  historyContainer: {
    gap: 12,
  },
  historyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  historyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyEmoji: {
    fontSize: 32,
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyGameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  historyHouseName: {
    fontSize: 12,
    color: '#94A3B8',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#64748B',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  winnerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  historyStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  historyScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  historyPlacement: {
    fontSize: 12,
    color: '#CBD5E1',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  leaderboardContainer: {
    gap: 12,
  },
  leaderboardCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  leaderboardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  leaderboardRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  leaderboardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  leaderboardAvatarImage: {
    width: '100%',
    height: '100%',
  },
  leaderboardAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  leaderboardInfo: {
    flex: 1,
    gap: 4,
  },
  leaderboardUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leaderboardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  leaderboardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardStatLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  leaderboardStatText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  themeDisplayCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginTop: 4,
  },
  themeGradientBg: {
    padding: 20,
    position: 'relative',
    minHeight: 100,
  },
  themeDisplayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  themeDisplayContent: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeDisplayHeader: {
    flex: 1,
  },
  themeDisplayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  themeDisplayChangeText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  themeColorPreview: {
    flexDirection: 'row',
    gap: 10,
  },
  themeColorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  premiumSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  premiumBadgeContainer: {
    alignItems: 'center',
    gap: 12,
  },
  premiumBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  premiumBadgeLargeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  premiumDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  unlockButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  unlockGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  unlockTextContainer: {
    flex: 1,
  },
  unlockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  unlockSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginLeft: 'auto',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
