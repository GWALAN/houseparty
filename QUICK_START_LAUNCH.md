# Quick Start: Launch HouseParty in 24 Hours

This is your fast-track guide to getting HouseParty live in the app stores.

## TL;DR - What You Need to Do

1. **Create app icon** (1024x1024px) → 2 hours
2. **Create splash screen** (2048x2048px) → 30 minutes
3. **Build the app** → 30 minutes
4. **Submit to stores** → 30 minutes
5. **Wait for review** → 1-7 days

**Total active work: ~4 hours**

---

## Step-by-Step Launch Plan

### STEP 1: Create Your App Icon (REQUIRED)
**Time: 2 hours**

#### Quick Option: Use Canva
1. Go to Canva.com (free account)
2. Create custom size: 1024x1024px
3. Design your icon using:
   - House icon
   - Color: #10B981 (green)
   - Background: #0F172A (dark blue)
4. Export as PNG
5. Save to `/assets/images/icon.png`
6. Resize to 48x48px for favicon: `/assets/images/favicon.png`

#### Even Faster: Hire on Fiverr
- Search "app icon design"
- Budget: $20-50
- Turnaround: 24-48 hours
- Provide: App name, colors (#10B981, #0F172A), concept (house + gaming)

### STEP 2: Create Splash Screen (REQUIRED)
**Time: 30 minutes**

1. Open your icon file in any image editor
2. Create new canvas: 2048x2048px
3. Fill with #0F172A (dark blue)
4. Center your icon (keep in middle 1200x1200px)
5. Save to `/assets/images/splash.png`

### STEP 3: Take Screenshots (REQUIRED)
**Time: 1 hour**

Run the app and screenshot these screens:

**iOS** (need at least 3):
1. Home screen with houses
2. Game session scoring screen
3. Profile/achievements screen
4. (Optional) Friends screen
5. (Optional) Shop screen

**Android** (need at least 2):
- Use same as iOS

**How to capture**:
```bash
# Run on iOS simulator
npm start
# Press 'i' for iOS simulator
# Cmd+S to save screenshot

# Run on Android emulator
npm start
# Press 'a' for Android emulator
# Screenshot tool in emulator
```

**Device sizes needed**:
- iPhone 14 Pro Max (6.7"): 1290 x 2796
- Android: 1080 x 1920

**Quick tip**: Use https://www.screely.com to add device frames to screenshots

### STEP 4: Write App Description (REQUIRED)
**Time: 15 minutes**

Copy this (or customize):

**Short** (80 chars):
```
Score everything, anywhere – your house, your rules.
```

**Long**:
```
HouseParty: Your Ultimate Score Tracker

Create custom houses for any game or activity. Track scores, compete with friends, and unlock achievements.

FEATURES:
• Create houses for different games
• Real-time scoring
• Track stats and leaderboards
• QR code invites
• Earn badges and rewards
• Customize with themes
• Works offline

Perfect for board games, card games, sports, and party activities!

Support: support@houseparty.app
```

### STEP 5: Set Up Production Environment (REQUIRED)
**Time: 15 minutes**

1. **Get Production Supabase Credentials**:
   - Go to your Supabase project
   - Settings → API
   - Copy Project URL and anon/public key

2. **Create `.env.production`**:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Configure PayPal** (if using real payments):
```bash
npx supabase secrets set PAYPAL_CLIENT_ID=your-production-client-id
npx supabase secrets set PAYPAL_SECRET=your-production-secret
npx supabase secrets set PAYPAL_BASE_URL=https://api-m.paypal.com
```

### STEP 6: Build the App (REQUIRED)
**Time: 30 minutes (mostly waiting)**

```bash
# Install EAS CLI (if not installed)
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS (if not done)
eas init

# Configure builds
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Or build both at once
eas build --platform all --profile production
```

**Wait for builds** (15-30 minutes each)

### STEP 7: Create Store Accounts (REQUIRED)
**Time: 1 hour total**

#### iOS: Apple Developer Account
1. Go to https://developer.apple.com
2. Click "Account"
3. Enroll ($99/year)
4. Wait for approval (usually instant)
5. Go to App Store Connect
6. Create new app:
   - Name: HouseParty
   - Bundle ID: com.houseparty.scoretracker
   - SKU: houseparty-001
   - Category: Games

#### Android: Google Play Console
1. Go to https://play.google.com/console
2. Create Developer Account ($25 one-time)
3. Complete registration
4. Create new app:
   - Name: HouseParty
   - Package: com.houseparty.scoretracker
   - Category: Board

### STEP 8: Submit to Stores (REQUIRED)
**Time: 30 minutes**

#### Submit to iOS
```bash
eas submit --platform ios

# Or manually:
# 1. Download .ipa from EAS dashboard
# 2. Upload via Xcode or Transporter app
```

**In App Store Connect**:
1. Fill in app information
2. Upload screenshots
3. Add description
4. Set privacy policy URL: `https://yoursite.com/privacy` (or use GitHub Pages)
5. Submit for review

#### Submit to Android
```bash
eas submit --platform android

# Or manually:
# 1. Download .aab from EAS dashboard
# 2. Upload via Play Console
```

**In Play Console**:
1. Complete store listing
2. Upload screenshots
3. Add description
4. Set privacy policy URL
5. Complete content rating
6. Set pricing (Free)
7. Submit for review

### STEP 9: Wait for Review
**Time: 1-7 days (no action needed)**

**Typical Review Times**:
- iOS: 1-3 days
- Android: 2-7 days

**Check Status**:
- iOS: App Store Connect → My Apps → [Your App] → App Store → Status
- Android: Play Console → [Your App] → Publishing Overview

**If Rejected**:
- Read rejection reason carefully
- Fix the issue
- Resubmit immediately

---

## Absolute Minimum to Submit

If you're in a HUGE hurry, this is the bare minimum:

✅ **Must Have**:
1. App icon (1024x1024px)
2. Splash screen (2048x2048px)
3. At least 2-3 screenshots per platform
4. App description (short + long)
5. Privacy policy URL (can use GitHub Pages)
6. Production environment configured
7. Working build from EAS

❌ **Can Skip for v1.0** (add later):
- Custom domain
- Push notifications
- App preview video
- Press kit
- Marketing website
- TestFlight beta testing (go straight to submission)

---

## Day-by-Day Plan

### Day 1: Assets & Setup (4-5 hours)
- Morning: Create icon and splash (2.5 hours)
- Afternoon: Screenshots and descriptions (1.5 hours)
- Evening: Set up store accounts (1 hour)

### Day 2: Build & Submit (2-3 hours)
- Morning: Configure production environment (30 min)
- Morning: Trigger builds on EAS (30 min active, 1 hour wait)
- Afternoon: Submit to both stores (1 hour)

### Day 3-7: Wait & Monitor
- Check email for review status
- Respond to any reviewer questions
- Monitor analytics once live
- Prepare v1.1 improvements based on feedback

---

## Common Issues & Quick Fixes

### Build Fails
**Problem**: Dependencies error
**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
eas build --clear-cache --platform [ios|android]
```

### Icon Not Showing
**Problem**: Wrong size or format
**Fix**:
- Must be exactly 1024x1024px
- Must be PNG format
- Must have transparency
- Run: `npx expo-optimize`

### Submission Rejected: Privacy Policy
**Problem**: URL not accessible
**Fix**:
1. Create GitHub repository
2. Enable GitHub Pages
3. Copy `/app/privacy-policy.tsx` content to HTML
4. Use that URL: `https://yourusername.github.io/houseparty-privacy`

### Submission Rejected: Missing Permissions Explanation
**Problem**: Camera permission not explained
**Fix**: Already in app.json:
```json
"cameraPermission": "Allow HouseParty to scan QR codes to join houses."
```
If rejected, add more detail about QR code scanning for invitations.

---

## Emergency Shortcuts

### Need Icon in 5 Minutes?
1. Go to https://icon.kitchen
2. Enter "HouseParty"
3. Choose "Gaming" category
4. Pick green color (#10B981)
5. Download and use

### Need Privacy Policy in 5 Minutes?
1. Go to https://www.privacypolicygenerator.info
2. Fill in basic info
3. Download HTML
4. Upload to GitHub Pages or any host
5. Use that URL

### Need Screenshots in 10 Minutes?
1. Run app in browser: `npm start` → press `w`
2. Use browser screenshot tool
3. Resize to required dimensions
4. Done!

---

## Post-Launch Immediate Tasks

Once approved and live:

### Hour 1:
- [ ] Download your own app
- [ ] Test sign up flow
- [ ] Create first house
- [ ] Verify analytics working
- [ ] Check payment flow (small purchase)

### Day 1:
- [ ] Share with friends/family
- [ ] Post on social media
- [ ] Ask for initial reviews
- [ ] Monitor crash reports
- [ ] Check analytics dashboard

### Week 1:
- [ ] Respond to all reviews
- [ ] Fix any critical bugs
- [ ] Collect user feedback
- [ ] Plan v1.1 features
- [ ] Monitor payment transactions

---

## Success Metrics to Track

Week 1 Goals:
- 50-100 downloads
- 10-20 daily active users
- 5-10 houses created
- 1-2 premium purchases
- 4+ star average rating

Month 1 Goals:
- 500-1000 downloads
- 100+ daily active users
- 50+ houses created
- 10-20 premium purchases
- Maintain 4+ star rating

---

## You're Ready When...

✅ App builds successfully on EAS
✅ All store assets created (icon, splash, screenshots)
✅ Store accounts active (Apple + Google)
✅ App descriptions written
✅ Privacy policy accessible via URL
✅ Production environment configured
✅ Payment system tested

**If all checked → SUBMIT NOW! 🚀**

---

## Final Encouragement

You've built a complete, functional, monetized app with:
- Real payment processing
- Social features
- Analytics
- Beautiful UI
- Proper error handling
- Legal compliance

**The hardest part is done.** Creating assets and submitting is the easy part.

Don't overthink it. Don't wait for perfection. Ship it! 🚢

You can always update with v1.1, v1.2, etc. The best way to improve is to get it in users' hands.

---

**Ready? Let's launch! 🎉**

Questions? Check DEPLOYMENT_GUIDE.md for detailed steps.
Stuck? Expo Discord is incredibly helpful: https://discord.gg/expo
