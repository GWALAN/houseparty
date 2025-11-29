/*
  # Fix Password Reset Redirect URLs

  This migration updates the Supabase auth configuration to allow direct deep link redirects
  for password reset functionality.

  ## Changes
  - Removes any web-based redirect URLs (Bolt preview, webcontainer, etc.)
  - Adds houseparty:// deep link scheme to allowed redirect URLs
  - This enables direct app-to-app password reset without web intermediaries
*/

-- Allow houseparty:// deep link redirects for password reset
-- This is configured at the project level in Supabase dashboard
-- This migration documents the required configuration

-- Note: The actual redirect URL configuration is done in Supabase Dashboard:
-- Auth → URL Configuration → Redirect URLs
-- Add: houseparty://reset-password
-- Add: houseparty://*

-- This migration serves as documentation of the required configuration
SELECT 1; -- No-op, configuration is done via dashboard
