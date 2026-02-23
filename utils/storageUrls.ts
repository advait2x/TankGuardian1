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
    // Equipment images are stored flat: catalog/equipment/<file>.webp
    // but DB image_key may have category subdirs: catalog/equipment/<category>/<file>.webp
    // Strip the category subdir to match actual storage layout
    const eqMatch = trimmed.match(/^catalog\/equipment\/[^/]+\/(.+)$/);
    if (eqMatch) {
      return `catalog/equipment/${eqMatch[1]}`;
    }
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
    if (__DEV__ && path) {
      console.log('[storageUrls] No SUPABASE_URL configured, cannot generate URL for:', path);
    }
    return null;
  }

  const normalizedPath = normalizeImageKey(path);

  // If normalization returned null (legacy aquascape key), return null
  if (!normalizedPath) {
    if (__DEV__) {
      console.log('[storageUrls] Normalized path is null for:', path);
    }
    return null;
  }

  // If path already starts with 'catalog/', use it directly without adding /catalog/ prefix
  if (normalizedPath.startsWith('catalog/')) {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${normalizedPath}`;
    if (__DEV__ && normalizedPath.includes('equipment')) {
      console.log('[storageUrls] Equipment URL generated:', url);
    }
    return url;
  }

  // Otherwise, it's in the catalog bucket
  const url = `${SUPABASE_URL}/storage/v1/object/public/catalog/${normalizedPath}`;
  if (__DEV__ && normalizedPath.includes('equipment')) {
    console.log('[storageUrls] Equipment URL (with catalog/ prefix):', url);
  }
  return url;
}

/**
 * Alias for getCatalogPublicUrl for backwards compatibility
 */
export function getPublicUrl(path?: string | null): string | null {
  return getCatalogPublicUrl(path);
}

