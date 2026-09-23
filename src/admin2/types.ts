export type MediaSlot = 'MAIN' | 'G0' | 'G1' | 'G2';

export interface MediaAsset {
  id: string;
  path: string;
  filename: string;
  mimeType?: string;
  width?: number;
  height?: number;
  altSr?: string;
  altEn?: string;
  createdAt?: string;
  source: 'repository' | 'upload';
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
