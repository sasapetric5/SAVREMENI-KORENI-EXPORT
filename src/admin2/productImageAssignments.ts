import type { MediaSlot, ProductImageAssignment } from './types';

export const PRODUCT_IMAGE_ASSIGNMENTS_KEY = 'savremeni_koreni_product_image_assignments_v1';

export type ProductImageAssignmentMap = Record<string, Partial<Record<MediaSlot, ProductImageAssignment>>>;

export function mediaIdFromPath(path: string): string {
  return 'repo:' + path.replace(/^\//, '');
}

export function readProductImageAssignments(): ProductImageAssignmentMap {
  try {
    const raw = localStorage.getItem(PRODUCT_IMAGE_ASSIGNMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProductImageAssignments(value: ProductImageAssignmentMap) {
  localStorage.setItem(PRODUCT_IMAGE_ASSIGNMENTS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('product-image-assignments-updated'));
}

export function makeAssignment(
  productId: string,
  slot: MediaSlot,
  mediaId: string,
  path: string,
  order: number
): ProductImageAssignment {
  return {
    productId,
    slot,
    mediaId,
    path,
  };
}
