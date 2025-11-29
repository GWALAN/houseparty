# Complete PayPal Payment Integration Guide

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Payment Flow Diagram](#payment-flow-diagram)
3. [App Pages & Components](#app-pages--components)
4. [Supabase Edge Functions](#supabase-edge-functions)
5. [Database Schema](#database-schema)
6. [Complete Code](#complete-code)

---

## Architecture Overview (350 Words)

Your app uses **PayPal's REST API** with a **server-side processing model** through **Supabase Edge Functions** to handle payments securely. This architecture ensures your PayPal credentials never touch the client app.

### Payment Types Supported

1. **Premium Membership** - $4.99 one-time purchase (lifetime access)
2. **House Kits** - $0.99-$2.99 per kit (cosmetic customizations)

### Complete Payment Flow

**Step 1: Client Initiates Payment**
When a user taps "Purchase Premium" or "Buy Kit" in the app, the React Native client makes a request to a Supabase Edge Function (not directly to PayPal). This request includes the product type and any metadata needed.

**Step 2: Order Creation (Server-Side)**
The Edge Function receives the request and communicates with PayPal's API using your **secret credentials** stored as Supabase secrets. The function calls PayPal's `/v2/checkout/orders` endpoint to create an order with:
- Amount and currency (USD)
- Item description
- Return URLs for success/cancel scenarios
- Purchase metadata (user ID, product ID)

PayPal responds with an **approval URL** and **order ID**. The Edge Function returns this data to your app.

**Step 3: User Authorization**
The app opens PayPal's approval URL in a WebView using `expo-web-browser`. The user logs into their PayPal account (or uses guest checkout), reviews the payment details, and authorizes the transaction. PayPal then redirects to your return URL with the order ID in the query parameters.

**Step 4: Payment Capture (Server-Side)**
When the return URL loads (`houseparty://paypal/success?token=ORDER_ID`), your app extracts the order ID and calls another Edge Function to **capture** the payment. This function makes a POST request to PayPal's `/v2/checkout/orders/{order_id}/capture` endpoint. PayPal processes the actual charge and returns a capture result with transaction details.

**Step 5: Database Updates**
Upon successful capture, the Edge Function:
- Records the transaction in `user_purchases` table (for premium)
- Records kit ownership in `user_kit_purchases` table (for kits)
- Stores transaction metadata (PayPal transaction ID, capture details)
- Returns success confirmation to the app

**Step 6: UI Confirmation**
The app receives the success response, closes the WebView, displays a success message, and updates the local state to reflect the new purchase. For premium purchases, the `PremiumContext` refreshes to update UI across the app.

### Security Considerations

All PayPal API calls use **server-to-server communication** with OAuth2 authentication. Your client app never sees PayPal credentials. Each transaction is logged with user ID, order ID, transaction ID, and timestamp for audit trails and dispute resolution. Row Level Security (RLS) policies ensure users can only view their own purchases.

---

## Payment Flow Diagram

```
┌─────────────┐
│   CLIENT    │  (React Native App)
│   (Expo)    │
└──────┬──────┘
       │
       │ 1. Tap "Purchase" button
       ▼
┌──────────────────────────────────────────────────┐
│  Shop Screen (app/(tabs)/shop.tsx)               │
│  OR PremiumPurchaseModal.tsx                     │
└──────┬───────────────────────────────────────────┘
       │
       │ 2. POST to create-order function
       │    (with auth token)
       ▼
┌──────────────────────────────────────────────────┐
│  SUPABASE EDGE FUNCTION                          │
│  - paypal-create-premium-order                   │
│  - create-kit-paypal-order                       │
└──────┬───────────────────────────────────────────┘
       │
       │ 3. Authenticate with PayPal
       │    GET /v1/oauth2/token
       ▼
┌──────────────────────────────────────────────────┐
│  PayPal API                                      │
│  (https://api-m.sandbox.paypal.com)              │
└──────┬───────────────────────────────────────────┘
       │
       │ 4. Create order
       │    POST /v2/checkout/orders
       ▼
┌──────────────────────────────────────────────────┐
│  PayPal Response                                 │
│  { orderId, approvalUrl }                        │
└──────┬───────────────────────────────────────────┘
       │
       │ 5. Return to client
       ▼
┌──────────────────────────────────────────────────┐
│  CLIENT - Open approval URL                      │
│  WebBrowser.openBrowserAsync(approvalUrl)        │
└──────┬───────────────────────────────────────────┘
       │
       │ 6. User logs in & approves
       ▼
┌──────────────────────────────────────────────────┐
│  PayPal Checkout Page                            │
│  (User authorizes payment)                       │
└──────┬───────────────────────────────────────────┘
       │
       │ 7. Redirect to return URL
       │    houseparty://paypal/success?token=XXX
       ▼
┌──────────────────────────────────────────────────┐
│  paypal-success.tsx                              │
│  (Deep link handler)                             │
└──────┬───────────────────────────────────────────┘
       │
       │ 8. POST to capture function
       │    (with orderId + auth token)
       ▼
┌──────────────────────────────────────────────────┐
│  SUPABASE EDGE FUNCTION                          │
│  - paypal-capture-premium-order                  │
│  - paypal-capture-order                          │
└──────┬───────────────────────────────────────────┘
       │
       │ 9. Authenticate with PayPal
       │    GET /v1/oauth2/token
       ▼
┌──────────────────────────────────────────────────┐
│  PayPal API                                      │
└──────┬───────────────────────────────────────────┘
       │
       │ 10. Capture payment
       │     POST /v2/checkout/orders/{id}/capture
       ▼
┌──────────────────────────────────────────────────┐
│  PayPal Capture Response                         │
│  { status: "COMPLETED", transactionId }          │
└──────┬───────────────────────────────────────────┘
       │
       │ 11. Record purchase in database
       ▼
┌──────────────────────────────────────────────────┐
│  Supabase Database                               │
│  - user_purchases (premium)                      │
│  - user_kit_purchases (kits)                     │
└──────┬───────────────────────────────────────────┘
       │
       │ 12. Return success to client
       ▼
┌──────────────────────────────────────────────────┐
│  CLIENT - Show success & redirect                │
│  - Close WebView                                 │
│  - Show success toast                            │
│  - Refresh premium status                        │
│  - Navigate to profile/shop                      │
└──────────────────────────────────────────────────┘
```

---

## App Pages & Components

### 1. Shop Screen (`app/(tabs)/shop.tsx`)

**Purpose:** Main store interface for purchasing house kits

**Key Functions:**
- `handlePurchaseKit(kit)` - Initiates kit purchase flow
- `loadKits()` - Fetches available kits and ownership status

**Payment Flow:**
```typescript
const handlePurchaseKit = async (kit: HouseKit) => {
  // 1. Get user session token
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  // 2. Call create order function
  const createOrderUrl = `${SUPABASE_URL}/functions/v1/create-kit-paypal-order`;
  const createResponse = await fetch(createOrderUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ kitId: kit.id }),
  });

  // 3. Get approval URL
  const { orderId, approvalUrl } = await createResponse.json();

  // 4. Open PayPal checkout in browser
  await WebBrowser.openBrowserAsync(approvalUrl);

  // User will complete payment in browser
  // Return URL: houseparty://paypal/success?token={orderId}&kitId={kitId}
};
```

**Location:** Line 242-326

---

### 2. Premium Purchase Modal (`components/PremiumPurchaseModal.tsx`)

**Purpose:** Modal for purchasing premium membership ($4.99)

**Key Functions:**
- `handlePurchase()` - Initiates premium purchase flow

**Payment Flow:**
```typescript
const handlePurchase = async () => {
  // 1. Get auth token
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  // 2. Create PayPal order for premium
  const createOrderResponse = await fetch(
    `${supabaseUrl}/functions/v1/paypal-create-premium-order`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  // 3. Get approval URL
  const { orderId, approvalUrl } = await createOrderResponse.json();

  // 4. Open PayPal in browser
  await WebBrowser.openBrowserAsync(approvalUrl);

  // Return URL: houseparty://paypal/success?token={orderId}
};
```

**Features:**
- Shows premium features list
- $4.99 one-time payment
- Lifetime access messaging
- Loading states during checkout

**Location:** Lines 27-107

---

### 3. PayPal Success Page (`app/paypal-success.tsx`)

**Purpose:** Deep link handler for successful PayPal payments

**Flow:**
```typescript
const handlePayPalReturn = async () => {
  // 1. Extract parameters from URL
  const { token, orderId, kitId } = params;
  const paymentOrderId = (orderId || token) as string;

  // 2. Get auth token
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;

  // 3. Determine which capture endpoint to call
  const endpoint = kitId
    ? 'paypal-capture-order'           // For kits
    : 'paypal-capture-premium-order';  // For premium

  // 4. Capture the payment
  const captureResponse = await fetch(
    `${supabaseUrl}/functions/v1/${endpoint}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ orderId: paymentOrderId, kitId }),
    }
  );

  // 5. Handle success
  if (captureResponse.ok) {
    setStatus('success');
    await refreshPremiumStatus(); // Update context

    // Redirect to appropriate screen
    setTimeout(() => {
      router.replace(kitId ? '/(tabs)/shop' : '/(tabs)/profile');
    }, 2000);
  }
};
```

**States:**
- `loading` - Processing payment
- `success` - Payment completed
- `error` - Payment failed

**Location:** Lines 22-101

---

### 4. PayPal Cancel Page (`app/paypal-cancel.tsx`)

**Purpose:** Handler for cancelled payments

**Flow:**
```typescript
useEffect(() => {
  // Auto-redirect after 2 seconds
  const timer = setTimeout(() => {
    router.replace('/(tabs)/shop');
  }, 2000);

  return () => clearTimeout(timer);
}, []);
```

**Simple UI:**
- Shows "Payment Cancelled" message
- "No charges were made" confirmation
- Auto-redirects to shop

**Location:** Lines 7-16

---

## Supabase Edge Functions

### 1. Create Premium Order (`paypal-create-premium-order/index.ts`)

**Purpose:** Creates a PayPal order for premium membership

**Environment Variables Required:**
- `PAYPAL_CLIENT_ID` - PayPal app client ID
- `PAYPAL_SECRET` - PayPal app secret
- `PAYPAL_BASE_URL` - API endpoint (sandbox or production)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

**Flow:**
```typescript
1. Authenticate user from Authorization header
2. Check if user already has premium (prevent duplicate purchases)
3. Get PayPal OAuth access token
4. Create PayPal order with:
   - Amount: $4.99
   - Description: "HouseParty Premium - Lifetime Access"
   - Return URL: houseparty://paypal/success
   - Cancel URL: houseparty://paypal/cancel
