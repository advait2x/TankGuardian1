import { FishSpecies } from '@/data/types';
import { fishSpecies as mockFishSpecies } from '@/data/mockData';
import { getFishCatalog } from './fishCatalogAdapter';
import { normalizeSpeciesSlug, deriveSlugFromFishInstance } from './slugifySpecies';

// In-memory cache for species catalog
let catalogCache: FishSpecies[] | null = null;
let cachePromise: Promise<FishSpecies[]> | null = null;
const warnedSlugs = new Set<string>();

/**
 * Load and cache the enriched fish catalog
 * Merges remote catalog data (with image_key) into mock data
 */
async function loadCatalog(): Promise<FishSpecies[]> {
  if (catalogCache) {
    return catalogCache;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    try {
      const remoteCatalog = await getFishCatalog({ limit: 100 });
      
      // Start with all remote catalog entries
      const remoteMap = new Map<string, FishSpecies>();
      remoteCatalog.forEach(rf => {
        const normalizedSlug = normalizeSpeciesSlug(rf.id);
        if (normalizedSlug) {
          remoteMap.set(normalizedSlug, rf);
        }
      });
      
      // Merge mock data: prefer remote if exists, otherwise use mock
      const enriched = mockFishSpecies.map(mockFish => {
        const normalizedSlug = normalizeSpeciesSlug(mockFish.id);
        const remoteFish = normalizedSlug ? remoteMap.get(normalizedSlug) : null;
        
        if (remoteFish) {
          // Use remote data but keep mock data as fallback for missing fields
          remoteMap.delete(normalizedSlug); // Remove from map so we don't duplicate
          return remoteFish;
        }
        
        return mockFish;
      });
      
      // Add any remote species that weren't in mock data
      const additionalRemote = Array.from(remoteMap.values());
      const combined = [...enriched, ...additionalRemote];
      
      catalogCache = combined;
      console.log(`[SpeciesLookup] Loaded ${combined.length} species (${enriched.length} from mock, ${additionalRemote.length} additional from remote)`);
      return combined;
    } catch (error) {
      // Fall back to mock data if remote fails
      console.warn('[SpeciesLookup] Remote catalog failed, using mock data only:', error);
      catalogCache = mockFishSpecies;
      return mockFishSpecies;
    }
  })();

  return cachePromise;
}

/**
 * Get fish species by slug (normalized lookup)
 * Returns null if not found
 * 
 * @param slug - Species identifier (slug, name, or any format)
 * @param fishInstance - Optional full fish instance for better error messages
 */
export async function getSpeciesBySlug(
  slug: string | null | undefined,
  fishInstance?: any
): Promise<FishSpecies | null> {
  if (!slug) {
    // Try to derive slug from fish instance if provided
    if (fishInstance) {
      const derivedSlug = deriveSlugFromFishInstance(fishInstance);
      if (derivedSlug) {
        return getSpeciesBySlug(derivedSlug);
      }
    }
    return null;
  }

  const catalog = await loadCatalog();
  const normalizedSlug = normalizeSpeciesSlug(slug);
  
  if (!normalizedSlug) {
    return null;
  }
  
  const species = catalog.find(s => normalizeSpeciesSlug(s.id) === normalizedSlug);
  
  // Dev-only warning for unmapped species (warn once per slug)
  if (__DEV__ && !species && !warnedSlugs.has(slug)) {
    const debugInfo = fishInstance 
      ? `slug="${slug}" normalized="${normalizedSlug}" name="${fishInstance.name || fishInstance.commonName || 'N/A'}" id="${fishInstance.id || fishInstance.instanceId || 'N/A'}"`
      : `slug="${slug}" normalized="${normalizedSlug}"`;
    
    console.warn(`[SpeciesLookup] Unresolved: ${debugInfo}`);
    warnedSlugs.add(slug);
  }
  
  return species || null;
}

/**
 * Synchronous lookup from cache (returns null if cache not loaded)
 * Use this only after loadCatalog has been called
 * 
 * @param slug - Species identifier (slug, name, or any format)
 * @param fishInstance - Optional full fish instance for deriving slug
 */
export function getSpeciesBySlugSync(
  slug: string | null | undefined,
  fishInstance?: any
): FishSpecies | null {
  if (!slug && fishInstance) {
    // Try to derive slug from fish instance
    const derivedSlug = deriveSlugFromFishInstance(fishInstance);
    if (derivedSlug) {
      slug = derivedSlug;
    }
  }

  if (!slug || !catalogCache) {
    return null;
  }

  const normalizedSlug = normalizeSpeciesSlug(slug);
  
  if (!normalizedSlug) {
    return null;
  }
  
  const species = catalogCache.find(s => normalizeSpeciesSlug(s.id) === normalizedSlug);
  
  // Dev-only warning for unmapped species (warn once per slug)
  if (__DEV__ && !species && !warnedSlugs.has(slug)) {
    const debugInfo = fishInstance 
      ? `slug="${slug}" normalized="${normalizedSlug}" name="${fishInstance.name || fishInstance.nickname || 'N/A'}" id="${fishInstance.instanceId || 'N/A'}"`
      : `slug="${slug}" normalized="${normalizedSlug}"`;
    
    console.warn(`[SpeciesLookup] Unresolved: ${debugInfo}`);
    warnedSlugs.add(slug);
  }
  
  return species || null;
}

/**
 * Preload the catalog (call on app mount)
 */
export function preloadCatalog(): void {
  loadCatalog().catch(() => {
    // Silently fail - will fall back to mock data
  });
}

