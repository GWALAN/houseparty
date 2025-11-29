/*
  # Fix user_purchases table schema

  1. Changes
    - Add missing columns to user_purchases table:
      - price_cents (integer) - actual purchase price
      - payment_provider (text) - payment provider used
      - transaction_id (text) - transaction ID from provider
      - metadata (jsonb) - additional payment metadata
    
  2. Notes
    - Using IF NOT EXISTS pattern for safety
    - All columns nullable for backward compatibility
*/

DO $$ 
BEGIN
  -- Add price_cents column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_purchases' AND column_name = 'price_cents'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN price_cents integer;
  END IF;

  -- Add payment_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_purchases' AND column_name = 'payment_provider'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN payment_provider text;
  END IF;

  -- Add transaction_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_purchases' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN transaction_id text;
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_purchases' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN metadata jsonb;
  END IF;
END $$;
