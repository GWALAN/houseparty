# 🎨 APPLY KIT TO HOUSE - COMPLETE CODE FLOW

## **🔴 CRITICAL ANDROID APK BUG IDENTIFIED**

### **THE PROBLEM:**
On Android APK builds, `houses.length === 0` even though houses exist. This is because:

**Lines 67-71 in `apply-kit/[kitId].tsx`:**
```typescript
const { data: memberData } = await supabase
  .from('house_members')
  .select('house_id, role')
  .eq('user_id', user.id)
  .eq('role', 'admin');  // ❌ ONLY FETCHES ADMIN HOUSES
```

**BUT:** The function checks `role === 'admin'` which **excludes houses where the user is the OWNER/CREATOR**.

In your database, when a house is created:
- The creator is added to `house_members` with `role = 'admin'`
- BUT if the role is stored differently (e.g., 'owner', 'creator', or NULL), those houses won't show up

---

## **📋 COMPLETE CODE DOCUMENTATION**

### **1. TYPES & INTERFACES**

```typescript
// app/apply-kit/[kitId].tsx

type House = {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
  has_customization: boolean;
};

type Kit = {
  id: string;
  name: string;
  theme_data: any;
  price_cents?: number;
};
```

---

### **2. COMPONENT STATE**

```typescript
export default function ApplyKitScreen() {
  const { kitId } = useLocalSearchParams();
  const [kit, setKit] = useState<Kit | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouses, setSelectedHouses] = useState<Set<string>>(new Set());
  const [applyToProfile, setApplyToProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
```

---

### **3. FETCH HOUSES FUNCTION - THE BUG SOURCE**

```typescript
const fetchData = async () => {
  if (!user) return;

  // ===== FETCH KIT DATA =====
  const { data: kitData } = await supabase
    .from('house_kits')
    .select(`
      *,
      kit_items!inner (
        item_data
      )
    `)
    .eq('id', kitId)
    .maybeSingle();

  if (kitData) {
    setKit({
      id: kitData.id,
      name: kitData.name,
      theme_data: kitData.kit_items?.[0]?.item_data,
      price_cents: kitData.price_cents,
    });
  }

  // ===== FETCH ADMIN HOUSES - BUG HERE =====
  // ❌ PROBLEM: Only fetches houses where role = 'admin'
  // This misses houses where user is creator/owner
  const { data: memberData } = await supabase
    .from('house_members')
    .select('house_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin');  // ❌ TOO RESTRICTIVE

  if (memberData) {
    const houseIds = memberData.map(m => m.house_id);

    // If no admin houses found, houseIds = [], query returns empty
    if (houseIds.length === 0) {
      console.log('[APPLY KIT] ❌ No admin houses found for user');
      setHouses([]);
      setLoading(false);
      return;
    }

    // Fetch house details
    const { data: housesData } = await supabase
      .from('houses')
      .select('id, name, invite_code')
      .in('id', houseIds);

    if (housesData) {
      // Enrich with member counts and customization status
      const enrichedHouses = await Promise.all(
        housesData.map(async (house) => {
          const { count } = await supabase
            .from('house_members')
            .select('*', { count: 'exact', head: true })
            .eq('house_id', house.id);

          const { data: customization } = await supabase
            .from('house_customizations')
            .select('house_id')
            .eq('house_id', house.id)
            .maybeSingle();

          return {
            ...house,
            member_count: count || 0,
            has_customization: !!customization,
          };
        })
      );

      setHouses(enrichedHouses);
    }
  }

  setLoading(false);
};
```

---

### **4. APPLY TO HOUSE EXECUTION**

```typescript
const executeApplyToHouse = async () => {
  if (selectedHouses.size === 0 || !kit || !user) {
    console.log('[APPLY KIT] Missing required data:', {
      selectedHousesCount: selectedHouses.size,
      kit: !!kit,
      user: !!user
    });
    return;
  }

  const isFreeKit = kit.price_cents === 0;

  // Check premium requirement
  if (!isPremium && !isFreeKit) {
    showError('Premium Required: You need premium to apply premium kits.');
    return;
  }

  try {
    console.log('[APPLY KIT] Starting theme application to', selectedHouses.size, 'houses...');
    setApplying(true);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Apply kit to each selected house
    for (const houseId of Array.from(selectedHouses)) {
      const { data, error } = await supabase.rpc('apply_kit_to_house', {
        p_kit_id: kitId as string,
        p_house_id: houseId,
      });

      if (error) {
        console.error('[APPLY KIT] Error applying kit to house:', houseId, error);
        failCount++;
        errors.push(error.message);
        continue;
      }

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        failCount++;
        errors.push(result.error || 'Unknown error');
      } else {
        successCount++;
      }
    }

    setApplying(false);

    // Show results
    if (successCount > 0 && failCount === 0) {
      showSuccess(`Kit applied to ${successCount} house${successCount > 1 ? 's' : ''}!`);
      setTimeout(() => router.back(), 1500);
    } else if (successCount > 0 && failCount > 0) {
      showError(`Applied to ${successCount}, failed for ${failCount}`);
    } else {
      showError('Failed to apply kit');
    }
  } catch (err: any) {
    console.error('[APPLY KIT] Unexpected error:', err);
    setApplying(false);
    showError(`An unexpected error occurred: ${err.message}`);
  }
};
```