5. Return { orderId, approvalUrl } to client
```

**Key Code Sections:**

**Authentication:**
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return Response error 401
}
```

**Duplicate Check:**
```typescript
const { data: existingPurchase } = await supabase
  .from('user_purchases')
  .select('id')
  .eq('user_id', user.id)
  .eq('product_type', 'premium')
  .eq('payment_status', 'completed')
  .maybeSingle();

if (existingPurchase) {
  return error "Premium already purchased"
}
```

**PayPal OAuth:**
```typescript
const auth = btoa(`${paypalClientId}:${paypalSecret}`);
const accessTokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${auth}`,
  },
  body: 'grant_type=client_credentials',
});
const { access_token } = await accessTokenResponse.json();
```

**Create Order:**
```typescript
const orderData = {
  intent: 'CAPTURE',
  purchase_units: [{
    amount: {
      currency_code: 'USD',
      value: '4.99',
    },
    description: 'HouseParty Premium - Lifetime Access',
    custom_id: JSON.stringify({ userId: user.id, productType: 'premium' }),
  }],
  application_context: {
    return_url: 'houseparty://paypal/success',
    cancel_url: 'houseparty://paypal/cancel',
    brand_name: 'HouseParty',
    user_action: 'PAY_NOW',
  },
};

const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`,
  },
  body: JSON.stringify(orderData),
});
```

