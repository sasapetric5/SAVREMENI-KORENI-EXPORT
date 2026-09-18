import { Product } from '../types';
import { openAppDB } from './db';
import { triggerSitemapUpdate } from './sitemapNotification';
import { permanentProductsData } from '../data/permanentProductsData';
import {
  isSupabaseConfigured,
  fetchSupabaseCustomProducts,
  syncCustomProductsToSupabase
} from '../lib/supabase';

const STORE_NAME = 'custom_products';
const LOCAL_STORAGE_KEY = 'savremeni_koreni_custom_products_v1';

/**
 * Heals and normalizes a product list by ensuring every product has its canonical
 * image and images array intact from permanent data or its gallery list.
 */
function healProductsWithCanonicalData(products: Product[]): Product[] {
  const permMap = new Map(permanentProductsData.map((p) => [p.id, p]));
  
  // First map existing products
  const healed: Product[] = products.map((p) => {
    const perm = permMap.get(p.id);
    const validMain = (p.image && typeof p.image === 'string' && p.image.trim().length > 0)
      ? p.image.trim()
      : (perm?.image || p.images?.[0] || '');

    // Extract all candidate images, preserving up to all 4 product views
    const rawImages = (Array.isArray(p.images) && p.images.length > 0)
      ? p.images
      : (perm?.images || []);

    const validImages = rawImages.filter(
      (img) => typeof img === 'string' && img.trim().length > 0
    );

    if (validImages.length === 0 && validMain) {
      validImages.push(validMain);
    } else if (validMain && !validImages.includes(validMain)) {
      validImages.unshift(validMain);
    }

    return {
      ...(perm || {}),
      ...p,
      image: validMain,
      images: validImages,
    };
  });

  // Ensure any permanent products not present in the local list are included
  const existingIds = new Set(healed.map((p) => p.id));
  for (const perm of permanentProductsData) {
    if (!existingIds.has(perm.id)) {
      healed.push(perm);
    }
  }

  return healed;
}

export async function loadCustomProductsFromStorage(): Promise<Product[]> {
  let localProducts: Product[] = [];
  try {
    const db = await openAppDB();
    localProducts = await new Promise<Product[]>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result as Product[];
        resolve(Array.isArray(result) ? result : []);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('Failed to load custom products from IndexedDB:', err);
  }

  if (localProducts.length === 0) {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localProducts = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Check Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const sbProducts = await fetchSupabaseCustomProducts();
      if (sbProducts && sbProducts.length > 0) {
        const map = new Map<string, Product>();
        sbProducts.forEach((p) => map.set(p.id, p));
        localProducts.forEach((p) => map.set(p.id, p));
        const merged = Array.from(map.values());
        // Cache to IndexedDB
        if (localProducts.length === 0) {
          saveCustomProductsToStorage(merged).catch(console.warn);
        }
        return healProductsWithCanonicalData(merged);
      }
    } catch (sbErr) {
      console.warn('Could not sync with Supabase:', sbErr);
    }
  }

  // Also check backend server if available
  try {
    const res = await fetch('/api/products/custom');
    if (res.ok) {
      const serverProducts = await res.json();
      if (Array.isArray(serverProducts) && serverProducts.length > 0) {
        // Merge without duplicates
        const map = new Map<string, Product>();
        serverProducts.forEach((p: Product) => map.set(p.id, p));
        localProducts.forEach((p) => map.set(p.id, p));
        return healProductsWithCanonicalData(Array.from(map.values()));
      }
    }
  } catch {
    // server might be offline or client SPA fallback
  }

  // If local storage is empty, directly return permanent data
  if (localProducts.length === 0) {
    return permanentProductsData;
  }

  return healProductsWithCanonicalData(localProducts);
}

export async function saveCustomProductsToStorage(products: Product[]): Promise<void> {
  try {
    const db = await openAppDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const clearReq = store.clear();

      clearReq.onsuccess = () => {
        if (products.length === 0) {
          resolve();
          return;
        }

        let count = 0;
        let hasError = false;

        products.forEach((prod) => {
          const putReq = store.put(prod);
          putReq.onsuccess = () => {
            count++;
            if (count === products.length && !hasError) {
              resolve();
            }
          };
          putReq.onerror = () => {
            hasError = true;
            reject(putReq.error);
          };
        });
      };

      clearReq.onerror = () => {
        reject(clearReq.error);
      };
    });
  } catch (err) {
    console.error('Failed to save custom products in IDB:', err);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
  } catch {
    // ignore
  }

  // Sync to Supabase if configured
  if (isSupabaseConfigured) {
    syncCustomProductsToSupabase(products).catch((err) => {
      console.warn('Failed to sync products to Supabase:', err);
    });
  }

  // Trigger backend sitemap regeneration with the updated products
  try {
    triggerSitemapUpdate({ customProducts: products });
  } catch (err) {
    console.warn('Could not trigger sitemap update:', err);
  }
}


export async function getCustomProducts(): Promise<Product[]> {
  return loadCustomProductsFromStorage();
}

export async function saveCustomProduct(product: Product): Promise<void> {
  const current = await loadCustomProductsFromStorage();
  const existingIndex = current.findIndex(p => p.id === product.id);
  let updated: Product[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = product;
  } else {
    updated = [product, ...current];
  }
  await saveCustomProductsToStorage(updated);
}

export async function deleteCustomProduct(productId: string): Promise<void> {
  const current = await loadCustomProductsFromStorage();
  const filtered = current.filter(p => p.id !== productId);
  await saveCustomProductsToStorage(filtered);
}

