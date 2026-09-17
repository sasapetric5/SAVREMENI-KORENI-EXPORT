import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, GalleryPhoto } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

/**
 * Fetch custom products from Supabase if configured
 */
export async function fetchSupabaseCustomProducts(): Promise<Product[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('custom_products')
      .select('*');

    if (error) {
      console.warn('Supabase fetch products error:', error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data.map((row: any) => ({
        ...row,
        // Map database fields to Product model
        craftTechniques: row.craft_techniques || row.craftTechniques || [],
        craftTechniquesEn: row.craft_techniques_en || row.craftTechniquesEn || [],
        materials: row.materials || [],
        materialsEn: row.materials_en || row.materialsEn || [],
        inStock: row.in_stock !== undefined ? row.in_stock : (row.inStock ?? true),
        leadTimeDays: row.lead_time_days || row.leadTimeDays || 3,
        priceRsd: row.price_rsd || row.priceRsd || 0,
        priceEur: row.price_eur || row.priceEur || 0,
      }));
    }
    return [];
  } catch (err) {
    console.warn('Supabase fetch error:', err);
    return null;
  }
}

/**
 * Save custom products to Supabase
 */
export async function syncCustomProductsToSupabase(products: Product[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const records = products.map((p) => ({
      id: p.id,
      name: p.name,
      name_en: p.nameEn || '',
      category: p.category,
      price_rsd: p.priceRsd,
      price_eur: p.priceEur,
      description: p.description,
      description_en: p.descriptionEn || '',
      image: p.image,
      in_stock: p.inStock,
      lead_time_days: p.leadTimeDays,
      featured: p.featured || false,
      badge: p.badge || '',
      badge_en: p.badgeEn || '',
      craft_techniques: p.craftTechniques || [],
      craft_techniques_en: p.craftTechniquesEn || [],
      materials: p.materials || [],
      materials_en: p.materialsEn || [],
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from('custom_products')
      .upsert(records, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to sync to Supabase:', err);
    return false;
  }
}

/**
 * Fetch workshop gallery photos from Supabase
 */
export async function fetchSupabaseGalleryPhotos(): Promise<GalleryPhoto[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('gallery_photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase gallery fetch error:', error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        titleEn: row.title_en || row.titleEn || '',
        category: row.category,
        categoryEn: row.category_en || row.categoryEn || '',
        imageUrl: row.image_url || row.imageUrl,
        caption: row.caption || '',
        captionEn: row.caption_en || row.captionEn || '',
        isCustomUploaded: row.is_custom_uploaded !== undefined ? row.is_custom_uploaded : true,
      }));
    }
    return [];
  } catch (err) {
    console.warn('Supabase gallery error:', err);
    return null;
  }
}

/**
 * Upsert gallery photos to Supabase
 */
export async function syncGalleryPhotosToSupabase(photos: GalleryPhoto[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const records = photos.map((photo) => ({
      id: photo.id,
      title: photo.title,
      title_en: photo.titleEn || '',
      category: photo.category,
      category_en: photo.categoryEn || '',
      image_url: photo.imageUrl,
      caption: photo.caption || '',
      caption_en: photo.captionEn || '',
      is_custom_uploaded: photo.isCustomUploaded ?? true,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from('gallery_photos')
      .upsert(records, { onConflict: 'id' });

    if (error) {
      console.error('Supabase gallery upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to sync gallery to Supabase:', err);
    return false;
  }
}