**Return Response:**
```typescript
const order = await orderResponse.json();
const approvalLink = order.links?.find((link: any) => link.rel === 'approve');

return new Response(JSON.stringify({
  orderId: order.id,
  approvalUrl: approvalLink?.href
}));
```

---

### 2. Capture Premium Order (`paypal-capture-premium-order/index.ts`)

**Purpose:** Captures payment and records premium purchase

**Flow:**
```typescript
1. Authenticate user
2. Get orderId from request body
3. Get PayPal OAuth access token
4. Capture the order: POST /v2/checkout/orders/{orderId}/capture
5. If status === 'COMPLETED':
   - Extract transaction ID
   - Record purchase in user_purchases table
   - Return success to client
6. If not completed:
   - Return error with PayPal response details
```

**Key Code Sections:**

**Capture Payment:**
```typescript
const captureResponse = await fetch(
  `${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
    },
  }
);

const captureData = await captureResponse.json();
```

**Record Purchase:**
```typescript
if (captureData.status === 'COMPLETED') {
  const transactionId = captureData.purchase_units[0]?.payments?.captures[0]?.id;

  const { error: insertError } = await supabase
    .from('user_purchases')
    .insert({
      user_id: user.id,
      product_type: 'premium',
      product_id: 'premium_lifetime',
      purchase_price_cents: 499,
      payment_provider: 'paypal',
      payment_transaction_id: transactionId,
      payment_status: 'completed',
      metadata: captureData,
    });

  return new Response(JSON.stringify({ success: true, transactionId }));
}
```

---

### 3. Create Kit Order (`create-kit-paypal-order/index.ts`)

**Purpose:** Creates a PayPal order for house kit purchase

**Flow:**
```typescript
1. Authenticate user
2. Get kitId from request body
3. Fetch kit details from database (name, price)
4. Check if kit is purchasable (price > 0)
5. Check if user already owns this kit
6. Get PayPal OAuth access token
7. Create PayPal order with:
   - Amount: kit.price_cents / 100
   - Description: kit.name
   - Return URL: houseparty://paypal/success?kitId={kitId}
