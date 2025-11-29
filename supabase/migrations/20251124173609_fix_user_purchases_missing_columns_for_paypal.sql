/*
  # Fix user_purchases Table for PayPal Integration

  1. Problem
    - PayPal capture fails with "Could not find the 'metadata' column"
    - Missing columns: payment_provider, payment_transaction_id, provider_order_id, purchase_price_cents, currency, metadata
    - This causes app crash after PayPal payment completion

  2. Changes
    - Add missing payment-related columns
    - Add metadata jsonb column for storing PayPal capture response
    - Add provider_order_id for tracking PayPal orders
    - Add payment_transaction_id for PayPal transaction tracking
    - Add payment_provider to differentiate payment methods
    - Add purchase_price_cents and currency for transaction details
    
  3. Security
    - No RLS changes needed (existing policies apply)
*/

-- Add missing columns to user_purchases table
DO $$
BEGIN
  -- Add payment_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_purchases' AND column_name = 'payment_provider'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN payment_provider text;
  END IF;

  -- Add payment_transaction_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_purchases' AND column_name = 'payment_transaction_id'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN payment_transaction_id text;
  END IF;

  -- Add provider_order_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_purchases' AND column_name = 'provider_order_id'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN provider_order_id text;
  END IF;

  -- Add purchase_price_cents column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_purchases' AND column_name = 'purchase_price_cents'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN purchase_price_cents integer;
  END IF;

  -- Add currency column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_purchases' AND column_name = 'currency'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN currency text DEFAULT 'USD';
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_purchases' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN metadata jsonb;
  END IF;
END $$;

-- Create unique index to prevent duplicate orders
CREATE UNIQUE INDEX IF NOT EXISTS user_purchases_provider_order_unique 
  ON user_purchases(user_id, provider_order_id)
  WHERE provider_order_id IS NOT NULL;
