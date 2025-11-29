/*
  # Create house_customizations table

  1. New Tables
    - `house_customizations`
      - `house_id` (uuid, primary key, references houses table)
      - `applied_by` (uuid, references auth.users)
      - `theme_data` (jsonb, stores kit theme information)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `house_customizations` table
    - Add policies for house admins to read and manage customizations
    - Add policies for house members to read customizations
  
  3. Purpose
    - Stores applied kit themes for each house
    - Allows tracking who applied the theme and when
    - Supports upsert operations for updating house themes
*/

-- Create house_customizations table
CREATE TABLE IF NOT EXISTS house_customizations (
  house_id uuid PRIMARY KEY REFERENCES houses(id) ON DELETE CASCADE,
  applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  theme_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE house_customizations ENABLE ROW LEVEL SECURITY;

-- Policy: House members can view customizations
CREATE POLICY "House members can view customizations"
  ON house_customizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_customizations.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Policy: House admins can insert customizations
CREATE POLICY "House admins can insert customizations"
  ON house_customizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_customizations.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );

-- Policy: House admins can update customizations
CREATE POLICY "House admins can update customizations"
  ON house_customizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_customizations.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_customizations.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );

-- Policy: House admins can delete customizations
CREATE POLICY "House admins can delete customizations"
  ON house_customizations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_customizations.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_house_customizations_house_id 
  ON house_customizations(house_id);

CREATE INDEX IF NOT EXISTS idx_house_customizations_applied_by 
  ON house_customizations(applied_by);