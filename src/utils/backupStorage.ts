import { Product, GalleryPhoto } from '../types';
import { loadCustomProductsFromStorage, saveCustomProductsToStorage } from './customProductStorage';
import { loadPhotosFromStorage, savePhotosToStorage } from './photoStorage';
import { syncCustomProductsToSupabase, syncGalleryPhotosToSupabase, isSupabaseConfigured } from '../lib/supabase';

export interface FullBackupData {
  version: number;
  exportedAt: string;
  source: string;
  customProducts: Product[];
  galleryPhotos: GalleryPhoto[];
  stats: {
    productsCount: number;
    photosCount: number;
  };
}

/**
 * Generates and triggers download of a JSON backup containing all custom products and gallery photos
 */
export async function downloadFullBackup(): Promise<{ success: boolean; filename?: string; count?: { products: number; photos: number } }> {
  try {
    const [products, photos] = await Promise.all([
      loadCustomProductsFromStorage(),
      loadPhotosFromStorage(),
    ]);

    const backupData: FullBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: 'Savremeni Koreni - Atelje Tanja Petrić',
      customProducts: products || [],
      galleryPhotos: photos || [],
      stats: {
        productsCount: (products || []).length,
        photosCount: (photos || []).length,
      },
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `savremeni_koreni_backup_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      filename,
      count: {
        products: backupData.stats.productsCount,
        photos: backupData.stats.photosCount,
      },
    };
  } catch (err) {
    console.error('Failed to export backup:', err);
    return { success: false };
  }
}

/**
 * Restores custom products and gallery photos from a backup JSON file or string
 */
export async function restoreFromBackupData(data: FullBackupData): Promise<{
  success: boolean;
  restoredProducts: number;
  restoredPhotos: number;
  error?: string;
}> {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Nevažeći format rezervne kopije.');
    }

    const products = Array.isArray(data.customProducts) ? data.customProducts : [];
    const photos = Array.isArray(data.galleryPhotos) ? data.galleryPhotos : [];

    if (products.length === 0 && photos.length === 0) {
      throw new Error('Rezervna kopija ne sadrži podatke.');
    }

    // Save to local IndexedDB
    if (products.length > 0) {
      await saveCustomProductsToStorage(products);
    }
    if (photos.length > 0) {
      await savePhotosToStorage(photos);
    }

    // If Supabase is configured, also push to Supabase
    if (isSupabaseConfigured) {
      if (products.length > 0) {
        await syncCustomProductsToSupabase(products).catch(console.warn);
      }
      if (photos.length > 0) {
        await syncGalleryPhotosToSupabase(photos).catch(console.warn);
      }
    }

    return {
      success: true,
      restoredProducts: products.length,
      restoredPhotos: photos.length,
    };
  } catch (err: any) {
    console.error('Failed to restore backup:', err);
    return {
      success: false,
      restoredProducts: 0,
      restoredPhotos: 0,
      error: err.message || 'Greška pri vraćanju rezervne kopije',
    };
  }
}
