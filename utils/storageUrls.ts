/**
 * Safe helper to generate public URLs for Supabase Storage assets
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/**
 * Normalize image_key to handle legacy formats
 * - 'fish/betta.webp' -> 'fish/betta.webp' (unchanged)
 * - 'fish/betta.png' -> 'fish/betta.png' (unchanged)
 * - 'guppy' -> 'fish/guppy.webp' (legacy key upgrade)
 */
function normalizeImageKey(path: string): string {
  const trimmed = path.trim();
  
  // If already has a path separator, keep as-is
  if (trimmed.includes('/')) {
    return trimmed;
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
 * @param path - The path within the catalog bucket (e.g., "fish/betta.webp", "guppy")
 * @returns Public URL or null if unavailable
 */
export function getCatalogPublicUrl(path?: string | null): string | null {
  if (!SUPABASE_URL || !path) {
    return null;
  }
  
  const normalizedPath = normalizeImageKey(path);
  return `${SUPABASE_URL}/storage/v1/object/public/catalog/${normalizedPath}`;
}


