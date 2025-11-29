# House Kit Application System - Technical Explanation

**Date:** November 25, 2025
**Topic:** How applying kits to houses works (NOT profiles)

---

## Overview

The **House Kit Application System** allows house creators to customize their house's appearance by applying color themes (kits) to it. This is different from profile kits - house kits change the visual theme of the entire house for all members.

---

## Database Schema

### Tables Involved

#### 1. `house_kits` (Available Kits)
Stores all available house kits that users can unlock and apply.

```sql
CREATE TABLE house_kits (
  id                uuid PRIMARY KEY,
  name              text NOT NULL,
  description       text,
  rarity            text,           -- 'common', 'rare', 'epic', 'legendary', 'mythic'
  color_scheme      text[],         -- Array of hex colors: ['#FF5733', '#33FF57', ...]
  price_cents       integer,        -- Price in cents (0 = free)
  is_premium        boolean,        -- Requires premium subscription
  is_active         boolean,        -- Can users see this kit?
  category          text,           -- Optional categorization
  preview_image     text,           -- Preview image URL
  created_at        timestamptz,
  updated_at        timestamptz
);
```

**Example Data:**
```javascript
{
  id: 'uuid-123',
  name: 'Ocean Breeze',
  rarity: 'epic',
  color_scheme: ['#00A8E8', '#007EA7', '#003459'],  // Blue gradient
  price_cents: 499,  // $4.99
  is_premium: true,
  is_active: true
}
```

---

#### 2. `user_house_kits` (User's Owned Kits)
Tracks which kits each user has unlocked/purchased.

```sql
CREATE TABLE user_house_kits (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES profiles(id),
  house_kit_id    uuid NOT NULL REFERENCES house_kits(id),
  is_active       boolean DEFAULT true,
  unlocked_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, house_kit_id)  -- User can't own same kit twice
);
```

**Example Data:**
```javascript
{
  id: 'uuid-456',
  user_id: 'user-abc',        // John owns this kit
  house_kit_id: 'uuid-123',    // He unlocked "Ocean Breeze"
  unlocked_at: '2025-11-20T10:30:00Z'
}
```

---

#### 3. `houses` (User's Houses)
Stores houses that users create and manage.

```sql
CREATE TABLE houses (
  id            uuid PRIMARY KEY,
  name          text NOT NULL,
  creator_id    uuid NOT NULL REFERENCES profiles(id),  -- ONLY creator can apply kits
  invite_code   text UNIQUE,
  created_at    timestamptz
);
```

**Key Point:** Only `creator_id` can apply kits to the house!

---

#### 4. `house_customizations` (Applied Kits)
Stores which kit is currently applied to each house.

```sql
CREATE TABLE house_customizations (
  house_id              uuid PRIMARY KEY REFERENCES houses(id),  -- One customization per house
  applied_kit_id        uuid REFERENCES house_kits(id),          -- Which kit is active
  custom_banner_colors  jsonb,                                    -- Colors from the kit
  rarity                text,                                     -- Kit's rarity
  applied_by            uuid REFERENCES profiles(id),             -- Who applied it
  theme_data            jsonb NOT NULL,                           -- Full theme configuration
  created_at            timestamptz,
  updated_at            timestamptz
);
```

**Example Data:**
```javascript
{
  house_id: 'house-xyz',
  applied_kit_id: 'uuid-123',                           // "Ocean Breeze" kit
  custom_banner_colors: ["#00A8E8", "#007EA7", "#003459"],
  rarity: 'epic',
  applied_by: 'user-abc',
  updated_at: '2025-11-25T14:00:00Z'
}
```

---

## Code Flow

### Frontend: Applying a Kit

**File:** `app/apply-kit/[kitId].tsx`

#### Step 1: User Navigates to Apply Kit Screen

```typescript
// User clicks "Apply" on a kit in the shop
router.push(`/apply-kit/${kitId}`);
```

#### Step 2: Fetch Available Houses

```typescript
const fetchData = async () => {
  // 1. Fetch houses where user is the CREATOR
  const { data: createdHouses } = await supabase
    .from('houses')
    .select('id, name, invite_code')
    .eq('creator_id', user.id);

  // 2. Fetch houses where user is an ADMIN member
  const { data: memberData } = await supabase
    .from('house_members')
    .select('house_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin');

  // 3. Combine both lists (remove duplicates)
  const allHouseIds = new Set();
  createdHouses.forEach(h => allHouseIds.add(h.id));
  memberData.forEach(m => allHouseIds.add(m.house_id));

  // 4. Fetch full house details
  const { data: housesData } = await supabase
    .from('houses')
    .select('id, name, invite_code')
    .in('id', Array.from(allHouseIds));

  // 5. Check which houses already have customizations
  const enrichedHouses = await Promise.all(
    housesData.map(async (house) => {
      const { data: customization } = await supabase
        .from('house_customizations')
        .select('house_id')
        .eq('house_id', house.id)
        .maybeSingle();

      return {
        ...house,
        has_customization: !!customization  // Does it have a kit applied?
      };
    })
  );

  setHouses(enrichedHouses);
};
```