8. Return { orderId, approvalUrl }
```

**Key Code Sections:**

**Fetch Kit:**
```typescript
const { data: kit, error: kitError } = await supabase
  .from('house_kits')
  .select('id, name, price_cents')
  .eq('id', kitId)
  .maybeSingle();

if (!kit || kit.price_cents === 0) {
  return error
}
```

**Duplicate Purchase Check:**
```typescript
const { data: existingPurchase } = await supabase
  .from('user_kit_purchases')
  .select('id')
  .eq('user_id', user.id)
  .eq('house_kit_id', kitId)
  .maybeSingle();

if (existingPurchase) {
  return error "Kit already purchased"
}
```

**Create Order with Kit Details:**
```typescript
const orderData = {
  intent: 'CAPTURE',
  purchase_units: [{
    amount: {
      currency_code: 'USD',
      value: (kit.price_cents / 100).toFixed(2),  // Convert cents to dollars
    },
    description: kit.name,
    custom_id: JSON.stringify({ userId: user.id, kitId: kit.id }),
  }],
  application_context: {
    return_url: `houseparty://paypal/success?kitId=${kit.id}`,  // Include kitId
    cancel_url: 'houseparty://paypal/cancel',
    brand_name: 'HouseParty',
    user_action: 'PAY_NOW',
  },
};
```

---

### 4. Capture Kit Order (`paypal-capture-order/index.ts`)

**Purpose:** Captures payment and records kit purchase

**Flow:**
```typescript
1. Authenticate user
2. Get orderId and kitId from request body
3. Fetch kit details to verify
4. Get PayPal OAuth access token
5. Capture the order
6. If status === 'COMPLETED':
   - Extract transaction ID
   - Record purchase in user_kit_purchases table
   - Return success
