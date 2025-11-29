# Remaining Fixes Needed

## Completed ✓
1. Removed house kit display text from profile screens
2. Removed private account feature from settings

## TODO - Friend System

### Remove Block User Feature
Location: `app/(tabs)/friends.tsx`

Need to:
1. Remove all blocked_users related code
2. Remove block/unblock functions
3. Remove blocked users list UI
4. Keep only unfriend functionality
5. Ensure both parties have friend removed when unfriending

## TODO - Leaderboard

### Fix Leaderboard Scores
Location: `app/(tabs)/leaderboard.tsx`

Current: Shows games played but not score per game
Need: Display actual scores for each game played

### Add House Leaderboard Filters
Location: Likely needs new component or filters in house view

Need filters for:
1. Most wins in this house
2. Best accuracy
3. Longest winning streak

## TODO - Profile Stats

### Fix Stats Display
Location: `app/(tabs)/profile.tsx`

Current: Shows "Games Played" but missing total wins and win rate
Need: Add two more stat cards:
1. Total Wins counter
2. Win Rate percentage

The stats are already being fetched:
```typescript
setStats({
  totalGames,
  totalWins,
  winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
  housesCount: housesData?.length || 0,
});
```

Just need to display totalWins and winRate in the UI.

## TODO - Friends List

### Remove Collection Section
Location: `app/(tabs)/friends.tsx`

Need to remove any UI showing friends' kit collections or similar collection data.
