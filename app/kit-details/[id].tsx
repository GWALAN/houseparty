import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Check, Sparkles, Eye, Clock, TrendingUp, Users, Zap, Crown, Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';

type KitDetails = {
  id: string;
  name: string;
  description: string;
  tier: string;
  price_cents: number;
  is_featured: boolean;
  included_items: string[];
  preview_image_url: string;
  theme_data?: any;
  purchase_count?: number;
  allows_trial?: boolean;
};

export default function KitDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [kit, setKit] = useState<KitDetails | null>(null);
  const [hasTrialed, setHasTrialed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const router = useRouter();

  useEffect(() => {
    fetchKitDetails();
  }, [id]);

  const fetchKitDetails = async () => {
    const { data: kitData } = await supabase
      .from('house_kits')
      .select(`
        *,
        kit_items!house_kit_id (
          item_data
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (kitData) {
      const { count } = await supabase
        .from('user_kit_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('kit_id', id);

      setKit({
        ...kitData,
        theme_data: kitData.kit_items?.[0]?.item_data,
        purchase_count: count || 0,
      });
    }

    if (user) {
      const { data: adminHouses } = await supabase
        .from('house_members')
        .select('house_id')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      if (adminHouses && adminHouses.length > 0) {
        const houseIds = adminHouses.map(h => h.house_id);
        const { data: trials } = await supabase
          .from('theme_trials')
          .select('id')
          .eq('kit_id', id)
          .in('house_id', houseIds)
          .limit(1);

        setHasTrialed(!!(trials && trials.length > 0));
      }
    }

    setLoading(false);
  };


  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'starter': return ['#3B82F6', '#2563EB'];
      case 'pro': return ['#8B5CF6', '#7C3AED'];
      case 'premium': return ['#F59E0B', '#D97706'];
      case 'ultimate': return ['#EF4444', '#DC2626'];
      default: return ['#6B7280', '#4B5563'];
    }
  };

  if (loading || !kit) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </LinearGradient>
    );
  }

  const tierColors = getTierColor(kit.tier);
  const themeColors = kit.theme_data?.colors;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={(themeColors?.background || tierColors) as [string, string, ...string[]]}
        style={styles.heroSection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {kit.preview_image_url && (
          <Image
            source={{ uri: kit.preview_image_url }}
            style={styles.heroImage}
            blurRadius={30}
          />
        )}

        <View style={styles.heroOverlay}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </Pressable>

            {kit.is_featured && (
              <View style={styles.featuredTag}>
                <Sparkles size={16} color="#FBBF24" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>

          <View style={styles.heroContent}>
            <LinearGradient
              colors={tierColors as [string, string, ...string[]]}
              style={styles.tierBadgeLarge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.tierTextLarge}>{kit.tier.toUpperCase()}</Text>
            </LinearGradient>

            <Text style={styles.kitTitle}>{kit.name}</Text>
            <Text style={styles.kitSubtitle}>{kit.description}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.statsBar}>
          {(kit.purchase_count || 0) > 0 && (
            <View style={styles.statItem}>
              <Users size={16} color="#10B981" />
              <Text style={styles.statText}>
                {kit.purchase_count}+ owners
              </Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Sparkles size={16} color="#F59E0B" />
            <Text style={styles.statText}>
              {kit.included_items.length} items
            </Text>
          </View>
          {kit.tier === 'pro' && (
            <View style={styles.statItem}>
              <Zap size={16} color="#10B981" fill="#10B981" />
              <Text style={styles.statText}>Best Value</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          <View style={styles.itemsList}>
            {kit.included_items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.checkIcon}>
                  <Check size={16} color="#10B981" />
                </View>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {themeColors && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color Palette</Text>
            <View style={styles.colorGrid}>
              {Object.entries(themeColors).filter(([key]) =>
                !key.includes('background') && !key.includes('text')
              ).map(([name, color]) => (
                <View key={name} style={styles.colorItem}>
                  <View style={[styles.colorSwatch, { backgroundColor: color as string }]} />
                  <Text style={styles.colorName}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose This Kit</Text>
          <View style={styles.benefitsList}>
            {kit.tier === 'ultimate' && (
              <View style={styles.benefitRow}>
                <Crown size={18} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.benefitText}>
                  All current & future themes included
                </Text>
              </View>
            )}
            {kit.tier !== 'starter' && (
              <View style={styles.benefitRow}>
                <Sparkles size={18} color="#10B981" />
                <Text style={styles.benefitText}>
                  Animated effects & transitions
                </Text>
              </View>
            )}
            <View style={styles.benefitRow}>
              <TrendingUp size={18} color="#3B82F6" />
              <Text style={styles.benefitText}>
                Stand out with unique house style
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <Users size={18} color="#8B5CF6" />
              <Text style={styles.benefitText}>
                Impress your house members
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tier</Text>
              <Text style={styles.detailValue}>{kit.tier}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Items</Text>
              <Text style={styles.detailValue}>{kit.included_items.length}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Animated</Text>
              <Text style={styles.detailValue}>
                {kit.tier !== 'starter' ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>One-time purchase</Text>
              <Text style={styles.price}>{formatPrice(kit.price_cents)}</Text>
              {kit.tier === 'pro' && (
                <View style={styles.savingsTag}>
                  <Text style={styles.savingsText}>Most Popular Choice</Text>
                </View>
              )}
            </View>
            {(kit.purchase_count || 0) > 5 && (
              <View style={styles.socialProofBadge}>
                <Users size={14} color="#10B981" />
                <Text style={styles.socialProofCount}>{kit.purchase_count}+</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footerActions}>
          {isPremium ? (
            <Pressable
              style={styles.applyButton}
              onPress={() => router.push(`/apply-kit/${kit.id}`)}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Apply to House</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.lockedButton}
              onPress={() => router.push('/profile')}
            >
              <Lock size={20} color="#FFFFFF" />
              <Text style={styles.lockedButtonText}>Premium Required</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    height: 350,
    position: 'relative',
  },
  heroImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  featuredText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FBBF24',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tierBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  tierTextLarge: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  kitTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  kitSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  itemText: {
    fontSize: 15,
    color: '#CBD5E1',
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  benefitsList: {
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  benefitText: {
    fontSize: 15,
    color: '#E2E8F0',
    flex: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  colorItem: {
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  colorName: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  priceContainer: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  savingsTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  savingsText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
  },
  socialProofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  socialProofCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  trialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  trialButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
    borderColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  applyButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lockedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#64748B',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
  },
  lockedButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