---

### **5. BACKEND RPC FUNCTION**

```sql
-- supabase/migrations/20251109165900_fix_apply_kit_to_house_color_conversion.sql

CREATE OR REPLACE FUNCTION apply_kit_to_house(p_kit_id uuid, p_house_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_kit_name text;
  v_kit_colors text[];
  v_kit_colors_jsonb jsonb;
  v_kit_rarity text;
  v_house_exists boolean;
  v_user_is_member boolean;
  v_user_owns_kit boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Fetch kit data
  SELECT name, color_scheme, rarity
  INTO v_kit_name, v_kit_colors, v_kit_rarity
  FROM house_kits
  WHERE id = p_kit_id;

  IF v_kit_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kit not found');
  END IF;

  -- Convert colors to JSONB
  v_kit_colors_jsonb := to_jsonb(v_kit_colors);

  -- Check house exists
  SELECT EXISTS(
    SELECT 1 FROM houses WHERE id = p_house_id
  ) INTO v_house_exists;

  IF NOT v_house_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'House not found');
  END IF;

  -- Check user is owner OR member
  SELECT EXISTS(
    SELECT 1 FROM houses
    WHERE id = p_house_id AND created_by = v_user_id
    UNION
    SELECT 1 FROM house_members
    WHERE house_id = p_house_id AND user_id = v_user_id
  ) INTO v_user_is_member;

  IF NOT v_user_is_member THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to modify this house'
    );
  END IF;

  -- Auto-grant kit if user doesn't own it
  SELECT EXISTS(
    SELECT 1 FROM user_house_kits
    WHERE user_id = v_user_id AND house_kit_id = p_kit_id
  ) INTO v_user_owns_kit;

  IF NOT v_user_owns_kit THEN
    INSERT INTO user_house_kits (user_id, house_kit_id)
    VALUES (v_user_id, p_kit_id)
    ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  END IF;

  -- Apply kit to house
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
    v_kit_colors_jsonb,
    v_kit_rarity,
    now(),
    now()
  )
  ON CONFLICT (house_id)
  DO UPDATE SET
    applied_kit_id = p_kit_id,
    custom_banner_colors = v_kit_colors_jsonb,
    rarity = v_kit_rarity,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit applied to house successfully',
    'kit_name', v_kit_name
  );
END;
$$;
```

---

### **6. UI RENDERING**

```typescript
// Empty state when no houses found
{!applyToProfile && houses.length === 0 ? (
  <View style={styles.emptyState}>
    <HouseIcon size={64} color="#475569" />
    <Text style={styles.emptyTitle}>No Houses Found</Text>
    <Text style={styles.emptyText}>
      You need to be an admin of a house to apply themes
    </Text>
  </View>
) : !applyToProfile ? (
  <FlatList
    data={houses}
    renderItem={renderHouse}
    keyExtractor={(item) => item.id}
  />
) : null}
```

---

## **🔧 THE FIX**

Replace lines 67-71 in `app/apply-kit/[kitId].tsx` with:

```typescript
// OPTION 1: Check for admin OR creator
const { data: memberData } = await supabase
  .from('house_members')
  .select('house_id, role')
  .eq('user_id', user.id)
  .in('role', ['admin', 'owner', 'creator']);

// OPTION 2: Fetch ALL houses where user is a member + has admin rights
const { data: memberData, error: memberError } = await supabase
  .from('house_members')
  .select('house_id, role')
  .eq('user_id', user.id);

console.log('[APPLY KIT] Found member records:', memberData?.length);
console.log('[APPLY KIT] Member roles:', memberData?.map(m => ({ id: m.house_id, role: m.role })));

// Filter for admin/owner roles in code
const adminHouses = memberData?.filter(m =>
  m.role === 'admin' || m.role === 'owner' || m.role === 'creator'
) || [];

console.log('[APPLY KIT] Admin houses after filter:', adminHouses.length);

const houseIds = adminHouses.map(m => m.house_id);
```

