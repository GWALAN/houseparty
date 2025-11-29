/*
  # Create User House Kits Table and Purchase Triggers
  
  ## Changes
  
  1. **New Tables**
    - `user_house_kits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `house_kit_id` (uuid, foreign key to house_kits)
      - `is_active` (boolean, default false)
      - `unlocked_at` (timestamptz, default now())
      - Unique constraint on (user_id, house_kit_id)
  
  2. **Triggers**
    - Automatically add free kits (common rarity) to new users
    - Automatically add purchased kits to user_house_kits when purchase completes
  
  3. **Functions**
    - `activate_house_kit` - Switch active kit for user
  
  4. **Security**
    - Enable RLS on `user_house_kits` table
    - Users can view their own kits
    - Users can update their own kits
  
  ## Notes
  
  - Free kits are automatically unlocked for all users
  - Purchased kits are automatically unlocked upon successful payment
  - Only one kit can be active at a time per user
*/

-- Create user_house_kits table
CREATE TABLE IF NOT EXISTS user_house_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house_kit_id uuid NOT NULL REFERENCES house_kits(id) ON DELETE CASCADE,
  is_active boolean DEFAULT false,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, house_kit_id)
);

-- Enable RLS
ALTER TABLE user_house_kits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_house_kits_user_id ON user_house_kits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_house_kits_active ON user_house_kits(user_id, is_active);

-- Function to activate a house kit
CREATE OR REPLACE FUNCTION activate_house_kit(p_user_id uuid, p_kit_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_house_kits 
  SET is_active = false 
  WHERE user_id = p_user_id;
  
  UPDATE user_house_kits 
  SET is_active = true 
  WHERE user_id = p_user_id AND house_kit_id = p_kit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Add free kits to all existing users
INSERT INTO user_house_kits (user_id, house_kit_id, is_active, unlocked_at)
SELECT u.id, hk.id, false, now()
FROM auth.users u
CROSS JOIN house_kits hk
WHERE hk.rarity = 'common' AND hk.price_cents = 0
ON CONFLICT (user_id, house_kit_id) DO NOTHING;
