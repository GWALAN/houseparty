/*
  # Create Missing Tables for PayPal Integration
  
  1. New Tables
    - `analytics_events` - Track user behavior
    - `user_kit_purchases` - Track PayPal purchases
    - `user_house_kits` - Track user's unlocked kits
  
  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
  
  3. Triggers
    - Auto-add free kits to new users
    - Auto-add purchased kits when payment completes
*/

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Kit Purchases Table
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

ALTER TABLE user_kit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kit purchases"
  ON user_kit_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kit purchases"
  ON user_kit_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_kit_purchases_user_id ON user_kit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kit_purchases_transaction_id ON user_kit_purchases(payment_transaction_id);

-- User House Kits Table
CREATE TABLE IF NOT EXISTS user_house_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house_kit_id uuid NOT NULL REFERENCES house_kits(id) ON DELETE CASCADE,
  is_active boolean DEFAULT false,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, house_kit_id)
);

ALTER TABLE user_house_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own house kits"
  ON user_house_kits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own house kits"
  ON user_house_kits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own house kits"
  ON user_house_kits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_house_kits_user_id ON user_house_kits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_house_kits_active ON user_house_kits(user_id, is_active);

-- Function to add purchased kit to user collection
CREATE OR REPLACE FUNCTION add_purchased_kit_to_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' THEN
    INSERT INTO user_house_kits (user_id, house_kit_id, is_active, unlocked_at)
    VALUES (NEW.user_id, NEW.house_kit_id, false, NEW.purchased_at)
    ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add kit when purchase completes
DROP TRIGGER IF EXISTS trigger_add_purchased_kit ON user_kit_purchases;
CREATE TRIGGER trigger_add_purchased_kit
  AFTER INSERT ON user_kit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION add_purchased_kit_to_user();

-- Function to add free kits to new users
CREATE OR REPLACE FUNCTION add_free_kits_to_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_house_kits (user_id, house_kit_id, is_active, unlocked_at)
  SELECT NEW.id, hk.id, false, now()
  FROM house_kits hk
  WHERE hk.rarity = 'common' AND hk.price_cents = 0
  ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add free kits when user signs up
DROP TRIGGER IF EXISTS trigger_add_free_kits_to_new_user ON auth.users;
CREATE TRIGGER trigger_add_free_kits_to_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION add_free_kits_to_new_user();

-- Add free kits to all existing users
INSERT INTO user_house_kits (user_id, house_kit_id, is_active, unlocked_at)
SELECT u.id, hk.id, false, now()
FROM auth.users u
CROSS JOIN house_kits hk
WHERE hk.rarity = 'common' AND hk.price_cents = 0
ON CONFLICT (user_id, house_kit_id) DO NOTHING;