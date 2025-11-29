# Leaderboard Scoring Display - Fixed

**Issue**: Leaderboard showing "0.00 %" for all scores instead of proper accuracy format
**Status**: ✅ RESOLVED

## Problems Fixed

1. **Scoring metadata missing from database function**
   - accuracy_hits, accuracy_attempts not included in participant data
   - ratio_numerator, ratio_denominator not included

2. **Frontend not passing metadata to formatScore()**
   - Only passing `unit` parameter
   - Missing hits, attempts, numerator, denominator

3. **Placement showing as "#null" for in-progress games**
   - No null check before displaying placement number

## Fixes Applied

### 1. Database Function Update ✅
**Migration**: `add_scoring_metadata_to_game_history`

Added fields to get_house_game_history() participant JSON:
- accuracy_hits
- accuracy_attempts  
- ratio_numerator
- ratio_denominator

### 2. Frontend Updates ✅
**File**: `app/(tabs)/leaderboard.tsx`

- Updated Participant type with new fields
- Pass all metadata to formatScore() function
- Added null check for placement display

## Expected Results

### Accuracy Games (like Trivia)
**Before**: `0.00 %`
**After**: `7/10 (70.0%)`

### In-Progress Games
**Before**: `#null` or `#undefined`
**After**: `-` (dash symbol)

### Completed Games with Winners
- Gold highlighting for winners ✅
- Trophy icon for winners ✅
- Proper placement numbers (#1, #2, #3) ✅

## Testing

To see the fix in action:
1. Start a new Trivia game
2. Enter scores (e.g., 7/10, 5/10)
3. End the game properly
4. Check leaderboard - should show "7/10 (70.0%)"

**Status**: Ready to use after app refresh
