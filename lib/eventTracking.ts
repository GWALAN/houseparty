/**
 * Event Tracking Helpers
 *
 * Provides helper functions to track common events across the app
 */

import { logger, EventType, EventStatus } from './logger';

// House Events
export const trackHouseEvent = {
  create: (houseId: string, houseName: string, metadata?: any) => {
    logger.event(EventType.HOUSE, 'house_create', {
      status: EventStatus.SUCCESS,
      house_id: houseId,
      metadata: { houseName, ...metadata },
    });
  },

  createFailed: (error: any, metadata?: any) => {
    logger.event(EventType.HOUSE, 'house_create', {
      status: EventStatus.FAIL,
      metadata: { error: String(error), ...metadata },
    });
  },

  join: (houseId: string, houseName: string, method: 'code' | 'qr' | 'invitation') => {
    logger.event(EventType.HOUSE, 'house_join', {
      status: EventStatus.SUCCESS,
      house_id: houseId,
      metadata: { houseName, method },
    });
  },

  joinFailed: (error: any, method: 'code' | 'qr' | 'invitation') => {
    logger.event(EventType.HOUSE, 'house_join', {
      status: EventStatus.FAIL,
      metadata: { error: String(error), method },
    });
  },

  leave: (houseId: string, houseName: string) => {
    logger.event(EventType.HOUSE, 'house_leave', {
      status: EventStatus.SUCCESS,
      house_id: houseId,
      metadata: { houseName },
    });
  },

  delete: (houseId: string, houseName: string, memberCount: number) => {
    logger.event(EventType.HOUSE, 'house_delete', {
      status: EventStatus.SUCCESS,
      house_id: houseId,
      metadata: { houseName, memberCount },
    });
  },

  updateSettings: (houseId: string, changes: string[]) => {
    logger.event(EventType.HOUSE, 'house_settings_update', {
      status: EventStatus.SUCCESS,
      house_id: houseId,
      metadata: { changes },
    });
  },

  applyKit: (houseId: string, kitId: string, kitName: string, rarity: string) => {
    logger.event(EventType.HOUSE, 'house_kit_apply', {
      status: EventStatus.SUCCESS,
      house_id: houseId,
      metadata: { kitId, kitName, rarity },
    });
  },

  memberInvited: (houseId: string, inviteeId: string) => {
    logger.event(EventType.HOUSE, 'house_member_invited', {
      status: EventStatus.SUCCESS,
      house_id: houseId,
      metadata: { inviteeId },
    });
  },

  memberRemoved: (houseId: string, removedUserId: string) => {
    logger.event(EventType.HOUSE, 'house_member_removed', {
      status: EventStatus.SUCCESS,
      house_id: houseId,
      metadata: { removedUserId },
    });
  },
};

// Game Events
export const trackGameEvent = {
  create: (gameId: string, gameName: string, houseId: string, playerCount: number) => {
    logger.event(EventType.GAME, 'game_create', {
      status: EventStatus.SUCCESS,
      game_id: gameId,
      house_id: houseId,
      metadata: { gameName, playerCount },
    });
  },

  start: (sessionId: string, gameId: string, houseId: string, playerCount: number) => {
    logger.event(EventType.GAME, 'game_start', {
      status: EventStatus.SUCCESS,
      session_id: sessionId,
      game_id: gameId,
      house_id: houseId,
      metadata: { playerCount },
    });
  },

  end: (sessionId: string, gameId: string, houseId: string, duration: number, winnerId?: string) => {
    logger.event(EventType.GAME, 'game_end', {
      status: EventStatus.SUCCESS,
      session_id: sessionId,
      game_id: gameId,
      house_id: houseId,
      metadata: { duration, winnerId },
    });
  },

  scoreSubmit: (sessionId: string, gameId: string, houseId: string, playerId: string, score: number) => {
    logger.event(EventType.GAME, 'game_score_submit', {
      status: EventStatus.SUCCESS,
      session_id: sessionId,
      game_id: gameId,
      house_id: houseId,
      metadata: { playerId, score },
    });
  },

  inviteSent: (sessionId: string, gameId: string, houseId: string, inviteeId: string) => {
    logger.event(EventType.GAME, 'game_invite_sent', {
      status: EventStatus.SUCCESS,
      session_id: sessionId,
      game_id: gameId,
      house_id: houseId,
      metadata: { inviteeId },
    });
  },

  inviteAccepted: (sessionId: string, gameId: string, houseId: string) => {
    logger.event(EventType.GAME, 'game_invite_accepted', {
      status: EventStatus.SUCCESS,
      session_id: sessionId,
      game_id: gameId,
      house_id: houseId,
    });
  },

  inviteDeclined: (sessionId: string, gameId: string, houseId: string) => {
    logger.event(EventType.GAME, 'game_invite_declined', {
      status: EventStatus.SUCCESS,
      session_id: sessionId,
      game_id: gameId,
      house_id: houseId,
    });
  },

  delete: (gameId: string, houseId: string, gameName: string) => {
    logger.event(EventType.GAME, 'game_delete', {
      status: EventStatus.SUCCESS,
      game_id: gameId,
      house_id: houseId,
      metadata: { gameName },
    });
  },
};

// Purchase Events
export const trackPurchaseEvent = {
  start: (productType: 'premium' | 'kit', productId?: string, price?: number) => {
    logger.event(EventType.PURCHASE, 'purchase_start', {
      status: EventStatus.START,
      metadata: { productType, productId, price },
    });
  },

  success: (productType: 'premium' | 'kit', transactionId: string, productId?: string, price?: number) => {
    logger.event(EventType.PURCHASE, 'purchase_complete', {
      status: EventStatus.SUCCESS,
      metadata: { productType, transactionId, productId, price },
    });
  },

  failed: (productType: 'premium' | 'kit', error: any, productId?: string) => {
    logger.event(EventType.PURCHASE, 'purchase_failed', {
      status: EventStatus.FAIL,
      metadata: { productType, error: String(error), productId },
    });
  },

  cancelled: (productType: 'premium' | 'kit', productId?: string) => {
    logger.event(EventType.PURCHASE, 'purchase_cancelled', {
      status: EventStatus.INFO,
      metadata: { productType, productId },
    });
  },
};

// API Call Tracking
export const trackAPICall = async <T>(
  endpoint: string,
  operation: () => Promise<T>,
  context?: { house_id?: string; game_id?: string; session_id?: string }
): Promise<T> => {
  const startTime = Date.now();

  logger.apiStart(endpoint, context);

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    logger.apiSuccess(endpoint, duration);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.apiError(endpoint, error, duration);

    throw error;
  }
};
