/*
  # Fix user_purchases Schema for Premium Status Check v2

  ## Summary
  Adds missing columns needed by check_user_can_join_house function and fixes
  schema inconsistencies causing house creation failures.

  ## Changes
  1. Add `product_type` column to identify purchase type (premium, house_kit, emoji_pack)
  2. Add `payment_status` column to track payment completion status
  3. Migrate existing data and normalize values
  4. Add indexes for faster premium status lookups

  ## Security
  - Maintains existing RLS policies
  - No changes to access controls
*/

-- Add product_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_purchases' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN product_type text;
  END IF;
END $$;

-- Add payment_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_purchases' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN payment_status text;
  END IF;
END $$;

-- Migrate and normalize data
UPDATE user_purchases 
SET product_type = CASE 
  WHEN purchase_type = 'premium_unlock' THEN 'premium'
  WHEN purchase_type = 'house_kit' THEN 'house_kit'
  WHEN purchase_type = 'emoji_pack' THEN 'emoji_pack'
  WHEN purchase_type = 'banner' THEN 'banner'
  ELSE purchase_type
END
WHERE product_type IS NULL;

-- Migrate payment status
UPDATE user_purchases 
SET payment_status = COALESCE(status, 'completed')
WHERE payment_status IS NULL;

-- Create indexes for faster premium status lookups
CREATE INDEX IF NOT EXISTS idx_user_purchases_premium_status 
  ON user_purchases(user_id, product_type, payment_status) 
  WHERE product_type = 'premium' AND payment_status = 'completed';

CREATE INDEX IF NOT EXISTS idx_user_purchases_user_product 
  ON user_purchases(user_id, product_type);

-- Add comments for clarity
COMMENT ON COLUMN user_purchases.product_type IS 'Type of product purchased: premium, house_kit, emoji_pack, banner';
COMMENT ON COLUMN user_purchases.payment_status IS 'Payment status: pending, completed, failed, refunded';
COMMENT ON COLUMN user_purchases.status IS 'Legacy status column - use payment_status instead';
COMMENT ON COLUMN user_purchases.purchase_type IS 'Legacy purchase type column - use product_type instead';