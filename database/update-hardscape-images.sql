-- Update scape_hardscape table to change image extensions from .webp to .png
UPDATE scape_hardscape
SET image_key = REPLACE(image_key, '.webp', '.png')
WHERE image_key LIKE '%.webp';

-- Verify the changes
SELECT id, slug, name, image_key
FROM scape_hardscape
WHERE image_key LIKE '%.png'
ORDER BY name;
