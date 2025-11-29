import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBanner } from '@/contexts/BannerContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePremium } from '@/contexts/PremiumContext';
import { Sparkles, Crown, Zap, Check, Lock, Star, Flame } from 'lucide-react-native';
import BannerRenderer from './BannerRenderer';
import Toast from './Toast';
import PremiumPurchaseModal from './PremiumPurchaseModal';
import { Banner, BannerRarity } from '@/types/banner';

const parseItemData = (raw: any) => {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
};

type DesignSpec = {
  rarity: BannerRarity;
  style_key: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    tertiary: string;
    quaternary: string;
  };
};

export default function BannerCatalog() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingBannerId, setApplyingBannerId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const { user } = useAuth();
  const { activeBanner, setBanner, refreshBanner } = useBanner();
  const { selectedBannerId, updateSelectedBanner, refreshProfile } = useProfile();
  const { isPremium } = usePremium();

  const activeBannerId = activeBanner?.id || selectedBannerId;

  useEffect(() => {
    loadBanners();
  }, [filter, user]);

  const loadBanners = async () => {
    setLoading(true);
    let query = supabase
      .from('banners')
      .select('id,name,rarity,item_data,is_animated,style_key,is_unlockable,is_earnable,kit_id,kit_name,created_at')
      .order('rarity', { ascending: true })
      .limit(200);

    if (filter !== 'all') query = query.eq('rarity', filter);

    const { data, error } = await query;
    if (error) console.error('[BANNERS] load error:', error);
    setBanners((data || []) as Banner[]);
    setLoading(false);
  };

  const buildDesignSpec = (item: Banner): DesignSpec => {
    const itemData = parseItemData(item.item_data);
    const c = itemData?.design_spec?.colors ?? {};
    if (!c?.primary || !c?.secondary) {
      console.warn('[BANNERS] Missing DB colors for', item.name, item.id, '— using safe fallbacks');
      // Very light fallback just to avoid crashes (should be rare after backfill)
      return {
        rarity: item.rarity,
        style_key: item.style_key,
        colors: {
          primary: '#6B7280',   // gray
          secondary: '#4B5563',
          accent: '#9CA3AF',
          tertiary: '#D1D5DB',
          quaternary: '#111827',
        }
      };
    }

    return {
      rarity: item.rarity,
      style_key: item.style_key,
      colors: {
        primary: c.primary,
        secondary: c.secondary,
        accent: c.accent || c.secondary,
        tertiary: c.tertiary || c.primary,
        quaternary: c.quaternary || c.accent || c.secondary,
      }
    };
  };

  // Memoize once per list load so designs don’t re-generate every render
  const designSpecsById = useMemo(() => {
    const map: Record<string, DesignSpec> = {};
    for (const b of banners) map[b.id] = buildDesignSpec(b);
    return map;
  }, [banners]);

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return <Flame size={12} color="#FFFFFF" fill="#FFFFFF" />;
      case 'legendary': return <Star size={12} color="#FFFFFF" fill="#FFFFFF" />;
      case 'epic': return <Crown size={12} color="#FFFFFF" fill="#FFFFFF" />;
      case 'rare': return <Sparkles size={12} color="#FFFFFF" />;
      case 'uncommon': return <Zap size={12} color="#FFFFFF" />;
      default: return null;
    }
  };

  const handleApplyBanner = async (banner: Banner) => {
    if (!user) return;
    setApplyingBannerId(banner.id);

    const designSpec = designSpecsById[banner.id];
    const colors = [
      designSpec.colors.primary,
      designSpec.colors.secondary,
      designSpec.colors.accent,
      designSpec.colors.tertiary,
      designSpec.colors.quaternary,
    ];

    setBanner({
      id: banner.id,
      name: banner.name,
      rarity: banner.rarity,
      colors,
    });

    try {
      await updateSelectedBanner(banner.id);
      await refreshBanner();
      await refreshProfile();
      setToast({ visible: true, message: `${banner.name} applied!`, type: 'success' });
    } catch (e) {
      console.error('[BANNERS] apply error:', e);
      setToast({ visible: true, message: 'Failed to apply banner.', type: 'error' });
    } finally {
      setApplyingBannerId(null);
    }
  };

  const canAccessBanner = (banner: Banner): boolean => {
    if (banner.rarity === 'common') return true;
    if (banner.is_unlockable && !isPremium) return false;
    return isPremium;
  };

  const renderBanner = ({ item }: { item: Banner }) => {
    const canAccess = canAccessBanner(item);
    const isActive = activeBannerId === item.id;
    const isApplying = applyingBannerId === item.id;
    const designSpec = designSpecsById[item.id];

    // Extract colors array from designSpec for BannerRenderer
    const colorsArray = [
      designSpec.colors.primary,
      designSpec.colors.secondary,
      designSpec.colors.accent,
      designSpec.colors.tertiary,
      designSpec.colors.quaternary,
    ].filter(Boolean);

    return (
      <Pressable
        style={[
          styles.card,
          isActive && styles.cardActive,
          !canAccess && styles.cardLocked,
        ]}
        onPress={() => {
          if (!canAccess) setShowPremiumModal(true);
          else if (!isApplying) handleApplyBanner(item);
        }}
        disabled={isApplying}
      >
        <View style={styles.cardInner}>
          <BannerRenderer
            colors={colorsArray}
            rarity={item.rarity as any}
            style={{ width: 180, height: 180 }}
            size="large"
          />

          <View style={styles.overlay}>
            <View style={styles.top}>
              <View style={styles.rarityTag}>
                {getRarityIcon(item.rarity)}
                <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.bottom}>
              <Text style={styles.title}>{item.name}</Text>
              {isActive ? (
                <View style={styles.activeBadge}>
                  <Check size={14} color="#10B981" />
                  <Text style={styles.activeText}>Active</Text>
                </View>
              ) : canAccess ? (
                <Pressable style={styles.applyBtn} onPress={() => handleApplyBanner(item)}>
                  {isApplying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.applyText}>Apply</Text>}
                </Pressable>
              ) : (
                <View style={styles.premiumBadge}>
                  <Lock size={12} color="#94A3B8" />
                  <Text style={styles.premiumText}>Premium only</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const rarities: ('all' | BannerRarity)[] = ['all','common','uncommon','rare','epic','legendary','mythic'];

  return (
    <View style={styles.container}>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />
      <PremiumPurchaseModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      <View style={styles.filters}>
        {rarities.map(r => (
          <Pressable key={r} style={[styles.filterBtn, filter === r && styles.filterBtnActive]} onPress={() => setFilter(r)}>
            <Text style={[styles.filterText, filter === r && styles.filterTextActive]}>{r[0].toUpperCase() + r.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#10B981" /><Text style={styles.loadingText}>Loading banners...</Text></View>
      ) : banners.length === 0 ? (
        <View style={styles.empty}><Sparkles size={48} color="#64748B" /><Text style={styles.emptyTitle}>No Banners</Text><Text style={styles.emptyText}>Try another rarity.</Text></View>
      ) : (
        <FlatList
          data={banners}
          renderItem={renderBanner}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1.5, borderColor: '#475569' },
  filterBtnActive: { backgroundColor: '#0F172A', borderColor: '#10B981', borderWidth: 2 },
  filterText: { fontSize: 12, fontWeight: '600', color: '#CBD5E1' },
  filterTextActive: { color: '#10B981' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 100 },
  row: { gap: 12, marginBottom: 12 },

  card: { flex: 1, aspectRatio: 1, borderRadius: 20, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  cardLocked: { opacity: 0.6 },
  cardActive: { shadowColor: '#FFFFFF', shadowOpacity: 0.5, shadowRadius: 20, borderWidth: 2, borderColor: '#FFFFFF' },
  cardInner: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0B0F19' },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rarityTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rarityText: { fontSize: 10, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },

  bottom: { alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center' },

  applyBtn: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7 },
  applyText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: '#10B981', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  activeText: { color: '#10B981', fontWeight: '700', fontSize: 12 },

  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(148,163,184,0.2)', borderWidth: 1, borderColor: '#64748B', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  premiumText: { color: '#94A3B8', fontWeight: '700', fontSize: 10 },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94A3B8' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#94A3B8', textAlign: 'center' },
});
