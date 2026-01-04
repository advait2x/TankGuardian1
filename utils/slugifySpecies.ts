/**
 * Robust species slug normalization and alias mapping
 * Handles various input formats: common names, camelCase, hyphenated, etc.
 */

// Common aliases for species that might be stored under different names
const SPECIES_ALIASES: Record<string, string> = {
  'angelfish': 'freshwater_angelfish',
  'angel_fish': 'freshwater_angelfish',
  'ramirezi': 'german_blue_ram',
  'ram_cichlid': 'german_blue_ram',
  'ocellaris_clown': 'ocellaris_clownfish',
  'clown_fish': 'ocellaris_clownfish',
  'clownfish': 'ocellaris_clownfish',
  'neon': 'neon_tetra',
  'cory': 'corydoras',
  'cory_catfish': 'corydoras',
  'plecostomus': 'pleco',
  'common_pleco': 'pleco',
  'common_plecostomus': 'pleco',
  'mystery': 'mystery_snail',
  'apple_snail': 'mystery_snail',
  'red_tailed_catfish': 'red_tailed_catfish',
  'rtc': 'red_tailed_catfish',
  'oscar': 'oscar_cichlid',
  'oscar_cichlid': 'oscar_cichlid',
  'astronotus_ocellatus': 'oscar_cichlid',
};

/**
 * Split camelCase string into words
 * Examples:
 *   "neonTetra" -> "neon Tetra"
 *   "freshwaterAngelfish" -> "freshwater Angelfish"
 */
function splitCamelCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * Normalize any species identifier into a valid slug format
 * 
 * @param input - Any species identifier (name, slug, camelCase, etc.)
 * @returns Normalized slug or null if invalid
 * 
 * Examples:
 *   "Neon Tetra" -> "neon_tetra"
 *   "neonTetra" -> "neon_tetra"
 *   "Freshwater Angelfish" -> "freshwater_angelfish"
 *   "  betta  " -> "betta"
 *   "Red-tailed Catfish" -> "red_tailed_catfish"
 *   null -> null
 */
export function normalizeSpeciesSlug(input: unknown): string | null {
  // Reject non-string inputs
  if (typeof input !== 'string') {
    return null;
  }

  // Trim whitespace
  let normalized = input.trim();
  
  if (!normalized) {
    return null;
  }

  // Split camelCase before processing
  normalized = splitCamelCase(normalized);

  // Lowercase
  normalized = normalized.toLowerCase();

  // Replace ampersand with 'and'
  normalized = normalized.replace(/&/g, 'and');

  // Replace any non-alphanumeric characters with underscores
  normalized = normalized.replace(/[^a-z0-9]+/g, '_');

  // Collapse multiple underscores
  normalized = normalized.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  normalized = normalized.replace(/^_|_$/g, '');

  if (!normalized) {
    return null;
  }

  // Apply alias mapping
  if (SPECIES_ALIASES[normalized]) {
    return SPECIES_ALIASES[normalized];
  }

  return normalized;
}

/**
 * Try multiple fields to derive a species slug from a fish instance
 * 
 * @param fishInstance - Any object that might contain species identifiers
 * @returns Best guess slug or null
 */
export function deriveSlugFromFishInstance(fishInstance: any): string | null {
  // Try common field names in order of preference
  const candidateFields = [
    'species_slug',
    'speciesSlug',
    'speciesId',
    'species_id',
    'species',
    'slug',
    'id',
    'commonName',
    'common_name',
    'name',
    'label',
  ];

  for (const field of candidateFields) {
    const value = fishInstance[field];
    if (value) {
      const normalized = normalizeSpeciesSlug(value);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

/**
 * Add a new alias mapping (useful for app-specific overrides)
 */
export function addSpeciesAlias(from: string, to: string): void {
  const normalizedFrom = normalizeSpeciesSlug(from);
  if (normalizedFrom) {
    SPECIES_ALIASES[normalizedFrom] = to;
  }
}

