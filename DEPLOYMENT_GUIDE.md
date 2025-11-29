# HouseParty Deployment Guide

This guide covers everything needed to deploy HouseParty to production and submit to app stores.

## Prerequisites Checklist

- [ ] Expo account created
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Apple Developer account ($99/year for iOS)
- [ ] Google Play Developer account ($25 one-time for Android)
- [ ] App icons and splash screens created (see `/assets/ASSETS_README.md`)
- [ ] Supabase project configured with production credentials
- [ ] PayPal production credentials configured

## 1. Environment Setup

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Configure EAS Project
```bash
eas init
eas build:configure
```

### Update Environment Variables
Create `.env.production`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

## 2. App Icons & Assets

### Required Assets (CRITICAL!)
Current status: ⚠️ Placeholder icons need replacement

1. **Create app icon** (1024x1024px PNG)
2. **Create splash screen** (2048x2048px PNG)
3. Replace files in `/assets/images/`
4. Run: `npx expo-optimize`

See `/assets/ASSETS_README.md` for detailed specifications.

## 3. Code Configuration

### Update app.json
Replace placeholder values:
- [ ] Update `expo.name` if desired
- [ ] Update `expo.slug` to match your domain
- [ ] Update `expo.ios.bundleIdentifier`
- [ ] Update `expo.android.package`
- [ ] Update associated domains to your actual domain

### Database Setup
Ensure all migrations are applied:
```bash
# Check Supabase migrations
npx supabase db push
```

### Edge Functions
Deploy Supabase edge functions:
```bash
# Deploy PayPal functions
npx supabase functions deploy paypal-create-order
npx supabase functions deploy paypal-capture-order
```

Configure edge function secrets:
```bash
npx supabase secrets set PAYPAL_CLIENT_ID=your-production-client-id
npx supabase secrets set PAYPAL_SECRET=your-production-secret
npx supabase secrets set PAYPAL_BASE_URL=https://api-m.paypal.com
```

## 4. Build Configuration

### Create eas.json
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "$EXPO_PUBLIC_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$EXPO_PUBLIC_SUPABASE_ANON_KEY"
      },
      "ios": {
        "distribution": "store",
        "resourceClass": "m-medium"
      },
      "android": {
        "distribution": "store",
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "production"
      }
    }
  }
}
```

## 5. iOS Deployment

### Prerequisites
- Apple Developer account
- iOS distribution certificate
- App Store provisioning profile

### Configure Push Notifications
```bash
eas credentials
# Follow prompts to configure push notification keys
```

### Build for iOS
```bash
eas build --platform ios --profile production
```

### Submit to App Store
```bash
eas submit --platform ios --profile production
```

### App Store Connect
1. Log in to App Store Connect
2. Create new app entry
3. Fill in app information:
   - Name: HouseParty
   - Primary Category: Games
   - Secondary Category: Social Networking
   - Keywords: score tracker, game scoring, board games, party games
4. Upload screenshots (required sizes):
   - 6.7" (iPhone 14 Pro Max): 1290 x 2796
   - 6.5" (iPhone 11 Pro Max): 1242 x 2688
   - 5.5" (iPhone 8 Plus): 1242 x 2208
5. Add app description and privacy policy URL
6. Submit for review

## 6. Android Deployment

### Prerequisites
- Google Play Developer account
- Signed APK/AAB

### Build for Android
```bash
eas build --platform android --profile production
```

### Submit to Google Play
```bash
eas submit --platform android --profile production
```

### Google Play Console
1. Log in to Google Play Console
2. Create new app
3. Fill in store listing:
   - Title: HouseParty
   - Short description: Score everything, anywhere
   - Full description: (see App Store description)
   - Category: Board > Family
4. Upload screenshots (required):
   - Phone: 1080 x 1920 (minimum 2 screenshots)
   - 7" tablet: 1200 x 1920
   - 10" tablet: 1600 x 2560
5. Add privacy policy URL
6. Complete content rating questionnaire
7. Set pricing (Free with in-app purchases)
8. Submit for review

## 7. Post-Deployment

### Monitor Analytics
Check Supabase for analytics events:
```sql
SELECT
  event_name,
  COUNT(*) as event_count,
  DATE(created_at) as date
FROM analytics_events
GROUP BY event_name, DATE(created_at)
ORDER BY date DESC, event_count DESC;
```

### Monitor Errors
Check error logs in Supabase and Expo dashboard.

### User Feedback
- Monitor app store reviews
- Check support email (support@houseparty.app)
- Track crash reports

## 8. Optional: Push Notifications

To enable push notifications:

1. **Install package**:
```bash
npx expo install expo-notifications
```

2. **Update lib/notifications.ts** with actual implementation

3. **Configure credentials**:
```bash
eas credentials
# Add push notification credentials for both platforms
```

4. **Update database** with push token storage:
```sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);
```

5. **Implement backend** push notification sending via Expo's API

## 9. Marketing Assets

### App Store Screenshots
Create 5-6 screenshots showcasing:
1. Onboarding/Welcome screen
2. House list with beautiful cards
3. Game session in progress
4. Achievements/Badges
5. Profile customization
6. Friend leaderboard

### App Preview Video (Optional)
- 15-30 seconds
- Showcase key features
- Add music and captions
- Required for featured placement

### Website/Landing Page
Consider creating:
- houseparty.app landing page
- FAQ section
- Tutorial videos
- Press kit

## 10. Common Issues

### Build Failures
- Check EAS build logs
- Verify all environment variables
- Ensure all dependencies are compatible
- Clear cache: `eas build --clear-cache`

### Submission Rejected
- Review App Store/Play Store guidelines
- Common issues:
  - Missing privacy policy
  - Inappropriate content descriptions
  - Missing required screenshots
  - Incomplete metadata

### Deep Links Not Working
- Verify associated domains in app.json
- Add `apple-app-site-association` file to your domain
- Test with `npx uri-scheme open houseparty://test`

## 11. Maintenance

### Regular Updates
- Monitor for dependency updates
- Review security advisories
- Update Expo SDK every 3-6 months
- Test on new OS versions

### Database Backups
Configure Supabase automatic backups:
- Daily backups enabled
- Point-in-time recovery configured
- Test restore procedure quarterly

## Support Resources

- Expo Documentation: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- Supabase Docs: https://supabase.com/docs
- App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Play Store Guidelines: https://support.google.com/googleplay/android-developer/answer/9859455

---

## Quick Launch Checklist

Before submitting to stores:
- [ ] Replace placeholder icons/splash screens
- [ ] Update app.json with production values
- [ ] Configure production environment variables
- [ ] Deploy edge functions with production credentials
- [ ] Test payment flow end-to-end
- [ ] Test deep linking on real devices
- [ ] Create app store screenshots
- [ ] Write compelling app descriptions
- [ ] Set up privacy policy page (✅ done)
- [ ] Set up terms of service page (✅ done)
- [ ] Test onboarding flow (✅ implemented)
- [ ] Verify analytics tracking (✅ implemented)
- [ ] Test error states (✅ implemented)
- [ ] Build and test on TestFlight/Internal Testing
- [ ] Submit for review!

Good luck with your launch! 🚀
