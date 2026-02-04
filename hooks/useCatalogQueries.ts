import { useQuery } from '@tanstack/react-query';
import { getFishCatalog } from '@/utils/fishCatalogAdapter';
import { getFloraCatalog, FloraItem } from '@/utils/floraCatalogAdapter';
import { getHardscapeCatalog, HardscapeItem } from '@/utils/hardscapeCatalogAdapter';
import { listEquipmentCatalog } from '@/utils/remoteEquipment';
import { adaptEquipmentCatalogList } from '@/utils/equipmentAdapter';
import { FishSpecies, EquipmentCatalogItem } from '@/data/types';
import { fishSpecies as mockFishSpecies } from '@/data/mockData';

// Query keys for cache invalidation
export const catalogKeys = {
  all: ['catalog'] as const,
  fish: (params: FishQueryParams) => ['catalog', 'fish', params] as const,
  flora: (params: FloraQueryParams) => ['catalog', 'flora', params] as const,
  hardscape: (params: HardscapeQueryParams) => ['catalog', 'hardscape', params] as const,
  equipment: (params: EquipmentQueryParams) => ['catalog', 'equipment', params] as const,
};

// Parameter types
interface FishQueryParams {
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
  search?: string;
}

interface FloraQueryParams {
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
  search?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface HardscapeQueryParams {
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
  search?: string;
}

interface EquipmentQueryParams {
  waterType?: 'freshwater' | 'saltwater' | 'both';
  search?: string;
  category?: string;
}

/**
 * Hook to fetch fish catalog with React Query caching
 * - Caches results for 5 minutes (staleTime)
 * - Returns cached data immediately while revalidating in background
 * - Falls back to mock data on error
 */
export function useFishCatalog(params: FishQueryParams = {}) {
  return useQuery({
    queryKey: catalogKeys.fish(params),
    queryFn: async () => {
      const result = await getFishCatalog({
        waterType: params.waterType,
        search: params.search,
      });
      return result;
    },
    placeholderData: mockFishSpecies, // Show mock data while loading
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
  });
}

/**
 * Hook to fetch flora catalog with React Query caching
 */
export function useFloraCatalog(params: FloraQueryParams = {}) {
  return useQuery({
    queryKey: catalogKeys.flora(params),
    queryFn: async () => {
      const result = await getFloraCatalog({
        waterType: params.waterType,
        search: params.search,
        difficulty: params.difficulty,
      });
      return result;
    },
    placeholderData: [] as FloraItem[], // Empty array while loading
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch hardscape catalog with React Query caching
 */
export function useHardscapeCatalog(params: HardscapeQueryParams = {}) {
  return useQuery({
    queryKey: catalogKeys.hardscape(params),
    queryFn: async () => {
      const result = await getHardscapeCatalog({
        waterType: params.waterType,
        search: params.search,
      });
      return result;
    },
    placeholderData: [] as HardscapeItem[], // Empty array while loading
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch equipment catalog with React Query caching
 */
export function useEquipmentCatalog(params: EquipmentQueryParams = {}) {
  return useQuery({
    queryKey: catalogKeys.equipment(params),
    queryFn: async () => {
      console.log('[useEquipmentCatalog] Fetching equipment with params:', params);
      const result = await listEquipmentCatalog({
        waterType: params.waterType,
        search: params.search,
        limit: 100,
      });
      console.log('[useEquipmentCatalog] Result:', result);
      if (result) {
        const adapted = adaptEquipmentCatalogList(result.items);
        console.log('[useEquipmentCatalog] Adapted:', adapted.length, 'items');
        return adapted;
      }
      return [] as EquipmentCatalogItem[];
    },
    placeholderData: [] as EquipmentCatalogItem[], // Empty array while loading
    staleTime: 1000 * 60 * 5,
  });
}
