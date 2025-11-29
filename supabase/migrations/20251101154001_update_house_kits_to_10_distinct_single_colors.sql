/*
  # Update House Kits to 10 Distinct Single Colors
  
  ## Changes
  
  1. **Replace existing house kits with 10 free kits**
    - Each kit uses ONE solid color only (no gradients)
    - All 10 colors are visually distinct from each other
    - All kits are free (price_cents = 0)
  
  2. **Color Selection**
    - Red: #EF4444
    - Orange: #F97316
    - Yellow: #EAB308
    - Green: #10B981
    - Cyan: #06B6D4
    - Blue: #3B82F6
    - Purple: #A855F7
    - Pink: #EC4899
    - White: #F8FAFC
    - Gray: #64748B
  
  ## Notes
  
  - No gradients or multiple tones
  - Each color is distinct and recognizable
  - All kits remain free to apply
*/

-- Delete existing house kits and items
DELETE FROM kit_items WHERE house_kit_id IS NOT NULL;
DELETE FROM house_kits;

-- Insert 10 distinct single-color house kits
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('10000000-0001-0000-0000-000000000001'::uuid, 'Ruby Red', 'Bold red color theme', 'common', ARRAY['#EF4444'], 0, true),
  ('10000000-0002-0000-0000-000000000002'::uuid, 'Sunset Orange', 'Vibrant orange color theme', 'common', ARRAY['#F97316'], 0, true),
  ('10000000-0003-0000-0000-000000000003'::uuid, 'Golden Yellow', 'Bright yellow color theme', 'common', ARRAY['#EAB308'], 0, true),
  ('10000000-0004-0000-0000-000000000004'::uuid, 'Emerald Green', 'Fresh green color theme', 'common', ARRAY['#10B981'], 0, true),
  ('10000000-0005-0000-0000-000000000005'::uuid, 'Ocean Cyan', 'Cool cyan color theme', 'common', ARRAY['#06B6D4'], 0, true),
  ('10000000-0006-0000-0000-000000000006'::uuid, 'Sky Blue', 'Classic blue color theme', 'common', ARRAY['#3B82F6'], 0, true),
  ('10000000-0007-0000-0000-000000000007'::uuid, 'Royal Purple', 'Rich purple color theme', 'common', ARRAY['#A855F7'], 0, true),
  ('10000000-0008-0000-0000-000000000008'::uuid, 'Hot Pink', 'Bright pink color theme', 'common', ARRAY['#EC4899'], 0, true),
  ('10000000-0009-0000-0000-000000000009'::uuid, 'Pure White', 'Clean white color theme', 'common', ARRAY['#F8FAFC'], 0, true),
  ('10000000-0010-0000-0000-000000000010'::uuid, 'Slate Gray', 'Neutral gray color theme', 'common', ARRAY['#64748B'], 0, true);

-- Create kit items for each house kit with single color
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('20000000-0001-0000-0000-000000000001'::uuid, 'Ruby Red Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#EF4444'),
        'text', '#FFFFFF',
        'accent', '#EF4444'
      )
    ),
    '10000000-0001-0000-0000-000000000001'::uuid, false
  ),
  ('20000000-0002-0000-0000-000000000002'::uuid, 'Sunset Orange Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#F97316'),
        'text', '#FFFFFF',
        'accent', '#F97316'
      )
    ),
    '10000000-0002-0000-0000-000000000002'::uuid, false
  ),
  ('20000000-0003-0000-0000-000000000003'::uuid, 'Golden Yellow Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#EAB308'),
        'text', '#FFFFFF',
        'accent', '#EAB308'
      )
    ),
    '10000000-0003-0000-0000-000000000003'::uuid, false
  ),
  ('20000000-0004-0000-0000-000000000004'::uuid, 'Emerald Green Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#10B981'),
        'text', '#FFFFFF',
        'accent', '#10B981'
      )
    ),
    '10000000-0004-0000-0000-000000000004'::uuid, false
  ),
  ('20000000-0005-0000-0000-000000000005'::uuid, 'Ocean Cyan Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#06B6D4'),
        'text', '#FFFFFF',
        'accent', '#06B6D4'
      )
    ),
    '10000000-0005-0000-0000-000000000005'::uuid, false
  ),
  ('20000000-0006-0000-0000-000000000006'::uuid, 'Sky Blue Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#3B82F6'),
        'text', '#FFFFFF',
        'accent', '#3B82F6'
      )
    ),
    '10000000-0006-0000-0000-000000000006'::uuid, false
  ),
  ('20000000-0007-0000-0000-000000000007'::uuid, 'Royal Purple Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#A855F7'),
        'text', '#FFFFFF',
        'accent', '#A855F7'
      )
    ),
    '10000000-0007-0000-0000-000000000007'::uuid, false
  ),
  ('20000000-0008-0000-0000-000000000008'::uuid, 'Hot Pink Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#EC4899'),
        'text', '#FFFFFF',
        'accent', '#EC4899'
      )
    ),
    '10000000-0008-0000-0000-000000000008'::uuid, false
  ),
  ('20000000-0009-0000-0000-000000000009'::uuid, 'Pure White Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#F8FAFC'),
        'text', '#1E293B',
        'accent', '#F8FAFC'
      )
    ),
    '10000000-0009-0000-0000-000000000009'::uuid, false
  ),
  ('20000000-0010-0000-0000-000000000010'::uuid, 'Slate Gray Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#64748B'),
        'text', '#FFFFFF',
        'accent', '#64748B'
      )
    ),
    '10000000-0010-0000-0000-000000000010'::uuid, false
  );
