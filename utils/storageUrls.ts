/**
 * Safe helper to generate public URLs for Supabase Storage assets
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/**
 * Normalize image_key to handle legacy formats and new catalog structure
 * - 'catalog/scaping/flora/java-fern.webp' -> 'catalog/scaping/flora/java-fern.webp' (full path)
 * - 'fish/betta.webp' -> 'fish/betta.webp' (unchanged)
 * - 'fish/betta.png' -> 'fish/betta.png' (unchanged)
 * - 'guppy' -> 'fish/guppy.webp' (legacy key upgrade)
 * - 'hardscape-dragon-stone' -> null (legacy aquascape key, should use emoji)
 * - 'flora-java-fern' -> null (legacy aquascape key, should use emoji)
 */
function normalizeImageKey(path: string): string | null {
  const trimmed = path.trim();
  
  // If starts with 'catalog/', it's already a full path from storage bucket root
  if (trimmed.startsWith('catalog/')) {
    return trimmed;
  }
  
  // If already has a path separator, keep as-is
  if (trimmed.includes('/')) {
    return trimmed;
  }
  
  // Detect legacy aquascape keys (hardscape-*, flora-*, plant-*, rock-*, wood-*)
  // These should fall back to emoji display, not try to load images
  if (/^(hardscape|flora|plant|rock|wood)-/.test(trimmed)) {
    return null;
  }
  
  // If has extension (has a dot), assume it's complete but missing fish/ prefix
  if (trimmed.includes('.')) {
    return `fish/${trimmed}`;
  }
  
  // Legacy key with no path and no extension -> convert to fish/<key>.webp
  return `fish/${trimmed}.webp`;
}

/**
 * Get a public URL for a catalog asset
 * @param path - The path within storage (e.g., "catalog/scaping/flora/java-fern.webp", "fish/betta.webp", "guppy")
 * @returns Public URL or null if unavailable
 */
export function getCatalogPublicUrl(path?: string | null): string | null {
  if (!SUPABASE_URL || !path) {
    return null;
  }
  
  const normalizedPath = normalizeImageKey(path);
  
  // If normalization returned null (legacy aquascape key), return null
  if (!normalizedPath) {
    return null;
  }
  
  // If path already starts with 'catalog/', use it directly without adding /catalog/ prefix
  if (normalizedPath.startsWith('catalog/')) {
    return `${SUPABASE_URL}/storage/v1/object/public/${normalizedPath}`;
  }
  
  // Otherwise, it's in the catalog bucket
  return `${SUPABASE_URL}/storage/v1/object/public/catalog/${normalizedPath}`;
}


