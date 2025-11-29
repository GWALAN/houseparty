import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Package, Lock, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import BannerRenderer from './BannerRenderer';
import { useRouter } from 'expo-router';

type HouseKit = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  is_active: boolean;
  unlocked_at: string;
  color_scheme?: string[];
};

type Props = {
  userId: string;
  isOwnProfile?: boolean;
  onKitChange?: () => void;
};

export default function KitCollectionShowcase({ userId, isOwnProfile = false, onKitChange }: Props) {
  const [kits, setKits] = useState<HouseKit[]>([]);
  const [activeKit, setActiveKit] = useState<HouseKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadKits();
  }, [userId]);

  const loadKits = async () => {
    setLoading(true);

    // First, get the equipped kit from user profile settings
    const { data: profileSettings } = await supabase
      .from('user_profile_settings')
      .select('equipped_house_kit_id')
      .eq('user_id', userId)
      .maybeSingle();

    const equippedKitId = profileSettings?.equipped_house_kit_id;

    // Then get all unlocked kits (excluding free kits where price_cents = 0)
    const { data, error } = await supabase
      .from('user_house_kits')
      .select(`
        id,
        is_active,
        unlocked_at,
        house_kits (
          id,
          name,
          description,
          rarity,
          color_scheme,
          price_cents
        )
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      const formatted = data
        .filter((item: any) => item.house_kits.price_cents > 0)
        .map((item: any) => ({
          id: item.house_kits.id,
          name: item.house_kits.name,
          description: item.house_kits.description,
          rarity: item.house_kits.rarity,
          is_active: item.house_kits.id === equippedKitId,
          unlocked_at: item.unlocked_at,
          color_scheme: item.house_kits.color_scheme,
        }));

      setKits(formatted);
      const active = formatted.find(k => k.is_active);
      setActiveKit(active || null);
    }

    setLoading(false);
  };

  const switchKit = async (kitId: string) => {
    if (!isOwnProfile || switching) return;

    setSwitching(true);

    const { error } = await supabase.rpc('activate_house_kit', {
      p_user_id: userId,
      p_kit_id: kitId,
    });

    if (!error) {
      await loadKits();
      onKitChange?.();
    }

    setSwitching(false);
  };

  const getKitColors = (kit: { rarity: string; color_scheme?: string[] }): string[] => {
    if (kit.color_scheme && Array.isArray(kit.color_scheme) && kit.color_scheme.length > 0) {
      return kit.color_scheme;
    }

    switch (kit.rarity) {
      case 'mythic':
        return ['#EC4899', '#DB2777', '#BE185D'];
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#10B981" />
        </View>
      </View>
    );
  }

  if (kits.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Package size={20} color="#94A3B8" />
          <Text style={styles.title}>Kit Collection</Text>
        </View>
        <View style={styles.empty}>
          <Lock size={32} color="#64748B" />
          <Text style={styles.emptyText}>
            {isOwnProfile ? 'No kits unlocked yet' : 'No kits to show'}
          </Text>
          {isOwnProfile && (
            <Pressable
              style={styles.shopButton}
              onPress={() => router.push('/(tabs)/shop')}
            >
              <Text style={styles.shopButtonText}>Visit Shop</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeKit && (
        <View style={styles.activeKitSection}>
          <View style={styles.activeKitHeader}>
            <Sparkles size={18} color="#F59E0B" />
            <Text style={styles.activeKitTitle}>Active Kit</Text>
          </View>
          <View style={styles.activeKitCard}>
            <BannerRenderer
              colors={getKitColors(activeKit)}
              rarity={activeKit.rarity as any}
              size="medium"
              style={{ width: '100%', height: 100 }}
            />
            <View style={styles.activeKitInfo}>
              <Text style={styles.activeKitName}>{activeKit.name}</Text>
              <Text style={styles.activeKitRarity}>{activeKit.rarity.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.collectionSection}>
        <View style={styles.collectionHeader}>
          <Package size={20} color="#10B981" />
          <Text style={styles.collectionTitle}>
            Collection ({kits.length})
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kitsScroll}
        >
          {kits.map((kit) => (
            <Pressable
              key={kit.id}
              style={[
                styles.kitItem,
                kit.is_active && styles.kitItemActive,
              ]}
              disabled={true}
            >
              <View style={styles.kitPreview}>
                <BannerRenderer
                  colors={getKitColors(kit)}
                  rarity={kit.rarity as any}
                  size="small"
                  style={{ width: '100%', height: 60 }}
                />
              </View>
              <Text style={styles.kitItemName} numberOfLines={1}>
                {kit.name}
              </Text>
              {kit.is_active && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeIndicatorText}>Active</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={styles.viewAllButton}
          onPress={() => router.push('/(tabs)/shop')}
        >
          <Text style={styles.viewAllText}>Manage Kits in House Kits Tab</Text>
          <Package size={14} color="#10B981" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  loading: {
    padding: 32,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  shopButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeKitSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  activeKitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activeKitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  activeKitCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  activeKitInfo: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeKitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  activeKitRarity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  collectionSection: {
    paddingBottom: 16,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  kitsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  kitItem: {
    width: 120,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  kitItemActive: {
    borderColor: '#10B981',
  },
  kitPreview: {
    width: '100%',
    height: 60,
  },
  kitItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
    padding: 8,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});
