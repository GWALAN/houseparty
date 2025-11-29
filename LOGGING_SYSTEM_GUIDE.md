# Global App Logging System - Implementation Guide

## Overview

A comprehensive event logging system has been implemented to track all user actions and app events. This system captures crashes, user behavior, API calls, and system events with breadcrumbs for debugging.

## Features Implemented

### 1. Enhanced Database Schema

**Migration**: `upgrade_to_app_event_logs_system_v2`

New columns added to `app_logs` table:
- `event_type` - Type of event (NAVIGATE, AUTH, HOUSE, GAME, PURCHASE, API_CALL, CRASH, etc.)
- `event_name` - Specific event name (e.g., "house_create", "game_start")
- `status` - Event status: start, success, fail, info
- `house_id` - Link to house if applicable
- `game_id` - Link to game if applicable
- `session_id` - Game session ID if applicable
- `screen_name` - Screen where event occurred
- `app_version` - App version
- `platform` - android/ios/web
- `build_channel` - dev/preview/prod
- `error_stack` - Full error stack for crashes
- `breadcrumbs` - Last actions before crash (JSONB)
- `metadata` - Additional event data (JSONB)

**Security**:
- Anonymous users can insert logs (for pre-login crashes)
- Users can only view their own logs
- Service role can view all logs

**Performance**:
- Batch insert function: `insert_app_logs_batch(logs jsonb)`
- Indexes on event_type, status, house_id, game_id, screen_name
- Composite indexes for common query patterns

### 2. Enhanced Logger Utility (`lib/logger.ts`)

**Core Features**:
- Batched log uploads (every 5 seconds or 50 logs)
- In-memory breadcrumb buffer (last 50 events)
- Rate limiting (100 logs per minute)
- Automatic flush on app background
- Immediate flush for errors and crashes

**Event Types**:
```typescript
EventType.NAVIGATE   // Screen navigation
EventType.AUTH       // Authentication events
EventType.HOUSE      // House-related events
EventType.GAME       // Game-related events
EventType.PURCHASE   // Payment/purchase events
EventType.API_CALL   // API/database calls
EventType.CRASH      // App crashes
EventType.WARNING    // Warnings
EventType.SYSTEM     // System events
```

**Event Status**:
```typescript
EventStatus.START    // Operation started
EventStatus.SUCCESS  // Operation succeeded
EventStatus.FAIL     // Operation failed
EventStatus.INFO     // Informational event
```

**API Methods**:

```typescript
// Basic logging
logger.info("Message", metadata)
logger.warn("Warning", metadata)
logger.error("Error", metadata)
logger.debug("Debug", metadata)

// Event tracking
logger.event(EventType.HOUSE, 'house_create', {
  status: EventStatus.SUCCESS,
  house_id: 'uuid',
  metadata: { houseName: 'My House' }
})

// Navigation tracking
logger.navigate('/house/123', { params })

// API call tracking
logger.apiStart('fetch_houses', { userId })
logger.apiSuccess('fetch_houses', duration)
logger.apiError('fetch_houses', error, duration)

// Crash logging
logger.crash(error, componentStack)

// Get breadcrumbs
logger.getBreadcrumbs()

// Force flush
logger.flush()
```

### 3. Global Error Handler (`lib/globalErrorHandler.ts`)

**Features**:
- Global JavaScript error handler
- Unhandled promise rejection handler
- React Native ErrorUtils integration
- Automatic crash logging with breadcrumbs
- Current screen tracking

**Setup** (done automatically in app/_layout.tsx):
```typescript
import { installGlobalErrorHandlers, setCurrentScreen } from '@/lib/globalErrorHandler';

// In root component
useEffect(() => {
  installGlobalErrorHandlers();
}, []);

// Track current screen
setCurrentScreen(pathname);
```

**Helper Functions**:
```typescript
// Log caught errors
logCaughtError('CONTEXT', error, additionalData)

// Wrap async functions
const { data, error } = await withErrorLogging('operation', async () => {
  // your code
}, additionalData)
```

### 4. Event Tracking Helpers (`lib/eventTracking.ts`)

Convenient helpers for common events:

**House Events**:
```typescript
trackHouseEvent.create(houseId, houseName, metadata)
trackHouseEvent.createFailed(error, metadata)
trackHouseEvent.join(houseId, houseName, method)
trackHouseEvent.joinFailed(error, method)
trackHouseEvent.leave(houseId, houseName)
trackHouseEvent.delete(houseId, houseName, memberCount)
trackHouseEvent.updateSettings(houseId, changes)
trackHouseEvent.applyKit(houseId, kitId, kitName, rarity)
trackHouseEvent.memberInvited(houseId, inviteeId)
trackHouseEvent.memberRemoved(houseId, removedUserId)
```

