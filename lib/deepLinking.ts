import * as Linking from 'expo-linking';
import { router } from 'expo-router';

const APP_SCHEME = 'houseparty';
const WEB_URL = 'https://houseparty.app';

export type DeepLinkType =
  | { type: 'house_invite'; houseId: string; inviteCode?: string }
  | { type: 'house_detail'; houseId: string }
  | { type: 'friend_profile'; userId: string }
  | { type: 'game_session'; sessionId: string }
  | { type: 'paypal_success'; token?: string; orderId?: string; kitId?: string }
  | { type: 'paypal_cancel' }
  | { type: 'password_reset'; access_token?: string; refresh_token?: string; recovery_type?: string };

class DeepLinkingService {
  generateHouseInviteLink(houseId: string, inviteCode?: string): string {
    const params = new URLSearchParams({ houseId });
    if (inviteCode) {
      params.append('code', inviteCode);
    }
    return `${WEB_URL}/invite?${params.toString()}`;
  }

  generateHouseDetailLink(houseId: string): string {
    return `${WEB_URL}/house/${houseId}`;
  }

  generateFriendProfileLink(userId: string): string {
    return `${WEB_URL}/profile/${userId}`;
  }

  generateAppLink(path: string): string {
    return `${APP_SCHEME}://${path}`;
  }

  parseDeepLink(url: string): DeepLinkType | null {
    try {
      const { hostname, path, queryParams } = Linking.parse(url);

      if (hostname === 'paypal' || path?.startsWith('/paypal')) {
        const pathSegment = path?.replace('/paypal/', '') || hostname;

        if (pathSegment === 'success' || path === '/paypal/success') {
          return {
            type: 'paypal_success',
            token: queryParams?.token as string,
            orderId: queryParams?.orderId as string,
            kitId: queryParams?.kitId as string,
          };
        }

        if (pathSegment === 'cancel' || path === '/paypal/cancel') {
          return { type: 'paypal_cancel' };
        }
      }

      if (hostname === 'invite' || path === '/invite') {
        const houseId = queryParams?.houseId as string;
        const inviteCode = queryParams?.code as string;
        if (houseId) {
          return { type: 'house_invite', houseId, inviteCode };
        }
      }

      if (path?.startsWith('/house/')) {
        const houseId = path.replace('/house/', '');
        if (houseId) {
          return { type: 'house_detail', houseId };
        }
      }

      if (path?.startsWith('/profile/')) {
        const userId = path.replace('/profile/', '');
        if (userId) {
          return { type: 'friend_profile', userId };
        }
      }

      if (path?.startsWith('/session/')) {
        const sessionId = path.replace('/session/', '');
        if (sessionId) {
          return { type: 'game_session', sessionId };
        }
      }

      if (hostname === 'reset-password' || path === '/reset-password') {
        console.log('[DeepLink] Password reset detected, parsing hash fragment');

        // Supabase sends tokens in hash fragment (#access_token=...&refresh_token=...)
        // Linking.parse() doesn't extract hash, so we need to parse it manually
        const hashIndex = url.indexOf('#');
        const hashParams: Record<string, string> = {};

        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          console.log('[DeepLink] Hash fragment:', hash);
          const params = new URLSearchParams(hash);
          params.forEach((value, key) => {
            hashParams[key] = value;
          });
          console.log('[DeepLink] Parsed hash params:', hashParams);
        }

        return {
          type: 'password_reset',
          access_token: hashParams.access_token || (queryParams?.access_token as string),
          refresh_token: hashParams.refresh_token || (queryParams?.refresh_token as string),
          recovery_type: hashParams.type || (queryParams?.type as string),
        };
      }

      return null;
    } catch (error) {
      console.error('[DeepLink] Error parsing URL:', error);
      return null;
    }
  }

  handleDeepLink(deepLink: DeepLinkType) {
    switch (deepLink.type) {
      case 'paypal_success':
        const successParams = new URLSearchParams();
        if (deepLink.token) successParams.append('token', deepLink.token);
        if (deepLink.orderId) successParams.append('orderId', deepLink.orderId);
        if (deepLink.kitId) successParams.append('kitId', deepLink.kitId);
        router.push(`/paypal/success?${successParams.toString()}`);
        break;

      case 'paypal_cancel':
        router.push('/paypal/cancel');
        break;

      case 'house_invite':
        if (deepLink.inviteCode) {
          router.push(`/join-house?code=${deepLink.inviteCode}`);
        } else {
          router.push(`/house/${deepLink.houseId}`);
        }
        break;

      case 'house_detail':
        router.push(`/house/${deepLink.houseId}`);
        break;

      case 'friend_profile':
        router.push(`/player-stats/${deepLink.userId}`);
        break;

      case 'game_session':
        router.push(`/game-session/${deepLink.sessionId}`);
        break;

      case 'password_reset':
        // Encode tokens in URL query string (Expo Router params object doesn't work reliably)
        const resetParams = new URLSearchParams();
        if (deepLink.access_token) resetParams.append('access_token', deepLink.access_token);
        if (deepLink.refresh_token) resetParams.append('refresh_token', deepLink.refresh_token);
        if (deepLink.recovery_type) resetParams.append('type', deepLink.recovery_type);

        console.log('[DeepLink] Navigating to reset-password with params:', resetParams.toString().substring(0, 100) + '...');
        router.push(`/(auth)/reset-password?${resetParams.toString()}` as any);
        break;
    }
  }

  setupDeepLinkListener(callback: (deepLink: DeepLinkType) => void) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] Received URL:', url);
      const deepLink = this.parseDeepLink(url);
      if (deepLink) {
        callback(deepLink);
      }
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
        const deepLink = this.parseDeepLink(url);
        if (deepLink) {
          callback(deepLink);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }
}

export const deepLinking = new DeepLinkingService();
