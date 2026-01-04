import { FishSpecies, Temperament, Diet, Difficulty } from '@/data/types';
import { fishSpecies as mockFishSpecies } from '@/data/mockData';
import { listFishSpecies, RemoteFishSpecies, getCompatibility } from './remoteFishCatalog';
import { USE_REMOTE_CATALOG } from './config';

/**
 * Map remote fish data to the local FishSpecies format
 */
function mapRemoteToLocal(remote: RemoteFishSpecies): FishSpecies {
  return {
    id: remote.slug || remote.id, // Use slug as ID for consistency
    commonName: remote.common_name,
    scientificName: remote.scientific_name,
    waterType: remote.water_type, // Include water type from DB
    adultSizeInches: remote.adult_size_inches,
    minTankGallons: remote.min_tank_gallons,
    temperament: remote.temperament as Temperament,
    schooling: false, // Default, could be added to DB later
    recommendedGroupSize: 1, // Default
    diet: remote.diet as Diet,
    difficulty: remote.care_level as Difficulty,
    compatibilityTags: [], // Could be added to DB later
    careNotes: '', // Could be added to DB later
    modelKey: remote.slug || remote.id,
    imageUrl: remote.image_key ? `https://placeholder.co/400?text=${encodeURIComponent(remote.common_name)}` : '',
    color: '#0D7377', // Default color
    image_key: remote.image_key ?? null,
  };
}

/**
 * Fetch fish species with automatic fallback to mock data
 */
export async function getFishCatalog(params: {
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
  search?: string;
} = {}): Promise<FishSpecies[]> {
  // If remote catalog is disabled, use mock data
  if (!USE_REMOTE_CATALOG) {
    return filterMockData(mockFishSpecies, params);
  }

  try {
    // Try to fetch from Supabase
    const result = await listFishSpecies({
      waterType: params.waterType,
      search: params.search,
      limit: 100, // Reasonable limit for catalog
    });

    // If remote fetch succeeded and has data, use it
    if (result && result.items.length > 0) {
      return result.items.map(mapRemoteToLocal);
    }

    // If remote returned empty or null, fall back to mock data
    console.warn('[FishCatalog] Using fallback mock data');
    return filterMockData(mockFishSpecies, params);
  } catch (err) {
    console.warn('[FishCatalog] Exception, using fallback:', err);
    return filterMockData(mockFishSpecies, params);
  }
}

/**
 * Filter mock data based on params (for fallback mode)
 */
function filterMockData(
  fish: FishSpecies[],
  params: { waterType?: string; search?: string }
): FishSpecies[] {
  let filtered = [...fish];

  // Filter by water type if specified
  if (params.waterType) {
    filtered = filtered.filter(f => f.waterType === params.waterType);
    
    if (__DEV__) {
      console.log(`[FishCatalog] Mock fallback filtered by waterType="${params.waterType}": ${filtered.length} results`);
    }
  }

  // Filter by search query
  if (params.search) {
    const query = params.search.toLowerCase();
    filtered = filtered.filter(
      f =>
        f.commonName.toLowerCase().includes(query) ||
        f.scientificName.toLowerCase().includes(query)
    );
  }

  // Ensure mock data has image_key explicitly set to null
  return filtered.map(f => ({
    ...f,
    image_key: f.image_key ?? null,
  }));
}

/**
 * Check compatibility between two species
 * Uses remote data if available, falls back to simple logic
 */
export async function checkFishCompatibility(
  speciesIdA: string,
  speciesIdB: string
): Promise<{ level: 'compatible' | 'caution' | 'incompatible'; notes?: string }> {
  if (!USE_REMOTE_CATALOG) {
    return { level: 'compatible' }; // Fallback to permissive
  }

  try {
    const result = await getCompatibility(speciesIdA, speciesIdB);
    if (result) {
      return result;
    }
  } catch (err) {
    console.warn('[FishCatalog] Compatibility check failed:', err);
  }

  // Fallback: assume compatible
  return { level: 'compatible' };
}