---

## **🔍 DEBUGGING STEPS FOR ANDROID APK**

Add comprehensive logging to `fetchData()`:

```typescript
const fetchData = async () => {
  if (!user) {
    console.log('[APPLY KIT] ❌ No user found');
    return;
  }

  console.log('[APPLY KIT] 🔍 Starting fetch for user:', user.id);

  // Fetch kit
  const { data: kitData, error: kitError } = await supabase
    .from('house_kits')
    .select(`*, kit_items!inner (item_data)`)
    .eq('id', kitId)
    .maybeSingle();

  console.log('[APPLY KIT] Kit fetch result:', { kitData: !!kitData, kitError });

  if (kitData) {
    setKit({
      id: kitData.id,
      name: kitData.name,
      theme_data: kitData.kit_items?.[0]?.item_data,
      price_cents: kitData.price_cents,
    });
    console.log('[APPLY KIT] ✅ Kit loaded:', kitData.name);
  }

  // Fetch member data
  const { data: memberData, error: memberError } = await supabase
    .from('house_members')
    .select('house_id, role')
    .eq('user_id', user.id);

  console.log('[APPLY KIT] Member fetch result:', {
    count: memberData?.length,
    error: memberError,
    roles: memberData?.map(m => m.role)
  });

  if (memberError) {
    console.error('[APPLY KIT] ❌ Member fetch error:', memberError);
    setLoading(false);
    return;
  }

  if (!memberData || memberData.length === 0) {
    console.log('[APPLY KIT] ⚠️ User is not a member of any houses');
    setHouses([]);
    setLoading(false);
    return;
  }

  // Filter for admin/owner
  const adminHouses = memberData.filter(m =>
    m.role === 'admin' || m.role === 'owner' || m.role === 'creator'
  );

  console.log('[APPLY KIT] Admin houses:', adminHouses.length);

  if (adminHouses.length === 0) {
    console.log('[APPLY KIT] ⚠️ User is not an admin of any houses');
    setHouses([]);
    setLoading(false);
    return;
  }

  const houseIds = adminHouses.map(m => m.house_id);
  console.log('[APPLY KIT] Fetching details for house IDs:', houseIds);

  // Fetch house details
  const { data: housesData, error: housesError } = await supabase
    .from('houses')
    .select('id, name, invite_code')
    .in('id', houseIds);

  console.log('[APPLY KIT] Houses fetch result:', {
    count: housesData?.length,
    error: housesError
  });

  if (housesData) {
    const enrichedHouses = await Promise.all(
      housesData.map(async (house) => {
        const { count } = await supabase
          .from('house_members')
          .select('*', { count: 'exact', head: true })
          .eq('house_id', house.id);

        const { data: customization } = await supabase
          .from('house_customizations')
          .select('house_id')
          .eq('house_id', house.id)
          .maybeSingle();

        return {
          ...house,
          member_count: count || 0,
          has_customization: !!customization,
        };
      })
    );

    console.log('[APPLY KIT] ✅ Final houses loaded:', enrichedHouses.length);
    setHouses(enrichedHouses);
  }

  setLoading(false);
};
```

---

## **📊 DATABASE SCHEMA CHECK**

Verify your `house_members` table:

```sql
-- Check what roles exist
SELECT DISTINCT role FROM house_members;

-- Check user's memberships
SELECT hm.house_id, h.name, hm.role, hm.user_id
FROM house_members hm
JOIN houses h ON h.id = hm.house_id
WHERE hm.user_id = 'YOUR_USER_ID';

-- Check who created houses
SELECT id, name, created_by
FROM houses
WHERE created_by = 'YOUR_USER_ID';
```

---

## **✅ EXPECTED BEHAVIOR**

1. User opens kit details screen
2. Taps "Apply Kit" button
3. Navigate to `/apply-kit/[kitId]`
4. `fetchData()` runs:
   - Fetches kit details
   - Fetches houses where user has admin rights
   - Enriches with member counts + customization status
5. If houses found: Shows selectable list
6. If no houses: Shows empty state
7. User selects houses + taps "Apply"
8. Calls `apply_kit_to_house` RPC for each house
9. Updates `house_customizations` table
10. Shows success message
11. Navigates back to previous screen

---

## **🐛 ROOT CAUSE ON ANDROID APK**

The query `eq('role', 'admin')` is too restrictive. On Android APK:
- Supabase connection might be working
- Query executes successfully
- BUT returns 0 results because role doesn't match exactly
- Could be: 'owner', 'creator', NULL, or different casing

**Fix:** Remove the role filter or broaden it to include all admin-like roles.