**Game Events**:
```typescript
trackGameEvent.create(gameId, gameName, houseId, playerCount)
trackGameEvent.start(sessionId, gameId, houseId, playerCount)
trackGameEvent.end(sessionId, gameId, houseId, duration, winnerId)
trackGameEvent.scoreSubmit(sessionId, gameId, houseId, playerId, score)
trackGameEvent.inviteSent(sessionId, gameId, houseId, inviteeId)
trackGameEvent.inviteAccepted(sessionId, gameId, houseId)
trackGameEvent.inviteDeclined(sessionId, gameId, houseId)
trackGameEvent.delete(gameId, houseId, gameName)
```

**Purchase Events**:
```typescript
trackPurchaseEvent.start(productType, productId, price)
trackPurchaseEvent.success(productType, transactionId, productId, price)
trackPurchaseEvent.failed(productType, error, productId)
trackPurchaseEvent.cancelled(productType, productId)
```

**API Call Wrapper**:
```typescript
const result = await trackAPICall('endpoint_name', async () => {
  return await supabase.from('table').select('*');
}, { house_id, game_id });
```

### 5. Navigation Tracking

Automatic screen tracking in `app/_layout.tsx`:
- Logs every screen view
- Updates current screen context
- Tracks navigation parameters

### 6. Auth Event Tracking

Comprehensive authentication logging in `contexts/AuthContext.tsx`:
- Session initialization and restoration
- Sign up attempts (success/fail)
- Sign in attempts (success/fail)
- Sign out events
- Password reset requests
- Token refresh events
- Auth state changes

### 7. Enhanced Error Boundary

Updated `components/ErrorBoundary.tsx`:
- Logs crashes with full breadcrumbs
- Captures component stack
- Records current screen
- Shows last 50 user actions before crash

## Usage Examples

### In a Screen Component

```typescript
import { logger, EventType, EventStatus } from '@/lib/logger';
import { trackHouseEvent } from '@/lib/eventTracking';

function CreateHouseScreen() {
  const handleCreateHouse = async (name: string) => {
    try {
      // Log start
      logger.event(EventType.HOUSE, 'house_create', {
        status: EventStatus.START,
        metadata: { name }
      });

      // Create house
      const { data, error } = await supabase
        .from('houses')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;

      // Log success using helper
      trackHouseEvent.create(data.id, name, { emoji: '🏠' });

      return data;
    } catch (error) {
      // Log failure
      trackHouseEvent.createFailed(error, { name });
      throw error;
    }
  };
}
```

### Wrapping API Calls

```typescript
import { trackAPICall } from '@/lib/eventTracking';

async function fetchHouseMembers(houseId: string) {
  return await trackAPICall(
    'fetch_house_members',
    async () => {
      const { data, error } = await supabase
        .from('house_members')
        .select('*')
        .eq('house_id', houseId);

      if (error) throw error;
      return data;
    },
    { house_id: houseId }
  );
}
```

### Handling Errors

```typescript
import { logCaughtError } from '@/lib/globalErrorHandler';

try {
  await riskyOperation();
} catch (error) {
  logCaughtError('RISKY_OPERATION', error, {
    userId,
    operationData: someData
  });
  // Handle error
}
```

## Querying Logs

### View Recent Events for a User

```sql
SELECT
  timestamp,
  event_type,
  event_name,
  status,
  screen_name,
  metadata
FROM app_logs
WHERE user_id = 'user-uuid'
ORDER BY timestamp DESC
LIMIT 100;
```

### View All Events in a House

```sql
SELECT
  timestamp,
  event_type,
  event_name,
  status,
  metadata
FROM app_logs
WHERE house_id = 'house-uuid'
ORDER BY timestamp DESC;
```

### View Crashes with Breadcrumbs

```sql
SELECT
  timestamp,
  message,
  error_stack,
  breadcrumbs,
  screen_name,
  user_id
FROM app_logs
WHERE event_type = 'CRASH'
ORDER BY timestamp DESC;
```

### View Failed Operations

```sql
SELECT
  timestamp,
  event_type,
  event_name,
  metadata,
  error_stack
FROM app_logs
WHERE status = 'fail'
ORDER BY timestamp DESC
LIMIT 50;
```

### View API Call Performance

