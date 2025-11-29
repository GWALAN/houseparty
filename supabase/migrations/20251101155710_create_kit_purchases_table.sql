/*
  # Create Kit Purchases Table
  
  ## Changes
  
  1. **New Tables**
    - `user_kit_purchases`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `house_kit_id` (uuid, foreign key to house_kits)
      - `purchase_price_cents` (integer, price paid at time of purchase)
      - `payment_provider` (text, e.g., 'paypal')
      - `payment_transaction_id` (text, PayPal transaction ID)
      - `payment_status` (text, e.g., 'completed', 'pending', 'refunded')
      - `purchased_at` (timestamptz, default now())
      - `metadata` (jsonb, for additional payment info)
  
  2. **Security**
    - Enable RLS on `user_kit_purchases` table
    - Users can view their own purchases
    - Only authenticated users can access
  
  ## Notes
  
  - Tracks all kit purchases with payment details
  - Stores transaction IDs for reconciliation
  - Immutable purchase records for audit trail
*/

-- Create user_kit_purchases table
CREATE TABLE IF NOT EXISTS user_kit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house_kit_id uuid NOT NULL REFERENCES house_kits(id) ON DELETE RESTRICT,
  purchase_price_cents integer NOT NULL,
  payment_provider text NOT NULL DEFAULT 'paypal',
  payment_transaction_id text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  purchased_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, house_kit_id)
);

-- Enable RLS
ALTER TABLE user_kit_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own kit purchases"
  ON user_kit_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kit purchases"
  ON user_kit_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_kit_purchases_user_id ON user_kit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kit_purchases_transaction_id ON user_kit_purchases(payment_transaction_id);