```

**Key Code:**

```typescript
if (captureData.status === 'COMPLETED') {
  const transactionId = captureData.purchase_units[0]?.payments?.captures[0]?.id;

  const { error: insertError } = await supabase
    .from('user_kit_purchases')
    .insert({
      user_id: user.id,
      house_kit_id: kitId,
      purchase_price_cents: kit.price_cents,
      payment_provider: 'paypal',
      payment_transaction_id: transactionId,
      payment_status: 'completed',
      metadata: captureData,
    });

  return new Response(JSON.stringify({ success: true, transactionId }));
}
```

---

## Database Schema

### 1. `user_purchases` Table

**Purpose:** Records all user purchases (currently used for premium membership)

```sql
CREATE TABLE user_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_type text NOT NULL,           -- 'premium', 'kit', etc.
  product_id text NOT NULL,             -- 'premium_lifetime', kit UUID, etc.
  purchase_price_cents integer NOT NULL,
  payment_provider text NOT NULL,       -- 'paypal'
  payment_transaction_id text NOT NULL, -- PayPal transaction ID
  payment_status text NOT NULL,         -- 'pending', 'completed', 'failed'
  metadata jsonb DEFAULT '{}'::jsonb,   -- Full PayPal capture response
  created_at timestamptz DEFAULT now()
);
```

**RLS Policies:**
```sql
-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON user_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

**Usage:**
- Premium membership purchases
- Audit trail for all transactions
- Dispute resolution

---

### 2. `user_kit_purchases` Table

**Purpose:** Records house kit purchases

```sql
CREATE TABLE user_kit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house_kit_id uuid NOT NULL REFERENCES house_kits(id) ON DELETE RESTRICT,
  purchase_price_cents integer NOT NULL,
  payment_provider text NOT NULL DEFAULT 'paypal',
  payment_transaction_id text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  purchased_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, house_kit_id)  -- Prevent duplicate purchases
);
```

**RLS Policies:**
```sql
-- Users can view their own kit purchases
CREATE POLICY "Users can view own kit purchases"
  ON user_kit_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

**Usage:**
- Track which kits users own
- Prevent duplicate kit purchases
- Show "Owned" vs "Purchase" buttons in shop

---

### 3. `house_kits` Table (Reference)

**Purpose:** Available kits for purchase

```sql
CREATE TABLE house_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rarity text NOT NULL,
  price_cents integer DEFAULT 0,        -- 0 = free, >0 = paid
  color_scheme jsonb,                   -- Array of hex colors
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Example Kits:**
- Common kits: $0 (free)
- Rare kits: $0.99
- Epic kits: $1.99
- Legendary kits: $2.99

---

## Complete Code

### Full Shop Screen (`app/(tabs)/shop.tsx`)

See Lines 1-718 in `/tmp/cc-agent/59524392/project/app/(tabs)/shop.tsx`

**Key excerpts already shown above**

---

### Full Premium Purchase Modal (`components/PremiumPurchaseModal.tsx`)

See Lines 1-379 in `/tmp/cc-agent/59524392/project/components/PremiumPurchaseModal.tsx`

---

### Full PayPal Success Handler (`app/paypal-success.tsx`)

See Lines 1-165 in `/tmp/cc-agent/59524392/project/app/paypal-success.tsx`

---

### Full PayPal Cancel Handler (`app/paypal-cancel.tsx`)

See Lines 1-60 in `/tmp/cc-agent/59524392/project/app/paypal-cancel.tsx`

---

### All Edge Functions

**1. Create Premium Order:**
`/tmp/cc-agent/59524392/project/supabase/functions/paypal-create-premium-order/index.ts`
Lines 1-152

