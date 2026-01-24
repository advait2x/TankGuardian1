/**
 * aquascapeLayout.ts
 * 
 * Single source of truth for aquascape layout coordinate mapping.
 * Handles normalization and transformation between design canvas and display containers.
 */

import { AquascapeLayout, AquascapeLayoutItem } from './aquascapeRemote';

// ===== Numeric Sanitizers =====
function num(value: any, fallback: number): number {
  const v = typeof value === 'number' ? value : parseFloat(value);
  return isFinite(v) ? v : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ===== Layout Normalization =====

/**
 * Normalizes layout data from Supabase.
 * - Converts string numbers to actual numbers
 * - Applies safe defaults for missing/invalid values
 * - Ensures zoom is never 0 (minimum 0.1)
 * - Logs items with invalid values for debugging
 */
export function normalizeLayout(
  layout: any,
  defaultCanvasW: number,
  defaultCanvasH: number
): AquascapeLayout {
  // Normalize canvas
  const canvas = layout?.canvas || {};
  const normalizedCanvas = {
    w: num(canvas.w, defaultCanvasW),
    h: num(canvas.h, defaultCanvasH),
    zoom: clamp(num(canvas.zoom, 1), 0.1, 10), // Never allow 0 zoom
    panX: num(canvas.panX, 0),
    panY: num(canvas.panY, 0),
    groundY: num(canvas.groundY, defaultCanvasH * 0.85), // Deprecated, kept for backward compat
    substrate: {
      type: canvas.substrate?.type || 'sand',
      heightPct: clamp(num(canvas.substrate?.heightPct, 0.16), 0.05, 0.4), // 5% - 40%
    },
  };

  // Normalize items
  const items = Array.isArray(layout?.items) ? layout.items : [];
  const normalizedItems = items.map((item: any) => {
    const x = num(item.x, 0);
    const y = num(item.y, 0);
    const scale = num(item.scale, 1);
    const rotation = num(item.rotation, 0);
    const z = num(item.z, 0);

    // Log if any value was invalid
    if (!isFinite(item.x) || !isFinite(item.y) || !isFinite(item.scale) || !isFinite(item.rotation) || !isFinite(item.z)) {
      console.log('[AquascapeLayout NaN]', {
        itemId: item.id,
        x,
        y,
        scale,
        rotation,
        z,
        rawItem: item,
      });
    }

    return {
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      type: item.type || 'rock',
      assetKey: item.assetKey || 'rock-1',
      catalogItemSlug: item.catalogItemSlug,
      catalogItemType: item.catalogItemType,
      x,
      y,
      scale,
      rotation,
      z,
    };
  });

  return {
    canvas: normalizedCanvas,
    items: normalizedItems,
  };
}

// ===== Container Mapping =====

export interface MappedLayoutItem {
  id: string;
  type: string;
  assetKey: string;
  catalogItemSlug?: string;
  catalogItemType?: 'flora' | 'hardscape';
  pixelX: number;
  pixelY: number;
  pixelScale: number;
  rotation: number;
  z: number;
}

export interface MappedLayout {
  items: MappedLayoutItem[];
  scaleFactor: number;
  canvasW: number;
  canvasH: number;
  containerW: number;
  containerH: number;
}

/**
 * Maps layout from design canvas coordinates to container pixel coordinates.
 * Uses percentage-based positioning to prevent left-piling across different device sizes.
 * 
 * @param layout - Normalized layout from database
 * @param containerW - Container width in pixels
 * @param containerH - Container height in pixels
 * @param baseDecorSize - Base size of decor in pixels (default 40 to match existing decor)
 * @returns Mapped layout with pixel positions and scales
 */
export function mapLayoutToContainer(
  layout: AquascapeLayout,
  containerW: number,
  containerH: number,
  baseDecorSize: number = 40
): MappedLayout {
  const canvasW = num(layout.canvas.w, 1);
  const canvasH = num(layout.canvas.h, 1);
  const substrateHeightPct = num(layout.canvas.substrate?.heightPct, 0.16);
  
  // Compute substrate top position (where items sit)
  const substrateTop = containerH * (1 - substrateHeightPct);

  // Validate dimensions
  if (!isFinite(canvasW) || canvasW <= 0) {
    console.warn('[AquascapeLayout] Invalid canvasW:', canvasW, '- using fallback 1');
  }
  if (!isFinite(containerW) || containerW <= 0) {
    console.warn('[AquascapeLayout] Invalid containerW:', containerW);
  }

  console.log('[AquascapeLayout] Mapping:', {
    canvasW: canvasW.toFixed(1),
    canvasH: canvasH.toFixed(1),
    substrate: layout.canvas.substrate?.type || 'sand',
    substrateHeightPct: (substrateHeightPct * 100).toFixed(1) + '%',
    containerW: containerW.toFixed(1),
    containerH: containerH.toFixed(1),
    substrateTop: substrateTop.toFixed(1),
    baseDecorSize,
  });

  // Map items to container coordinates
  const mappedItems: MappedLayoutItem[] = layout.items.map((item, index) => {
    // Position as percentage of canvas (prevents left-piling)
    const xPercent = num(item.x, 0) / canvasW;
    const yPercent = num(item.y, 0) / canvasH;
    const px = xPercent * containerW;
    const py = yPercent * containerH;

    // Size: base decor size * item's scale (no container scaling)
    const itemScale = num(item.scale, 1);
    const size = baseDecorSize * itemScale;

    // Clamp within container bounds
    const clampedPx = clamp(px, 0, Math.max(0, containerW - size));
    const clampedPy = clamp(py, 0, Math.max(0, containerH - size));

    // Validate all values
    if (!isFinite(clampedPx) || !isFinite(clampedPy) || !isFinite(size)) {
      console.error('[AquascapeLayout] NaN detected in mapping:', {
        itemId: item.id,
        px: clampedPx,
        py: clampedPy,
        size,
        rawItem: item,
      });
    }

    const mapped = {
      id: item.id,
      type: item.type,
      assetKey: item.assetKey,
      catalogItemSlug: item.catalogItemSlug,
      catalogItemType: item.catalogItemType,
      pixelX: clampedPx,
      pixelY: clampedPy,
      pixelScale: itemScale, // Keep original scale, don't multiply by container scale
      rotation: num(item.rotation, 0),
      z: num(item.z, 0),
    };

    // Log first 3 items for debugging
    if (index < 3) {
      console.log(`[AquascapeLayout] Item ${index + 1}:`, {
        id: item.id.slice(0, 8),
        original: { x: item.x.toFixed(1), y: item.y.toFixed(1), xPercent: (xPercent * 100).toFixed(1) + '%', yPercent: (yPercent * 100).toFixed(1) + '%', scale: item.scale },
        mapped: { px: clampedPx.toFixed(1), py: clampedPy.toFixed(1), size: size.toFixed(1) },
      });
    }

    return mapped;
  });

  return {
    items: mappedItems,
    scaleFactor: 1, // No longer using a scale factor, using percentage-based positioning
    canvasW,
    canvasH,
    containerW,
    containerH,
  };
}

// ===== Asset Registry =====

export interface AssetInfo {
  emoji: string;
  label: string;
  baseSize?: number;
}

export const ASSET_REGISTRY: Record<string, AssetInfo> = {
  'rock-1': { emoji: '🪨', label: 'Rock', baseSize: 40 },
  'wood-1': { emoji: '🪵', label: 'Wood', baseSize: 40 },
  'plant-1': { emoji: '🌿', label: 'Plant', baseSize: 40 },
};

export function getAsset(assetKey: string): AssetInfo {
  return ASSET_REGISTRY[assetKey] || { emoji: '🔷', label: 'Unknown', baseSize: 40 };
}
