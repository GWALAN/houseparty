/*
  # Add Performance Indexes for House Kit System

  1. Performance Improvements
    - Add composite index on house_members for faster user house lookups
    - Add index on user_house_kits for faster ownership checks
    - Add index on user_kit_purchases for faster purchase verification
    - Add index on house_customizations for faster theme loading

  2. Expected Impact
    - Reduce house loading time from ~1000ms to ~200-300ms
    - Faster kit ownership verification
    - Improved shop page load performance

  3. Notes
    - All indexes use IF NOT EXISTS to prevent conflicts
    - Indexes are designed for the specific queries in shop.tsx and KitApplicationModal.tsx
*/

-- Index for house_members query (user_id + role filter with joined_at ordering)
CREATE INDEX IF NOT EXISTS idx_house_members_user_role_joined 
ON house_members(user_id, role, joined_at DESC);

-- Index for user_house_kits ownership checks
CREATE INDEX IF NOT EXISTS idx_user_house_kits_user_kit 
ON user_house_kits(user_id, house_kit_id);

-- Index for user_kit_purchases payment status checks
CREATE INDEX IF NOT EXISTS idx_user_kit_purchases_user_status 
ON user_kit_purchases(user_id, payment_status, house_kit_id);

-- Index for house_customizations theme loading
CREATE INDEX IF NOT EXISTS idx_house_customizations_house 
ON house_customizations(house_id);

-- Index for houses lookup (used in joins)
CREATE INDEX IF NOT EXISTS idx_houses_id_name 
ON houses(id, name, house_emoji);

-- Analyze tables to update query planner statistics
ANALYZE house_members;
ANALYZE user_house_kits;
ANALYZE user_kit_purchases;
ANALYZE house_customizations;
ANALYZE houses;
