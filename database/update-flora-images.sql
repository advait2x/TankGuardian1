-- Update scape_flora table to change image extensions from .webp to .png
UPDATE scape_flora
SET image_key = REPLACE(image_key, '.webp', '.png')
WHERE image_key LIKE '%.webp';

-- Verify the changes
SELECT id, slug, image_key
FROM scape_flora
WHERE image_key LIKE '%.png'
ORDER BY slug;
