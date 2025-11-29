import { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, LogBox } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// Suppress harmless Expo Router navigation warning
LogBox.ignoreLogs([
  'Looks like you have configured linking in multiple places',
]);
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { BannerProvider } from '@/contexts/BannerContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { BadgeProvider } from '@/contexts/BadgeContext';
import { BannerUnlockProvider } from '@/contexts/BannerUnlockContext';
import { ErrorProvider } from '@/contexts/ErrorContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { deepLinking } from '@/lib/deepLinking';
import { installGlobalErrorHandlers, setCurrentScreen } from '@/lib/globalErrorHandler';
import { logger, EventType, EventStatus } from '@/lib/logger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Navigation tracking component
function NavigationLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      setCurrentScreen(pathname);
      logger.navigate(pathname);
    }
  }, [pathname]);

  return null;
}

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  useEffect(() => {
    // Install global error handlers (non-blocking)
    try {
      installGlobalErrorHandlers();
    } catch (e) {
      console.error('[App] Failed to install error handlers:', e);
    }

    // Log app startup (non-blocking)
    try {
      logger.event(EventType.SYSTEM, 'app_start', {
        status: EventStatus.SUCCESS,
        metadata: {
          platform: typeof Platform !== 'undefined' ? Platform.OS : 'web',
          version: typeof Platform !== 'undefined' ? Platform.Version : 'unknown',
        },
      });
    } catch (e) {
      console.error('[App] Failed to log startup:', e);
    }

    // Complete auth session when deep link opens (for PayPal redirect)
    WebBrowser.maybeCompleteAuthSession();

    const unsubscribe = deepLinking.setupDeepLinkListener((deepLink) => {
      console.log('[App] Deep link received:', deepLink);

      try {
        logger.event(EventType.NAVIGATE, 'deep_link', {
          status: EventStatus.SUCCESS,
          metadata: { deepLink },
        });
      } catch (e) {
        console.error('[App] Failed to log deep link:', e);
      }

      deepLinking.handleDeepLink(deepLink);
    });

    return () => {
      unsubscribe();

      try {
        logger.flush();
      } catch (e) {
        console.error('[App] Failed to flush logs:', e);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorProvider>
          <ToastProvider>
            <AuthProvider>
              <NotificationProvider>
                <PremiumProvider>
                    <BannerUnlockProvider>
                      <ProfileProvider>
                        <BannerProvider>
                          <BadgeProvider>
                      <NavigationLogger />
                      <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="auth-redirect" />
                  <Stack.Screen name="create-house" />
                  <Stack.Screen name="join-house" />
                  <Stack.Screen name="scan-qr" />
                  <Stack.Screen name="house/[id]" />
                  <Stack.Screen name="house-settings/[id]" />
                  <Stack.Screen name="add-game/[houseId]" />
                  <Stack.Screen name="game-session/[gameId]" />
                  <Stack.Screen name="profile-settings" />
                  <Stack.Screen name="kit-details/[id]" />
                  <Stack.Screen name="apply-kit/[kitId]" />
                  <Stack.Screen name="qr-code/[houseId]" />
                  <Stack.Screen name="player-stats/[userId]" />
                  <Stack.Screen name="diagnostic" />
                  <Stack.Screen name="paypal/success" />
                  <Stack.Screen name="paypal/cancel" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                    <StatusBar
                      style="light"
                      translucent={typeof Platform !== 'undefined' && Platform.OS === 'android'}
                      backgroundColor="transparent"
                    />
                          </BadgeProvider>
                        </BannerProvider>
                      </ProfileProvider>
                    </BannerUnlockProvider>
                  </PremiumProvider>
                </NotificationProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
