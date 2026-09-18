import React, { useEffect, useState } from 'react';
import { loadCustomProductsFromStorage } from '../utils/customProductStorage';
import { loadPhotosFromStorage } from '../utils/photoStorage';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export interface PersistenceResult {
  success: boolean;
  savedProductsCount?: number;
  savedPhotosCount?: number;
  imagesSavedOnDisk?: number;
  message?: string;
  error?: string;
}

/**
 * Imperatively triggers a complete synchronization of the user's browser database (IndexedDB)
 * into the physical files of the GitHub repository (data/ and public/custom_products/)
 * Sends data in safe sequential chunks to avoid HTTP 413 (Request Entity Too Large) limits.
 */
export async function triggerPermanentProjectPersistence(
  onProgress?: (progressText: string) => void
): Promise<PersistenceResult> {
  try {
    const [products, photos] = await Promise.all([
      loadCustomProductsFromStorage(),
      loadPhotosFromStorage(),
    ]);

    const hasData = (products && products.length > 0) || (photos && photos.length > 0);
    if (!hasData) {
      return {
        success: false,
        message: 'Nema pronađenih prilagođenih proizvoda ili fotografija u pretraživaču za upis.',
      };
    }

    const allProducts = products || [];
    const allPhotos = photos || [];

    let totalSavedProducts = 0;
    let totalSavedPhotos = 0;
    let totalImagesSavedOnDisk = 0;

    // 1. Process products in small batches of 3 so base64 payloads never exceed Cloud Run's 32MB limit (each chunk ~1-3MB)
    const PRODUCT_CHUNK_SIZE = 3;
    const totalProductBatches = Math.ceil(allProducts.length / PRODUCT_CHUNK_SIZE);

    for (let i = 0; i < allProducts.length; i += PRODUCT_CHUNK_SIZE) {
      const currentBatch = Math.floor(i / PRODUCT_CHUNK_SIZE) + 1;
      const chunk = allProducts.slice(i, i + PRODUCT_CHUNK_SIZE);
      const progressMsg = `Upisivanje proizvoda (${currentBatch}/${totalProductBatches}): ${Math.min(i + PRODUCT_CHUNK_SIZE, allProducts.length)}/${allProducts.length}...`;
      if (onProgress) onProgress(progressMsg);

      const res = await fetch('/api/persist-browser-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: chunk,
          photos: [],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server greška pri upisu proizvoda (${res.status}): ${errText.substring(0, 150)}`);
      }

      const data = await res.json();
      totalSavedProducts = data.savedProductsCount ?? totalSavedProducts;
      totalSavedPhotos = data.savedPhotosCount ?? totalSavedPhotos;
      totalImagesSavedOnDisk += (data.imagesSavedOnDisk ?? 0);
    }

    // 2. Process photos in small batches:
    // Photos with base64 dataUri are heavy -> send 3 per chunk.
    // Photos with standard URLs (/custom_products/...) are light -> send 25 per chunk.
    const base64Photos = allPhotos.filter(p => p.imageUrl?.startsWith('data:image/'));
    const urlPhotos = allPhotos.filter(p => !p.imageUrl?.startsWith('data:image/'));

    // 2a. Send base64 photos in batches of 3
    const PHOTO_BASE64_CHUNK = 3;
    const totalBase64Batches = Math.ceil(base64Photos.length / PHOTO_BASE64_CHUNK);
    for (let i = 0; i < base64Photos.length; i += PHOTO_BASE64_CHUNK) {
      const currentBatch = Math.floor(i / PHOTO_BASE64_CHUNK) + 1;
      const chunk = base64Photos.slice(i, i + PHOTO_BASE64_CHUNK);
      const progressMsg = `Optimizacija i upis novih slika (${currentBatch}/${totalBase64Batches}): ${Math.min(i + PHOTO_BASE64_CHUNK, base64Photos.length)}/${base64Photos.length}...`;
      if (onProgress) onProgress(progressMsg);

      const res = await fetch('/api/persist-browser-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [],
          photos: chunk,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server greška pri upisu fotografija (${res.status}): ${errText.substring(0, 150)}`);
      }

      const data = await res.json();
      totalSavedProducts = data.savedProductsCount ?? totalSavedProducts;
      totalSavedPhotos = data.savedPhotosCount ?? totalSavedPhotos;
      totalImagesSavedOnDisk += (data.imagesSavedOnDisk ?? 0);
    }

    // 2b. Send existing url-based photos in larger batches (e.g. 25 per chunk)
    const PHOTO_URL_CHUNK = 25;
    for (let i = 0; i < urlPhotos.length; i += PHOTO_URL_CHUNK) {
      const chunk = urlPhotos.slice(i, i + PHOTO_URL_CHUNK);
      const res = await fetch('/api/persist-browser-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [],
          photos: chunk,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        totalSavedProducts = data.savedProductsCount ?? totalSavedProducts;
        totalSavedPhotos = data.savedPhotosCount ?? totalSavedPhotos;
      }
    }

    const finalResult: PersistenceResult = {
      success: true,
      savedProductsCount: totalSavedProducts,
      savedPhotosCount: totalSavedPhotos,
      imagesSavedOnDisk: totalImagesSavedOnDisk,
      message: `Uspešno trajno upisano ${totalSavedProducts} proizvoda i ${totalSavedPhotos} slika u GitHub repozitorijum!`
    };

    window.dispatchEvent(new CustomEvent('project-persistence-updated', { detail: finalResult }));
    return finalResult;
  } catch (err: any) {
    console.error('Permanent persistence failed:', err);
    return {
      success: false,
      error: err.message || 'Neuspešna sinhronizacija sa serverom.',
    };
  }
}