```sql
SELECT
  event_name as endpoint,
  COUNT(*) as call_count,
  AVG((metadata->>'duration')::numeric) as avg_duration,
  MAX((metadata->>'duration')::numeric) as max_duration
FROM app_logs
WHERE event_type = 'API_CALL'
  AND status = 'success'
GROUP BY event_name
ORDER BY avg_duration DESC;
```

## Benefits

### For Debugging Production Issues

1. **Complete Timeline**: See exactly what user did before crash
2. **Breadcrumbs**: Last 50 actions stored with every crash
3. **Context**: Current screen, house ID, game ID, user ID all captured
4. **Device Info**: Platform, OS version, app version, build channel

### For Understanding User Behavior

1. **Navigation Patterns**: Track which screens users visit most
2. **Feature Usage**: See which features are used most frequently
3. **Error Rates**: Monitor failure rates for different operations
4. **Performance**: Track API call durations and slow operations

### For Quality Assurance

1. **Pre-login Crashes**: Logs work even before user authenticates
2. **No UI Blocking**: Batched uploads prevent performance impact
3. **Rate Limited**: Prevents log spam from degrading performance
4. **Automatic Flush**: Logs saved when app backgrounds or crashes

## Configuration

### Adjust Logging Behavior

Edit `lib/logger.ts`:

```typescript
const ENABLE_REMOTE_LOGGING = true;  // Enable/disable remote logging
const BATCH_INTERVAL = 5000;          // Batch send interval (ms)
const MAX_BATCH_SIZE = 50;            // Max logs per batch
const MAX_BREADCRUMBS = 50;           // Breadcrumb buffer size
const MAX_LOGS_PER_MINUTE = 100;      // Rate limit
```

### Disable Logging in Development

```typescript
const ENABLE_REMOTE_LOGGING = !__DEV__;  // Only log in production
```

## Best Practices

1. **Don't Over-Log**: Only log meaningful actions, not UI renders
2. **Use Event Types**: Categorize events properly for easier filtering
3. **Include Context**: Always include house_id, game_id when applicable
4. **Use Helpers**: Use `eventTracking.ts` helpers for consistency
5. **Wrap API Calls**: Use `trackAPICall` for automatic timing
6. **Handle Errors**: Always log failures with context
7. **Metadata**: Include useful debugging info in metadata field

## What's Logged Automatically

- ✅ App startup
- ✅ Screen navigation (all routes)
- ✅ Authentication (login, logout, signup, password reset)
- ✅ Auth state changes (session restored, token refresh)
- ✅ Deep link navigation
- ✅ Global JavaScript errors
- ✅ Unhandled promise rejections
- ✅ Component crashes (Error Boundary)
- ✅ App background/foreground

## What Needs Manual Integration

To complete the logging system, add event tracking to:

- House creation, join, leave, delete screens
- Game session creation, start, end screens
- Score submission
- Game invitations
- Purchase flows
- Settings changes
- Profile updates
- Friend requests
- Kit applications

Use the helpers from `lib/eventTracking.ts` for easy integration!

## Performance Impact

- **Minimal**: Logs batched every 5 seconds
- **Non-blocking**: Fire-and-forget inserts
- **Rate limited**: Max 100 logs/minute prevents spam
- **Efficient**: Batch insert function reduces database load
- **Smart**: Auto-flush on errors, crashes, and app background

## Troubleshooting

### Logs Not Appearing

1. Check `ENABLE_REMOTE_LOGGING` is true
2. Verify database policies allow anon inserts
3. Check network connectivity
4. Look for logger errors in console

### Too Many Logs

1. Increase `BATCH_INTERVAL` to reduce frequency
2. Decrease `MAX_LOGS_PER_MINUTE` rate limit
3. Remove verbose debug logging in production

### Missing Context

1. Ensure `house_id`, `game_id` passed to logger
2. Check `setCurrentScreen()` called on navigation
3. Verify user session available in auth context

## Next Steps

1. Add logging to all house operations
2. Add logging to all game operations
3. Add logging to purchase flows
4. Set up log monitoring dashboards
5. Create alerts for high error rates
6. Analyze user behavior patterns
7. Optimize slow API calls based on logs

## Summary

You now have a production-ready logging system that:
- Captures every meaningful user action
- Works before login (for crash debugging)
- Doesn't block UI or impact performance
- Stores last 50 actions as breadcrumbs
- Provides complete context for debugging
- Enables behavior analysis and optimization

The foundation is complete. Now integrate the event tracking helpers throughout your app to capture house, game, and purchase events!