**Result:** User sees list of houses they can customize.

---

#### Step 3: User Selects Houses and Applies Kit

```typescript
const executeApplyToHouse = async () => {
  // 1. Check if kit requires premium
  const isFreeKit = kit.price_cents === 0;

  if (!isPremium && !isFreeKit) {
    showError('Premium Required: You need premium to apply this kit.');
    return;
  }

  // 2. Apply kit to each selected house
  for (const houseId of selectedHouses) {
    console.log('Applying kit to house:', houseId);

    // 3. Call database function
    const { data, error } = await supabase.rpc('apply_kit_to_house', {
      p_house_id: houseId,
      p_kit_id: kitId
    });

    if (error) {
      console.error('Failed to apply kit:', error);
      failCount++;
    } else {
      console.log('Kit applied successfully!');
      successCount++;
    }
  }

  // 4. Show success message
  if (successCount > 0) {
    showSuccess(`Kit applied to ${successCount} houses!`);
    router.back();
  }
};
```

---

### Backend: Database Function

**File:** `supabase/migrations/20251124223925_fix_apply_kit_creator_only.sql`

#### The `apply_kit_to_house()` Function

```sql
CREATE OR REPLACE FUNCTION apply_kit_to_house(
  p_kit_id uuid,
  p_house_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges (bypass RLS)
AS $$
DECLARE
  v_user_id uuid;
  v_kit_name text;
  v_kit_colors text[];
  v_kit_colors_jsonb jsonb;
  v_kit_rarity text;
  v_house_exists boolean;
  v_user_is_creator boolean;
  v_user_owns_kit boolean;
BEGIN
  -- STEP 1: Get current user
  v_user_id := auth.uid();  -- Get authenticated user ID

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- STEP 2: Fetch kit details
  SELECT name, color_scheme, rarity
  INTO v_kit_name, v_kit_colors, v_kit_rarity
  FROM house_kits
  WHERE id = p_kit_id;

  IF v_kit_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found'
    );
  END IF;

  -- Convert text[] to jsonb for storage
  v_kit_colors_jsonb := to_jsonb(v_kit_colors);

  -- STEP 3: Verify house exists
  SELECT EXISTS(
    SELECT 1 FROM houses WHERE id = p_house_id
  ) INTO v_house_exists;

  IF NOT v_house_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'House not found'
    );
  END IF;

  -- STEP 4: Check if user is the CREATOR (ONLY creators can apply kits)
  SELECT EXISTS(
    SELECT 1 FROM houses
    WHERE id = p_house_id AND creator_id = v_user_id
  ) INTO v_user_is_creator;

  IF NOT v_user_is_creator THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only the house creator can apply kits'
    );
  END IF;

  -- STEP 5: Check if user owns this kit
  SELECT EXISTS(
    SELECT 1 FROM user_house_kits
    WHERE user_id = v_user_id AND house_kit_id = p_kit_id
  ) INTO v_user_owns_kit;

  -- STEP 6: If user doesn't own kit, add it to their collection (for free kits)
  IF NOT v_user_owns_kit THEN
    INSERT INTO user_house_kits (user_id, house_kit_id)
    VALUES (v_user_id, p_kit_id)
    ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  END IF;

  -- STEP 7: Apply kit to house (UPSERT)
  INSERT INTO house_customizations (
    house_id,
    applied_kit_id,
    custom_banner_colors,
    rarity,
    created_at,
    updated_at
  )
  VALUES (
    p_house_id,
    p_kit_id,
    v_kit_colors_jsonb,  -- Store colors as JSONB
    v_kit_rarity,
    now(),
    now()
  )
  ON CONFLICT (house_id)  -- If customization already exists, update it
  DO UPDATE SET
    applied_kit_id = p_kit_id,
    custom_banner_colors = v_kit_colors_jsonb,
    rarity = v_kit_rarity,
    updated_at = now();

  -- STEP 8: Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit applied to house successfully',
    'kit_name', v_kit_name
  );
END;
$$;
```

