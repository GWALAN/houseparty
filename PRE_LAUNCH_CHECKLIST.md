# Pre-Launch Checklist for HouseParty

Use this checklist to ensure everything is ready before submitting to app stores.

## CRITICAL ITEMS (Must Complete)

### [ ] 1. Create App Icons
**Status**: ⚠️ REQUIRED - Current files are placeholders
**Time**: 2-4 hours

**What to create**:
- App icon: 1024x1024px PNG
- Use brand colors: #10B981 (green), #0F172A (dark blue)
- Suggested designs:
  - House icon with trophy/score inside
  - Stylized "HP" monogram
  - Game piece on house foundation

**Tools**: Figma, Adobe Illustrator, Canva, or hire on Fiverr ($20-50)

**Files to replace**:
- `/assets/images/icon.png`
- `/assets/images/favicon.png`

**After creating**:
```bash
# Optimize assets
npx expo-optimize

# Clear cache and rebuild
npm start -- --clear
```

### [ ] 2. Create Splash Screen
**Status**: ⚠️ REQUIRED - Currently missing
**Time**: 1 hour

**What to create**:
- Size: 2048x2048px PNG
- Background: #0F172A (to match app.json)
- Center your app icon or logo
- Keep important content in center 1200x1200px (safe zone)

**File to create**:
- `/assets/images/splash.png`

### [ ] 3. Update Environment Variables
**Status**: ⚠️ REQUIRED - Currently using development values

**Create `.env.production`**:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-production-key
```

**Configure PayPal**:
```bash
# Set production PayPal credentials in Supabase
npx supabase secrets set PAYPAL_CLIENT_ID=your-production-client-id
npx supabase secrets set PAYPAL_SECRET=your-production-secret
npx supabase secrets set PAYPAL_BASE_URL=https://api-m.paypal.com
```

## HIGH PRIORITY ITEMS

### [ ] 4. Create App Store Screenshots
**Status**: Required for submission
**Time**: 2-3 hours

**iOS Requirements**:
- iPhone 6.7" (1290 x 2796) - Minimum 3 screenshots
- iPhone 6.5" (1242 x 2688) - Optional but recommended
- iPhone 5.5" (1242 x 2208) - Optional

**Android Requirements**:
- Phone (1080 x 1920) - Minimum 2 screenshots
- 7" Tablet (1200 x 1920) - Optional
- 10" Tablet (1600 x 2560) - Optional

**What to screenshot**:
1. Welcome/Onboarding screen
2. House list with customized houses
3. Game session with scoring
4. Profile with achievements
5. Friends leaderboard
6. Shop with premium items

**Tips**:
- Use real data, not lorem ipsum
- Show the app in action
- Use device frames (https://www.screely.com)
- Add captions if needed

### [ ] 5. Write App Store Descriptions

**Short Description** (80 chars for iOS, 80 chars for Android):
```
Score everything, anywhere – your house, your rules.
```

**Full Description**:
```
HouseParty: Your Ultimate Score Tracker

Create custom houses for any game or activity. Track scores, compete with friends, and unlock achievements as you play.

FEATURES:
• Create unlimited houses for different games
• Real-time scoring for any activity
• Track statistics and see who's leading
• Invite friends with QR codes or links
• Earn badges and unlock rewards
• Customize with themes and banners
• Leaderboards and player stats
• Works offline - sync when online

PERFECT FOR:
• Board game nights
• Card games
• Sports competitions
• Party games
• Family game time
• Tournament tracking

Whether you're playing Monopoly, poker, darts, or any activity you can score - HouseParty makes tracking easy and fun.

Download now and start your first house!

Premium features available for unlimited houses and customization options.

Support: support@houseparty.app
```

### [ ] 6. Set Up TestFlight / Internal Testing
**Status**: Recommended before public launch
**Time**: 1 hour + build time

**iOS (TestFlight)**:
```bash
# Build for TestFlight
eas build --platform ios --profile preview

# Once approved, it appears in TestFlight
# Invite 10-100 beta testers
# Collect feedback
```

**Android (Internal Testing)**:
```bash
# Build for Play Store
eas build --platform android --profile preview

# Upload to Play Console
# Add internal testers
# Share test link
```

### [ ] 7. Test Payment Flow
**Status**: CRITICAL - Must work before launch
**Time**: 30 minutes

**Test Cases**:
1. ✓ Purchase premium with PayPal
2. ✓ Verify premium features unlock
3. ✓ Test with failed payment
4. ✓ Test with duplicate purchase
5. ✓ Verify receipt/confirmation
6. ✓ Test refund request (if applicable)

**How to Test**:
1. Use PayPal sandbox first
2. Switch to production credentials
3. Make small test purchase ($0.99)
4. Verify in database:
```sql
SELECT * FROM user_purchases
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC;
```

## MEDIUM PRIORITY ITEMS

### [ ] 8. Register Domain (Optional but Recommended)
**Status**: Needed for deep links and web presence
**Time**: 30 minutes + $10-15/year

**Domain Options**:
- houseparty.app (ideal)
- housepartyapp.com
- gethouseparty.com
- myhouseparty.app

**After Registration**:
1. Point domain to your web host
2. Create simple landing page
3. Add `.well-known/apple-app-site-association` for iOS
4. Add `.well-known/assetlinks.json` for Android
5. Update app.json with actual domain

### [ ] 9. Create Privacy Policy URL
**Status**: ✅ Screen created, needs hosting
**Time**: 30 minutes

**Options**:
A. Host on your domain: `https://houseparty.app/privacy`
B. Use GitHub Pages (free)
C. Use privacy policy generator services

