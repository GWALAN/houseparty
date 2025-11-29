# Notification System Implementation Guide

## Overview

The HouseParty app now includes a comprehensive real-time notification system that supports both in-app toast notifications and native push notifications for:

1. **Friend Requests** - When someone sends you a friend request
2. **Friend Acceptances** - When someone accepts your friend request
3. **Game Invitations** - When someone invites you to join a game session

---

## Architecture

### Components

1. **NotificationContext** (`contexts/NotificationContext.tsx`)
   - Global notification provider
   - Handles real-time Supabase subscriptions
   - Manages push notification permissions
   - Routes notifications to appropriate screens

2. **Toast Notifications** (In-App)
   - Immediate visual feedback
   - Shows at top of screen
   - Auto-dismisses after 5 seconds
   - Works in all environments (Expo Go, dev builds, production)

3. **Push Notifications** (Native)
   - System-level notifications
   - Shows even when app is in background
   - Tappable to navigate to relevant screen
   - Requires production build or Expo Dev Client

---

## Implementation Details

### 1. Real-Time Notification Listeners

The `NotificationContext` sets up Supabase real-time subscriptions when user logs in:

```typescript
// Friend Request Notifications
supabase
  .channel(`friend-request-notifications-${user.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'friend_requests',
    filter: `recipient_id=eq.${user.id}`
  }, async (payload) => {
    // Show toast notification
    showInfo(`${senderName} sent you a friend request!`);

    // Send push notification
    await Notifications.scheduleNotificationAsync({...});
  })
  .subscribe();
```

### 2. In-App Toast Notifications

**How They Work:**
- Triggered immediately when real-time event occurs
- Uses existing `ToastContext` for display
- Shows username and action description
- 5-second duration (configurable)

**Example:**
```typescript
showInfo(`${username} sent you a friend request!`, 5000);
showSuccess(`${username} accepted your friend request!`, 5000);
```

### 3. Native Push Notifications

**How They Work:**
- Uses `expo-notifications` package
- Requests permissions on app launch
- Schedules local notification with custom data
- Handles tap to navigate to relevant screen

**Push Notification Structure:**
```typescript
{
  title: 'New Friend Request',
  body: 'John sent you a friend request!',
  data: {
    type: 'friend_request',
    senderId: 'uuid',
    requestId: 'uuid'
  },
  sound: true
}
```

### 4. Notification Routing

When user taps a push notification:

```typescript
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;

  if (data.type === 'friend_request') {
    router.push('/(tabs)/friends');
  } else if (data.type === 'game_invite') {
    router.push(`/game-session/${data.sessionId}`);
  }
});
```

---

## Database Schema

### New Columns

**user_profile_settings.push_token**
- Stores device push token for remote notifications
- Updated when app requests notification permissions
- Used for sending push notifications via Expo Push API

### New Tables

**game_invitations**
```sql
CREATE TABLE game_invitations (
  id uuid PRIMARY KEY,
  game_session_id uuid REFERENCES game_sessions(id),
  inviter_id uuid REFERENCES profiles(id),
  invitee_id uuid REFERENCES profiles(id),
  house_id uuid REFERENCES houses(id),
  status text CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### New Functions

1. **send_game_invitation(session_id, invitee_id, house_id)**
   - Creates game invitation
   - Validates house membership
   - Triggers real-time notification

2. **accept_game_invitation(invitation_id)**
   - Updates invitation status
   - Returns game session ID for navigation

3. **decline_game_invitation(invitation_id)**
   - Updates invitation status to declined

---

## Testing

### Testing in Expo Go (Development)

**What Works:**
- ✅ In-app toast notifications
- ✅ Real-time updates via Supabase
- ✅ Navigation when tapping notifications
- ❌ Native push notifications (not available in Expo Go)

**How to Test:**
1. Run app in Expo Go
2. Send friend request from another account
3. Toast notification should appear immediately
4. Navigate to Friends tab to see request

### Testing in Production/Dev Client

**What Works:**
- ✅ In-app toast notifications
- ✅ Native push notifications
- ✅ Background notifications
- ✅ Lock screen notifications
- ✅ Notification badges

**How to Test:**
1. Build production APK or use Expo Dev Client
2. Grant notification permissions when prompted
3. Send friend request from another device
4. Receive both toast and push notification
5. Tap push notification to navigate to Friends tab

---

## Notification Permissions

### Permission Request Flow

1. **On App Launch:**
   ```typescript
   const { status } = await Notifications.requestPermissionsAsync();
   ```

2. **Permission States:**
   - `granted` - User approved notifications
   - `denied` - User declined notifications
   - `undetermined` - User hasn't decided yet

3. **Handling Denied Permissions:**
   - App continues to work normally
   - Only in-app toasts are shown
   - User can manually enable in device settings

### Best Practices

- Request permissions at appropriate time (not immediately on launch)
- Explain value of notifications before requesting
- Gracefully handle permission denial
- Provide in-app alternative (toast notifications)

---

## Notification Types

### 1. Friend Request Received

**Trigger:** User receives new friend request

**In-App Toast:**
```
"[Username] sent you a friend request!"
Type: info
Duration: 5 seconds
```

**Push Notification:**
```
Title: "New Friend Request"
Body: "[Username] wants to be your friend!"
Action: Navigate to Friends tab
```

### 2. Friend Request Accepted

**Trigger:** Someone accepts your friend request

**In-App Toast:**
```
"[Username] accepted your friend request!"
Type: success
Duration: 5 seconds
```

**Push Notification:**
```
Title: "Friend Request Accepted"
Body: "[Username] is now your friend!"
Action: Navigate to Friends tab
```

### 3. Game Invitation

**Trigger:** Friend invites you to join game session

**In-App Toast:**
```
"[Username] invited you to play [Game Name]!"
Type: info
Duration: 5 seconds
```

**Push Notification:**
```
Title: "Game Invitation"
Body: "[Username] invited you to play [Game Name] in [House Name]!"
Action: Navigate to game session
```

---

## Integration Guide

### Adding New Notification Types

1. **Add to NotificationContext:**
```typescript
// In NotificationContext.tsx
const newTypeChannel = supabase
  .channel(`new-type-${user.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'your_table',
    filter: `user_id=eq.${user.id}`
  }, async (payload) => {
    showInfo('Your notification message');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Title',
        body: 'Body',
        data: { type: 'new_type', ...data }
      }
    });
  })
  .subscribe();