---

## Step-by-Step Example

Let's walk through a complete example:

### Scenario
**User:** John (user_id: `abc-123`)
**Kit:** "Ocean Breeze" (kit_id: `kit-456`, colors: `['#00A8E8', '#007EA7', '#003459']`)
**House:** "John's Party House" (house_id: `house-789`, creator_id: `abc-123`)

---

### Step 1: John Clicks "Apply Kit"

```typescript
// Frontend
router.push('/apply-kit/kit-456');
```

---

### Step 2: Fetch John's Houses

```sql
-- Query 1: Houses John created
SELECT id, name FROM houses WHERE creator_id = 'abc-123';
-- Returns: [{ id: 'house-789', name: "John's Party House" }]

-- Query 2: Houses where John is admin
SELECT house_id FROM house_members WHERE user_id = 'abc-123' AND role = 'admin';
-- Returns: [{ house_id: 'house-999' }]

-- Result: John can apply kits to 2 houses
```

---

### Step 3: John Selects "John's Party House" and Clicks "Apply"

```typescript
// Frontend calls database function
await supabase.rpc('apply_kit_to_house', {
  p_house_id: 'house-789',
  p_kit_id: 'kit-456'
});
```

---

### Step 4: Database Function Executes

```sql
-- Step 4.1: Get user ID
v_user_id = 'abc-123';  -- From auth.uid()

-- Step 4.2: Fetch kit details
SELECT name, color_scheme, rarity FROM house_kits WHERE id = 'kit-456';
-- Returns:
-- v_kit_name = 'Ocean Breeze'
-- v_kit_colors = ['#00A8E8', '#007EA7', '#003459']
-- v_kit_rarity = 'epic'

-- Step 4.3: Verify house exists
SELECT EXISTS(SELECT 1 FROM houses WHERE id = 'house-789');
-- Returns: true

-- Step 4.4: Check if John is the creator
SELECT EXISTS(
  SELECT 1 FROM houses
  WHERE id = 'house-789' AND creator_id = 'abc-123'
);
-- Returns: true (John is the creator!)

-- Step 4.5: Check if John owns this kit
SELECT EXISTS(
  SELECT 1 FROM user_house_kits
  WHERE user_id = 'abc-123' AND house_kit_id = 'kit-456'
);
-- Returns: true (John purchased it)

-- Step 4.6: Apply kit to house (UPSERT)
INSERT INTO house_customizations (
  house_id,
  applied_kit_id,
  custom_banner_colors,
  rarity,
  created_at,
  updated_at
)
VALUES (
  'house-789',
  'kit-456',
  '["#00A8E8", "#007EA7", "#003459"]'::jsonb,
  'epic',
  now(),
  now()
)
ON CONFLICT (house_id) DO UPDATE SET
  applied_kit_id = 'kit-456',
  custom_banner_colors = '["#00A8E8", "#007EA7", "#003459"]'::jsonb,
  rarity = 'epic',
  updated_at = now();

-- Returns:
{
  "success": true,
  "message": "Kit applied to house successfully",
  "kit_name": "Ocean Breeze"
}
```

---

### Step 5: Frontend Shows Success

```typescript
// Frontend receives response
if (result.success) {
  showSuccess('Kit applied to 1 house!');
  router.back();  // Return to previous screen
}
```

---

### Step 6: House Now Has New Colors

```sql
-- Query house customization
SELECT * FROM house_customizations WHERE house_id = 'house-789';

-- Result:
{
  house_id: 'house-789',
  applied_kit_id: 'kit-456',
  custom_banner_colors: ["#00A8E8", "#007EA7", "#003459"],
  rarity: 'epic',
  applied_by: 'abc-123',
  updated_at: '2025-11-25T14:00:00Z'
}
```

---

### Step 7: House Displays New Theme

When the house is rendered anywhere in the app:

```typescript
// Fetch house with customization
const { data: house } = await supabase
  .from('houses')
  .select(`
    id,
    name,
    house_customizations (
      custom_banner_colors,
      rarity
    )
  `)
  .eq('id', 'house-789')
  .single();

// Use colors in LinearGradient
<LinearGradient
  colors={house.house_customizations.custom_banner_colors}
  style={styles.houseBanner}
>
  <Text>{house.name}</Text>
</LinearGradient>

// Result: House banner shows blue gradient!
```

---

## Key Concepts

