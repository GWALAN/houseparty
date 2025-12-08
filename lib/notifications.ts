import { Platform } from 'react-native';

type NotificationType =
  | 'game_invite'
  | 'friend_request'
  | 'friend_accepted'
  | 'invitation_accepted'
  | 'game_completed'
  | 'game_session_started'
  | 'badge_unlocked'
  | 'house_joined'
  | 'purchase_success';

type NotificationData = {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
};

class NotificationService {
  private pushToken: string | null = null;
  private isInitialized: boolean = false;

  async initialize() {
    console.log('[Notifications] Notifications disabled in Expo Go');
    this.isInitialized = true;
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async registerPushToken(userId: string): Promise<void> {
    console.log('[Notifications] Push tokens not available in Expo Go');
  }

  getPushToken(): string | null {
    return null;
  }

  async sendLocalNotification(notification: NotificationData): Promise<void> {
    console.log('[Notifications] Local notification:', notification.title);
  }

  async scheduleNotification(notification: NotificationData, trigger: { seconds: number }): Promise<void> {
    console.log('[Notifications] Schedule notification:', notification.title);
  }

  async cancelAllNotifications(): Promise<void> {
    console.log('[Notifications] Cancel notifications');
  }

  notifyGameInvite(houseName: string, gameTitle: string, inviterId: string) {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Game invite (web):', houseName, gameTitle);
    } else {
      console.log('[Notifications] Game invite:', houseName, gameTitle);
    }
  }

  notifyFriendRequest(username: string, userId: string) {
    console.log('[Notifications] Friend request:', username);
  }

  notifyFriendAccepted(username: string, userId: string) {
    console.log('[Notifications] Friend accepted:', username);
  }

  notifyGameSessionStarted(houseName: string, gameTitle: string, sessionId: string) {
    console.log('[Notifications] Game started:', houseName, gameTitle);
  }

  notifyBadgeUnlocked(badgeName: string, badgeId: string) {
    console.log('[Notifications] Badge unlocked:', badgeName);
  }

  notifyHouseJoined(houseName: string, memberName: string, houseId: string) {
    console.log('[Notifications] House joined:', houseName, memberName);
  }

  notifyFriendRequestDeclined(username: string) {
    console.log('[Notifications] Friend request declined:', username);
  }

  async cancelFriendRequestNotification(userId: string) {
    console.log('[Notifications] Cancel friend request notification:', userId);
  }

  notifyPurchaseSuccess(itemName: string, itemType: 'premium' | 'kit' | 'subscription') {
    console.log('[Notifications] Purchase success:', itemName, itemType);
  }
}

export const notifications = new NotificationService();

export const setupNotificationHandler = () => {
  console.log('[Notifications] Handler setup skipped (Expo Go)');
};

export const addNotificationReceivedListener = (
  callback: (notification: any) => void
) => {
  return { remove: () => {} };
};

export const addNotificationResponseReceivedListener = (
  callback: (response: any) => void
) => {
  return { remove: () => {} };
};