**Required URL for**:
- App Store submission
- Google Play submission
- GDPR compliance
- User trust

### [ ] 10. Set Up Analytics Review Process
**Status**: ✅ Analytics implemented
**Time**: 15 minutes

**Create Saved Queries in Supabase**:
```sql
-- Daily Active Users
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Popular Events
SELECT
  event_name,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_name
ORDER BY count DESC;

-- Conversion Funnel
SELECT
  SUM(CASE WHEN event_name = 'app_opened' THEN 1 ELSE 0 END) as opens,
  SUM(CASE WHEN event_name = 'house_created' THEN 1 ELSE 0 END) as houses_created,
  SUM(CASE WHEN event_name = 'game_session_started' THEN 1 ELSE 0 END) as games_played,
  SUM(CASE WHEN event_name = 'premium_purchased' THEN 1 ELSE 0 END) as premium_purchased
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days';
```

## OPTIONAL ITEMS (Nice to Have)

### [ ] 11. Enable Push Notifications
**Status**: Infrastructure ready, needs activation
**Time**: 2-3 hours

```bash
# Install package
npx expo install expo-notifications

# Configure in EAS
eas credentials

# Update lib/notifications.ts with real implementation
# Add push token storage to database
# Test on physical devices
```

### [ ] 12. Create App Preview Video
**Status**: Optional for v1.0
**Time**: 4-6 hours

**Requirements**:
- 15-30 seconds
- Show app in action
- Add captions
- Background music
- Required for App Store featuring

### [ ] 13. Set Up Customer Support
**Status**: Email mentioned in legal docs
**Time**: 1 hour

**Set Up**:
- Create support@houseparty.app email
- Set up auto-responder
- Create FAQ document
- Prepare response templates

### [ ] 14. Create Press Kit
**Status**: Optional for launch
**Time**: 2-3 hours

**Include**:
- App icon in various sizes
- Screenshots
- App description
- Feature list
- Founder bio
- Company logo
- Press contact

## FINAL CHECKS BEFORE SUBMISSION

### [ ] Pre-Submission Testing
- [ ] Test on real iOS device
- [ ] Test on real Android device
- [ ] Test on tablet (if supported)
- [ ] Test all deep links
- [ ] Test QR code scanning
- [ ] Test payment flow
- [ ] Test onboarding flow
- [ ] Test sign up / sign in
- [ ] Test password reset
- [ ] Test friend requests
- [ ] Test game creation and scoring
- [ ] Test profile customization
- [ ] Test with poor internet connection
- [ ] Test offline functionality

### [ ] App Store Metadata
- [ ] App name finalized
- [ ] Short description written
- [ ] Full description written
- [ ] Keywords selected (iOS)
- [ ] Category selected
- [ ] Age rating determined
- [ ] Support URL added
- [ ] Marketing URL added (optional)
- [ ] Privacy policy URL added
- [ ] Copyright information added

### [ ] Legal Compliance
- [ ] ✅ Privacy policy created and accessible
- [ ] ✅ Terms of service created and accessible
- [ ] Privacy policy URL publicly accessible
- [ ] Terms of service URL publicly accessible
- [ ] GDPR compliance verified (if EU users)
- [ ] COPPA compliance verified (if < 13 users)
- [ ] App Store guidelines reviewed
- [ ] Play Store policies reviewed

### [ ] Business Setup
- [ ] Apple Developer account active ($99/year)
- [ ] Google Play Developer account active ($25 one-time)
- [ ] PayPal business account configured
- [ ] Bank account linked for payouts
- [ ] Tax information submitted

## LAUNCH DAY

### [ ] Final Steps
```bash
# 1. Build for production
eas build --platform all --profile production

# 2. Submit to stores
eas submit --platform ios
eas submit --platform android

# 3. Monitor build logs
# 4. Wait for store review (1-7 days typical)
# 5. Respond to any feedback from reviewers
# 6. Approve for release when approved
```

### [ ] Post-Launch Monitoring
- [ ] Monitor crash reports
- [ ] Check analytics daily
- [ ] Respond to user reviews
- [ ] Monitor support email
- [ ] Track payment transactions
- [ ] Check server load/costs
- [ ] Prepare for v1.1 updates

---

## Quick Reference Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas init

# Build iOS
eas build --platform ios --profile production

# Build Android
eas build --platform android --profile production

# Submit iOS
eas submit --platform ios

# Submit Android
eas submit --platform android

# Check build status
eas build:list

# View credentials
eas credentials
```

---

## Estimated Timeline to Launch

**Fast Track** (if icons ready): 1-2 days
1. Day 1 Morning: Create assets (4 hours)
2. Day 1 Afternoon: Build and test (4 hours)
3. Day 2 Morning: Submit to stores (2 hours)
4. Wait: 1-7 days for review

**Comfortable Pace**: 1 week
- Day 1-2: Create assets
- Day 3: TestFlight/Internal testing
- Day 4-5: Fix any issues found
- Day 6: Submit to stores
- Day 7+: Wait for review

**With Beta Testing**: 2-3 weeks
- Week 1: Assets and TestFlight
- Week 2: Beta testing and fixes
- Week 3: Final submission

---

## Need Help?

- Expo Docs: https://docs.expo.dev
- Supabase Docs: https://supabase.com/docs
- App Store Connect: https://appstoreconnect.apple.com
- Google Play Console: https://play.google.com/console

Good luck with your launch! 🚀
