# Scoring System Audit Report

## Executive Summary
After comprehensive analysis of the scoring system across the application, I've identified several critical issues and inconsistencies that make scoring confusing for users.

## Key Issues Identified

### 1. **CRITICAL: No Player Leaderboard Exists**
**Location:** Leaderboard Tab (`app/(tabs)/leaderboard.tsx`)
**Issue:** The "Leaderboard" tab shows game history (individual completed games), NOT player rankings/standings.

**Evidence:**
- The database function `get_house_leaderboard()` exists and works correctly
- It returns: wins, games_played, win_rate, total_score, current_win_streak
- **BUT** this function is never called in the frontend
- Users expect to see player rankings but only see game sessions

**User Impact:** HIGH - Users cannot see who's leading in their house

---

### 2. **Games Count Inconsistency**
**Location:** Multiple screens
**Issue:** Different screens count games differently

**Profile Screen (`app/(tabs)/profile.tsx` line 214-215):**
```typescript
const totalGames = scoresResult.data?.length || 0;  // Counts ALL score entries
```
**Problem:** This counts every `session_scores` row, not unique game sessions

**Player Stats Screen (`app/player-stats/[userId].tsx` line 267-268):**
```typescript
const uniqueSessions = new Set(sortedScores.map(s => s.session_id));
const totalGames = uniqueSessions.size;  // Counts UNIQUE sessions (CORRECT)
```

**Database Function (`get_house_leaderboard`):**
```sql
COALESCE(COUNT(DISTINCT ss.session_id), 0) as games_played  -- CORRECT
```

**User Impact:** MEDIUM - Profile shows incorrect game counts if multiple scores per session

---

### 3. **Win Rate Calculation Inconsistency**
**Issue:** Profile screen calculates wins incorrectly

**Profile Screen (line 215):**
```typescript
const totalWins = scoresResult.data?.filter((s) => s.is_winner).length || 0;
```
**Problem:** If a user has multiple score entries in one session, this counts it multiple times

**Correct Approach (Player Stats screen, line 271-272):**
```typescript
const winningSessionIds = new Set(sortedScores.filter(s => s.is_winner).map(s => s.session_id));
const totalWins = winningSessionIds.size;
```

**User Impact:** MEDIUM - Win rates may be inflated

---

### 4. **Total Score Ambiguity**
**Location:** Leaderboard function and display
**Issue:** "Total Score" meaning is unclear to users

**Current Implementation:**
- Sums up ALL scores across ALL games
- Example: 320 + 320 + 340 = 980 points

**Problems:**
- Doesn't account for different scoring types (points vs weight vs time)
- A player who plays more games always has higher "total" (not fair)
- No context for what this number means
- Different games use different scales (0-100 vs 0-1000)

**User Impact:** HIGH - Users don't understand what "total score" represents

---

### 5. **Average Score Not Displayed**
**Location:** Leaderboard
**Issue:** The leaderboard shows TOTAL score but not AVERAGE score

**Why This Matters:**
- Total score favors players who play more games
- Average score shows skill level per game
- Both metrics provide different insights

**User Impact:** MEDIUM - Can't compare player skill fairly

---

### 6. **Missing Context for Scoring Types**
**Issue:** Scores shown without indicating the scoring system used

**Example:**
- Game 1: 320 kg (weight)
- Game 2: 95% (accuracy)
- Game 3: 45 seconds (time)

All get summed together as "total score" which makes no sense.

**User Impact:** HIGH - Mixing incompatible scoring types

---

### 7. **Placement vs Winner Inconsistency**
**Database Check Results:**
```
FortniteTest:
- Game 1: placement=2, is_winner=false (CORRECT)
- Game 2: placement=1, is_winner=true (CORRECT)
- Game 3: placement=2, is_winner=false (CORRECT)
```

**Status:** GOOD - Placements are correctly assigned

---

### 8. **House Members vs Participants Confusion**
**Issue:** Two different concepts shown in different places