**2. Capture Premium Order:**
`/tmp/cc-agent/59524392/project/supabase/functions/paypal-capture-premium-order/index.ts`
Lines 1-166

**3. Create Kit Order:**
`/tmp/cc-agent/59524392/project/supabase/functions/create-kit-paypal-order/index.ts`
Lines 1-204

**4. Capture Kit Order:**
`/tmp/cc-agent/59524392/project/supabase/functions/paypal-capture-order/index.ts`
Lines 1-183

---

## Environment Variables Setup

### Required Supabase Secrets

Set these in your Supabase dashboard under Settings > Edge Functions > Secrets:

```bash
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_SECRET=your_paypal_secret_here
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com  # or production URL
```

### Client Environment Variables

In your `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Testing Checklist

### Premium Purchase
- [ ] Click "Purchase Premium" button
- [ ] PayPal browser opens
- [ ] Login with test account
- [ ] Approve payment
- [ ] Redirects back to app
- [ ] Success message shows
- [ ] Premium features unlock
- [ ] Record appears in `user_purchases` table

### Kit Purchase
- [ ] Browse shop
- [ ] Click "Purchase" on a kit
- [ ] PayPal browser opens
- [ ] Complete payment
- [ ] Redirects back to app
- [ ] Kit shows as "Unlocked"
- [ ] Can apply kit to profile/house
- [ ] Record appears in `user_kit_purchases` table

### Error Handling
- [ ] Cancel payment - shows cancel page
- [ ] Payment fails - shows error message
- [ ] Already purchased - shows error before PayPal
- [ ] Network errors - graceful error messages

---

## Common Issues & Solutions

### Issue: "PayPal credentials not configured"
**Solution:** Set `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, and `PAYPAL_BASE_URL` in Supabase Edge Function secrets.

### Issue: "Premium already purchased"
**Solution:** This is expected behavior to prevent duplicate charges. Check `user_purchases` table.

### Issue: Deep link not working
**Solution:** Ensure `houseparty://` scheme is registered in `app.json`:
```json
{
  "scheme": "houseparty"
}
```

### Issue: Payment captured but not recorded
**Solution:** Check Edge Function logs for database insert errors. Verify RLS policies allow inserts.

---

## Security Best Practices

1. **Never expose PayPal credentials in client code**
   - Always use Edge Functions
   - Store secrets in Supabase secure storage

2. **Validate user authentication**
   - Check Authorization header in all functions
   - Verify user owns the purchase

3. **Prevent duplicate purchases**
   - Check existing purchases before creating orders
   - Use UNIQUE constraints in database

4. **Store full transaction data**
   - Keep PayPal response in `metadata` column
   - Helps with disputes and refunds

5. **Use RLS policies**
   - Users can only see their own purchases
   - Prevents data leaks

---

## File Locations Summary

```
project/
├── app/
│   ├── (tabs)/
│   │   └── shop.tsx                    # Main shop interface
│   ├── paypal-success.tsx              # Payment success handler
│   └── paypal-cancel.tsx               # Payment cancel handler
├── components/
│   └── PremiumPurchaseModal.tsx        # Premium purchase UI
└── supabase/
    ├── functions/
    │   ├── paypal-create-premium-order/
    │   │   └── index.ts                # Create premium order
    │   ├── paypal-capture-premium-order/
    │   │   └── index.ts                # Capture premium payment
    │   ├── create-kit-paypal-order/
    │   │   └── index.ts                # Create kit order
    │   └── paypal-capture-order/
    │       └── index.ts                # Capture kit payment
    └── migrations/
        ├── *_create_missing_tables_for_paypal.sql
        └── *_create_kit_purchases_table.sql
```

---

## Support

For PayPal API documentation:
- https://developer.paypal.com/docs/api/orders/v2/

For Supabase Edge Functions:
- https://supabase.com/docs/guides/functions