/**
 * Component that automatically synchronizes browser IndexedDB state with the project filesystem
 * on initial load and listens for background persistence events.
 */
export const AutoProjectPersister: React.FC = () => {
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function autoSync() {
      try {
        // Query server persistence status
        const statusRes = await fetch('/api/persistence-status');
        if (!statusRes.ok) return;
        const status = await statusRes.json();

        // Load client records from IndexedDB
        const [products, photos] = await Promise.all([
          loadCustomProductsFromStorage(),
          loadPhotosFromStorage(),
        ]);

        const clientProductCount = (products || []).length;
        const clientPhotoCount = (photos || []).length;

        // Check if client has data that hasn't been written to disk yet
        const hasBase64Images = (products || []).some(p => 
          p.image?.startsWith('data:image/') || 
          (Array.isArray(p.images) && p.images.some(img => img?.startsWith('data:image/')))
        ) || (photos || []).some(p => p.imageUrl?.startsWith('data:image/'));

        const needsSync = (clientProductCount > 0 || clientPhotoCount > 0) && (
          status.productsCount < clientProductCount ||
          status.photosCount < clientPhotoCount ||
          hasBase64Images
        );

        if (needsSync) {
          console.log(`[AutoProjectPersister] Triggering auto-persistence for ${clientProductCount} products and ${clientPhotoCount} photos...`);
          setNotification({
            show: true,
            type: 'info',
            message: `Priprema trajnog upisa ${clientProductCount} proizvoda i ${clientPhotoCount} fotografija...`,
          });

          const result = await triggerPermanentProjectPersistence((progress) => {
            if (isMounted) {
              setNotification({
                show: true,
                type: 'info',
                message: progress,
              });
            }
          });

          if (isMounted) {
            if (result.success) {
              setNotification({
                show: true,
                type: 'success',
                message: `Automatski trajno sačuvano ${result.savedProductsCount} proizvoda i ${result.savedPhotosCount} slika u GitHub repozitorijum!`,
              });
              setTimeout(() => setNotification(null), 7000);
            } else if (result.error) {
              setNotification({
                show: true,
                type: 'error',
                message: result.error,
              });
              setTimeout(() => setNotification(null), 8000);
            }
          }
        }
      } catch (e) {
        console.warn('[AutoProjectPersister] Check error:', e);
      }
    }

    // Run autoSync on mount
    const timer = setTimeout(() => {
      autoSync();
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (!notification || !notification.show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md bg-stone-900/95 text-stone-100 p-4 rounded-xl shadow-2xl border border-amber-500/40 backdrop-blur-md flex items-start space-x-3 transition-all">
      {notification.type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 text-sm">
        <p className="font-semibold text-stone-200">Trajna sinhronizacija projekta</p>
        <p className="text-stone-300 text-xs mt-0.5 leading-relaxed">{notification.message}</p>
      </div>
      <button 
        onClick={() => setNotification(null)}
        className="text-stone-400 hover:text-stone-200 text-xs px-1 py-0.5"
      >
        ✕
      </button>
    </div>
  );
};