**Leaderboard Function:**
- Shows ALL house members (even if they never played)
- Includes members with 0 games, 0 wins

**Game History:**
- Shows only actual participants in each game
- More relevant for per-game viewing

**User Impact:** LOW - Acceptable design choice, but could be confusing

---

## Recommendations

### Priority 1: CRITICAL FIXES

#### Fix 1: Add Actual Player Leaderboard View
**Action:** Create a proper player rankings view on the Leaderboard tab
**Display:**
```
PLAYER RANKINGS

1. 👑 FortniteTest          Win Rate: 33%
   🎮 3 games  •  ⭐ 1 wins  •  🔥 Streak: 0

2.    Elandre               Win Rate: 0%
   🎮 0 games  •  ⭐ 0 wins  •  🔥 Streak: 0
```

#### Fix 2: Fix Profile Stats Counting
**Change:**
```typescript
// BEFORE (WRONG)
const totalGames = scoresResult.data?.length || 0;
const totalWins = scoresResult.data?.filter((s) => s.is_winner).length || 0;

// AFTER (CORRECT)
const uniqueSessions = new Set(scoresResult.data?.map(s => s.session_id));
const totalGames = uniqueSessions.size;
const winningSessionIds = new Set(
  scoresResult.data?.filter(s => s.is_winner).map(s => s.session_id)
);
const totalWins = winningSessionIds.size;
```

### Priority 2: IMPORTANT IMPROVEMENTS

#### Improvement 1: Replace "Total Score" with Better Metrics
**Options:**
1. Remove "Total Score" entirely
2. Add "Average Score" instead
3. Show both with clear labels:
   - "Total Points Earned: 980"
   - "Avg Points Per Game: 327"

#### Improvement 2: Add Per-House Leaderboards
- Each house should have its own leaderboard
- Shows only games played in that specific house
- More relevant than global stats

#### Improvement 3: Better Score Display Context
Show scoring type next to scores:
```
FortniteTest    320 kg     ⭐ Winner
Elandre         280 kg     2nd Place
```

### Priority 3: NICE-TO-HAVE

#### Enhancement 1: Streak Tracking
- Current win streak already in database
- Display prominently on leaderboard
- Add visual flair for streaks > 3

#### Enhancement 2: Best Performance Highlights
- Best score in each scoring type
- Best placement percentage
- Most improved player

---

## Database Health Check

✅ **GOOD:** Database functions work correctly
✅ **GOOD:** Scoring data is stored properly
✅ **GOOD:** Placements are calculated correctly
✅ **GOOD:** Winner flags are accurate
✅ **GOOD:** House members are tracked properly

❌ **BAD:** Frontend doesn't use available data correctly
❌ **BAD:** Inconsistent calculations across screens
❌ **BAD:** Missing key UI components (player leaderboard)

---

## Test Results

### Test Case 1: House "tsek" Leaderboard
```
✅ FortniteTest appears in leaderboard
✅ Shows 3 games, 1 win, 33.33% win rate
✅ Total score: 980 (320+320+340)
✅ Elandre appears (member with 0 games)
```

### Test Case 2: Database vs Frontend
```
✅ Database function returns correct data
❌ Frontend profile shows incorrect game count
❌ Frontend doesn't display player leaderboard
❌ Frontend mixes different scoring types
```

---

## Implementation Priority

1. **IMMEDIATE:** Add player leaderboard view to Leaderboard tab
2. **IMMEDIATE:** Fix profile stats counting logic
3. **HIGH:** Improve score display with context
4. **MEDIUM:** Add average score calculations
5. **LOW:** Add streak displays and highlights

---

## Conclusion

The scoring SYSTEM works correctly at the database level, but the DISPLAY and CALCULATIONS in the frontend are inconsistent and confusing. Users need:

1. A clear player rankings view
2. Consistent game/win counting
3. Better context for scores
4. Separation of different scoring types
5. Fair comparison metrics (averages, not just totals)