### 1. **Kit Ownership**
```typescript
// Users must own a kit before applying it
// Tracked in: user_house_kits table

// Check ownership:
SELECT EXISTS(
  SELECT 1 FROM user_house_kits
  WHERE user_id = 'abc-123' AND house_kit_id = 'kit-456'
);
```

### 2. **Creator-Only Application**
```sql
-- ONLY house creators can apply kits
-- Checked in apply_kit_to_house function:

SELECT EXISTS(
  SELECT 1 FROM houses
  WHERE id = p_house_id AND creator_id = v_user_id
);

-- Admin members CANNOT apply kits (even though they can manage members)
```

### 3. **UPSERT Pattern**
```sql
-- Use ON CONFLICT to update existing customizations
-- This means changing kits is easy - just apply a new one!

INSERT INTO house_customizations (...)
VALUES (...)
ON CONFLICT (house_id) DO UPDATE SET
  applied_kit_id = new_kit_id,
  custom_banner_colors = new_colors;
```

### 4. **Auto-Unlock Free Kits**
```sql
-- If user doesn't own a kit but tries to apply it,
-- the function automatically adds it to their collection
-- (only works for free kits)

IF NOT v_user_owns_kit THEN
  INSERT INTO user_house_kits (user_id, house_kit_id)
  VALUES (v_user_id, p_kit_id)
  ON CONFLICT DO NOTHING;
END IF;
```

---

## Data Flow Diagram

```
User Action (Frontend)
        ↓
[Select Kit from Shop]
        ↓
[Navigate to /apply-kit/[kitId]]
        ↓
[Fetch Houses User Can Customize]
        ↓
     Query 1: houses.creator_id = user.id
     Query 2: house_members (role = admin)
        ↓
[Display List of Houses]
        ↓
[User Selects House(s) and Clicks Apply]
        ↓
[Check Premium Status if Kit is Premium]
        ↓
[Call RPC: apply_kit_to_house()]
        ↓
Database Function Executes:
        ↓
[1. Validate User is Authenticated]
        ↓
[2. Fetch Kit Details from house_kits]
        ↓
[3. Verify House Exists]
        ↓
[4. Check User is Creator of House]
        ↓
[5. Check User Owns Kit]
        ↓
[6. Auto-Add Kit if Free]
        ↓
[7. UPSERT house_customizations]
        ↓
[8. Return Success/Error]
        ↓
Frontend Handles Response
        ↓
[Show Success Toast]
        ↓
[Navigate Back to Shop]
        ↓
[House Now Displays New Colors!]
```

---

## Error Scenarios

### Error 1: Not Authenticated
```sql
IF v_user_id IS NULL THEN
  RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
END IF;
```

### Error 2: Kit Not Found
```sql
IF v_kit_name IS NULL THEN
  RETURN jsonb_build_object('success', false, 'error', 'Kit not found');
END IF;
```

### Error 3: House Not Found
```sql
IF NOT v_house_exists THEN
  RETURN jsonb_build_object('success', false, 'error', 'House not found');
END IF;
```

### Error 4: Not the Creator
```sql
IF NOT v_user_is_creator THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Only the house creator can apply kits'
  );
END IF;
```

### Error 5: Premium Required (Frontend)
```typescript
if (!isPremium && !isFreeKit) {
  showError('Premium Required: You need premium to apply this kit.');
  return;
}
```

---

## Differences: House Kits vs Profile Kits

| Feature | House Kits | Profile Kits |
|---------|-----------|--------------|
| **Applied To** | Houses | User Profile |
| **Who Can Apply** | Creator only | User themselves |
| **Visibility** | All house members see it | Only visible on user's profile |
| **Storage Table** | `house_customizations` | `user_profile_settings` |
| **Usage** | House banners, cards | Profile avatar borders |
| **Permission Check** | `houses.creator_id = user_id` | `user_id = auth.uid()` |

---

## Summary

**House Kit Application** is a 7-step process:

1. **Frontend:** User navigates to apply kit screen
2. **Frontend:** Fetch houses user can customize (creator or admin)
3. **Frontend:** User selects houses and clicks apply
4. **Backend:** Validate user is creator of house
5. **Backend:** Check user owns kit (auto-add if free)
6. **Backend:** UPSERT house_customizations table
7. **Frontend:** Display success and refresh house UI

**Key Rules:**
- ✅ Only house **creators** can apply kits
- ✅ User must **own** the kit (or it must be free)
- ✅ One kit per house (UPSERT overwrites previous)
- ✅ Premium kits require premium subscription
- ✅ Colors stored as JSONB array

**Result:** House displays the new color gradient everywhere it appears in the app!
