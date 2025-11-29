# Email Authentication Setup Guide

**Password Reset & Email Verification**

This guide walks you through setting up password reset and email verification for your HouseParty app using Supabase.

---

## 📋 Table of Contents

1. [Current State](#current-state)
2. [Supabase Dashboard Setup](#supabase-dashboard-setup)
3. [Email Templates](#email-templates)
4. [Deep Linking Setup](#deep-linking-setup)
5. [Testing](#testing)
6. [Production Checklist](#production-checklist)

---

## 🔍 Current State

### ✅ Already Implemented

Your app already has the following auth features working:

1. **Password Reset Flow (UI Complete)**
   - Screen: `app/(auth)/forgot-password.tsx`
   - Function: `resetPassword()` in `contexts/AuthContext.tsx`
   - User enters email → Receives reset link
   - **Status:** UI ready, needs email configuration

2. **Email Auto-Confirmation (Development Only)**
   - Migration: `supabase/migrations/20251110165715_auto_confirm_emails_for_development.sql`
   - Auto-confirms emails for development
   - **Status:** Active (should be disabled for production)

3. **Sign Up Flow**
   - User creates account → Profile created automatically
   - **Status:** Working, but email verification disabled

---

## 🎯 What Needs to Be Set Up

### For Password Reset to Work:
1. Configure email provider in Supabase
2. Set up custom email templates
3. Configure redirect URLs for deep linking

### For Email Verification to Work:
1. Disable auto-confirmation (production only)
2. Enable email confirmation in Supabase
3. Set up email verification templates
4. Configure redirect URLs

---

## 🚀 Supabase Dashboard Setup

### Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `qqeccmwtvjjysypahgkn`
3. Navigate to **Authentication** in the left sidebar

---

### Step 2: Configure Email Provider

**Navigate to:** Authentication → Settings → Email

#### Option A: Use Supabase Built-in SMTP (Easiest)

**For Development:**
- Supabase provides a built-in SMTP server
- Limited to 3 emails per hour (development only)
- No setup required, works out of the box
- **Status:** Already configured by default

**Limitations:**
- Rate limited (3 emails/hour)
- May end up in spam
- Not reliable for production

---

#### Option B: Configure Custom SMTP Provider (Recommended for Production)

Choose one of these providers:

**1. SendGrid (Recommended)**
- Free tier: 100 emails/day
- Sign up: [https://sendgrid.com](https://sendgrid.com)
- Easy setup, reliable delivery

**2. Mailgun**
- Free tier: 5,000 emails/month
- Sign up: [https://mailgun.com](https://mailgun.com)

**3. AWS SES**
- Very cheap, highly scalable
- Requires AWS account
- More complex setup

**4. Resend**
- Developer-friendly
- Good documentation
- Sign up: [https://resend.com](https://resend.com)

---

#### Configuring Custom SMTP (Example: SendGrid)

1. **Create SendGrid Account**
   - Go to [https://sendgrid.com/pricing](https://sendgrid.com/pricing)
   - Sign up for free tier (100 emails/day)

2. **Create API Key**
   - Navigate to Settings → API Keys
   - Click "Create API Key"
   - Name: `HouseParty-Supabase`
   - Permissions: Full Access (or Restricted Access for "Mail Send")
   - **Copy the API key** (shown only once!)

3. **Get SMTP Credentials**
   - Username: `apikey` (literally the word "apikey")
   - Password: Your API key from step 2
   - Server: `smtp.sendgrid.net`
   - Port: `587` or `465`

4. **Configure in Supabase Dashboard**
   - Go to: Authentication → Settings → Email
   - Click "Enable Custom SMTP"
   - Fill in:
     ```
     SMTP Host: smtp.sendgrid.net
     SMTP Port: 587
     SMTP Username: apikey
     SMTP Password: [Your SendGrid API Key]
     Sender Email: noreply@yourdomain.com
     Sender Name: HouseParty
     ```
   - Click "Save"

5. **Verify Setup**
   - Click "Send Test Email"
   - Enter your email
   - Check inbox (and spam folder)

---

### Step 3: Configure Email Confirmation

**Navigate to:** Authentication → Settings → Email

#### Enable Email Confirmation

Toggle these settings:

**For Development (Current State):**
```
✅ Enable email confirmations: OFF
✅ Secure email change: ON
✅ Double confirm email changes: OFF
```

**For Production (Recommended):**
```
✅ Enable email confirmations: ON
✅ Secure email change: ON
✅ Double confirm email changes: ON
```

**What each setting does:**

- **Enable email confirmations:** Requires users to click link in email before they can sign in
- **Secure email change:** Requires confirmation when user changes email
- **Double confirm email changes:** Sends confirmation to both old and new email

---

### Step 4: Configure Redirect URLs

**Navigate to:** Authentication → Settings → URL Configuration

Add these URLs to your **Redirect URLs** list:

**For Development:**
```
exp://localhost:8081
houseparty://
myapp://
```

**For Production:**
```
houseparty://
https://yourdomain.com/auth/callback
```

**What are redirect URLs?**
- After user clicks email link, they're redirected back to your app
- Must whitelist URLs for security
- Deep links (like `houseparty://`) open your mobile app

---

### Step 5: Configure Site URL

**Navigate to:** Authentication → Settings → URL Configuration

**Site URL:** The URL where your app is hosted

**For Development:**
```
http://localhost:8081
```

**For Production:**
```
https://yourdomain.com
```

This is used as a fallback if redirect fails.

---

## 📧 Email Templates

### Customize Email Templates

**Navigate to:** Authentication → Email Templates

You'll see these templates:

1. **Confirm signup** (email verification)
2. **Invite user**
3. **Magic Link**
4. **Change Email Address**
5. **Reset Password** ← Most important for your use case

---

### Password Reset Email Template

**Click:** Reset Password

**Default template:**
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

**Customized template (recommended):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      color: #FFFFFF;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10B981;
      margin-bottom: 8px;
    }
    .content {
      background-color: #1E293B;
      border-radius: 12px;
      padding: 32px;
      border: 1px solid #334155;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #FFFFFF;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      color: #94A3B8;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #10B981;
      color: #FFFFFF;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }
    .button:hover {
      background-color: #059669;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 14px;
      color: #64748B;
    }
    .link {
      color: #10B981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏠 HouseParty</div>
    </div>

    <div class="content">
      <h1 class="title">Reset Your Password</h1>

      <p class="message">
        You recently requested to reset your password for your HouseParty account.
        Click the button below to reset it.
      </p>

      <p style="text-align: center; margin: 32px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
      </p>

      <p class="message">
        If you didn't request a password reset, you can safely ignore this email.
        Your password will not be changed.
      </p>

      <p class="message" style="font-size: 14px;">
        <strong>Security tip:</strong> This link will expire in 24 hours for your security.
      </p>
    </div>

    <div class="footer">
      <p>
        This email was sent by HouseParty<br>
        If you have questions, contact us at support@houseparty.app
      </p>
      <p style="margin-top: 16px;">
        <a href="{{ .SiteURL }}" class="link">Visit HouseParty</a>
      </p>
    </div>
  </div>
</body>
</html>
```

**Variables available:**
- `{{ .ConfirmationURL }}` - The password reset link
- `{{ .Token }}` - The reset token (usually in the URL already)
- `{{ .TokenHash }}` - Hashed version of the token
- `{{ .SiteURL }}` - Your site URL from settings
- `{{ .Email }}` - User's email address

---

### Email Confirmation Template

**Click:** Confirm signup

**Customized template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      color: #FFFFFF;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #10B981;
      margin-bottom: 8px;
    }
    .content {
      background-color: #1E293B;
      border-radius: 12px;
      padding: 32px;
      border: 1px solid #334155;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #FFFFFF;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      color: #94A3B8;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #10B981;
      color: #FFFFFF;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }
    .button:hover {
      background-color: #059669;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 14px;
      color: #64748B;
    }
    .link {
      color: #10B981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏠 HouseParty</div>
    </div>

    <div class="content">
      <h1 class="title">Welcome to HouseParty!</h1>

      <p class="message">
        Thanks for signing up! We're excited to have you join the party.
        To get started, please confirm your email address by clicking the button below.
      </p>

      <p style="text-align: center; margin: 32px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">Confirm Email</a>
      </p>

      <p class="message">
        Once confirmed, you'll be able to:
      </p>
      <ul class="message">
        <li>Create and join houses with friends</li>
        <li>Track scores and compete on leaderboards</li>
        <li>Unlock achievements and collect rewards</li>
        <li>Customize your profile and houses</li>
      </ul>

      <p class="message" style="font-size: 14px;">
        <strong>Didn't create an account?</strong> You can safely ignore this email.
      </p>
    </div>

    <div class="footer">
      <p>
        This email was sent by HouseParty<br>
        If you have questions, contact us at support@houseparty.app
      </p>
      <p style="margin-top: 16px;">
        <a href="{{ .SiteURL }}" class="link">Visit HouseParty</a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 📱 Deep Linking Setup (Mobile)

For password reset and email verification to work in your mobile app, you need to set up deep linking.

### Step 1: Configure app.json

**File:** `app.json`

Add/update the `scheme` property:

```json
{
  "expo": {
    "name": "HouseParty",
    "slug": "houseparty",
    "scheme": "houseparty",
    "ios": {
      "bundleIdentifier": "com.houseparty.scoretracker",
      "associatedDomains": [
        "applinks:qqeccmwtvjjysypahgkn.supabase.co"
      ]
    },
    "android": {
      "package": "com.houseparty.scoretracker",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "qqeccmwtvjjysypahgkn.supabase.co",
              "pathPrefix": "/auth/v1/verify"
            },
            {
              "scheme": "houseparty"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

### Step 2: Handle Deep Links in App

**File:** `app/_layout.tsx`

The deep linking handler is likely already set up. If not, add this:

```typescript
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Handle deep links
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('[DEEP LINK] Received:', url);

      // Parse the URL
      const { path, queryParams } = Linking.parse(url);

      // Handle password reset
      if (path?.includes('reset-password') || queryParams?.type === 'recovery') {
        router.push({
          pathname: '/(auth)/reset-password',
          params: {
            token: queryParams?.token,
            type: queryParams?.type,
          },
        });
      }

      // Handle email confirmation
      if (queryParams?.type === 'signup' || queryParams?.type === 'email_change') {
        // User confirmed email, redirect to app
        router.replace('/(tabs)');
      }
    };

    // Subscribe to deep link events
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    // Your layout JSX
  );
}
```

---

### Step 3: Create Reset Password Screen

**File:** `app/(auth)/reset-password.tsx` (create if doesn't exist)

```typescript
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log('[RESET PASSWORD] Params:', params);

    // Verify we have the necessary token/params
    if (!params.token && !params.type) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [params]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.replace('/(auth)/signin');
      }, 2000);
    } catch (error: any) {
      console.error('[RESET PASSWORD] Error:', error);
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#FFFFFF" />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              ✅ Password reset successful! Redirecting to sign in...
            </Text>
          </View>
        ) : null}

        {!success && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#64748B"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  error: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successBox: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

---

## 🧪 Testing

### Test Password Reset Flow

1. **Request Password Reset**
   - Open app → Navigate to Sign In
   - Tap "Forgot Password?"
   - Enter your email
   - Tap "Send Reset Link"

2. **Check Email**
   - Check your inbox (and spam folder)
   - You should receive an email with "Reset Password" button

3. **Click Reset Link**
   - Click the button in the email
   - App should open to reset password screen
   - **iOS:** Make sure app is installed
   - **Android:** May need to select "Open with HouseParty"

4. **Reset Password**
   - Enter new password (twice)
   - Click "Reset Password"
   - Should see success message
   - Redirected to sign in

5. **Sign In with New Password**
   - Use your new password to sign in
   - Should work!

---

### Test Email Verification Flow (Production Only)

1. **Enable Email Confirmation in Supabase**
   - Dashboard → Authentication → Settings
   - Toggle "Enable email confirmations" to ON

2. **Sign Up New User**
   - Create new account in app
   - Enter email and password
   - Submit form

3. **Check Email**
   - Check inbox for confirmation email
   - Should receive "Welcome to HouseParty" email

4. **Click Confirmation Link**
   - Click "Confirm Email" button
   - App should open (or web page)
   - User is now confirmed

5. **Sign In**
   - Return to app
   - Sign in with credentials
   - Should work!

---

### Troubleshooting

**Email not received?**
- Check spam folder
- Verify email address is correct
- Check Supabase logs: Dashboard → Logs → Filter "auth"
- Verify SMTP configuration

**Deep link not opening app?**
- Verify `scheme` in app.json matches
- Check URL Configuration in Supabase
- iOS: Make sure app is installed (not Expo Go)
- Android: May need to clear defaults in app settings

**"Invalid reset link" error?**
- Links expire after 24 hours
- Request new reset link
- Check that redirectTo URL is whitelisted

**Still in Expo Go?**
- Deep linking works differently in Expo Go
- Build development client: `npx expo run:ios` or `npx expo run:android`
- Or test on web first

---

## ✅ Production Checklist

Before launching to production:

### Email Configuration
- [ ] Configure custom SMTP provider (SendGrid, Mailgun, etc.)
- [ ] Set sender email to your domain (e.g., `noreply@houseparty.app`)
- [ ] Verify email sending works (send test email)
- [ ] Customize email templates with your branding
- [ ] Set up SPF and DKIM records for your domain

### Authentication Settings
- [ ] Enable email confirmations
- [ ] Enable secure email change
- [ ] Enable double confirm email changes
- [ ] Set appropriate password requirements
- [ ] Configure rate limiting

### URL Configuration
- [ ] Add production redirect URLs
- [ ] Set production site URL
- [ ] Remove development URLs (exp://, localhost)
- [ ] Test deep linking on actual devices

### App Configuration
- [ ] Update app.json with production scheme
- [ ] Configure iOS associated domains
- [ ] Configure Android intent filters
- [ ] Test on iOS and Android devices

### Security
- [ ] Disable auto-email-confirmation (remove migration)
- [ ] Review RLS policies
- [ ] Enable CAPTCHA if needed
- [ ] Set up monitoring/alerts for auth failures

### Documentation
- [ ] Document password reset flow for support team
- [ ] Create FAQ for common email issues
- [ ] Set up support email address
- [ ] Document emergency password reset procedure

---

## 📊 Email Provider Comparison

| Provider | Free Tier | Price (Paid) | Reliability | Ease of Setup |
|----------|-----------|--------------|-------------|---------------|
| **SendGrid** | 100/day | $15/mo (40k) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Mailgun** | 5,000/mo | $35/mo (50k) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **AWS SES** | 62,000/mo* | $0.10/1k | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Resend** | 3,000/mo | $20/mo (50k) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Supabase** | 3/hour | N/A | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

*AWS SES free tier requires sending from EC2

**Recommendation:** Start with SendGrid free tier, upgrade as needed.

---

## 🎯 Quick Start (TL;DR)

**Minimum setup for password reset:**

1. Go to Supabase Dashboard → Authentication → Settings → Email
2. Enable custom SMTP or use Supabase default (3/hour limit)
3. Add redirect URL: `houseparty://` to URL Configuration
4. Customize Reset Password email template
5. Test: Use forgot password flow in app
6. Done!

**To enable email verification (production):**

1. Disable auto-confirmation migration
2. Enable "Email confirmations" in Supabase settings
3. Customize Confirm Signup email template
4. Add deep link handling for email confirmation
5. Test with new user signup
6. Done!

---

## 📞 Support

**Common Issues:**

**Q: Emails going to spam?**
A: Configure SPF/DKIM records for your domain, use reputable SMTP provider

**Q: Deep links not working?**
A: Build development client (not Expo Go), verify scheme in app.json

**Q: Reset link expired?**
A: Links valid for 24 hours, request new one

**Q: Can't receive emails?**
A: Check Supabase logs, verify SMTP configuration, check spam folder

---

## 🎉 Summary

You now have everything you need to set up:
- ✅ Password reset emails
- ✅ Email verification
- ✅ Custom email templates
- ✅ Deep linking for mobile
- ✅ Production-ready configuration

Your app already has the UI and logic implemented. You just need to configure Supabase and your email provider!

---

**Next Steps:**
1. Choose an email provider (SendGrid recommended)
2. Configure SMTP in Supabase Dashboard
3. Test password reset flow
4. Customize email templates
5. Set up deep linking
6. Test on real devices
7. Launch! 🚀
