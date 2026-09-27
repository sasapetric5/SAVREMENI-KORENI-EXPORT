import { Product } from '../types';

export type AdminPublishedState = {
  version: 1;
  updatedAt: string;
  productOverrides: Record<string, Partial<Pick<Product, 'image' | 'images'>>>;
  removedProductIds: string[];
  removedMediaPaths: string[];
};

export const adminPublishedState: AdminPublishedState = {
  version: 1,
  updatedAt: '',
  productOverrides: {},
  removedProductIds: [],
  removedMediaPaths: [],
};
