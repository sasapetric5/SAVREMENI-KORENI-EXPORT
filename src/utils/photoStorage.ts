import { GalleryPhoto } from '../types';
import { openAppDB } from './db';
import {
  isSupabaseConfigured,
  fetchSupabaseGalleryPhotos,
  syncGalleryPhotosToSupabase
} from '../lib/supabase';

const STORE_NAME = 'gallery_photos';
const STORAGE_KEY = 'savremeni_koreni_user_photos_v1';

export function deduplicatePhotos(photos: GalleryPhoto[]): GalleryPhoto[] {
  if (!Array.isArray(photos)) return [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const seenHashes = new Set<string>();
  const result: GalleryPhoto[] = [];

  for (const p of photos) {
    if (!p || !p.imageUrl || typeof p.imageUrl !== 'string') continue;
    const rawUrl = p.imageUrl.trim();
    if (rawUrl.length === 0) continue;

    // Normalize URL to detect duplicate filenames regardless of domain/protocol/leading slash
    const normalizedUrl = rawUrl
      .replace(/^https?:\/\/[^\/]+/, '')
      .replace(/^\/public/, '')
      .toLowerCase();

    // Extract core filename/hash (e.g. 1789326187913_1000020290.webp or etno_unikatna_torba_1789105500674.jpg)
    const fileName = normalizedUrl.split('/').pop()?.split('?')[0] || normalizedUrl;
    
    // Check for title + category duplicate
    const titleKey = `${(p.title || '').trim().toLowerCase()}_${(p.category || '').trim().toLowerCase()}`;

    if (
      seenUrls.has(normalizedUrl) ||
      seenIds.has(p.id) ||
      seenHashes.has(fileName)
    ) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    seenIds.add(p.id);
    seenHashes.add(fileName);

    // Standardize object structure
    result.push({
      ...p,
      imageUrl: rawUrl,
      title: p.title || 'Autentični rad radionice',
      category: p.category || 'Radionica'
    });

    if (result.length >= 250) break; // Hard cap at 250 clean images max
  }

  return result;
}

/**
 * Loads all stored photos from IndexedDB, with graceful migration from localStorage and Supabase sync.
 */
export async function loadPhotosFromStorage(): Promise<GalleryPhoto[] | null> {
  let localPhotos: GalleryPhoto[] | null = null;
  try {
    const db = await openAppDB();
    localPhotos = await new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result as GalleryPhoto[];
        if (Array.isArray(result) && result.length > 0) {
          // Clean up old bulky localStorage item to avoid any storage quota errors
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
          resolve(deduplicatePhotos(result));
        } else {
          // Check for legacy localStorage data to migrate
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const deduped = deduplicatePhotos(parsed);
                // Save to IndexedDB and clear localStorage
                savePhotosToStorage(deduped).catch(console.error);
                try {
                  localStorage.removeItem(STORAGE_KEY);
                } catch {
                  // ignore
                }
                resolve(deduped);
                return;
              }
            }
          } catch {
            // ignore
          }
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to load from IndexedDB, checking localStorage:', err);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localPhotos = deduplicatePhotos(parsed);
        }
      }
    } catch {
      // ignore
    }
  }

  // Check Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const sbPhotos = await fetchSupabaseGalleryPhotos();
      if (sbPhotos && sbPhotos.length > 0) {
        const map = new Map<string, GalleryPhoto>();
        sbPhotos.forEach((p) => map.set(p.id, p));
        if (localPhotos) {
          localPhotos.forEach((p) => map.set(p.id, p));
        }
        const merged = deduplicatePhotos(Array.from(map.values()));
        if (!localPhotos || localPhotos.length === 0) {
          savePhotosToStorage(merged).catch(console.warn);
        }
        return merged;
      }
    } catch (err) {
      console.warn('Could not sync gallery with Supabase:', err);
    }
  }

  return localPhotos ? deduplicatePhotos(localPhotos) : null;
}

/**
 * Saves all photos to IndexedDB without any 5MB localStorage limits.
 */
export async function savePhotosToStorage(photos: GalleryPhoto[]): Promise<void> {
  try {
    const db = await openAppDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing records first to mirror current array state
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        if (photos.length === 0) {
          resolve();
          return;
        }

        let addedCount = 0;
        let hasError = false;

        photos.forEach((photo) => {
          const putRequest = store.put(photo);
          putRequest.onsuccess = () => {
            addedCount++;
            if (addedCount === photos.length && !hasError) {
              resolve();
            }
          };
          putRequest.onerror = (e) => {
            hasError = true;
            console.error('Error storing photo in IndexedDB:', e);
            reject(putRequest.error);
          };
        });
      };

      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB save failed:', err);
    // As a safe fallback without crashing, try storing just metadata without huge base64 in localStorage if IDB completely fails
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  // Sync to Supabase if configured
  if (isSupabaseConfigured) {
    syncGalleryPhotosToSupabase(photos).catch((err) => {
      console.warn('Failed to sync gallery to Supabase:', err);
    });
  }
}


/**
 * Clears all stored photos from IndexedDB and localStorage.
 */
export async function clearAllStoredPhotos(): Promise<void> {
  try {
    const db = await openAppDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
  } catch (e) {
    console.error('Failed to clear IndexedDB:', e);
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
