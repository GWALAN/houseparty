/*
  # Remove Subscription System

  1. Changes
    - Drop subscriptions table as app uses one-time premium purchase model
    - Premium status tracked via user_purchases table with purchase_type='premium_unlock'
    - No recurring subscriptions needed

  2. Notes
    - Premium is a lifetime purchase, not a subscription
    - All premium features unlock immediately upon purchase
    - No expiration dates or renewal logic needed
*/

-- Drop subscriptions table (if exists)
DROP TABLE IF EXISTS subscriptions CASCADE;
