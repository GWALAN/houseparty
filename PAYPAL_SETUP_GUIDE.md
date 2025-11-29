# PayPal Integration Setup Guide

This guide explains how to complete the PayPal integration for your app to enable real payments.

## Overview

The app uses PayPal for processing payments for:
- **House Kits** - Premium visual customization kits ($1.99 - $399.99)
- **Premium Subscription** - One-time lifetime premium access ($4.99)

## Architecture

```
Mobile App (React Native/Expo)
    ↓
Edge Functions (Supabase)
    ↓
PayPal REST API
    ↓
Database (user_kit_purchases table)
```

## Setup Steps

### 1. Create PayPal Developer Account

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Sign in or create a developer account
3. Navigate to **Apps & Credentials**

### 2. Create a Sandbox App (For Testing)

1. Click **Create App**
2. Choose **Merchant** as the account type
3. App Name: `YourAppName-Sandbox`
4. Select **Sandbox**
5. Click **Create App**

You'll receive:
- **Client ID** (starts with `A...`)
- **Secret** (click "Show" to reveal)

### 3. Configure Supabase Secrets

The edge functions need these environment variables. Set them in Supabase:

```bash
# Using Supabase CLI
supabase secrets set PAYPAL_CLIENT_ID="your_sandbox_client_id"
supabase secrets set PAYPAL_SECRET="your_sandbox_secret"
supabase secrets set PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
```

Or via Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secrets:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_SECRET`
   - `PAYPAL_BASE_URL`

### 4. Test Sandbox Payments

PayPal provides test accounts for sandbox testing:

1. Go to **Sandbox → Accounts** in PayPal Developer Dashboard
2. You'll see test accounts (buyer and merchant)
3. Click on a buyer account to see credentials
4. Use these credentials when testing payments in your app

**Sandbox Buyer Account Example:**
- Email: `sb-buyer@personal.example.com`
- Password: (provided by PayPal)

### 5. Production Setup

When ready for production:

1. Create a **Live** app in PayPal Developer Dashboard
2. Complete business verification
3. Update Supabase secrets with production credentials:
   ```bash
   supabase secrets set PAYPAL_CLIENT_ID="your_live_client_id"
   supabase secrets set PAYPAL_SECRET="your_live_secret"
   supabase secrets set PAYPAL_BASE_URL="https://api-m.paypal.com"
   ```

## Edge Functions

### Already Deployed Functions

The following edge functions are already deployed and active:

1. **paypal-create-order** - Creates PayPal order for house kit purchases
2. **paypal-capture-order** - Captures payment and records purchase
3. **paypal-create-premium-order** - Creates order for premium subscription
4. **paypal-capture-premium-order** - Captures premium payment

### Endpoint URLs

```
https://[your-project-id].supabase.co/functions/v1/paypal-create-order
https://[your-project-id].supabase.co/functions/v1/paypal-capture-order
https://[your-project-id].supabase.co/functions/v1/paypal-create-premium-order
https://[your-project-id].supabase.co/functions/v1/paypal-capture-premium-order
```

## Payment Flow

### House Kit Purchase Flow

1. User taps "Purchase" button on a kit
2. App calls `paypal-create-order` edge function
3. Edge function creates PayPal order and returns `orderId`
4. App opens PayPal checkout in browser: `https://www.sandbox.paypal.com/checkoutnow?token={orderId}`
5. User completes payment in PayPal
6. User returns to app
7. App calls `paypal-capture-order` with `orderId`
8. Edge function captures payment and saves to `user_kit_purchases` table
9. User now owns the kit

### Premium Subscription Flow

1. User taps "Purchase with PayPal" in Premium modal
2. App calls `paypal-create-premium-order`
3. Opens PayPal checkout
4. Polls `paypal-capture-premium-order` every 3 seconds
5. When payment completes, premium status updates
6. User gets premium features

## Database Schema

### user_kit_purchases Table

```sql
CREATE TABLE user_kit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  house_kit_id UUID NOT NULL REFERENCES house_kits(id),
  purchase_price_cents INTEGER NOT NULL,
  payment_provider TEXT NOT NULL DEFAULT 'paypal',
  payment_transaction_id TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  purchased_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

## Testing

### Test Kit Purchase

1. Make sure PayPal sandbox credentials are configured
2. Go to Shop tab in app
3. Find a premium kit (e.g., "Eternal Radiance" - $399.99)
4. Tap "Purchase"
5. Use sandbox buyer account to complete payment
6. Verify kit appears as owned

### Test Premium Purchase

1. Go to Profile tab
2. Tap crown icon (if not premium)
3. Tap "Purchase with PayPal"
4. Complete payment with sandbox account
5. Verify premium features unlock

## Troubleshooting

### Common Issues

**Error: "PayPal credentials not configured"**
- Solution: Set PAYPAL_CLIENT_ID and PAYPAL_SECRET in Supabase secrets

**Error: "Failed to create PayPal order"**
- Check edge function logs in Supabase Dashboard
- Verify credentials are correct
- Ensure PAYPAL_BASE_URL is set correctly for sandbox/production

**Payment completes but kit doesn't unlock**
- Check `user_kit_purchases` table for the record
- Verify `payment_status` is 'completed'
- Check edge function logs for capture errors

**Browser doesn't open PayPal**
- Ensure app has permission to open URLs
- Try on physical device (simulators may have issues)

### Viewing Logs

View edge function logs in Supabase Dashboard:
1. Go to **Edge Functions**
2. Select the function
3. Click **Logs** tab

### Manual Testing Queries

```sql
-- Check if user owns a kit
SELECT * FROM user_kit_purchases
WHERE user_id = 'your-user-id'
AND house_kit_id = 'kit-id'
AND payment_status = 'completed';

-- View all purchases for a user
SELECT
  ukp.*,
  hk.name as kit_name,
  hk.price_cents
FROM user_kit_purchases ukp
JOIN house_kits hk ON hk.id = ukp.house_kit_id
WHERE ukp.user_id = 'your-user-id'
ORDER BY ukp.purchased_at DESC;
```

## Security Notes

- ✅ Edge functions use JWT authentication (verifyJWT: true)
- ✅ All payments are server-side verified
- ✅ PayPal credentials are stored securely in Supabase secrets
- ✅ Transaction IDs are stored for audit trail
- ✅ RLS policies protect user_kit_purchases table

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check PayPal Dashboard for transaction status
3. Verify credentials are correct for sandbox/production
4. Review database records in `user_kit_purchases`

## Quick Start Checklist

- [ ] Create PayPal Developer account
- [ ] Create Sandbox app
- [ ] Get Client ID and Secret
- [ ] Set Supabase secrets (PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_BASE_URL)
- [ ] Test purchase with sandbox account
- [ ] Verify purchase records in database
- [ ] Create Live app for production (when ready)
- [ ] Update secrets to production credentials
