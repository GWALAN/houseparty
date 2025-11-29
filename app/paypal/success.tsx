import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useProfile } from '@/contexts/ProfileContext';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';

export default function PayPalSuccessScreen() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your payment...');
  const hasProcessed = useRef(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { refreshPremiumStatus } = usePremium();
  const { refreshProfile } = useProfile();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasProcessed.current) {
      hasProcessed.current = true;
      handlePayPalReturn();
    }
  }, []);

  const handlePayPalReturn = async () => {
    try {
      const { token, orderId, kitId } = params;
      console.log('[PAYPAL_SUCCESS] Received params:', { token, orderId, kitId });
      console.log('[PAYPAL_SUCCESS] All params:', params);
      logger.info('PayPal success page loaded', { token, orderId, kitId, allParams: params, userId: user?.id });

      // PayPal returns 'token' parameter which is the order ID
      const paymentOrderId = (token || orderId) as string;
      const kitIdParam = kitId as string | undefined;

      if (!paymentOrderId) {
        console.error('[PAYPAL_SUCCESS] No token or orderId found');
        logger.error('PayPal success - missing order ID', { params });
        setStatus('error');
        setMessage('Invalid payment link - missing order ID');
        setTimeout(() => router.replace('/(tabs)/shop'), 3000);
        return;
      }

      console.log('[PAYPAL_SUCCESS] Using order ID:', paymentOrderId);

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        console.error('[PAYPAL_SUCCESS] No access token found');
        logger.error('PayPal success - no access token', { userId: user?.id });
        setStatus('error');
        setMessage('Authentication required');
        setTimeout(() => router.replace('/(auth)/signin'), 3000);
        return;
      }

      console.log('[PAYPAL_SUCCESS] User authenticated');
      logger.info('PayPal success - user authenticated', { userId: user?.id });
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      const endpoint = kitIdParam
        ? 'capture-kit-paypal-payment'
        : 'paypal-capture-premium-order';

      const body = kitIdParam
        ? JSON.stringify({ orderId: paymentOrderId, kitId: kitIdParam })
        : JSON.stringify({ orderId: paymentOrderId });

      console.log('[PAYPAL_SUCCESS] Calling endpoint:', endpoint);
      console.log('[PAYPAL_SUCCESS] Request body:', body);
      logger.info('Calling PayPal capture endpoint', { endpoint, orderId: paymentOrderId, kitId: kitIdParam, userId: user?.id });

      const captureResponse = await fetch(
        `${supabaseUrl}/functions/v1/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body,
        }
      );

      console.log('[PAYPAL_SUCCESS] Capture response status:', captureResponse.status);
      logger.info('PayPal capture response', { status: captureResponse.status, orderId: paymentOrderId, userId: user?.id });

      if (captureResponse.ok) {
        const responseData = await captureResponse.json();
        const { success } = responseData;
        logger.info('PayPal capture success', { success, orderId: paymentOrderId, userId: user?.id });

        if (success) {
          setStatus('success');
          setMessage(kitIdParam ? 'Kit purchased successfully!' : 'Premium unlocked!');
          logger.track('paypal_purchase_completed', {
            type: kitIdParam ? 'kit' : 'premium',
            orderId: paymentOrderId,
            kitId: kitIdParam,
            userId: user?.id
          });

          // Refresh premium status and profile data
          await refreshPremiumStatus();
          await refreshProfile();

          // Invalidate queries to refresh kit list in shop
          if (kitIdParam) {
            queryClient.invalidateQueries({ queryKey: ['houseKits'] });
          }

          // Redirect to appropriate screen
          setTimeout(() => {
            if (kitIdParam) {
              router.replace('/(tabs)/shop');
            } else {
              router.replace('/(tabs)/profile');
            }
          }, 2000);
        } else {
          logger.error('PayPal capture failed - success false', { responseData, orderId: paymentOrderId });
          throw new Error('Payment capture failed');
        }
      } else {
        const errorData = await captureResponse.json();
        logger.error('PayPal capture HTTP error', {
          status: captureResponse.status,
          error: errorData,
          orderId: paymentOrderId,
          userId: user?.id
        });
        throw new Error(errorData.error || 'Payment processing failed');
      }
    } catch (error: any) {
      console.error('[PAYPAL_SUCCESS] Error:', error);
      logger.error('PayPal success page error', {
        error: error.message,
        stack: error.stack,
        userId: user?.id
      });
      setStatus('error');
      setMessage(error.message || 'Payment processing failed');
      setTimeout(() => router.replace('/(tabs)/shop'), 3000);
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.title}>{message}</Text>
            <Text style={styles.subtitle}>Please wait...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} color="#10B981" />
            <Text style={styles.title}>{message}</Text>
            <Text style={styles.subtitle}>Redirecting...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} color="#EF4444" />
            <Text style={styles.title}>Payment Failed</Text>
            <Text style={styles.subtitle}>{message}</Text>
            <Text style={styles.info}>Redirecting back...</Text>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
});
