import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Crown, Check, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { notifications } from '@/lib/notifications';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Toast from './Toast';
import { logger } from '@/lib/logger';

type PremiumPurchaseModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function PremiumPurchaseModal({ visible, onClose }: PremiumPurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const { user } = useAuth();
  const { refreshPremiumStatus } = usePremium();

  const handlePurchase = async () => {
    if (!user) {
      logger.warn('Premium purchase attempted without user', { userId: null });
      setToast({ visible: true, message: 'Please sign in to purchase', type: 'error' });
      return;
    }

    setLoading(true);
    logger.track('premium_purchase_initiated', { userId: user.id, platform: Platform.OS });

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        logger.error('Premium purchase failed - no auth token', { userId: user.id });
        throw new Error('Not authenticated');
      }

      logger.info('Creating PayPal premium order', { userId: user.id });

      // Create PayPal order for premium subscription
      const createOrderResponse = await fetch(
        `${supabaseUrl}/functions/v1/paypal-create-premium-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!createOrderResponse.ok) {
        const errorData = await createOrderResponse.json();
        console.error('[PREMIUM PURCHASE] Create order failed:', errorData);
        logger.error('PayPal order creation failed', {
          userId: user.id,
          status: createOrderResponse.status,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to create PayPal order');
      }

      const { orderId, approvalUrl } = await createOrderResponse.json();
      logger.info('PayPal order created', { userId: user.id, orderId, hasApprovalUrl: !!approvalUrl });

      if (!approvalUrl) {
        logger.error('No approval URL in PayPal response', { userId: user.id, orderId });
        throw new Error('No approval URL returned from PayPal');
      }

      console.log('[PREMIUM PURCHASE] Opening PayPal approval URL:', approvalUrl);

      // On web, use direct navigation. On native, use auth session
      if (Platform.OS === 'web') {
        // Store order info for when user returns
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pendingPayPalOrder', JSON.stringify({ orderId, isPremium: true }));
        }

        // Redirect directly to PayPal (avoids popup blocker)
        window.location.href = approvalUrl;
      } else {
        // On Android, openAuthSessionAsync can fail immediately
        // Use openBrowserAsync instead which is more reliable
        logger.info('Opening PayPal in browser', { userId: user.id, orderId, approvalUrl });

        setToast({
          visible: true,
          message: 'Opening PayPal. The app will resume after payment.',
          type: 'success',
        });

        // Store the orderId for when user returns via deep link
        await supabase
          .from('user_purchases')
          .upsert({
            user_id: user.id,
            product_type: 'premium',
            payment_provider: 'paypal',
            payment_status: 'pending',
            provider_order_id: orderId,
            amount_cents: 499,
            currency: 'USD',
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,provider_order_id'
          });

        // Open PayPal in external browser (will return via deep link)
        const result = await WebBrowser.openBrowserAsync(approvalUrl, {
          toolbarColor: '#0F172A',
          controlsColor: '#10B981',
          showTitle: true,
          enableBarCollapsing: false,
        });

        logger.info('Browser result', { userId: user.id, orderId, resultType: result.type });

        // Browser was closed - check if payment was completed
        if (result.type === 'cancel' || result.type === 'dismiss') {
          logger.info('Browser closed by user', { userId: user.id, orderId });

          // Give a moment for deep link to be processed if user completed payment
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check if payment was completed while browser was open
          const { data: purchase } = await supabase
            .from('user_purchases')
            .select('payment_status')
            .eq('user_id', user.id)
            .eq('provider_order_id', orderId)
            .maybeSingle();

          if (purchase?.payment_status === 'completed') {
            logger.track('premium_paypal_payment_completed', { userId: user.id, orderId });
            setToast({
              visible: true,
              message: 'Premium unlocked successfully!',
              type: 'success',
            });
            await refreshPremiumStatus();
            setTimeout(() => onClose(), 1500);
          } else {
            setToast({
              visible: true,
              message: 'Payment window closed. Complete payment to continue.',
              type: 'error',
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      logger.error('Premium purchase error', {
        userId: user?.id,
        error: error.message,
        stack: error.stack
      });
      setToast({
        visible: true,
        message: error.message || 'Failed to process purchase',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Create unlimited houses',
    'Upload custom profile photos',
    'Access all emoji packs',
    'Lifetime access - no subscriptions',
  ];

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              style={styles.modalGradient}
            >
              <Pressable style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#FFFFFF" />
              </Pressable>

              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    style={styles.iconGradient}
                  >
                    <Crown size={48} color="#FFFFFF" fill="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.title}>Unlock Premium</Text>
                <Text style={styles.subtitle}>
                  Lifetime access - Pay once, own forever
                </Text>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.currency}>$</Text>
                <Text style={styles.price}>4.99</Text>
                <View style={styles.periodContainer}>
                  <Text style={styles.period}>one-time</Text>
                  <Text style={styles.lifetimeText}>lifetime access</Text>
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <View style={styles.checkIcon}>
                      <Check size={16} color="#10B981" strokeWidth={3} />
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.noteContainer}>
                <Sparkles size={16} color="#10B981" />
                <Text style={styles.noteText}>
                  Unlock unlimited houses and premium features forever
                </Text>
              </View>

              <Pressable
                style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
                onPress={handlePurchase}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#6B7280', '#4B5563'] : ['#10B981', '#059669']}
                  style={styles.purchaseGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.purchaseText}>Purchase with PayPal</Text>
                      <Crown size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Text style={styles.disclaimer}>
                Secure payment processed by PayPal
              </Text>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  modalGradient: {
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  currency: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: -12,
  },
  price: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#10B981',
    lineHeight: 64,
  },
  periodContainer: {
    alignItems: 'flex-start',
    marginTop: 16,
  },
  period: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  lifetimeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#E2E8F0',
    flex: 1,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 24,
  },
  noteText: {
    fontSize: 12,
    color: '#6EE7B7',
    flex: 1,
    lineHeight: 18,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  purchaseButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  purchaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 18,
  },
  purchaseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
