# Notification System Updates

## Overview

Added two new notification types to enhance real-time user communication within the HouseParty app.

---

## New Notification Types

### 1. Game Invitation Acceptance Notification

**When it triggers:** When someone accepts your game invitation

**Who gets notified:** The game creator (person who sent the invitation)

**Notification content:**
- In-app toast: `[Username] accepted your invitation to play [Game Name]!`
- Push notification title: `Invitation Accepted`
- Push notification body: `[Username] has joined your game of [Game Name] in [House Name]!`

**Navigation:** Tapping the notification takes the user to:
1. The game session (if session ID is available)
2. The house page (if only house ID is available)
3. Home screen (fallback)

**Technical details:**
- Listens to UPDATE events on `game_invitations` table
- Filters by `inviter_id=eq.${user.id}` (only notify the inviter)
- Only triggers when `status` changes from `pending` to `accepted`
- Channel name: `invitation-acceptance-notifications-${user.id}`

---

### 2. Game Completion Notification

**When it triggers:** When a game you participated in ends

**Who gets notified:** All participants except the person who completed the game

**Notification content:**
- In-app toast: `[Game Name] in [House Name] has ended - You won!` (or placement)
- Push notification title: `Game Completed`
- Push notification body: Includes win status and placement

**Notification variations:**
- If user won: "You won!"
- If user placed: "You placed #2" (or their actual placement)
- Otherwise: Just shows game ended

**Navigation:** Tapping the notification takes the user to:
- The house page to view game history

**Technical details:**
- Listens to UPDATE events on `game_sessions` table
- Checks if user was a participant via `session_scores` table
- Only triggers when `status` changes to `completed`
- Excludes notification if user is the one who completed the game
- Channel name: `game-completion-notifications-${user.id}`

---

## Implementation Details

### NotificationContext Changes

**File:** `contexts/NotificationContext.tsx`

**New channels added:**
1. `invitationAcceptanceChannel` - Lines 273-328
2. `gameCompletionChannel` - Lines 330-399

**Cleanup updated:**
- Both new channels properly cleaned up on unmount

**Navigation handlers updated:**
- Added `invitation_accepted` handler - Lines 426-434
- Added `game_completed` handler - Lines 435-441

### Database Requirements

**Tables used:**
- `game_invitations` - Already has realtime enabled ✅
- `game_sessions` - Already has realtime enabled ✅
- `session_scores` - For checking participant status ✅

**Required columns:**
- `game_invitations.status` ✅
- `game_sessions.status` ✅
- `session_scores.is_winner` ✅
- `session_scores.placement` ✅

All requirements are met in the current schema.

---

## Testing Guide

### Test 1: Invitation Acceptance Notification

**Setup:**
1. User A creates a game and invites User B
2. User B receives the game invitation

**Test steps:**
1. Have User B accept the invitation
2. User A should see:
   - Toast notification: "[User B] accepted your invitation to play [Game]!"
   - Push notification (on native builds)
3. Tap notification on User A's device
4. Should navigate to the game session

**Expected result:** User A is notified immediately when User B accepts

---

### Test 2: Game Completion Notification

**Setup:**
1. User A creates a game with User B and User C
2. All users have started the game

**Test steps:**
1. Have User A complete the game (end the game)
2. User B and User C should see:
   - Toast notification with their result (win/placement)
   - Push notification (on native builds)
3. User A should NOT see a notification (they completed it)
4. Tap notification on User B's device
5. Should navigate to the house page

**Expected result:** All participants except the completer are notified

---

### Test 3: Solo Game Completion

**Setup:**
1. User A creates a solo game (no other participants)

**Test steps:**
1. Have User A complete the game
2. User A should NOT see a notification

**Expected result:** No notification for solo games

---

### Test 4: Multi-game Scenario

**Setup:**
1. User A is invited to multiple games
2. User A is in multiple active games

**Test steps:**
1. Accept one invitation while in another game
2. Complete one game while another is active
3. Verify notifications are specific to each game

**Expected result:** Each notification references the correct game

---

## Notification Flow Diagrams

### Invitation Acceptance Flow

