# Debug Console System

## Overview
The HouseParty app now includes a comprehensive debugging system that helps you diagnose and track crashes, errors, and app behavior in both development and production environments.

## Features

### 1. **Crash Debugger (`lib/crashDebugger.ts`)**
A utility that manages crash log storage, retrieval, and analysis:
- Fetches recent crashes from Supabase database
- Provides crash statistics (total, last 24 hours, average per day)
- Exports crash reports in multiple formats (text, JSON, markdown)
- Stores crashes locally as fallback using AsyncStorage
- Redacts sensitive user data (user IDs, emails, tokens) for privacy

### 2. **Crash Debug Modal (`components/CrashDebugModal.tsx`)**
A full-featured modal interface for viewing and managing logs:

#### Three Tabs:
- **Crashes Tab**: View recent crash logs with expandable details
- **All Logs Tab**: Browse all logs with filtering (all/error/warn/info)
- **Stats Tab**: View crash statistics and trends

#### Features:
- Expandable crash cards showing full stack traces
- Copy crash details to clipboard
- Export all logs as shareable report
- Clear all logs functionality
- Real-time refresh
- Privacy-safe display (sensitive data redacted)

### 3. **Profile Screen Integration**
The debug console button appears in the profile screen:
- Visible in development mode (`__DEV__`) OR for premium users
- Shows badge with crash count from last 24 hours
- Orange-to-red gradient design matches error severity
- Located between stats and premium section

## Usage

### For Developers (Development Mode)
1. Navigate to Profile tab
2. You'll see "Debug Console" button with bug icon
3. Tap to open the debug modal
4. Browse crashes, logs, and statistics

### For Premium Users (Production)
Premium users can access the debug console in production builds to report issues:
1. Same as above - button appears automatically for premium accounts
2. Users can export and share crash reports
3. Helps with customer support and bug reporting

### Exporting Crash Reports
1. Open Debug Console
2. Tap "Export" button in the footer
3. Choose sharing method (email, message, etc.)
4. Report includes:
   - App version and device info
   - All recent crashes with full details
   - Stack traces and breadcrumbs
   - Formatted for easy reading

### Clearing Logs
1. Open Debug Console
2. Tap "Clear" button in the footer
3. Confirm deletion
4. All logs removed from database and local storage

## Technical Details

### Database Integration
- Uses `app_logs` table in Supabase
- Stores logs with automatic batching (every 5 seconds)
- Rate limited (100 logs per minute)
- Keeps breadcrumbs (last 50 events)

### Crash Tracking
- Captured by `ErrorBoundary` component
- Logged by `lib/logger.ts`
- Includes:
  - Error message and stack trace
  - Screen name where crash occurred
  - User actions before crash (breadcrumbs)
  - Device and app information
  - Platform and OS version

### Privacy & Security
- Sensitive data automatically redacted:
  - User IDs (show only last 4 characters)
  - Email addresses masked
  - Auth tokens removed
- Local fallback using AsyncStorage
- Premium-only access in production

## APK Crash Debugging

When your APK crashes (as mentioned in your original issue), this system will:

1. **Capture the crash** via ErrorBoundary
2. **Log to database** with full context
3. **Show in Debug Console** with:
   - Exact error message
   - Stack trace (even if minified)
   - Screen that crashed
   - User actions leading to crash
4. **Export for analysis** in readable format

### To Debug APK Crashes:
1. Install APK on device
2. Reproduce the crash
3. Open app again (if it doesn't stay crashed)
4. Go to Profile → Debug Console
5. View crash details in "Crashes" tab
6. Export report and analyze

## Files Created
- `lib/crashDebugger.ts` - Core crash management utilities
- `components/CrashDebugModal.tsx` - UI for viewing crashes
- Updated `app/(tabs)/profile.tsx` - Added debug button

## Dependencies Added
- `@react-native-async-storage/async-storage` - Local crash storage
- `expo-clipboard` - Copy crash details to clipboard

## Configuration
No configuration needed! The system works out of the box:
- Automatically shows in dev mode
- Automatically available for premium users
- Automatically logs crashes from ErrorBoundary
- Automatically integrates with existing logger

## Tips
- Check debug console after any crash
- Export logs before clearing them
- Use breadcrumbs to understand user flow
- Filter logs to focus on errors only
- Statistics help identify problem areas

## Troubleshooting

### Debug button not visible?
- Check if in dev mode: `__DEV__` should be true
- Or ensure user is premium
- Check profile screen is loaded

### No crashes showing?
- Crashes are only stored after they occur
- Check "All Logs" tab for other log levels
- Verify database connection (Supabase)

### Can't export logs?
- Ensure device has storage permissions
- Try copy-to-clipboard instead
- Check network connection

## Future Enhancements
Potential improvements:
- Push notifications for new crashes
- Crash trend graphs
- Integration with error tracking services (Sentry)
- Automatic crash report emailing
- Screenshot capture on crash
