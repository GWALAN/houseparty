/*
  # Remove Duplicate Analytics Column

  The analytics_events table has both event_data and event_properties.
  Remove event_properties as the code uses event_data.
*/

-- Drop event_properties column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics_events' AND column_name = 'event_properties'
  ) THEN
    ALTER TABLE analytics_events DROP COLUMN event_properties;
  END IF;
END $$;
