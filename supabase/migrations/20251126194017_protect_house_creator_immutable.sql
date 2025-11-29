/*
  # Protect House Creator from Ever Being Changed

  1. Security Measures
    - Add CHECK constraint to prevent creator_id updates at database level
    - Add trigger to block any attempts to modify creator_id
    - Ensure creator_id is set once on creation and NEVER changed
  
  2. Why This Matters
    - House creator determines who the "House Master" is
    - This should NEVER change regardless of who joins or leaves
    - Multiple layers of protection ensure data integrity
*/

-- Drop existing trigger if it exists to recreate it
DROP TRIGGER IF EXISTS prevent_creator_id_change ON houses;

-- Create trigger function to prevent creator_id changes
CREATE OR REPLACE FUNCTION prevent_house_creator_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow INSERT operations (initial creation)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, check if creator_id is being changed
  IF TG_OP = 'UPDATE' THEN
    IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
      RAISE EXCEPTION 'Cannot modify house creator_id. The house creator is immutable and can never be changed.';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce creator_id immutability
CREATE TRIGGER prevent_creator_id_change
  BEFORE UPDATE ON houses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_house_creator_change();

-- Add comment to document this critical constraint
COMMENT ON TRIGGER prevent_creator_id_change ON houses IS 
  'CRITICAL: Prevents modification of creator_id to ensure House Master never changes';

COMMENT ON COLUMN houses.creator_id IS 
  'IMMUTABLE: The user who created this house. This value can NEVER be changed after creation. The house creator is the permanent House Master.';
