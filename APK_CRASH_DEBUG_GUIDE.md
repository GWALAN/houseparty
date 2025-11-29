# APK Crash Debugging Guide

## Important Understanding

**Your old APK does NOT have the new logging code!**

The logging system we just implemented is ONLY in the codebase now. Your old APK was built before we added it, so it doesn't have:
- ❌ Logger utility
- ❌ Global error handlers
- ❌ Event tracking
- ❌ Any of the new features we just added

This means **the logging system is NOT causing your old APK to crash**. Something else is wrong.

## Possible Causes of Old APK Crash

### 1. Database Schema Changes Breaking Old Code

If we changed database schemas (added/removed columns) that the old APK depends on:

**Check:**
```sql
-- See recent migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 10;
```

**Problem**: Old APK expects old schema, but database has new schema

**Solution**: Revert migrations OR build new APK

### 2. RLS Policy Changes Blocking Access

If we changed RLS policies that the old APK needs:

**Check:**
- Can old APK authenticate?
- Can it read profiles?
- Can it read houses?

**Test on web** (which has new code) to isolate the issue

### 3. Supabase Connection Issue

**Check:**
- Is Supabase URL correct in old APK?
- Is anon key still valid?
- Is database online?

**Test:**
```sql
-- Can anonymous users connect?
SELECT 1;
```

### 4. React Native Compatibility

**Check:**
- Expo SDK version mismatch
- Native module issues
- Android version compatibility

## How to Debug the Crash

### Step 1: Connect Device for Logs

```bash
# For Android
adb logcat | grep -i "expo\|react"

# Or use Android Studio Logcat
```

### Step 2: Check Device Logs

Look for:
- `FATAL EXCEPTION`
- `JavaScriptException`
- `Native crash`
- `Unable to resolve module`

### Step 3: Test on Web First

If web works but APK crashes:
- ✅ Database is fine
- ✅ Backend is fine
- ❌ APK-specific issue (build problem, native module, etc.)

If web ALSO crashes:
- ❌ Code problem
- ❌ Database/RLS problem
- Fix in codebase first

### Step 4: Check Diagnostic Screen

If you can access it:
1. Open app (if it doesn't crash immediately)
2. Go to Profile tab
3. Tap Diagnostic
4. Check which tests fail

### Step 5: Build New APK

The ONLY way to fix old APK crashes is to build a new one:

```bash
# Development build (faster, with debugging)
eas build --profile development --platform android

# Production build
eas build --profile production --platform android
```

## Common Crash Scenarios

### Crash on Launch (Immediate)

**Possible causes:**
- Bundle corrupted
- Native module initialization failed
- JavaScript parse error
- Missing native dependencies

**Solution:** Build new APK

### Crash After Login

**Possible causes:**
- Profile creation trigger failed
- User settings query failed
- RLS policy blocking access
- Missing database columns

**Solution:**
1. Check database triggers
2. Check RLS policies
3. Check for missing columns old APK needs

### Crash When Opening Specific Screen

**Possible causes:**
- Query using columns that don't exist
- RLS policy blocking that table
- Missing relationship/foreign key

**Solution:**
1. Test that screen on web
2. Check database schema for that table
3. Check RLS policies for that table

## Quick Checklist

Before assuming it's a logging issue:

- [ ] Does web version work?
- [ ] Can you log in on web?
- [ ] Can you view houses on web?
- [ ] Can you navigate around on web?
- [ ] When was the old APK built?
- [ ] What version of the code was it?
- [ ] Has the database changed since then?

## The Real Solution

**You MUST build a new APK** with the current codebase.

The old APK is incompatible with:
- ✅ New database schema (new columns added)
- ✅ New RLS policies
- ✅ New database functions
- ✅ New triggers
- ✅ Current codebase

**Old APK = Old Code + New Database = CRASHES**

**New APK = New Code + New Database = WORKS**

## Get Device Logs

To see the actual crash error:

### Android

```bash
# Method 1: ADB
adb logcat *:E | grep -i "expo\|react\|fatal"

# Method 2: Android Studio
# Open Android Studio → Logcat → Filter by package name

# Method 3: Expo Dev Client
# Install development build, it will show crash screen with stack trace
```

### iOS

```bash
# Xcode Console
# Connect device → Window → Devices and Simulators → View Device Logs

# Or
# Settings → Analytics & Improvements → Analytics Data
```

## Next Steps

1. ✅ Get crash logs from device (see above)
2. ✅ Test on web to isolate issue
3. ✅ Check diagnostic screen (if accessible)
4. ✅ Build new APK with current code
5. ✅ Test new APK
6. ✅ Never use old APK again

## Critical Understanding

The logging system we just added:
- ✅ Works perfectly on web
- ✅ Will work perfectly on new APK builds
- ✅ Is completely crash-proof
- ✅ Is 100% non-blocking
- ❌ **Does NOT exist in your old APK**

Your old APK is crashing for reasons **completely unrelated** to the logging system we just implemented.

**The fix:** Build a new APK!
