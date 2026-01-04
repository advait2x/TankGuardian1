import { Tank } from '@/data/types';
import { normalizeSpeciesSlug, deriveSlugFromFishInstance } from './slugifySpecies';

/**
 * In-memory migration to fix tank fish instances
 * Ensures all fish have valid species_slug populated
 * Runs on every app boot but only processes fish that need fixing
 * 
 * @param tanks - Current tanks array
 * @returns Updated tanks array with normalized species_slug
 */
export function migrateSpeciesSlugs(tanks: Tank[]): Tank[] {
  try {
    let changesMade = false;
    const updatedTanks = tanks.map(tank => {
      const updatedFishInstances = tank.fishInstances.map(fish => {
        const currentSlug = fish.speciesId;
        const normalizedCurrent = normalizeSpeciesSlug(currentSlug);
        
        // Check if slug needs fixing (missing, invalid, or "unknown")
        if (!normalizedCurrent || normalizedCurrent === 'unknown') {
          // Try to derive a valid slug from any available field
          const derivedSlug = deriveSlugFromFishInstance(fish);
          
          if (derivedSlug && derivedSlug !== normalizedCurrent) {
            changesMade = true;
            
            if (__DEV__) {
              console.log(
                `[Migration] Fixed fish: "${currentSlug}" -> "${derivedSlug}"`
              );
            }
            
            // Update speciesId with the derived slug
            return {
              ...fish,
              speciesId: derivedSlug,
            };
          }
        } else if (normalizedCurrent !== currentSlug) {
          // Slug is valid but not normalized - normalize it
          changesMade = true;
          
          if (__DEV__) {
            console.log(
              `[Migration] Normalized fish: "${currentSlug}" -> "${normalizedCurrent}"`
            );
          }
          
          return {
            ...fish,
            speciesId: normalizedCurrent,
          };
        }
        
        return fish;
      });

      if (changesMade) {
        return {
          ...tank,
          fishInstances: updatedFishInstances,
        };
      }
      
      return tank;
    });
    
    if (__DEV__ && changesMade) {
      console.log('[Migration] Species slug normalization completed');
    }

    return updatedTanks;
  } catch (error) {
    // Silently fail - don't break app startup
    if (__DEV__) {
      console.warn('[Migration] Species slug migration failed:', error);
    }
    return tanks;
  }
}

