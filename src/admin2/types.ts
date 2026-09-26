export type MediaSlot = 'MAIN' | 'G0' | 'G1' | 'G2';

export type MediaUsageTarget =
  | 'product'
  | 'gallery'
  | 'homepage'
  | 'blog'
  | 'landing';

export type MediaSource = 'repository' | 'upload';

export interface MediaVariant {
  id: string;
  path: string;
  format: 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif' | 'svg' | 'gif';
  width?: number;
  height?: number;
  byteSize?: number;
  purpose: 'original' | 'optimized' | 'thumbnail' | 'responsive';
}

export interface MediaAsset {
  id: string;
  path: string;
  filename: string;
  mimeType?: string;
  width?: number;
  height?: number;
  byteSize?: number;
  altSr?: string;
  altEn?: string;
  titleSr?: string;
  titleEn?: string;
  descriptionSr?: string;
  descriptionEn?: string;
  createdAt?: string;
  updatedAt?: string;
  source: MediaSource;
  originalAssetId?: string;
  immutableOriginal: boolean;
  sitePublished: boolean;
  variants?: MediaVariant[];
}

export interface MediaAssignment {
  id: string;
  mediaId: string;
  target: MediaUsageTarget;
  targetId: string;
  role: string;
  order: number;
  enabled: boolean;
}

export interface ProductImageAssignment {
  productId: string;
  slot: MediaSlot;
  mediaId: string;
  path: string;
}

export interface AdminValidationResult {
  ok: boolean;
  products: number;
  media: number;
  missingPaths: string[];
  duplicateMainProductIds: string[];
  errors: string[];
  warnings: string[];
}
