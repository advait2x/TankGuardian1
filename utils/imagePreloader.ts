/**
 * Image Preloader Utility
 * Prefetches all catalog images on app startup for faster loading
 */

import { Image } from 'expo-image';
import { getCatalogPublicUrl } from './storageUrls';
import { listFishSpecies } from './remoteFishCatalog';
import { getFloraCatalog } from './floraCatalogAdapter';
import { getHardscapeCatalog } from './hardscapeCatalogAdapter';

let preloadStarted = false;
let preloadedCount = 0;
let totalImages = 0;

/**
 * Prefetch a single image URL using expo-image
 * Returns the URL if failed, null if successful
 */
async function prefetchImage(url: string): Promise<string | null> {
  try {
    await Image.prefetch(url);
    return null; // Success
  } catch {
    // Return the URL that failed
    return url;
  }
}

/**
 * Preload all catalog images in the background
 * This runs asynchronously and doesn't block the app
 */
export async function preloadCatalogImages(): Promise<void> {
  // Prevent multiple preload attempts
  if (preloadStarted) {
    return;
  }
  preloadStarted = true;

  console.log('[ImagePreloader] Starting catalog image preload...');
  const startTime = Date.now();

  try {
    // Fetch all catalog data in parallel
    const [fishResult, floraItems, hardscapeItems] = await Promise.all([
      listFishSpecies({ limit: 200 }), // Get all fish
      getFloraCatalog(), // Get all plants/corals
      getHardscapeCatalog(), // Get all decor
    ]);

    // Collect all image keys
    const imageKeys: string[] = [];

    // Fish images
    if (fishResult?.items) {
      fishResult.items.forEach(fish => {
        if (fish.image_key) {
          imageKeys.push(fish.image_key);
        }
      });
      console.log(`[ImagePreloader] Found ${fishResult.items.length} fish, ${fishResult.items.filter(f => f.image_key).length} with images`);
    }

    // Flora images
    const floraWithImages = floraItems.filter(f => f.imageKey);
    floraItems.forEach(flora => {
      if (flora.imageKey) {
        imageKeys.push(flora.imageKey);
      }
    });
    console.log(`[ImagePreloader] Found ${floraItems.length} flora, ${floraWithImages.length} with images`);
    if (floraWithImages.length > 0) {
      console.log(`[ImagePreloader] Sample flora imageKey: ${floraWithImages[0].imageKey}`);
    }

    // Hardscape images
    const hardscapeWithImages = hardscapeItems.filter(h => h.imageKey);
    hardscapeItems.forEach(item => {
      if (item.imageKey) {
        imageKeys.push(item.imageKey);
      }
    });
    console.log(`[ImagePreloader] Found ${hardscapeItems.length} hardscape, ${hardscapeWithImages.length} with images`);
    if (hardscapeWithImages.length > 0) {
      console.log(`[ImagePreloader] Sample hardscape imageKey: ${hardscapeWithImages[0].imageKey}`);
    }

    // Convert to URLs and filter out nulls
    const imageUrls = imageKeys
      .map(key => getCatalogPublicUrl(key))
      .filter((url): url is string => url !== null);
    
    // Log how many were filtered out
    const filteredOut = imageKeys.length - imageUrls.length;
    if (filteredOut > 0) {
      console.log(`[ImagePreloader] ${filteredOut} image keys were filtered out (legacy keys)`);
    }

    totalImages = imageUrls.length;
    console.log(`[ImagePreloader] Preloading ${totalImages} images...`);

    // Prefetch all images in batches to avoid overwhelming the network
    const BATCH_SIZE = 10;
    const failedUrls: string[] = [];
    
    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(prefetchImage));
      
      // Collect failed URLs (non-null results)
      results.forEach(result => {
        if (result === null) {
          preloadedCount++;
        } else {
          failedUrls.push(result);
        }
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[ImagePreloader] Completed: ${preloadedCount}/${totalImages} images in ${duration}s`);
    
    // Log failed images for debugging
    if (failedUrls.length > 0) {
      console.log(`[ImagePreloader] ❌ ${failedUrls.length} images failed to load:`);
      failedUrls.forEach(url => {
        // Extract just the filename from the URL for cleaner logs
        const filename = url.split('/').pop() || url;
        console.log(`  - ${filename}`);
      });
    }
  } catch (error) {
    console.warn('[ImagePreloader] Error during preload:', error);
  }
}

/**
 * Get preload status (for debugging/UI)
 */
export function getPreloadStatus(): { started: boolean; loaded: number; total: number } {
  return {
    started: preloadStarted,
    loaded: preloadedCount,
    total: totalImages,
  };
}