```
User B (Invitee)                    System                      User A (Inviter)
     |                                 |                              |
     |--[Accepts Invitation]---------->|                              |
     |                                 |                              |
     |                                 |--[UPDATE game_invitations]-->|
     |                                 |                              |
     |                                 |--[Realtime event]----------->|
     |                                 |                              |
     |                                 |<--[Fetch user/game info]-----|
     |                                 |                              |
     |                                 |--[Show toast]-------------->[Toast]
     |                                 |                              |
     |                                 |--[Send push notification]-->[Push]
```

### Game Completion Flow

```
User A (Creator)                     System                  Users B, C, D (Participants)
     |                                  |                              |
     |--[Completes Game]--------------->|                              |
     |                                  |                              |
     |                                  |--[UPDATE game_sessions]----->|
     |                                  |                              |
     |                                  |--[Check participants]------->|
     |                                  |                              |
     |                                  |--[Realtime event]----------->|
     |                                  |                              |
     |                                  |<--[Fetch score/placement]----|
     |                                  |                              |
     |                                  |--[Show toast (B,C,D)]------>[Toasts]
     |                                  |                              |
     |                                  |--[Send push (B,C,D)]------->[Pushes]
     |                                  |                              |
     | (User A gets NO notification)    |    (Excludes game completer) |
```

---

## Performance Considerations

### Database Queries

**Invitation Acceptance:**
- 3 queries per notification (invitee profile, house, game)
- All queries run in parallel for optimal performance
- Queries are lightweight (single row lookups)

**Game Completion:**
- 3 queries per participant (user score, game, house)
- User score checked first (quick exit if not participant)
- Game and house info fetched in parallel

### Realtime Efficiency

**Channel subscription:**
- Each user has 5 active channels total:
  1. Friend requests
  2. Friendships
  3. Game invitations
  4. Invitation acceptances
  5. Game completions

**Filtering:**
- All channels use server-side filtering
- Only relevant events reach the client
- Minimal battery impact

---

## Troubleshooting

### Issue: Invitation acceptance notification not showing

**Possible causes:**
1. User is not the inviter
2. Status didn't change from pending to accepted
3. Realtime subscription not connected

**Solutions:**
1. Check console logs for `[Notifications] Game invitation updated`
2. Verify filter: `inviter_id=eq.${user.id}`
3. Ensure game_invitations table has realtime enabled

---

### Issue: Game completion notification not showing

**Possible causes:**
1. User is not a participant in the game
2. User is the one who completed the game
3. Session status wasn't properly updated

**Solutions:**
1. Check if user has entry in session_scores
2. Verify `created_by` doesn't match current user
3. Check status transition (should be from active/pending to completed)

---

### Issue: Notification shows but navigation fails

**Possible causes:**
1. Missing gameSessionId or houseId in notification data
2. Route doesn't exist
3. User doesn't have permission to view page

**Solutions:**
1. Check notification data includes required IDs
2. Verify routes exist in app folder
3. Check RLS policies for target pages

---

## Future Enhancements

### Potential improvements:

1. **Batch notifications:**
   - Group multiple invitation acceptances
   - "3 friends joined your game!"

2. **Notification preferences:**
   - Allow users to disable specific notification types
   - Quiet hours setting

3. **Rich notifications:**
   - Include user avatars
   - Show game scores in notification
   - Quick actions (View Results, Play Again)

4. **Notification history:**
   - Store notification history in database
   - Allow users to review past notifications
   - Mark as read/unread

5. **Smart notifications:**
   - Only notify if user hasn't opened app recently
   - Delay notifications if user is active in another game

---

## Summary

The notification system now supports:

✅ **Game invitation received** (existing)
✅ **Friend request received** (existing)
✅ **Friend request accepted** (existing)
✅ **Game invitation accepted** (NEW)
✅ **Game completed** (NEW)

All notifications include:
- In-app toast notifications (work in Expo Go)
- Push notifications (production builds only)
- Smart navigation when tapped
- Personalized messages with usernames and game names
- Proper filtering to prevent spam

The system is production-ready and scalable for future notification types.

---

*Documentation Version: 2.0*
*Last Updated: 2025-12-08*
