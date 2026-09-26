import { permanentProductsData } from '../data/permanentProductsData';
import type { MediaSlot } from './types';
import { PRODUCT_IMAGE_ASSIGNMENTS_KEY, mediaIdFromPath, readProductImageAssignments } from './productImageAssignments';

export type ResolvedProductImages = Record<MediaSlot, string>;

function legacySlots(product: any): ResolvedProductImages {
  return {
    MAIN: product?.image || '',
    G0: product?.images?.[2] || '',
    G1: product?.images?.[1] || '',
    G2: product?.images?.[0] || ''
  };
}

export function resolvePermanentProductImages(productId: string, productOverride?: any): ResolvedProductImages {
  const product = productOverride || (permanentProductsData as any[]).find(p => p.id === productId);
  const legacy = legacySlots(product);
  if (typeof window === 'undefined') return legacy;

  const assignments = readProductImageAssignments();
  const current = assignments[productId];
  if (!current) return legacy;

  return {
    MAIN: current.MAIN?.path || legacy.MAIN,
    G0: current.G0?.path || legacy.G0,
    G1: current.G1?.path || legacy.G1,
    G2: current.G2?.path || legacy.G2
  };
}

export function getProductImagesInDisplayOrder(productId: string, productOverride?: any): string[] {
  const resolved = resolvePermanentProductImages(productId, productOverride);
  return [resolved.MAIN, resolved.G0, resolved.G1, resolved.G2].filter(Boolean);
}

export function buildSeedAssignment(product: any) {
  const resolved = legacySlots(product);
  const slots: MediaSlot[] = ['MAIN','G0','G1','G2'];
  return slots.reduce((acc, slot) => {
    const path = resolved[slot];
    if (path) {
      acc[slot] = {
        productId: product.id,
        slot,
        mediaId: mediaIdFromPath(path),
        path
      };
    }
    return acc;
  }, {} as Record<MediaSlot, { productId: string; slot: MediaSlot; mediaId: string; path: string }>);
}

export function hasPublishedLocalAssignment(productId: string): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(PRODUCT_IMAGE_ASSIGNMENTS_KEY);
  return Boolean(raw && readProductImageAssignments()[productId]);
}
