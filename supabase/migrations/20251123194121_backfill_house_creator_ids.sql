/*
  # Backfill missing creator_id values in houses table

  1. Problem
    - Houses created before the creator_id column was added to the INSERT statement have NULL creator_id
    - This causes the apply-kit screen to show zero houses even though users created/own houses

  2. Solution
    - Find houses where creator_id IS NULL
    - Look up an admin member for each house (they are most likely the creator)
    - Set that admin as the creator_id

  3. Safety
    - Only updates houses where creator_id IS NULL
    - Only sets creator_id if there is an admin member for the house
*/

-- Update houses with NULL creator_id by finding their admin member
UPDATE houses h
SET creator_id = (
  SELECT hm.user_id
  FROM house_members hm
  WHERE hm.house_id = h.id
    AND hm.role = 'admin'
  LIMIT 1
)
WHERE h.creator_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM house_members hm2
    WHERE hm2.house_id = h.id
      AND hm2.role = 'admin'
  );

-- Log the results
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM houses
  WHERE creator_id IS NOT NULL;

  RAISE NOTICE 'Backfilled creator_id for houses. Total houses with creator_id: %', updated_count;
END $$;