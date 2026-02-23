-- Fix equipment image_key paths by removing category subdirectories
-- The images are stored directly in catalog/equipment/, not in subdirectories

-- Update image_key to remove category subdirectories
-- Example: catalog/equipment/heater/hygger-titanium-heater-200w.webp
--       -> catalog/equipment/hygger-titanium-heater-200w.webp

UPDATE equipment_catalog
SET image_key = REGEXP_REPLACE(
  image_key,
  'catalog/equipment/[^/]+/',  -- Match catalog/equipment/<category>/
  'catalog/equipment/',         -- Replace with catalog/equipment/
  'g'
)
WHERE image_key LIKE 'catalog/equipment/%/%';

-- Verify the changes
SELECT 
  id,
  brand,
  model,
  image_key
FROM equipment_catalog
WHERE image_key IS NOT NULL
ORDER BY brand, model
LIMIT 10;