```

2. **Add Navigation Handler:**
```typescript
// In NotificationContext notification response listener
if (data.type === 'new_type') {
  router.push('/your-screen');
}
```

3. **Test Both Environments:**
   - Expo Go (toast only)
   - Production build (toast + push)

---

## Troubleshooting

### Issue: No Notifications Appearing

**Possible Causes:**
1. Real-time subscriptions not connected
2. User not authenticated
3. Notification permissions denied

**Solutions:**
1. Check console for subscription status logs
2. Verify user is logged in
3. Check device notification settings

### Issue: Toast Shows But No Push Notification

**Cause:** Running in Expo Go

**Solution:** Build production APK or use Expo Dev Client

### Issue: Push Notification Not Opening Correct Screen

**Cause:** Missing or incorrect navigation data

**Solution:**
1. Verify notification data includes required fields
2. Check router path is correct
3. Ensure screen exists in navigation stack

### Issue: Duplicate Notifications

**Cause:** Multiple subscriptions to same channel

**Solution:**
1. Ensure proper cleanup in useEffect
2. Check for multiple NotificationProvider instances
3. Verify channel names are unique

---

## Performance Considerations

### Real-Time Subscriptions

- Each user has 2-3 active subscriptions
- Automatically cleaned up on unmount
- Minimal battery impact
- Efficient database queries with indexes

### Push Notifications

- Scheduled immediately (no delay)
- Minimal data payload
- Respects system notification settings
- Does not wake screen unnecessarily

### Database Impact

- Indexes on notification-related columns
- Efficient RLS policies
- No polling - event-driven only
- Automatic cleanup of old data

---

## Future Enhancements

### Planned Features

1. **Notification History**
   - View past notifications
   - Mark as read/unread
   - Delete individual notifications

2. **Notification Preferences**
   - Toggle notification types
   - Quiet hours
   - Custom notification sounds

3. **Grouped Notifications**
   - Multiple friend requests in one notification
   - Game invitation summaries

4. **Rich Notifications**
   - Profile pictures in notifications
   - Quick actions (Accept/Decline)
   - Inline replies

---

## Summary

The notification system is now fully functional with:

✅ **Real-time friend request notifications** (in-app toast)
✅ **Real-time friend acceptance notifications** (in-app toast)
✅ **Native push notifications** (production builds)
✅ **Smart navigation** (tap to open relevant screen)
✅ **Graceful fallbacks** (works in Expo Go with toasts)
✅ **Database schema** (game invitations table ready)
✅ **Efficient performance** (indexed queries, event-driven)

### Key Benefits

1. **Immediate Feedback** - Users see notifications instantly
2. **Multi-Environment Support** - Works in dev and production
3. **Scalable Architecture** - Easy to add new notification types
4. **Battery Efficient** - Event-driven, no polling
5. **User-Friendly** - Clear messages, smart navigation

---

*Documentation Version: 1.0*
*Last Updated: 2025-11-17*
